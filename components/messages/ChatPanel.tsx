"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, Bell, Pin, Images, Search, MoreVertical, Flag, Eraser, X } from "lucide-react";
import { Sparkles } from "lucide-react";
import { useMessagesContext } from "@/lib/context/MessagesContext";
import { useTypingIndicator } from "@/lib/hooks/useTypingIndicator";
import { updateConversations, clearCachedMessages, subscribeTypingForConversation } from "@/app/(main)/messages/page";
import { useMessageStore } from "@/lib/store/messageStore";
import { useUpload } from "@/lib/context/UploadContext";
import { ChatHeader } from "@/components/messages/ChatHeader";
import { ConversationActionModal } from "@/components/messages/ConversationActionModal";
import { MessagesList } from "@/components/messages/MessagesList";
import { MessageInput } from "@/components/messages/MessageInput";
import { ReportModal } from "@/components/messages/ReportModal";
import type { Conversation, Message } from "@/lib/types/messages";

interface Props {
  conversation:           Conversation;
  currentUserId:          string;
  onBack:                 () => void;
  onClearMessages?:       () => void;
  onLoadMore?:            () => void;
  hasMore?:               boolean;
  loadingMore?:           boolean;
  realConversationIdRef:  React.MutableRefObject<number | null>;
  onConversationCreated?: (realId: number) => void;
}

const DOTS_PATTERN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='2' cy='2' r='1.2' fill='rgba(255,255,255,0.12)'/%3E%3C/svg%3E")`;

export function ChatPanel({
  conversation,
  currentUserId,
  onBack,
  onClearMessages,
  onLoadMore,
  hasMore,
  loadingMore,
  realConversationIdRef,
  onConversationCreated,
}: Props) {
  const { participant } = conversation;
  const router          = useRouter();
  const handleBack      = () => router.push("/messages");

  const { messages, setMessages, appendMessage } = useMessageStore();

  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [reportOpen,    setReportOpen]    = useState(false);
  const [confirmClear,  setConfirmClear]  = useState(false);
  const [sending,       setSending]       = useState(false);
  const [replyTo,       setReplyTo]       = useState<Message | null>(null);
  const [avatarOpen,    setAvatarOpen]    = useState(false);

  const { startMessageUpload, uploads } = useUpload();

  // Sync in-progress uploads into store
  useEffect(() => {
    const inProgress = uploads.filter(
      (u) => u._isMessage && u._conversationId === conversation.id &&
        (u.phase === "uploading" || u.phase === "processing")
    );
    if (inProgress.length === 0) return;

    setMessages((prev) => {
      let updated = [...prev];
      for (const u of inProgress) {
        if (updated.some((m) => m.tempId === u._tempId)) continue;
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

  const { setTypingConversationId } = useMessagesContext();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { sendTyping, isTyping } = useTypingIndicator({
    conversationId:       conversation.id,
    currentUserId,
    realConversationIdRef,
  });

  useEffect(() => {
    if (isTyping) setTypingConversationId(conversation.id);
    else setTypingConversationId(null);
  }, [isTyping, conversation.id, setTypingConversationId]);

  // Close avatar lightbox on Escape
  useEffect(() => {
    if (!avatarOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setAvatarOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [avatarOpen]);

  // Mark conversation as read on mount
  useEffect(() => {
    if (conversation.id === 0) return;
    updateConversations((prev) =>
      prev.map((c) => c.id === conversation.id ? { ...c, unreadCount: 0 } : c)
    );
    fetch(`/api/conversations/${conversation.id}/read`, { method: "PATCH" }).catch(() => {});
  }, [conversation.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleTyping = useCallback(() => sendTyping(), [sendTyping]);

  const handleDelete = useCallback(async (message: Message, deleteFor: "me" | "everyone") => {
    const convId = conversation.id;
    if (convId === 0) return;

    if (deleteFor === "me") {
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
    } else {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? { ...m, text: "This message was deleted", type: "text" as const, mediaUrls: [], isDeleted: true }
            : m
        )
      );
    }

    try {
      const res = await fetch(`/api/conversations/${convId}/messages/${message.id}`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ deleteFor }),
      });
      if (!res.ok) {
        setMessages((prev) => {
          if (deleteFor === "me") {
            return [...prev, message].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          }
          return prev.map((m) => m.id === message.id ? message : m);
        });
      }
    } catch {
      setMessages((prev) => {
        if (deleteFor === "me") {
          return [...prev, message].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }
        return prev.map((m) => m.id === message.id ? message : m);
      });
    }
  }, [conversation.id, setMessages]);

  const handleSend = useCallback(async (text: string, mediaFiles?: File[], ppvPrice?: number) => {
    if (sending) return;

    if (mediaFiles && mediaFiles.length > 0) {
      const tempId    = `temp_${Date.now()}_${Math.random()}`;
      const blobItems = mediaFiles.map((file) => ({
        url:  URL.createObjectURL(file),
        type: file.type.startsWith("video/") ? "video" as const : "image" as const,
      }));

      const optimistic: Message = {
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
        ...(ppvPrice ? { ppv: { price: ppvPrice * 100, isUnlocked: true, unlockedCount: 0 } } : {}),
      };
      appendMessage(optimistic);

      startMessageUpload({
        files: mediaFiles, conversationId: conversation.id, content: text.trim() || undefined,
        isPPV: !!ppvPrice, ppvPrice: ppvPrice ? ppvPrice * 100 : undefined, tempId,
        onProgress: (progress) => {
          setMessages((prev) => prev.map((m) => m.tempId === tempId ? { ...m, uploadProgress: progress } : m));
        },
        onSent: (serverMessage) => {
          blobItems.forEach((b) => URL.revokeObjectURL(b.url));
          setMessages((prev) => prev.map((m) => m.tempId === tempId ? { ...serverMessage, status: "sent" as const } : m));
          updateConversations((prev) => prev.map((c) =>
            c.id === conversation.id ? { ...c, lastMessage: text || "📷 Media", lastMessageAt: new Date().toISOString() } : c
          ));
        },
        onError: () => {
          setMessages((prev) => prev.map((m) => m.tempId === tempId ? { ...m, status: "failed" as const } : m));
        },
      });

    } else if (text.trim()) {
      const tempId         = `temp_text_${Date.now()}_${Math.random()}`;
      const savedReplyToId = replyTo?.id ?? null;
      setReplyTo(null);

      const optimistic: Message = {
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
      appendMessage(optimistic);

      try {
        let convId = realConversationIdRef.current ?? conversation.id;

        // Lazily create conversation on first message send
        if (convId === 0) {
          const createRes  = await fetch("/api/conversations", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ targetUserId: conversation.participant.id }),
          });
          const createData = await createRes.json();
          convId                        = createData.conversationId;
          realConversationIdRef.current = convId;

          // Sync store so realtime MSG INSERT handler routes messages correctly
          useMessageStore.getState().setConversationId(convId);

          // Subscribe typing channel for new conversation so indicators work immediately
          subscribeTypingForConversation(convId);

          // Notify parent so it updates conversation state + URL
          onConversationCreated?.(convId);

          // Prepend to conversation list — triggers AnimatePresence slide-in
          updateConversations((prev) => {
            if (prev.some((c) => c.id === convId)) return prev;
            return [{
              ...conversation,
              id:            convId,
              lastMessage:   text.trim(),
              lastMessageAt: new Date().toISOString(),
              unreadCount:   0,
            }, ...prev];
          });
        }

        const res  = await fetch(`/api/conversations/${convId}/messages`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ content: text.trim(), reply_to_id: savedReplyToId }),
        });
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => prev.map((m) =>
            m.tempId === tempId ? { ...data.message, status: "sent" as const, tempId } : m
          ));
          // Update last message preview in conversation list
          updateConversations((prev) => prev.map((c) =>
            c.id === convId ? { ...c, lastMessage: text.trim(), lastMessageAt: new Date().toISOString() } : c
          ));
        } else {
          setMessages((prev) => prev.map((m) => m.tempId === tempId ? { ...m, status: "failed" as const } : m));
        }
      } catch {
        setMessages((prev) => prev.map((m) => m.tempId === tempId ? { ...m, status: "failed" as const } : m));
      } finally {
        setSending(false);
      }
    }
  }, [sending, conversation, currentUserId, replyTo, startMessageUpload, appendMessage, setMessages, realConversationIdRef]);

  const handleMessagesUpdate = useCallback((updater: (msgs: Message[]) => Message[]) => {
    setMessages((prev) => updater(prev));
  }, [setMessages]);

  const menuItems = [
    { icon: Star,   label: "Favourite",     action: () => setDropdownOpen(false) },
    { icon: Bell,   label: "Notifications", action: () => setDropdownOpen(false) },
    { icon: Pin,    label: "Pin chat",      action: () => setDropdownOpen(false) },
    { icon: Images, label: "Gallery",       action: () => { setDropdownOpen(false); router.push(`/messages/${conversation.id}/gallery`); } },
    { icon: Search, label: "Find in chat",  action: () => setDropdownOpen(false) },
    { icon: Eraser, label: "Clear chat",    action: () => { setDropdownOpen(false); setConfirmClear(true); }, danger: false },
    { icon: Flag,   label: "Report",        action: () => { setDropdownOpen(false); setReportOpen(true); }, danger: true },
  ];

  const showStatus = isTyping || participant.isOnline;

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
        .chat-messages-wall {
          flex: 1; min-height: 0; display: flex; flex-direction: column;
          overflow: hidden; background-color: #0D0D18;
          background-image: ${DOTS_PATTERN}; background-size: 20px 20px;
        }
        .desktop-header-name { transition: transform 0.2s ease; }
        .desktop-header-name--up { transform: translateY(-2px); }
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-4px); opacity: 1; }
        }
        .typing-dot {
          width: 4px; height: 4px; border-radius: 50%;
          background-color: #8B5CF6; display: inline-block;
          animation: typing-bounce 1.2s infinite ease-in-out;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes avatarFadeIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        .avatar-lightbox-inner { animation: avatarFadeIn 0.2s ease forwards; }
      `}</style>

      {/* Clear chat confirmation */}
      {confirmClear && (
        <div
          onClick={() => setConfirmClear(false)}
          style={{ position: "fixed", inset: 0, zIndex: 998, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "16px", padding: "24px", width: "300px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", fontFamily: "'Inter', sans-serif" }}>
            <p style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>Clear chat?</p>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#A3A3C2" }}>This will clear all messages for you. This can't be undone.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setConfirmClear(false)}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #2A2A3D", backgroundColor: "transparent", color: "#A3A3C2", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setConfirmClear(false);
                  try {
                    await fetch(`/api/conversations/${conversation.id}`, { method: "DELETE" });
                    updateConversations((prev) =>
                      prev.filter((c) => c.id !== conversation.id)
                    );
                    clearCachedMessages(conversation.id);
                    setMessages([]);
                    onClearMessages?.();
                    onBack();
                  } catch (err) { console.error("[ChatPanel] clear error:", err); }
                }}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", backgroundColor: "#EF4444", color: "#FFFFFF", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar lightbox */}
      {avatarOpen && (
        <div
          onClick={() => setAvatarOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 999, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div className="avatar-lightbox-inner" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
            {participant.avatarUrl ? (
              <img src={participant.avatarUrl} alt={participant.name} style={{ width: "280px", height: "280px", borderRadius: "50%", objectFit: "cover", border: "3px solid #2A2A3D" }} />
            ) : (
              <div style={{ width: "280px", height: "280px", borderRadius: "50%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "80px", fontWeight: 700, color: "#FFFFFF" }}>
                {participant.name[0].toUpperCase()}
              </div>
            )}
            <button
              onClick={() => setAvatarOpen(false)}
              style={{ position: "absolute", top: "-12px", right: "-12px", width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <X size={16} color="#A3A3C2" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}

      {reportOpen && (
        <ReportModal
          context="message"
          username={participant.username}
          reportedUserId={participant.id}
          onClose={() => setReportOpen(false)}
        />
      )}

      <div className="chat-panel-root">
        {/* Mobile header */}
        <ChatHeader
          conversation={conversation}
          onBack={onBack}
          isTyping={isTyping}
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

            <div
              style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}
              onClick={() => setAvatarOpen(true)}
            >
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

            <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 }}>
              <div
                className={`desktop-header-name${showStatus ? " desktop-header-name--up" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}
                onClick={() => router.push(`/${participant.username}`)}
              >
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap" }}>{participant.name}</span>
                {participant.isVerified && <Sparkles size={14} color="#8B5CF6" strokeWidth={1.8} />}
              </div>

              {isTyping ? (
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                  <span style={{ fontSize: "12px", color: "#8B5CF6", whiteSpace: "nowrap" }}>typing...</span>
                </div>
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

        <div className="chat-messages-wall">
          <MessagesList
            messages={messages}
            conversation={conversation}
            currentUserId={currentUserId}
            isTyping={isTyping}
            onReply={(msg) => setReplyTo(msg)}
            onDelete={handleDelete}
            onLoadMore={onLoadMore}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onMessagesUpdate={handleMessagesUpdate}
          />
        </div>

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