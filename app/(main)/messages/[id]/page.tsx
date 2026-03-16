"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { getBrowserClient } from "@/lib/supabase/browserClient";
import { useRouter } from "next/navigation";
import { ChatPanel } from "@/components/messages/ChatPanel";
import { useMessagesContext } from "@/lib/context/MessagesContext";
import { useConversations, setActiveConversation, setMessageDispatcher, setCachedMessages, appendCachedMessage } from "@/app/(main)/messages/page";
import type { Conversation, Message } from "@/lib/types/messages";

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();
  const conversationId = parseInt(id, 10);

  const { conversations } = useConversations();
  const { setActiveConversationId, registerMessageHandler, unregisterMessageHandler, setTypingConversationId } = useMessagesContext();

  const cached = conversations.find((c) => c.id === conversationId) ?? null;

  const [conversation,  setConversation]  = useState<Conversation | null>(cached);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  // ✅ Start empty — column-reverse means no scroll jump, messages appear at bottom instantly
  const [messages, setMessages] = useState<Message[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setActiveConversationId(conversationId);
    setActiveConversation(conversationId);
    return () => {
      setActiveConversationId(null);
      setActiveConversation(null);
    };
  }, [conversationId, setActiveConversationId]);

  useEffect(() => {
    const supabase = getBrowserClient();
    supabase.auth.getUser().then((res: any) => {
      if (res.data.user) setCurrentUserId(res.data.user.id);
    });
  }, []);

  // ✅ Fetch latest messages — update cache + state silently
  useEffect(() => {
    async function load() {
      try {
        const [convoRes, msgsRes] = await Promise.all([
          conversation ? Promise.resolve(null) : fetch(`/api/conversations/${id}`),
          fetch(`/api/conversations/${id}/messages`),
        ]);

        if (convoRes) {
          if (convoRes.status === 404) { setNotFound(true); return; }
          if (!convoRes.ok) throw new Error("Failed to load");
          const convoData = await convoRes.json();
          setConversation(convoData.conversation);
        }

        if (!msgsRes.ok) throw new Error("Failed to load messages");
        const msgsData = await msgsRes.json();
        const fresh: Message[] = msgsData.messages ?? [];
        setMessages(fresh);
        setCachedMessages(conversationId, fresh);
        setNextCursor(msgsData.nextCursor ?? null);
        setHasMore(!!msgsData.nextCursor);
      } catch {
        if (!conversation) setNotFound(true);
      }
    }

    load();
  }, [id]);

  // ✅ Load older messages when user scrolls to top
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/conversations/${id}/messages?cursor=${encodeURIComponent(nextCursor)}`);
      if (!res.ok) return;
      const data = await res.json();
      const older: Message[] = data.messages ?? [];
      if (older.length === 0) {
        setHasMore(false);
        return;
      }
      setMessages((prev) => [...older, ...prev]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(!!data.nextCursor);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [id, loadingMore, hasMore, nextCursor]);

  const handleNewMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
    appendCachedMessage(conversationId, message);
  }, [conversationId]);

  useEffect(() => {
    registerMessageHandler(handleNewMessage);
    setMessageDispatcher(handleNewMessage);
    return () => {
      unregisterMessageHandler();
      setMessageDispatcher(null);
    };
  }, [handleNewMessage, registerMessageHandler, unregisterMessageHandler]);

  if (notFound) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#4A4A6A", fontFamily: "'Inter',sans-serif" }}>
        Conversation not found
      </div>
    );
  }

  if (!conversation || !currentUserId || messages.length === 0) {
    return (
      <div style={{ height: "100%", backgroundColor: "#0A0A0F" }} />
    );
  }

  return (
    <ChatPanel
      conversation={conversation}
      messages={messages}
      onBack={() => router.push("/messages")}
      onNewMessage={handleNewMessage}
      currentUserId={currentUserId}
      onLoadMore={loadMore}
      hasMore={hasMore}
      loadingMore={loadingMore}
    />
  );
}