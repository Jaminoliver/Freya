"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { getBrowserClient } from "@/lib/supabase/browserClient";
import { useRouter } from "next/navigation";
import { ChatPanel } from "@/components/messages/ChatPanel";
import { useMessagesContext } from "@/lib/context/MessagesContext";
import { useConversations, setActiveConversation, setMessageDispatcher } from "@/app/(main)/messages/page";
import type { Conversation, Message } from "@/lib/types/messages";

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();
  const conversationId = parseInt(id, 10);

  const { conversations } = useConversations();
  const { setActiveConversationId, registerMessageHandler, unregisterMessageHandler, setTypingConversationId } = useMessagesContext();
  const typingTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setTypingRef     = useRef(setTypingConversationId);
  setTypingRef.current   = setTypingConversationId;

  // ✅ Try to get conversation instantly from sidebar cache
  const cached = conversations.find((c) => c.id === conversationId) ?? null;

  const [conversation,  setConversation]  = useState<Conversation | null>(cached);
  const [currentUserId, setCurrentUserId] = useState<string>("me");
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [notFound,  setNotFound]  = useState(false);

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

  // ✅ Load messages only — conversation already available from cache
  useEffect(() => {
    async function load() {
      try {
        const [convoRes, msgsRes] = await Promise.all([
          // Only fetch conversation if not in cache
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
        setMessages(msgsData.messages ?? []);
      } catch {
        if (!conversation) setNotFound(true);
      }
    }

    load();
  }, [id]);

  const handleNewMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  useEffect(() => {
    registerMessageHandler(handleNewMessage);
    setMessageDispatcher(handleNewMessage);
    return () => {
      unregisterMessageHandler();
      setMessageDispatcher(null);
    };
  }, [handleNewMessage, registerMessageHandler, unregisterMessageHandler]);

  useEffect(() => {
    const supabase = getBrowserClient();
    const channel  = supabase.channel(`typing:${conversationId}`);
    channel
      .on("broadcast", { event: "typing" }, (payload: any) => {
        if (payload.payload?.userId === currentUserIdRef.current) return;
        setTypingRef.current(conversationId);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setTypingRef.current(null), 2000);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  if (notFound) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#4A4A6A", fontFamily: "'Inter',sans-serif" }}>
        Conversation not found
      </div>
    );
  }

  // ✅ Render immediately if we have conversation from cache — messages stream in
  if (!conversation) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", backgroundColor: "#0A0A0F" }}>
        <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #2A2A3D", borderTopColor: "#8B5CF6", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <ChatPanel
      conversation={conversation}
      messages={messages}
      onBack={() => router.push("/messages")}
      onNewMessage={handleNewMessage}
      currentUserId={currentUserId}
    />
  );
}