"use client";

import { useEffect, useState, useCallback } from "react";
import { EmptyState } from "@/components/messages/EmptyState";
import { getBrowserClient } from "@/lib/supabase/browserClient";
import { getAuthenticatedBrowserClient } from "@/lib/supabase/browserClient";
import type { Conversation, Message } from "@/lib/types/messages";

// Module-level cache
let cachedConversations: Conversation[] | null = null;
let isFetching        = false;
let realtimeStarted   = false;
let currentUserId: string | null = null;
let activeConversationId: number | null = null;
let messageDispatcher: ((msg: Message) => void) | null = null;
const listeners        = new Set<(convs: Conversation[]) => void>();
const typingListeners  = new Set<(typers: Set<number>) => void>();
const typingTimers     = new Map<number, ReturnType<typeof setTimeout>>();
let   typingConvIds    = new Set<number>();
const typingChannels   = new Map<number, any>();

export function setActiveConversation(id: number | null) {
  console.log("[setActiveConversation] setting to:", id);
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

function updateConversations(updater: Conversation[] | ((prev: Conversation[]) => Conversation[])) {
  const next = typeof updater === "function"
    ? updater(cachedConversations ?? [])
    : updater;
  cachedConversations = next;
  listeners.forEach((fn) => fn(next));
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

function startGlobalRealtime() {
  if (realtimeStarted) return;
  realtimeStarted = true;

  getAuthenticatedBrowserClient().then((supabase) => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) {
        currentUserId = session.user.id;
        if (cachedConversations) {
          cachedConversations.forEach((c) => subscribeTyping(supabase, c.id));
        }
      }
    });

    supabase
      .channel("global-messages-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload: any) => {
        const row   = payload.new as any;
        const isOwn = row.sender_id === currentUserId;

        const newMessage: Message = row.is_ppv
          ? { id: row.id, conversationId: row.conversation_id, senderId: row.sender_id, type: "ppv",   text: row.content ?? undefined, mediaUrls: row.media_url ? [row.media_url] : [], thumbnailUrl: row.thumbnail_url ?? null, ppv: { price: row.ppv_price ?? 0, isUnlocked: row.is_unlocked ?? false, unlockedCount: 0 }, isRead: row.is_read ?? false, createdAt: row.created_at, replyToId: row.reply_to_id ?? null }
          : row.media_type
          ? { id: row.id, conversationId: row.conversation_id, senderId: row.sender_id, type: "media", text: row.content ?? undefined, mediaUrls: row.media_url ? [row.media_url] : [], thumbnailUrl: row.thumbnail_url ?? null, isRead: row.is_read ?? false, createdAt: row.created_at, replyToId: row.reply_to_id ?? null }
          : { id: row.id, conversationId: row.conversation_id, senderId: row.sender_id, type: "text",  text: row.content ?? "", isRead: row.is_read ?? false, createdAt: row.created_at, replyToId: row.reply_to_id ?? null };

        if (messageDispatcher) messageDispatcher(newMessage);
        setTyping(row.conversation_id, false);

        updateConversations((prev) => {
          const updated = prev.map((c) => {
            if (c.id !== row.conversation_id) return c;
            return {
              ...c,
              lastMessage:   row.content ?? (row.media_type ? "📎 Media" : ""),
              lastMessageAt: row.created_at,
              unreadCount:   isOwn ? c.unreadCount : c.unreadCount + 1,
              hasMedia:      !!row.media_type,
            };
          });
          return [...updated].sort((a, b) => {
            if (!a.lastMessage && b.lastMessage) return 1;
            if (a.lastMessage && !b.lastMessage) return -1;
            return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
          });
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, (payload: any) => {
        const row = payload.new as any;
        console.log("[Realtime UPDATE] conversation:", row.id, "activeConversationId:", activeConversationId);
        console.log("[Realtime UPDATE] unread_count_creator:", row.unread_count_creator, "unread_count_fan:", row.unread_count_fan);
        console.log("[Realtime UPDATE] currentUserId:", currentUserId, "row.creator_id:", row.creator_id);
        updateConversations((prev) =>
          prev.map((c) => {
            if (c.id !== row.id) return c;
            const incomingUnread = row.creator_id === currentUserId
              ? row.unread_count_creator ?? c.unreadCount
              : row.unread_count_fan     ?? c.unreadCount;
            console.log("[Realtime UPDATE] c.id:", c.id, "c.unreadCount:", c.unreadCount, "incomingUnread:", incomingUnread, "isActive:", c.id === activeConversationId);
            return {
              ...c,
              lastMessage:   row.last_message_preview ?? c.lastMessage,
              lastMessageAt: row.last_message_at      ?? c.lastMessageAt,
              unreadCount:   c.id === activeConversationId
                ? c.unreadCount
                : Math.max(c.unreadCount, incomingUnread),
            };
          })
        );
      })
      .subscribe();
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
        cachedConversations = convs;
        listeners.forEach((fn) => fn(convs));
        // Subscribe typing for all conversations once loaded
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

// Hook for typing state — use in sidebar
export function useTypingConversations() {
  const [typers, setTypers] = useState<Set<number>>(new Set(typingConvIds));

  useEffect(() => {
    typingListeners.add(setTypers);
    return () => { typingListeners.delete(setTypers); };
  }, []);

  return typers;
}