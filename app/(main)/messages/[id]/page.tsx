"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { getBrowserClient } from "@/lib/supabase/browserClient";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatPanel } from "@/components/messages/ChatPanel";
import { useMessagesContext } from "@/lib/context/MessagesContext";
import { useMessageStore } from "@/lib/store/messageStore";
import {
  useConversations,
  setActiveConversation,
  setOnMessagesPage,
  setCachedMessages,
  appendCachedMessage,
  updateConversations,
} from "@/app/(main)/messages/page";
import type { Conversation, Message } from "@/lib/types/messages";

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }       = use(params);
  const router       = useRouter();
  const searchParams = useSearchParams();
  const isNew        = id === "new";

  const targetUserId   = searchParams.get("targetUserId");
  const targetName     = searchParams.get("name") ?? "Unknown";
  const targetUser     = searchParams.get("username") ?? "";
  const targetAvatar   = searchParams.get("avatar") ?? null;
  const targetVerified = searchParams.get("verified") === "1";

  const conversationId = isNew ? 0 : parseInt(id, 10);

  const { conversations } = useConversations();
  const { setActiveConversationId } = useMessagesContext();

  const {
    messages,
    setMessages,
    appendMessage,
    patchMessage,
    clearMessages,
    setConversationId: setStoreConversationId,
  } = useMessageStore();

  const cached = isNew ? null : (conversations.find((c) => c.id === conversationId) ?? null);

  const [conversation,  setConversation]  = useState<Conversation | null>(
    isNew
      ? {
          id:            0,
          participant:   { id: targetUserId ?? "", name: targetName, username: targetUser, avatarUrl: targetAvatar, isVerified: targetVerified, isOnline: false },
          lastMessage:   "",
          lastMessageAt: "",
          unreadCount:   0,
          hasMedia:      false,
        }
      : cached
  );

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const currentUserIdRef                  = useRef(currentUserId);
  currentUserIdRef.current                = currentUserId;

  const realConversationIdRef = useRef<number | null>(null);

  const [notFound,    setNotFound]    = useState(false);
  const [nextCursor,  setNextCursor]  = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);
  const [loaded,      setLoaded]      = useState(isNew);

  // Keep isOnMessagesPage = true while in any conversation —
  // so messages from OTHER conversations still get delivered
  useEffect(() => {
    setOnMessagesPage(true);
    return () => setOnMessagesPage(false);
  }, []);

  // Tell the store which conversation is active
  useEffect(() => {
    if (isNew) return;
    setActiveConversationId(conversationId);
    setActiveConversation(conversationId);
    setStoreConversationId(conversationId);
    return () => {
      setActiveConversationId(null);
      setActiveConversation(null);
      setStoreConversationId(null);
      clearMessages();
    };
  }, [conversationId, setActiveConversationId, isNew]);

  useEffect(() => {
    const supabase = getBrowserClient();
    supabase.auth.getUser().then((res: any) => {
      if (res.data.user) setCurrentUserId(res.data.user.id);
    });
  }, []);

  useEffect(() => {
    if (isNew) return;

    async function load() {
      try {
        const [convoRes, msgsRes] = await Promise.all([
          conversation ? Promise.resolve(null) : fetch(`/api/conversations/${id}`),
          fetch(`/api/conversations/${id}/messages`),
        ]);

        if (convoRes) {
          if (convoRes.status === 404) { setNotFound(true); return; }
          if (convoRes.status === 401) { setTimeout(() => load(), 800); return; }
          if (!convoRes.ok) throw new Error("Failed to load conversation");
          const convoData = await convoRes.json();
          setConversation(convoData.conversation);
        }

        if (msgsRes.status === 401) { setTimeout(() => load(), 800); return; }
        if (!msgsRes.ok) throw new Error("Failed to load messages");
        const msgsData = await msgsRes.json();
        const fresh: Message[] = msgsData.messages ?? [];
        setMessages(fresh);
        setCachedMessages(conversationId, fresh);
        setNextCursor(msgsData.nextCursor ?? null);
        setHasMore(!!msgsData.nextCursor);
      } catch {
        if (!conversation) setNotFound(true);
      } finally {
        setLoaded(true);
      }
    }

    load();
  }, [id, isNew]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const convId = realConversationIdRef.current ?? conversationId;
      const res    = await fetch(`/api/conversations/${convId}/messages?cursor=${encodeURIComponent(nextCursor)}`);
      if (!res.ok) return;
      const data   = await res.json();
      const older: Message[] = data.messages ?? [];
      if (older.length === 0) { setHasMore(false); return; }
      setMessages((prev) => [...older, ...prev]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(!!data.nextCursor);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, loadingMore, hasMore, nextCursor]);

  const handleClearMessages = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  if (notFound) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#4A4A6A", fontFamily: "'Inter',sans-serif" }}>
        Conversation not found
      </div>
    );
  }

  if (!loaded || !conversation || !currentUserId) {
    return <div style={{ height: "100%", backgroundColor: "#0A0A0F" }} />;
  }

  return (
    <ChatPanel
      conversation={conversation}
      currentUserId={currentUserId}
      onBack={() => router.push("/messages")}
      onClearMessages={handleClearMessages}
      onLoadMore={loadMore}
      hasMore={hasMore}
      loadingMore={loadingMore}
      realConversationIdRef={realConversationIdRef}
    />
  );
}