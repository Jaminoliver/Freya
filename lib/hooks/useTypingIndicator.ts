"use client";

import { useRef, useCallback } from "react";
import { sendTypingEvent, useTypingConversations } from "@/app/(main)/messages/page";

interface UseTypingIndicatorProps {
  conversationId:       number;
  currentUserId:        string;
  realConversationIdRef?: React.MutableRefObject<number | null>;
}

export function useTypingIndicator({
  conversationId,
  currentUserId,
  realConversationIdRef,
}: UseTypingIndicatorProps) {
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const typingConversations = useTypingConversations();

  // Use the real conversation ID if available (new chats start as 0)
  const effectiveId = realConversationIdRef?.current ?? conversationId;
  const isTyping    = typingConversations.has(effectiveId);

  const sendTyping = useCallback(() => {
    if (throttleRef.current) return;
    const id = realConversationIdRef?.current ?? conversationId;
    if (id === 0) return; // no conversation yet
    sendTypingEvent(id, currentUserId);
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
    }, 1000);
  }, [conversationId, currentUserId, realConversationIdRef]);

  return { sendTyping, isTyping };
}