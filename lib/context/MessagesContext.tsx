"use client";

import { createContext, useContext, useRef, useCallback, useState } from "react";
import type { Message } from "@/lib/types/messages";

interface MessagesContextValue {
  setActiveConversationId:  (id: number | null) => void;
  registerMessageHandler:   (handler: (msg: Message) => void) => void;
  unregisterMessageHandler: () => void;
  dispatchMessage:          (msg: Message) => void;
  setTypingConversationId:  (id: number | null) => void;
  typingConversationId:     number | null;
}

const MessagesContext = createContext<MessagesContextValue>({
  setActiveConversationId:  () => {},
  registerMessageHandler:   () => {},
  unregisterMessageHandler: () => {},
  dispatchMessage:          () => {},
  setTypingConversationId:  () => {},
  typingConversationId:     null,
});

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const activeConversationIdRef = useRef<number | null>(null);
  const messageHandlerRef       = useRef<((msg: Message) => void) | null>(null);
  const [typingConversationId, setTypingConversationId] = useState<number | null>(null);

  const setActiveConversationId = useCallback((id: number | null) => {
    activeConversationIdRef.current = id;
  }, []);

  const registerMessageHandler = useCallback((handler: (msg: Message) => void) => {
    messageHandlerRef.current = handler;
  }, []);

  const unregisterMessageHandler = useCallback(() => {
    messageHandlerRef.current = null;
  }, []);

  const dispatchMessage = useCallback((msg: Message) => {
    console.log("[Context] dispatchMessage called, conversationId:", msg.conversationId, "active:", activeConversationIdRef.current, "handler:", !!messageHandlerRef.current);
    if (
      messageHandlerRef.current &&
      msg.conversationId === activeConversationIdRef.current
    ) {
      console.log("[Context] dispatching to handler");
      messageHandlerRef.current(msg);
    }
  }, []);

  return (
    <MessagesContext.Provider value={{
      setActiveConversationId,
      registerMessageHandler,
      unregisterMessageHandler,
      dispatchMessage,
      setTypingConversationId,
      typingConversationId,
    }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessagesContext() {
  return useContext(MessagesContext);
}