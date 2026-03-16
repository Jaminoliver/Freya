"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, Bell, Pin, Images, Search, MoreVertical, Flag } from "lucide-react";
import { Sparkles } from "lucide-react";
import { useMessagesContext } from "@/lib/context/MessagesContext";
import { useTypingIndicator } from "@/lib/hooks/useTypingIndicator";
import { useTypingConversations } from "@/app/(main)/messages/page";
import { ChatHeader } from "@/components/messages/ChatHeader";
import { MessagesList } from "@/components/messages/MessagesList";
import { MessageInput } from "@/components/messages/MessageInput";
import { ReportModal } from "@/components/messages/ReportModal";
import type { Conversation, Message } from "@/lib/types/messages";

interface Props {
  conversation:   Conversation;
  messages:       Message[];
  onBack:         () => void;
  onNewMessage:   (message: Message) => void;
  currentUserId?: string;
}

export function ChatPanel({ conversation, messages, onBack, onNewMessage, currentUserId = "me" }: Props) {
  const { participant } = conversation;
  const router = useRouter();
  const handleBack = () => router.push("/messages");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [reportOpen,   setReportOpen]   = useState(false);
  const [sending,      setSending]      = useState(false);
  const [replyTo,      setReplyTo]      = useState<Message | null>(null);

  const { setTypingConversationId } = useMessagesContext();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Send typing via hook, receive from global
  const { sendTyping } = useTypingIndicator({ conversationId: conversation.id, currentUserId });
  const typingConversations = useTypingConversations();
  const isTyping = typingConversations.has(conversation.id);

  // Sync typing state to context for desktop header indicator
  useEffect(() => {
    if (isTyping) setTypingConversationId(conversation.id);
    else setTypingConversationId(null);
  }, [isTyping, conversation.id, setTypingConversationId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleTyping = useCallback(() => {
    sendTyping();
  }, [sendTyping]);

  const handleSend = async (text: string, mediaFiles?: File[], ppvPrice?: number) => {
    if (sending) return;
    setSending(true);
    setReplyTo(null);
    try {
      if (mediaFiles && mediaFiles.length > 0) {
        const formData = new FormData();
        formData.append("file", mediaFiles[0]);
        if (text.trim()) formData.append("content", text.trim());
        const endpoint = ppvPrice
          ? `/api/conversations/${conversation.id}/messages/ppv`
          : `/api/conversations/${conversation.id}/messages/media`;
        if (ppvPrice) formData.append("price", String(ppvPrice));
        const res  = await fetch(endpoint, { method: "POST", body: formData });
        const data = await res.json();
        if (data.message) wrappedOnNewMessage(data.message);
      } else if (text.trim()) {
        const res  = await fetch(`/api/conversations/${conversation.id}/messages`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            content:     text.trim(),
            reply_to_id: replyTo?.id ?? null,
          }),
        });
        const data = await res.json();
        if (data.message) wrappedOnNewMessage(data.message);
      }
    } finally {
      setSending(false);
    }
  };

  const wrappedOnNewMessage = useCallback((message: Message) => {
    onNewMessage(message);
  }, [onNewMessage]);

  const menuItems = [
    { icon: Star,   label: "Favourite",     action: () => setDropdownOpen(false) },
    { icon: Bell,   label: "Notifications",  action: () => setDropdownOpen(false) },
    { icon: Pin,    label: "Pin chat",       action: () => setDropdownOpen(false) },
    { icon: Images, label: "Gallery",        action: () => setDropdownOpen(false) },
    { icon: Search, label: "Find in chat",   action: () => setDropdownOpen(false) },
    { icon: Flag,   label: "Report",         action: () => { setDropdownOpen(false); setReportOpen(true); }, danger: true },
  ];

  return (
    <>
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chat-panel-dropdown { animation: dropdownIn 0.15s ease forwards; }
        .chat-desktop-header { display: flex; }
        @media (max-width: 767px) { .chat-desktop-header { display: none !important; } }
      `}</style>

      {reportOpen && (
        <ReportModal
          context="message"
          username={participant.username}
          reportedUserId={participant.id}
          onClose={() => setReportOpen(false)}
        />
      )}

      {/* ✅ height: 100% instead of 100dvh — stays inside the chat column */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "100%", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", position: "relative", overflow: "hidden" }}>
        <ChatHeader conversation={conversation} onBack={onBack} />

        {/* Desktop inline header */}
        <div
          className="chat-desktop-header"
          style={{ alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: "56px", flexShrink: 0, backgroundColor: "#0D0D1A", borderBottom: "1px solid #1E1E2E", fontFamily: "'Inter', sans-serif", touchAction: "none", userSelect: "none" }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
            <button onClick={handleBack}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: "4px", borderRadius: "6px", transition: "color 0.15s ease", flexShrink: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
            >
              <ArrowLeft size={20} strokeWidth={1.8} />
            </button>

            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", backgroundColor: "#2A2A3D" }}>
                {participant.avatarUrl ? (
                  <img src={participant.avatarUrl} alt={participant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontSize: "16px", fontWeight: 700 }}>
                    {participant.name[0].toUpperCase()}
                  </div>
                )}
              </div>
              {participant.isOnline && (
                <div style={{ position: "absolute", bottom: "1px", right: "1px", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10B981", border: "2px solid #0D0D1A" }} />
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap" }}>{participant.name}</span>
                {participant.isVerified && <Sparkles size={14} color="#8B5CF6" strokeWidth={1.8} />}
              </div>
              {isTyping ? (
                <span style={{ fontSize: "12px", color: "#8B5CF6", whiteSpace: "nowrap" }}>typing...</span>
              ) : participant.isOnline ? (
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#10B981", flexShrink: 0 }} />
                  <span style={{ fontSize: "12px", color: "#10B981", whiteSpace: "nowrap" }}>Available now</span>
                </div>
              ) : null}
            </div>
          </div>

          <div ref={dropdownRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              style={{ background: "none", border: "none", cursor: "pointer", color: dropdownOpen ? "#8B5CF6" : "#A3A3C2", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px", transition: "all 0.15s ease", backgroundColor: dropdownOpen ? "rgba(139,92,246,0.1)" : "transparent" }}
              onMouseEnter={(e) => { if (!dropdownOpen) { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "#1C1C2E"; }}}
              onMouseLeave={(e) => { if (!dropdownOpen) { e.currentTarget.style.color = "#A3A3C2"; e.currentTarget.style.backgroundColor = "transparent"; }}}
            >
              <MoreVertical size={20} strokeWidth={1.8} />
            </button>

            {dropdownOpen && (
              <div className="chat-panel-dropdown" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "12px", padding: "6px", minWidth: "180px", zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                {menuItems.map(({ icon: Icon, label, action, danger }: any) => (
                  <button key={label} onClick={action}
                    style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: "transparent", color: danger ? "#EF4444" : "#FFFFFF", fontSize: "14px", fontFamily: "'Inter', sans-serif", textAlign: "left", transition: "background-color 0.15s ease" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <Icon size={15} color={danger ? "#EF4444" : "#A3A3C2"} strokeWidth={1.8} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <MessagesList
          messages={messages}
          conversation={conversation}
          currentUserId={currentUserId}
          isTyping={isTyping}
          onReply={(msg) => setReplyTo(msg)}
        />
        <MessageInput
          onSend={handleSend}
          onTyping={handleTyping}
          disabled={sending}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
    </>
  );
}