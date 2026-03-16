"use client";

import { useEffect, useRef, useCallback } from "react";
import { getBrowserClient } from "@/lib/supabase/browserClient";

interface UseTypingIndicatorProps {
  conversationId: number;
  currentUserId:  string;
}

export function useTypingIndicator({ conversationId, currentUserId }: UseTypingIndicatorProps) {
  const channelRef  = useRef<any>(null);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    // ✅ Get existing channel — Supabase returns the same instance for same name
    const channel = supabase.channel(`typing:${conversationId}`);
    channelRef.current = channel;

    return () => {
      // ✅ Do NOT unsubscribe — global subscription in messages/page.tsx owns this channel
      if (throttleRef.current) clearTimeout(throttleRef.current);
      channelRef.current = null;
    };
  }, [conversationId]);

  const sendTyping = useCallback(() => {
    if (!channelRef.current || throttleRef.current) return;
    channelRef.current.send({
      type:    "broadcast",
      event:   "typing",
      payload: { userId: currentUserId },
    });
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
    }, 1000);
  }, [currentUserId]);

  return { sendTyping };
}