"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, Bell, Pin, Images, Search, MoreVertical, Flag } from "lucide-react";
import { Sparkles } from "lucide-react";
import { useMessagesContext } from "@/lib/context/MessagesContext";
import { useTypingIndicator } from "@/lib/hooks/useTypingIndicator";
import { useTypingConversations } from "@/app/(main)/messages/page";
import { updateConversations, clearCachedMessages } from "@/app/(main)/messages/page";
import { useUpload } from "@/lib/context/UploadContext";
import { ChatHeader } from "@/components/messages/ChatHeader";
import { MessagesList } from "@/components/messages/MessagesList";
import { MessageInput } from "@/components/messages/MessageInput";
import { ReportModal } from "@/components/messages/ReportModal";
import type { Conversation, Message } from "@/lib/types/messages";

interface Props {
  conversation:     Conversation;
  messages:         Message[];
  onBack:           () => void;
  onNewMessage:     (message: Message) => void;
  onClearMessages?: () => void;
  currentUserId?:   string;
  onLoadMore?:      () => void;
  hasMore?:         boolean;
  loadingMore?:     boolean;
}

export function ChatPanel({
  conversation,
  messages: initialMessages,
  onBack,
  onNewMessage,
  onClearMessages,
  currentUserId = "me",
  onLoadMore,
  hasMore,
  loadingMore,
}: Props) {
  const { participant } = conversation;
  const router          = useRouter();
  const handleBack      = () => router.push("/messages");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [reportOpen,   setReportOpen]   = useState(false);
  const [sending,      setSending]      = useState(false);
  const [replyTo,      setReplyTo]      = useState<Message | null>(null);
  const [messages,     setMessages]     = useState<Message[]>(initialMessages);

  const { startMessageUpload, uploads } = useUpload();

  // Restore in-progress uploads as optimistic messages when returning to this chat
  useEffect(() => {
    const inProgress = uploads.filter(
      (u) => u._isMessage && u._conversationId === conversation.id && (u.phase === "uploading" || u.phase === "processing")
    );
    if (inProgress.length === 0) return;

    setMessages((prev) => {
      let updated = [...prev];
      for (const u of inProgress) {
        const alreadyExists = updated.some((m) => m.tempId === u._tempId);
        if (alreadyExists) continue;
        updated.push({
          id:             Date.now() + Math.random(),
          conversationId: conversation.id,
          senderId:       currentUserId,
          type:           u._isPPV ? "ppv" : "media",
          text:           u._content || undefined,
          mediaUrls:      [],
          createdAt:      new Date().toISOString(),
          isRead:         false,
          status:         "sending",
          uploadProgress: u.progress,
          tempId:         u._tempId,
          ...(u._isPPV && u._ppvPrice ? {
            ppv: { price: u._ppvPrice, isUnlocked: true, unlockedCount: 0 },
          } : {}),
        } as Message);
      }
      return updated;
    });
  }, [uploads, conversation.id, currentUserId]);

  // FIX 1: Properly sync server messages without skipping updates on existing messages
  useEffect(() => {
    setMessages((prev) => {
      const pending = prev.filter((m) => m.status === "sending" || m.status === "failed");
      const stillPending = pending.filter(
        (p) => !initialMessages.some((c) => c.tempId === p.tempId || c.id === p.id)
      );
      return [...initialMessages, ...stillPending];
    });
  }, [initialMessages]);

  const { setTypingConversationId } = useMessagesContext();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { sendTyping } = useTypingIndicator({ conversationId: conversation.id, currentUserId });
  const typingConversations = useTypingConversations();
  const isTyping = typingConversations.has(conversation.id);

  useEffect(() => {
    if (isTyping) setTypingConversationId(conversation.id);
    else setTypingConversationId(null);
  }, [isTyping, conversation.id, setTypingConversationId]);

  useEffect(() => {
    updateConversations((prev) =>
      prev.map((c) => c.id === conversation.id ? { ...c, unreadCount: 0 } : c)
    );
    fetch(`/api/conversations/${conversation.id}/read`, { method: "PATCH" }).catch(() => {});
  }, [conversation.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleTyping = useCallback(() => sendTyping(), [sendTyping]);

  const handleSend = useCallback(async (text: string, mediaFiles?: File[], ppvPrice?: number) => {
    if (sending) return; // only blocks if previous send hasn't even started yet

    if (mediaFiles && mediaFiles.length > 0) {
      const tempId = `temp_${Date.now()}_${Math.random()}`;

      const blobItems = mediaFiles.map((file) => ({
        url:  URL.createObjectURL(file),
        type: file.type.startsWith("video/") ? "video" as const : "image" as const,
      }));

      const optimisticMessage: Message = {
        id:             Date.now(),
        conversationId: conversation.id,
        senderId:       currentUserId,
        type:           ppvPrice ? "ppv" : "media",
        text:           text.trim() || undefined,
        mediaUrls:      blobItems.map((b) => b.type === "video" ? `${b.url}#video` : b.url),
        createdAt:      new Date().toISOString(),
        isRead:         false,
        status:         "sending",
        uploadProgress: 0,
        tempId,
        ...(ppvPrice ? {
          ppv: {
            price:         ppvPrice * 100,
            isUnlocked:    true,
            unlockedCount: 0,
          },
        } : {}),
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      startMessageUpload({
        files:          mediaFiles,
        conversationId: conversation.id,
        content:        text.trim() || undefined,
        isPPV:          !!ppvPrice,
        ppvPrice:       ppvPrice ? ppvPrice * 100 : undefined,
        tempId,
        onProgress: (progress) => {
          setMessages((prev) =>
            prev.map((m) => m.tempId === tempId ? { ...m, uploadProgress: progress } : m)
          );
        },
        onSent: (serverMessage) => {
          blobItems.forEach((b) => URL.revokeObjectURL(b.url));
          setMessages((prev) =>
            prev.map((m) =>
              m.tempId === tempId
                ? { ...serverMessage, status: "sent" as const }
                : m
            )
          );
          onNewMessage(serverMessage);
          updateConversations((prev) =>
            prev.map((c) =>
              c.id === conversation.id
                ? { ...c, lastMessage: text || "📷 Media", lastMessageAt: new Date().toISOString() }
                : c
            )
          );
        },
        onError: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.tempId === tempId ? { ...m, status: "failed" as const } : m
            )
          );
        },
      });

    } else if (text.trim()) {
      const tempId = `temp_text_${Date.now()}_${Math.random()}`;
      const savedReplyToId = replyTo?.id ?? null;
      setReplyTo(null);

      const optimisticMessage: Message = {
        id:             Date.now(),
        conversationId: conversation.id,
        senderId:       currentUserId,
        type:           "text",
        text:           text.trim(),
        createdAt:      new Date().toISOString(),
        isRead:         false,
        status:         "sending",
        tempId,
        replyToId:      savedReplyToId,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      updateConversations((prev) =>
        prev.map((c) =>
          c.id === conversation.id
            ? { ...c, lastMessage: text.trim(), lastMessageAt: new Date().toISOString() }
            : c
        )
      );

      try {
        const res  = await fetch(`/api/conversations/${conversation.id}/messages`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ content: text.trim(), reply_to_id: savedReplyToId }),
        });
        const data = await res.json();
        if (data.message) {
          setMessages((prev) =>
            prev.map((m) =>
              m.tempId === tempId
                ? { ...data.message, status: "sent" as const, tempId, isDelivered: m.isDelivered ?? false }
                : m
            )
          );
          onNewMessage(data.message);
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.tempId === tempId ? { ...m, status: "failed" as const } : m
            )
          );
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.tempId === tempId ? { ...m, status: "failed" as const } : m
          )
        );
      } finally {
        setSending(false);
      }
    }
  }, [sending, conversation.id, currentUserId, replyTo, startMessageUpload, onNewMessage]);

  const wrappedOnNewMessage = useCallback((message: Message) => {
    onNewMessage(message);
    if (message.senderId !== currentUserId) {
      updateConversations((prev) =>
        prev.map((c) => c.id === conversation.id ? { ...c, unreadCount: 0 } : c)
      );
      fetch(`/api/conversations/${conversation.id}/read`, { method: "PATCH" }).catch(() => {});
    }
  }, [onNewMessage, currentUserId, conversation.id]);

  const handleMessagesUpdate = useCallback((updater: (msgs: Message[]) => Message[]) => {
    setMessages((prev) => updater(prev));
  }, []);

  const menuItems = [
    { icon: Star,   label: "Favourite",    action: () => setDropdownOpen(false) },
    { icon: Bell,   label: "Notifications", action: () => setDropdownOpen(false) },
    { icon: Pin,    label: "Pin chat",      action: () => setDropdownOpen(false) },
    { icon: Images, label: "Gallery",       action: () => setDropdownOpen(false) },
    { icon: Search, label: "Find in chat",  action: () => setDropdownOpen(false) },
    { icon: Flag,   label: "Report",        action: () => { setDropdownOpen(false); setReportOpen(true); }, danger: true },
  ];

  return (
    <>
      <style>{`
        @keyframes dropdownIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .chat-panel-dropdown { animation: dropdownIn 0.15s ease forwards; }
        .chat-desktop-header { display: flex; }
        @media (max-width: 767px) { .chat-desktop-header { display: none !important; } }
        .chat-panel-root {
          display: flex; flex-direction: column; height: 100%; max-height: 100%;
          background-color: #0A0A0F; font-family: 'Inter', sans-serif;
          position: relative; overflow: hidden;
        }
        @media (max-width: 767px) {
          .chat-panel-root {
            position: fixed !important; top: 0 !important; left: 0 !important;
            right: 0 !important; bottom: 0 !important; height: 100% !important;
            max-height: 100% !important; z-index: 100;
            padding-top: env(safe-area-inset-top, 0px);
            padding-bottom: env(safe-area-inset-bottom, 0px);
            box-sizing: border-box;
          }
        }
      `}</style>

      {reportOpen && (
        <ReportModal
          context="message"
          username={participant.username}
          reportedUserId={participant.id}
          onClose={() => setReportOpen(false)}
        />
      )}

      <div className="chat-panel-root">
        <ChatHeader
          conversation={conversation}
          onBack={onBack}
          onMessagesCleared={() => { clearCachedMessages(conversation.id); onClearMessages?.(); setMessages([]); }}
        />

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
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onMessagesUpdate={handleMessagesUpdate}
        />
        <MessageInput
          onSend={handleSend}
          onTyping={handleTyping}
          disabled={false}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
    </>
  );
}