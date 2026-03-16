"use client";

import { useRef, useCallback } from "react";
import { sendTypingEvent } from "@/app/(main)/messages/page";

interface UseTypingIndicatorProps {
  conversationId: number;
  currentUserId:  string;
}

export function useTypingIndicator({ conversationId, currentUserId }: UseTypingIndicatorProps) {
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendTyping = useCallback(() => {
    if (throttleRef.current) return;
    sendTypingEvent(conversationId, currentUserId);
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
    }, 1000);
  }, [conversationId, currentUserId]);

  return { sendTyping };
}