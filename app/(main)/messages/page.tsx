"use client";

import { useState, useEffect, useCallback } from "react";
import { EmptyState } from "@/components/messages/EmptyState";
import { getAuthenticatedBrowserClient } from "@/lib/supabase/browserClient";
import { useMessageStore } from "@/lib/store/messageStore";
import type { Conversation, Message } from "@/lib/types/messages";

// ─── Module-level singletons ──────────────────────────────────────────────────
let cachedConversations: Conversation[] | null = null;
let isFetching            = false;
let realtimeChannel: any  = null;
let currentUserId: string | null = null;
let activeConversationId: number | null = null;
let sortDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let isOnMessagesPage = false;

export function setOnMessagesPage(value: boolean) {
  console.log("[MessagesPage] setOnMessagesPage:", value);
  isOnMessagesPage = value;
}

const listeners       = new Set<(convs: Conversation[]) => void>();
const typingListeners = new Set<(typers: Set<number>) => void>();
const typingTimers    = new Map<number, ReturnType<typeof setTimeout>>();
const typingChannels  = new Map<number, any>();
const messageCache    = new Map<number, { messages: Message[]; timestamp: number }>();

let typingConvIds = new Set<number>();
const blockedConversationIds  = new Set<number>();
const archivedConversationIds = new Set<number>();

export function addArchivedId(id: number) {
  archivedConversationIds.add(id);
}

export function removeArchivedId(id: number) {
  archivedConversationIds.delete(id);
}

// ─── Message cache helpers ────────────────────────────────────────────────────
export function getCachedMessages(conversationId: number): Message[] | null {
  const entry = messageCache.get(conversationId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > 30_000) return null;
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
  messageCache.set(conversationId, {
    messages:  [...entry.messages, message],
    timestamp: Date.now(),
  });
}

// ─── Conversation sorting ─────────────────────────────────────────────────────
function sortConversations(convs: Conversation[]): Conversation[] {
  return [...convs].sort((a, b) => {
    const aPinned = a.isPinned ? 1 : 0;
    const bPinned = b.isPinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    if (!a.lastMessage && b.lastMessage) return 1;
    if (a.lastMessage && !b.lastMessage) return -1;
    return (
      new Date(b.lastMessageAt || 0).getTime() -
      new Date(a.lastMessageAt || 0).getTime()
    );
  });
}

// ─── Core update function ─────────────────────────────────────────────────────
export function updateConversations(
  updater: Conversation[] | ((prev: Conversation[]) => Conversation[])
) {
  const next =
    typeof updater === "function"
      ? updater(cachedConversations ?? [])
      : updater;
  cachedConversations = sortConversations(next);
  if (sortDebounceTimer) clearTimeout(sortDebounceTimer);
  sortDebounceTimer = setTimeout(() => {
    sortDebounceTimer = null;
    listeners.forEach((fn) => fn(cachedConversations!));
  }, 80);
}

// ─── Active conversation ──────────────────────────────────────────────────────
export function setActiveConversation(id: number | null) {
  if (activeConversationId !== null && id === null) {
    updateConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId ? { ...c, unreadCount: 0 } : c
      )
    );
  }
  activeConversationId = id;
}

export function blockConversation(id: number) {
  blockedConversationIds.add(id);
}
// ─── Typing ───────────────────────────────────────────────────────────────────
function setTyping(conversationId: number, isTyping: boolean) {
  const updated = new Set(typingConvIds);
  if (isTyping) updated.add(conversationId);
  else updated.delete(conversationId);
  typingConvIds = updated;
  typingListeners.forEach((fn) => fn(updated));
}

export async function subscribeTypingForConversation(conversationId: number) {
  const supabase = await getAuthenticatedBrowserClient();
  subscribeTyping(supabase, conversationId);
}

function subscribeTyping(supabase: any, conversationId: number) {
  if (typingChannels.has(conversationId)) return;
  const channel = supabase.channel(`typing:${conversationId}`);
  channel
    .on("broadcast", { event: "typing" }, (payload: any) => {
      if (payload.payload?.userId === currentUserId) return;
      setTyping(conversationId, true);
      if (typingTimers.has(conversationId))
        clearTimeout(typingTimers.get(conversationId)!);
      typingTimers.set(
        conversationId,
        setTimeout(() => {
          setTyping(conversationId, false);
          typingTimers.delete(conversationId);
        }, 2000)
      );
    })
    .subscribe();
  typingChannels.set(conversationId, channel);
}

export function sendTypingEvent(conversationId: number, userId: string) {
  const channel = typingChannels.get(conversationId);
  if (!channel) return;
  channel.send({ type: "broadcast", event: "typing", payload: { userId } });
}

// ─── Fetch conversations ──────────────────────────────────────────────────────
function ensureConversationsFetched() {
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

      // Track archived IDs so realtime doesn't re-add them
      if (data.archivedIds) {
        data.archivedIds.forEach((id: number) => archivedConversationIds.add(id));
      }

      cachedConversations = sortConversations(convs);
      listeners.forEach((fn) => fn(cachedConversations!));
      getAuthenticatedBrowserClient().then((supabase) => {
        convs.forEach((c: Conversation) => subscribeTyping(supabase, c.id));
      });
    })
    .catch(() => {})
    .finally(() => { isFetching = false; });
}

// ─── Global realtime ──────────────────────────────────────────────────────────
function startGlobalRealtime() {
  if (realtimeChannel) return;

  getAuthenticatedBrowserClient().then(async (supabase) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    currentUserId = session.user.id;
    console.log("[Realtime] currentUserId set:", currentUserId);
    cachedConversations?.forEach((c) => subscribeTyping(supabase, c.id));

    realtimeChannel = supabase
      .channel("global-messages-changes")

      // ── conversations INSERT ───────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        (payload: any) => {
          const row = payload.new as any;
          console.log("[CONV INSERT] fired — row:", JSON.stringify(row));
          console.log("[CONV INSERT] currentUserId:", currentUserId);
          console.log("[CONV INSERT] creator_id:", row.creator_id, "fan_id:", row.fan_id);

          const isCreator = row.creator_id === currentUserId;
          const isFan     = row.fan_id     === currentUserId;
          console.log("[CONV INSERT] isCreator:", isCreator, "isFan:", isFan);

          if (!isCreator && !isFan) {
            console.log("[CONV INSERT] not involved — skipping");
            return;
          }

          const alreadyExists = cachedConversations?.some((c) => c.id === row.id) ?? false;
          console.log("[CONV INSERT] alreadyExists in cache:", alreadyExists);
          if (alreadyExists) return;

          // Never re-add a blocked or archived conversation
          if (blockedConversationIds.has(row.id)) return;
          if (archivedConversationIds.has(row.id)) return;

          console.log("[CONV INSERT] fetching /api/conversations/" + row.id);
          fetch(`/api/conversations/${row.id}`)
            .then((r) => {
              console.log("[CONV INSERT] fetch status:", r.status);
              return r.json();
            })
            .then((data) => {
              console.log("[CONV INSERT] fetch response:", JSON.stringify(data));
              if (data.conversation && !archivedConversationIds.has(row.id)) {
                updateConversations((prev) => {
                  if (prev.some((c) => c.id === row.id)) {
                    console.log("[CONV INSERT] duplicate guard hit — not adding");
                    return prev;
                  }
                  console.log("[CONV INSERT] adding to list:", row.id);
                  return [data.conversation, ...prev];
                });
                getAuthenticatedBrowserClient().then((sb) =>
                  subscribeTyping(sb, row.id)
                );
              } else {
                console.warn("[CONV INSERT] no conversation in response — check /api/conversations/:id");
              }
            })
            .catch((err) => console.error("[CONV INSERT] fetch error:", err));
        }
      )

      // ── messages INSERT ────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          const row   = payload.new as any;
          const isOwn = row.sender_id === currentUserId;

          setTyping(row.conversation_id, false);
          console.log("[MSG INSERT] receiver_id:", row.receiver_id, "currentUserId:", currentUserId, "isOnMessagesPage:", isOnMessagesPage);

          if (isOwn) return;

          const convoExists = cachedConversations?.some((c) => c.id === row.conversation_id) ?? false;
          if (!convoExists) {
            // Never re-add a blocked or archived conversation
            if (blockedConversationIds.has(row.conversation_id)) return;
            if (archivedConversationIds.has(row.conversation_id)) return;
            fetch(`/api/conversations/${row.conversation_id}`)
              .then((r) => r.json())
              .then((data) => {
                if (data.conversation && !archivedConversationIds.has(row.conversation_id)) {
                  updateConversations((prev) => {
                    if (prev.some((c) => c.id === row.conversation_id)) return prev;
                    return [data.conversation, ...prev];
                  });
                  getAuthenticatedBrowserClient().then((sb) =>
                    subscribeTyping(sb, row.conversation_id)
                  );
                }
              })
              .catch(() => {});
            return;
          }

          if (row.receiver_id === currentUserId && isOnMessagesPage) {
            console.log("[MSG INSERT] firing deliver PATCH for msg:", row.id);
            fetch(
              `/api/conversations/${row.conversation_id}/messages/${row.id}/deliver`,
              { method: "PATCH" }
            ).catch(() => {});
          }

          if (row.media_type && !row.is_ppv) {
            updateConversations((prev) =>
              prev.map((c) =>
                c.id !== row.conversation_id ? c : {
                  ...c,
                  lastMessage:   row.content ?? "📎 Media",
                  lastMessageAt: row.created_at,
                  unreadCount:   c.id === activeConversationId ? c.unreadCount : c.unreadCount + 1,
                  hasMedia:      true,
                }
              )
            );
            return;
          }

          if (row.is_ppv) {
            updateConversations((prev) =>
              prev.map((c) =>
                c.id !== row.conversation_id ? c : {
                  ...c,
                  lastMessage:   "🔒 PPV message",
                  lastMessageAt: row.created_at,
                  unreadCount:   c.id === activeConversationId ? c.unreadCount : c.unreadCount + 1,
                  hasMedia:      true,
                }
              )
            );
            return;
          }

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

          const store = useMessageStore.getState();
          if (row.conversation_id === store.conversationId) {
            store.appendMessage(newMessage);
            fetch(`/api/conversations/${row.conversation_id}/read`, { method: "PATCH" }).catch(() => {});
          }

          appendCachedMessage(row.conversation_id, newMessage);

          updateConversations((prev) =>
            prev.map((c) =>
              c.id !== row.conversation_id ? c : {
                ...c,
                lastMessage:   row.content ?? "",
                lastMessageAt: row.created_at,
                unreadCount:   c.id === activeConversationId ? c.unreadCount : c.unreadCount + 1,
                hasMedia:      false,
              }
            )
          );
        }
      )

      // ── messages UPDATE ────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload: any) => {
          const row = payload.new as any;
          const old = payload.old as any;

          console.log("[MSG UPDATE] patching msg:", row.id, "is_delivered:", row.is_delivered, "is_read:", row.is_read);

          if (row.is_deleted_for_everyone) {
            useMessageStore.getState().patchMessage(row.id, {
              text:      "This message was deleted",
              type:      "text",
              mediaUrls: [],
              isDeleted: true,
            } as any);
            return;
          }

          const isInvolved = row.sender_id === currentUserId || row.receiver_id === currentUserId;
          if (isInvolved && (row.deleted_for_creator || row.deleted_for_fan)) return;

          if (row.is_ppv && row.thumbnail_url) {
            const isReceiver = row.receiver_id === currentUserId;
            const isSender   = row.sender_id   === currentUserId;
            if (isSender || isReceiver) {
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

              const store = useMessageStore.getState();
              if (row.conversation_id === store.conversationId) {
                store.appendMessage(ppvMessage);
              }
              appendCachedMessage(row.conversation_id, ppvMessage);
            }
            return;
          }

          if (row.sender_id === currentUserId) {
            useMessageStore.getState().patchMessage(row.id, {
              isDelivered: row.is_delivered ?? false,
              isRead:      row.is_read      ?? false,
              status:      "sent",
            });

            const entry = messageCache.get(row.conversation_id);
            if (entry) {
              messageCache.set(row.conversation_id, {
                messages: entry.messages.map((m) =>
                  m.id === row.id
                    ? {
                        ...m,
                        isDelivered: row.is_delivered ?? m.isDelivered,
                        isRead:      row.is_read      ?? m.isRead,
                        status:      "sent",
                      }
                    : m
                ),
                timestamp: entry.timestamp,
              });
            }
            return;
          }

          if (row.receiver_id !== currentUserId) return;
          if (!row.media_type || !row.media_url) return;
          if (old.media_url) return;

          const mediaMessage: Message = {
            id:             row.id,
            conversationId: row.conversation_id,
            senderId:       row.sender_id,
            type:           "media",
            text:           row.content ?? undefined,
            mediaUrls:      row.media_url ? [row.media_url] : [],
            thumbnailUrl:   row.thumbnail_url ?? null,
            isRead:         row.is_read ?? false,
            isDelivered:    true,
            createdAt:      row.created_at,
            replyToId:      row.reply_to_id ?? null,
          };

          const store = useMessageStore.getState();
          if (row.conversation_id === store.conversationId) {
            store.appendMessage(mediaMessage);
          }
          appendCachedMessage(row.conversation_id, mediaMessage);
        }
      )

      // ── conversations UPDATE ───────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload: any) => {
          const row       = payload.new as any;
          const isCreator = row.creator_id === currentUserId;
          const isFan     = row.fan_id     === currentUserId;

          if (!isCreator && !isFan) return;

          const deletedForMe = isCreator ? row.deleted_for_creator : row.deleted_for_fan;

          // ── Blocked, restricted, or deleted — remove immediately, never re-add ──
          if (row.is_blocked || row.is_restricted || deletedForMe) {
            blockedConversationIds.add(row.id);
            updateConversations((prev) => prev.filter((c) => c.id !== row.id));
            return;
          }

          updateConversations((prev) => {
            const exists = prev.some((c) => c.id === row.id);

            if (!exists) {
              if (blockedConversationIds.has(row.id)) return prev;
              if (archivedConversationIds.has(row.id)) return prev;
              fetch(`/api/conversations/${row.id}`)
                .then((r) => r.json())
                .then((data) => {
                  if (data.conversation && !archivedConversationIds.has(row.id)) {
                    updateConversations((p) => {
                      if (p.some((c) => c.id === row.id)) return p;
                      return [data.conversation, ...p];
                    });
                    getAuthenticatedBrowserClient().then((sb) =>
                      subscribeTyping(sb, row.id)
                    );
                  }
                })
                .catch(() => {});
              return prev;
            }

            return prev.map((c) => {
              if (c.id !== row.id) return c;

              const incomingUnread = isCreator
                ? (row.unread_count_creator ?? c.unreadCount)
                : (row.unread_count_fan     ?? c.unreadCount);

              const incomingAt = row.last_message_at;
              const cachedAt   = c.lastMessageAt;

              const alreadySorted =
                cachedAt &&
                incomingAt &&
                new Date(cachedAt).getTime() >= new Date(incomingAt).getTime();

              if (alreadySorted) {
                return {
                  ...c,
                  lastMessage: row.last_message_preview ?? c.lastMessage,
                  unreadCount: c.id === activeConversationId
                    ? c.unreadCount
                    : Math.max(c.unreadCount, incomingUnread),
                };
              }

              return {
                ...c,
                lastMessage:   row.last_message_preview ?? c.lastMessage,
                lastMessageAt: incomingAt               ?? c.lastMessageAt,
                unreadCount:   c.id === activeConversationId
                  ? c.unreadCount
                  : Math.max(c.unreadCount, incomingUnread),
              };
            });
          });
        }
      )

      .subscribe((status: string) => {
        console.log("[Realtime] channel status:", status);
        if (status === "CHANNEL_ERROR" || status === "CLOSED") {
          const deadChannel = realtimeChannel;
          realtimeChannel = null;
          if (deadChannel) supabase.removeChannel(deadChannel).catch(() => {});
          if (status === "CHANNEL_ERROR")
            setTimeout(() => startGlobalRealtime(), 2000);
        }
      });
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  useEffect(() => {
    console.log("[MessagesPage] mounted — setting isOnMessagesPage true");
    setOnMessagesPage(true);
    fetch("/api/conversations/deliver-all", { method: "PATCH" }).catch(() => {});
    return () => {
      console.log("[MessagesPage] unmounted — setting isOnMessagesPage false");
      setOnMessagesPage(false);
    };
  }, []);

  return <EmptyState />;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useConversations() {
  const [conversations, setConversationsState] = useState<Conversation[]>(
    cachedConversations ?? []
  );
  const [loading, setLoading] = useState(cachedConversations === null);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
  const handler = (convs: Conversation[]) => {
    setConversationsState(convs);
    setLoading(false);
  };
  listeners.add(handler);
  startGlobalRealtime();
  ensureConversationsFetched();
  if (cachedConversations !== null) setLoading(false);
  return () => { listeners.delete(handler); };
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

export function useUnreadConversationCount() {
  const [count, setCount] = useState(() =>
    (cachedConversations ?? []).filter((c) => c.unreadCount > 0).length
  );

  useEffect(() => {
    startGlobalRealtime();
    ensureConversationsFetched();

    const handler = (convs: Conversation[]) => {
      setCount(convs.filter((c) => c.unreadCount > 0).length);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  return count;
}