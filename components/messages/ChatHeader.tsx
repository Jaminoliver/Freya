"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, MoreVertical, Images } from "lucide-react";
import { Sparkles } from "lucide-react";
import { ChatActionModal } from "@/components/messages/ChatActionModal";
import { ReportModal } from "@/components/messages/ReportModal";
import BlockConfirmModal from "@/components/ui/BlockConfirmModal";
import { useBlockRestrict } from "@/lib/hooks/useBlockRestrict";
import { clearCachedMessages, updateConversations, blockConversation } from "@/app/(main)/messages/page";
import { useMessageStore } from "@/lib/store/messageStore";
import type { Conversation } from "@/lib/types/messages";

interface Props {
  conversation:       Conversation;
  onBack:             () => void;
  onMessagesCleared?: () => void;
  isTyping?:          boolean;
}

export function ChatHeader({ conversation, onBack, onMessagesCleared, isTyping = false }: Props) {
  const { participant } = conversation;
  const router = useRouter();
  const { setMessages } = useMessageStore();

  const [modalOpen,         setModalOpen]         = useState(false);
  const [modalPos,          setModalPos]          = useState({ x: 0, y: 0 });
  const [reportOpen,        setReportOpen]        = useState(false);
  const [avatarOpen,        setAvatarOpen]        = useState(false);
  const [blockConfirm,      setBlockConfirm]      = useState(false);
  const [unblockConfirm,    setUnblockConfirm]    = useState(false);
  const [restrictConfirm,   setRestrictConfirm]   = useState(false);
  const [unrestrictConfirm, setUnrestrictConfirm] = useState(false);

  const {
    isBlocked, isRestricted,
    block, unblock, restrict, unrestrict,
    fetchStatus,
  } = useBlockRestrict({ userId: participant.id });

  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const handleOpenModal = () => {
    fetchStatus();
    if (menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect();
      setModalPos({ x: rect.right, y: rect.bottom + 6 });
    }
    setModalOpen(true);
  };

  const handleClearChat = useCallback(async () => {
    // Update client state immediately
    updateConversations((prev) =>
      prev.map((c) => c.id === conversation.id ? { ...c, lastMessage: "" } : c)
    );
    clearCachedMessages(conversation.id);
    setMessages([]);
    onMessagesCleared?.();

    try {
      await fetch(`/api/conversations/${conversation.id}/clear`, { method: "PATCH" });
    } catch (err) {
      console.error("[ChatHeader] clear chat error:", err);
    }
  }, [conversation.id, onMessagesCleared, setMessages]);

  const handleDeleteChat = useCallback(async () => {
    blockConversation(conversation.id);
    updateConversations((prev) =>
      prev.filter((c) => c.id !== conversation.id)
    );
    clearCachedMessages(conversation.id);
    setMessages([]);
    onBack();

    try {
      await Promise.all([
        fetch(`/api/conversations/${conversation.id}`, { method: "DELETE" }),
        fetch(`/api/favourites/chatlists/by-conversation/${conversation.id}`, { method: "DELETE" }),
      ]);
      window.dispatchEvent(new Event("favourites-updated"));
    } catch (err) {
      console.error("[ChatHeader] delete chat error:", err);
    }
  }, [conversation.id, onBack, setMessages]);

  const handleBlock = useCallback(async () => {
    await block();
    onBack();
  }, [block, onBack]);

  const handleRestrict = useCallback(async () => {
    await restrict();
    onBack();
  }, [restrict, onBack]);

  useEffect(() => {
    if (!avatarOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setAvatarOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [avatarOpen]);

  const showStatus = isTyping || participant.isOnline;

  return (
    <>
      <style>{`
        @media (min-width: 768px) { .chat-header-mobile { display: none !important; } }
        .chat-header-name { transition: transform 0.2s ease; }
        .chat-header-name--up { transform: translateY(-2px); }
        @keyframes avatarFadeIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        .avatar-lightbox-inner { animation: avatarFadeIn 0.2s ease forwards; }
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-4px); opacity: 1; }
        }
        .typing-dot { width: 4px; height: 4px; border-radius: 50%; background-color: #8B5CF6; display: inline-block; animation: typing-bounce 1.2s infinite ease-in-out; }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.3s; }
        .header-icon-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 8px; border-radius: 8px; transition: all 0.15s ease; color: #A3A3C2; }
        .header-icon-btn:hover { color: #FFFFFF; background-color: #1C1C2E; }
      `}</style>

      {/* Avatar lightbox */}
      {avatarOpen && (
        <div onClick={() => setAvatarOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 999, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="avatar-lightbox-inner" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
            {participant.avatarUrl ? (
              <img src={participant.avatarUrl} alt={participant.name} style={{ width: "280px", height: "280px", borderRadius: "50%", objectFit: "cover", border: "3px solid #2A2A3D" }} />
            ) : (
              <div style={{ width: "280px", height: "280px", borderRadius: "50%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "80px", fontWeight: 700, color: "#FFFFFF" }}>
                {participant.name[0].toUpperCase()}
              </div>
            )}
            <button onClick={() => setAvatarOpen(false)} style={{ position: "absolute", top: "-12px", right: "-12px", width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={16} color="#A3A3C2" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}

      {/* Chat action modal */}
      {modalOpen && (
        <ChatActionModal
          conversationId={conversation.id}
          participant={participant}
          isBlocked={isBlocked}
          isRestricted={isRestricted}
          onClose={() => setModalOpen(false)}
          onClearChat={handleClearChat}
          onDeleteChat={handleDeleteChat}
          onBlock={() => setBlockConfirm(true)}
          onUnblock={() => setUnblockConfirm(true)}
          onRestrict={() => setRestrictConfirm(true)}
          onUnrestrict={() => setUnrestrictConfirm(true)}
          onReport={() => setReportOpen(true)}
          x={modalPos.x}
          y={modalPos.y}
        />
      )}

      {reportOpen && (
        <ReportModal context="message" username={participant.username} reportedUserId={participant.id} onClose={() => setReportOpen(false)} />
      )}

      <BlockConfirmModal isOpen={blockConfirm}      onClose={() => setBlockConfirm(false)}      onConfirm={handleBlock}    type="block"    username={participant.username} />
      <BlockConfirmModal isOpen={unblockConfirm}    onClose={() => setUnblockConfirm(false)}    onConfirm={unblock}        type="block"    username={participant.username} />
      <BlockConfirmModal isOpen={restrictConfirm}   onClose={() => setRestrictConfirm(false)}   onConfirm={handleRestrict} type="restrict" username={participant.username} />
      <BlockConfirmModal isOpen={unrestrictConfirm} onClose={() => setUnrestrictConfirm(false)} onConfirm={unrestrict}     type="restrict" username={participant.username} />

      {/* MOBILE ONLY — fixed to viewport */}
      <div
        className="chat-header-mobile"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", height: "56px", flexShrink: 0,
          backgroundColor: "#0D0D1A", borderBottom: "1px solid #1E1E2E",
          fontFamily: "'Inter', sans-serif",
          position: "fixed", top: 0, left: 0, right: 0,
          zIndex: 101,
          paddingTop: "env(safe-area-inset-top, 0px)",
          touchAction: "none", userSelect: "none",
        }}
      >
        {/* Left: back + avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1, overflow: "hidden" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: "4px", borderRadius: "6px", transition: "color 0.15s ease", flexShrink: 0 }} onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")} onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}>
            <ArrowLeft size={20} strokeWidth={1.8} />
          </button>

          <div style={{ position: "relative", flexShrink: 0, cursor: "pointer" }} onClick={() => setAvatarOpen(true)}>
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

          <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: 0, overflow: "hidden" }}>
            <div className={`chat-header-name${showStatus ? " chat-header-name--up" : ""}`} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", minWidth: 0 }} onClick={() => router.push(`/${participant.username}`)}>
              <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "calc(100vw - 200px)" }}>{participant.name}</span>
              {participant.isVerified && <Sparkles size={14} color="#8B5CF6" strokeWidth={1.8} style={{ flexShrink: 0 }} />}
            </div>
            {isTyping ? (
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
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

        {/* Right: media icon + 3-dot menu */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
          <button
            className="header-icon-btn"
            onClick={() => router.push(`/messages/${conversation.id}/gallery`)}
          >
            <Images size={20} strokeWidth={1.8} />
          </button>

          <button
            ref={menuBtnRef}
            className="header-icon-btn"
            onClick={handleOpenModal}
            style={{
              color: modalOpen ? "#8B5CF6" : undefined,
              backgroundColor: modalOpen ? "rgba(139,92,246,0.1)" : undefined,
            }}
          >
            <MoreVertical size={20} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </>
  );
}