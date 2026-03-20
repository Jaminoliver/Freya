"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BadgeCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/messages/EmptyState";
import { getBrowserClient } from "@/lib/supabase/browserClient";
import { getAuthenticatedBrowserClient } from "@/lib/supabase/browserClient";
import type { Conversation, Message } from "@/lib/types/messages";

// Module-level cache
let cachedConversations: Conversation[] | null = null;
let isFetching        = false;
let realtimeChannel: any = null;
let currentUserId: string | null = null;
let activeConversationId: number | null = null;
let messageDispatcher: ((msg: Message) => void) | null = null;
const listeners        = new Set<(convs: Conversation[]) => void>();
const typingListeners  = new Set<(typers: Set<number>) => void>();
const typingTimers     = new Map<number, ReturnType<typeof setTimeout>>();
let   typingConvIds    = new Set<number>();
const typingChannels   = new Map<number, any>();

const messageCache = new Map<number, { messages: Message[]; timestamp: number }>();
let sortDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function getCachedMessages(conversationId: number): Message[] | null {
  const entry = messageCache.get(conversationId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > 30000) return null;
  return entry.messages;
}

export function setCachedMessages(conversationId: number, messages: Message[]) {
  messageCache.set(conversationId, { messages, timestamp: Date.now() });
}

export function clearCachedMessages(conversationId: number) {
  messageCache.delete(conversationId);
}

export function appendCachedMessage(conversationId: number, message: Message) {
  const entry = messageCache.get(conversationId);
  if (!entry) {
    messageCache.set(conversationId, { messages: [message], timestamp: Date.now() });
    return;
  }
  if (entry.messages.some((m) => m.id === message.id)) return;
  messageCache.set(conversationId, { messages: [...entry.messages, message], timestamp: Date.now() });
}

function sortConversations(convs: Conversation[]): Conversation[] {
  return [...convs].sort((a, b) => {
    if (!a.lastMessage && b.lastMessage) return 1;
    if (a.lastMessage && !b.lastMessage) return -1;
    return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
  });
}

export function setActiveConversation(id: number | null) {
  if (activeConversationId !== null && id === null) {
    updateConversations((prev) =>
      prev.map((c) => c.id === activeConversationId ? { ...c, unreadCount: 0 } : c)
    );
  }
  activeConversationId = id;
}

export function setMessageDispatcher(fn: ((msg: Message) => void) | null) {
  messageDispatcher = fn;
}

export function updateConversations(updater: Conversation[] | ((prev: Conversation[]) => Conversation[])) {
  const next = typeof updater === "function"
    ? updater(cachedConversations ?? [])
    : updater;
  cachedConversations = sortConversations(next);
  if (sortDebounceTimer) clearTimeout(sortDebounceTimer);
  sortDebounceTimer = setTimeout(() => {
    sortDebounceTimer = null;
    listeners.forEach((fn) => fn(cachedConversations!));
  }, 80);
}

function setTyping(conversationId: number, isTyping: boolean) {
  const updated = new Set(typingConvIds);
  if (isTyping) updated.add(conversationId);
  else updated.delete(conversationId);
  typingConvIds = updated;
  typingListeners.forEach((fn) => fn(updated));
}

function subscribeTyping(supabase: any, conversationId: number) {
  if (typingChannels.has(conversationId)) return;
  const channel = supabase.channel(`typing:${conversationId}`);
  channel
    .on("broadcast", { event: "typing" }, (payload: any) => {
      if (payload.payload?.userId === currentUserId) return;
      setTyping(conversationId, true);
      if (typingTimers.has(conversationId)) clearTimeout(typingTimers.get(conversationId)!);
      typingTimers.set(conversationId, setTimeout(() => {
        setTyping(conversationId, false);
        typingTimers.delete(conversationId);
      }, 2000));
    })
    .subscribe();
  typingChannels.set(conversationId, channel);
}

export function sendTypingEvent(conversationId: number, userId: string) {
  const channel = typingChannels.get(conversationId);
  if (!channel) return;
  channel.send({
    type:    "broadcast",
    event:   "typing",
    payload: { userId },
  });
}

function startGlobalRealtime() {
  if (realtimeChannel) return;

  getAuthenticatedBrowserClient().then((supabase) => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) {
        currentUserId = session.user.id;
        if (cachedConversations) {
          cachedConversations.forEach((c) => subscribeTyping(supabase, c.id));
        }
      }
    });

    realtimeChannel = supabase
      .channel("global-messages-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload: any) => {
        const row   = payload.new as any;
        const isOwn = row.sender_id === currentUserId;

        console.log("[Realtime INSERT]", {
          messageId:      row.id,
          conversationId: row.conversation_id,
          senderId:       row.sender_id,
          receiverId:     row.receiver_id,
          currentUserId,
          isOwn,
          hasDispatcher:  !!messageDispatcher,
          activeConvId:   activeConversationId,
          isPPV:          row.is_ppv,
          mediaType:      row.media_type,
        });

        setTyping(row.conversation_id, false);

        if (isOwn) {
          console.log("[Realtime INSERT] skipping own message");
          return;
        }

        if (row.receiver_id === currentUserId) {
          console.log("[Realtime INSERT] marking delivered, messageId:", row.id);
          fetch(`/api/conversations/${row.conversation_id}/messages/${row.id}/deliver`, {
            method: "PATCH",
          }).catch((e) => console.error("[deliver] failed:", e));
        }

        // Normal media (non-PPV) — update sidebar only, UPDATE event will dispatch to chat
        if (row.media_type && !row.is_ppv) {
          updateConversations((prev) =>
            prev.map((c) => {
              if (c.id !== row.conversation_id) return c;
              return {
                ...c,
                lastMessage:   row.content ?? "📎 Media",
                lastMessageAt: row.created_at,
                unreadCount:   c.id === activeConversationId ? c.unreadCount : c.unreadCount + 1,
                hasMedia:      true,
              };
            })
          );
          return;
        }

        // PPV — update sidebar only, wait for UPDATE with thumbnail_url to dispatch to chat
        if (row.is_ppv) {
          updateConversations((prev) =>
            prev.map((c) => {
              if (c.id !== row.conversation_id) return c;
              return {
                ...c,
                lastMessage:   "🔒 PPV message",
                lastMessageAt: row.created_at,
                unreadCount:   c.id === activeConversationId ? c.unreadCount : c.unreadCount + 1,
                hasMedia:      true,
              };
            })
          );
          return;
        }

        // Text message
        const newMessage: Message = {
          id:             row.id,
          conversationId: row.conversation_id,
          senderId:       row.sender_id,
          type:           "text",
          text:           row.content ?? "",
          isRead:         row.is_read ?? false,
          isDelivered:    true,
          createdAt:      row.created_at,
          replyToId:      row.reply_to_id ?? null,
        };

        appendCachedMessage(row.conversation_id, newMessage);
        if (messageDispatcher) messageDispatcher(newMessage);

        updateConversations((prev) =>
          prev.map((c) => {
            if (c.id !== row.conversation_id) return c;
            return {
              ...c,
              lastMessage:   row.content ?? "",
              lastMessageAt: row.created_at,
              unreadCount:   c.id === activeConversationId ? c.unreadCount : c.unreadCount + 1,
              hasMedia:      false,
            };
          })
        );
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload: any) => {
        const row = payload.new as any;
        const old = payload.old as any;

        console.log("[Realtime UPDATE]", {
          messageId:    row.id,
          senderId:     row.sender_id,
          receiverId:   row.receiver_id,
          currentUserId,
          isDelivered:  row.is_delivered,
          wasDelivered: old.is_delivered,
          isRead:       row.is_read,
          wasRead:      old.is_read,
          hasMediaUrl:  !!row.media_url,
          hadMediaUrl:  !!old.media_url,
        });

        if (row.is_deleted_for_everyone) {
          console.log("[Realtime UPDATE] skipping — deleted for everyone");
          if (messageDispatcher && row.conversation_id === activeConversationId) {
            messageDispatcher({
              id:              row.id,
              conversationId:  row.conversation_id,
              senderId:        row.sender_id,
              type:            "text",
              text:            "This message was deleted",
              isRead:          row.is_read ?? false,
              isDelivered:     false,
              createdAt:       row.created_at,
              isDeleted:       true,
              _isStatusUpdate: true,
            } as any);
          }
          return;
        }

        const isCreatorUser = row.sender_id === currentUserId || row.receiver_id === currentUserId;
        if (isCreatorUser) {
          if (row.deleted_for_creator || row.deleted_for_fan) {
            console.log("[Realtime UPDATE] skipping — soft-deleted for a user");
            return;
          }
        }

        // PPV thumbnail available — dispatch as new message
        // Don't rely on old.thumbnail_url (DEFAULT replica identity may not include it)
        // Instead check cache: only dispatch if this message isn't already cached with a thumbnail
        if (row.is_ppv && row.thumbnail_url) {
          const isReceiver = row.receiver_id === currentUserId;
          const isSender   = row.sender_id === currentUserId;

          if (isSender || isReceiver) {
            // Skip if already cached with thumbnail (avoid duplicate on read receipt updates)
            const cached = messageCache.get(row.conversation_id);
            const alreadyHasThumbnail = cached?.messages.some(
              (m) => m.id === row.id && m.thumbnailUrl
            );
            if (alreadyHasThumbnail) return;

            const ppvMessage: Message = {
              id:             row.id,
              conversationId: row.conversation_id,
              senderId:       row.sender_id,
              type:           "ppv",
              text:           row.content ?? undefined,
              mediaUrls:      isSender ? (row.media_url ? [row.media_url] : []) : [],
              thumbnailUrl:   row.thumbnail_url,
              isRead:         row.is_read ?? false,
              isDelivered:    true,
              createdAt:      row.created_at,
              replyToId:      row.reply_to_id ?? null,
              ppv: {
                price:         row.ppv_price ?? 0,
                isUnlocked:    isSender,
                unlockedCount: 0,
              },
            };
            appendCachedMessage(row.conversation_id, ppvMessage);
            if (messageDispatcher && row.conversation_id === activeConversationId) {
              messageDispatcher(ppvMessage);
            }
          }
          return;
        }

        if (row.sender_id === currentUserId) {
          const entry = messageCache.get(row.conversation_id);
          if (entry) {
            const updated = entry.messages.map((m) =>
              m.id === row.id
                ? { ...m, isDelivered: row.is_delivered ?? m.isDelivered, isRead: row.is_read ?? m.isRead }
                : m
            );
            messageCache.set(row.conversation_id, { messages: updated, timestamp: entry.timestamp });
          }
          if (messageDispatcher && row.conversation_id === activeConversationId) {
            messageDispatcher({
              id:              row.id,
              conversationId:  row.conversation_id,
              senderId:        row.sender_id,
              type:            "text",
              text:            row.content ?? "",
              isRead:          row.is_read ?? false,
              isDelivered:     row.is_delivered ?? false,
              createdAt:       row.created_at,
              replyToId:       row.reply_to_id ?? null,
              _isStatusUpdate: true,
            } as any);
          }
          return;
        }

        if (row.receiver_id !== currentUserId) return;
        if (!row.media_type || !row.media_url) return;
        if (old.media_url) return;

        const mediaMessage: Message = { id: row.id, conversationId: row.conversation_id, senderId: row.sender_id, type: "media", text: row.content ?? undefined, mediaUrls: row.media_url ? [row.media_url] : [], thumbnailUrl: row.thumbnail_url ?? null, isRead: row.is_read ?? false, isDelivered: true, createdAt: row.created_at, replyToId: row.reply_to_id ?? null };

        appendCachedMessage(row.conversation_id, mediaMessage);
        if (messageDispatcher) messageDispatcher(mediaMessage);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, (payload: any) => {
        const row       = payload.new as any;
        const isCreator = row.creator_id === currentUserId;
        const deletedForMe = isCreator ? row.deleted_for_creator : row.deleted_for_fan;

        updateConversations((prev) => {
          const exists = prev.some((c) => c.id === row.id);

          if (!exists && !deletedForMe) {
            fetch(`/api/conversations/${row.id}`)
              .then((r) => r.json())
              .then((data) => {
                if (data.conversation) {
                  updateConversations((p) => {
                    if (p.some((c) => c.id === row.id)) return p;
                    return [data.conversation, ...p];
                  });
                  getAuthenticatedBrowserClient().then((sb) => subscribeTyping(sb, row.id));
                }
              })
              .catch(() => {});
            return prev;
          }

          if (exists && deletedForMe) {
            return prev.filter((c) => c.id !== row.id);
          }

          return prev.map((c) => {
            if (c.id !== row.id) return c;
            const incomingUnread = isCreator
              ? row.unread_count_creator ?? c.unreadCount
              : row.unread_count_fan     ?? c.unreadCount;
            return {
              ...c,
              lastMessage:   row.last_message_preview ?? c.lastMessage,
              lastMessageAt: row.last_message_at      ?? c.lastMessageAt,
              unreadCount:   c.id === activeConversationId
                ? c.unreadCount
                : Math.max(c.unreadCount, incomingUnread),
            };
          });
        });
      })
      .subscribe((status: string) => {
        console.log("[Realtime] channel status:", status);
        if (status === "CHANNEL_ERROR" || status === "CLOSED") {
          console.log("[Realtime] channel dropped, reconnecting in 2s...");
          const deadChannel = realtimeChannel;
          realtimeChannel = null;
          if (deadChannel) {
            supabase.removeChannel(deadChannel).catch(() => {});
          }
          if (status === "CHANNEL_ERROR") {
            setTimeout(() => startGlobalRealtime(), 2000);
          }
        }
      });
  });
}

export default function MessagesPage() {
  return <EmptyState />;
}

export function useConversations() {
  const [conversations, setConversationsState] = useState<Conversation[]>(
    cachedConversations ?? []
  );
  const [loading, setLoading] = useState(cachedConversations === null);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    listeners.add(setConversationsState);
    startGlobalRealtime();
    return () => { listeners.delete(setConversationsState); };
  }, []);

  useEffect(() => {
    if (cachedConversations !== null) return;
    if (isFetching) return;
    isFetching = true;

    fetch("/api/conversations")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch conversations");
        return res.json();
      })
      .then((data) => {
        const convs = data.conversations ?? [];
        cachedConversations = sortConversations(convs);
        listeners.forEach((fn) => fn(cachedConversations!));
        getAuthenticatedBrowserClient().then((supabase) => {
          convs.forEach((c: Conversation) => subscribeTyping(supabase, c.id));
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        isFetching = false;
        setLoading(false);
      });
  }, []);

  const setConversations = useCallback(updateConversations, []);

  return { conversations, setConversations, loading, error };
}

export function useTypingConversations() {
  const [typers, setTypers] = useState<Set<number>>(new Set(typingConvIds));

  useEffect(() => {
    typingListeners.add(setTypers);
    return () => { typingListeners.delete(setTypers); };
  }, []);

  return typers;
}