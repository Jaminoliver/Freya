"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { getBrowserClient } from "@/lib/supabase/browserClient";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatPanel } from "@/components/messages/ChatPanel";
import { useMessagesContext } from "@/lib/context/MessagesContext";
import {
  useConversations,
  setActiveConversation,
  setMessageDispatcher,
  setCachedMessages,
  appendCachedMessage,
  updateConversations,
} from "@/app/(main)/messages/page";
import type { Conversation, Message } from "@/lib/types/messages";

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }      = use(params);
  const router      = useRouter();
  const searchParams = useSearchParams();
  const isNew       = id === "new";

  const targetUserId   = searchParams.get("targetUserId");
  const targetName     = searchParams.get("name") ?? "Unknown";
  const targetUser     = searchParams.get("username") ?? "";
  const targetAvatar   = searchParams.get("avatar") ?? null;
  const targetVerified = searchParams.get("verified") === "1";

  const conversationId = isNew ? 0 : parseInt(id, 10);

  const { conversations } = useConversations();
  const { setActiveConversationId, registerMessageHandler, unregisterMessageHandler } = useMessagesContext();

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
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  const realConversationIdRef = useRef<number | null>(null);

  const [messages,    setMessages]    = useState<Message[]>([]);
  const [notFound,    setNotFound]    = useState(false);
  const [nextCursor,  setNextCursor]  = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);
  const [loaded,      setLoaded]      = useState(isNew);

  useEffect(() => {
    if (isNew) return;
    setActiveConversationId(conversationId);
    setActiveConversation(conversationId);
    return () => {
      setActiveConversationId(null);
      setActiveConversation(null);
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
      const res = await fetch(`/api/conversations/${convId}/messages?cursor=${encodeURIComponent(nextCursor)}`);
      if (!res.ok) return;
      const data = await res.json();
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

  const handleNewMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      if ((message as any)._isStatusUpdate) {
        return prev.map((m) => {
          if (m.id !== message.id) return m;

          // Deleted
          if ((message as any).isDeleted) {
            return { ...m, text: "This message was deleted", type: "text" as const, mediaUrls: [], isDeleted: true };
          }

          // PPV thumbnail/media patch — update thumbnailUrl and mediaUrls if provided
          if (message.type === "ppv") {
            return {
              ...m,
              thumbnailUrl: message.thumbnailUrl ?? m.thumbnailUrl,
              mediaUrls:    message.mediaUrls?.length ? message.mediaUrls : m.mediaUrls,
              isDelivered:  message.isDelivered ?? m.isDelivered,
              isRead:       message.isRead ?? m.isRead,
              ppv:          message.ppv ?? m.ppv,
            };
          }

          // Default: patch delivery/read status
          return { ...m, isDelivered: message.isDelivered, isRead: message.isRead };
        });
      }

      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });

    if (!(message as any)._isStatusUpdate) {
      const convId = realConversationIdRef.current ?? conversationId;
      appendCachedMessage(convId, message);
    }
  }, [conversationId]);

  const handleClearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    registerMessageHandler(handleNewMessage);
    setMessageDispatcher(handleNewMessage);
    return () => {
      unregisterMessageHandler();
      setMessageDispatcher(null);
    };
  }, [handleNewMessage, registerMessageHandler, unregisterMessageHandler]);

  const handleFirstMessage = useCallback(async (content: string): Promise<number | null> => {
    if (!targetUserId) return null;
    try {
      const convoRes  = await fetch("/api/conversations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ targetUserId }),
      });
      const convoData = await convoRes.json();
      if (!convoData.conversationId) return null;
      const newId: number = convoData.conversationId;
      realConversationIdRef.current = newId;

      const msgRes  = await fetch(`/api/conversations/${newId}/messages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content }),
      });
      const msgData = await msgRes.json();
      if (!msgData.message) return null;

      const freshRes  = await fetch(`/api/conversations/${newId}`);
      const freshData = await freshRes.json();
      if (freshData.conversation) {
        updateConversations((prev) => {
          if (prev.some((c) => c.id === newId)) return prev;
          return [freshData.conversation, ...prev];
        });
        setConversation(freshData.conversation);
      }

      setActiveConversationId(newId);
      setActiveConversation(newId);
      window.history.replaceState(null, "", `/messages/${newId}`);

      setMessages((prev) =>
        prev.map((m) =>
          m.status === "sending"
            ? { ...msgData.message, status: "sent" as const }
            : m
        )
      );

      return newId;
    } catch {
      return null;
    }
  }, [targetUserId, setActiveConversationId]);

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
      messages={messages}
      onBack={() => router.push("/messages")}
      onNewMessage={handleNewMessage}
      onClearMessages={handleClearMessages}
      currentUserId={currentUserId}
      onLoadMore={loadMore}
      hasMore={hasMore}
      loadingMore={loadingMore}
    />
  );
}