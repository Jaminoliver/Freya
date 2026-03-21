"use client";

import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessagesSidebar } from "@/components/messages/MessagesSidebar";
import { MessagesProvider, useMessagesContext } from "@/lib/context/MessagesContext";
import { useConversations, useTypingConversations, setOnMessagesPage } from "@/app/(main)/messages/page";
import type { Conversation } from "@/lib/types/messages";

function MessagesLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inChat   = pathname !== "/messages";
  const { conversations, setConversations } = useConversations();
  const { typingConversationId } = useMessagesContext();
  const typingConversations = useTypingConversations();

  useEffect(() => {
    setOnMessagesPage(true);
    return () => setOnMessagesPage(false);
  }, []);

  useEffect(() => {
    if (!inChat) {
      fetch("/api/conversations/deliver-all", { method: "PATCH" }).catch(() => {});
    }
  }, [inChat]);

  const handleNewConversation = useCallback((conv: Conversation) => {
    setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);
  }, [setConversations]);

  return (
    <div
      style={{
        display:         "flex",
        height:          "100%",
        backgroundColor: "#0A0A0F",
        overflow:        "hidden",
        width:           "100%",
        fontFamily:      "'Inter', sans-serif",
        boxSizing:       "border-box",
      }}
    >
      <style>{`
        .main-scroll { padding-top: 0 !important; }
        .msg-sidebar-wrap {
          display: flex;
          width: 380px;
          flex-shrink: 0;
          height: 100%;
        }
        .msg-chat-wrap {
          display: flex;
          flex: 1;
          flex-direction: column;
          overflow: hidden;
          height: 100%;
          min-height: 0;
        }
        @media (max-width: 767px) {
          .msg-sidebar-wrap {
            display: ${inChat ? "none" : "flex"} !important;
            width: 100% !important;
          }
          .msg-chat-wrap {
            display: ${inChat ? "flex" : "none"} !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div className="msg-sidebar-wrap">
        <MessagesSidebar
          conversations={conversations}
          activeId={null}
          onNewConversation={handleNewConversation}
          typingConversations={typingConversations}
        />
      </div>

      <div className="msg-chat-wrap">
        {children}
      </div>
    </div>
  );
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <MessagesProvider>
      <MessagesLayoutInner>{children}</MessagesLayoutInner>
    </MessagesProvider>
  );
}