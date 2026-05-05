"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowLeft, X, MoreVertical, Images, Mic } from "lucide-react";
import { Sparkles } from "lucide-react";
import { ChatActionModal } from "@/components/messages/ChatActionModal";
import { ReportModal } from "@/components/messages/ReportModal";
import BlockConfirmModal from "@/components/ui/BlockConfirmModal";
import { useBlockRestrict } from "@/lib/hooks/useBlockRestrict";
import { updateConversations, blockConversation } from "@/app/(main)/messages/page";
import { useMessageStore } from "@/lib/store/messageStore";
import type { Conversation } from "@/lib/types/messages";
import { useCreatorStory } from "@/lib/hooks/useCreatorStory";
import { AvatarWithStoryRing } from "@/components/ui/AvatarWithStoryRing";
import StoryViewer from "@/components/story/StoryViewer";

interface Props {
  conversation:       Conversation;
  onBack:             () => void;
  onMessagesCleared?: () => void;
  isTyping?:          boolean;
  isRecording?:       boolean;
  onSelectMode?:      () => void;
}

export function ChatHeader({ conversation, onBack, onMessagesCleared, isTyping = false, isRecording = false, onSelectMode }: Props) {
  const { participant } = conversation;
  const router = useRouter();
  const { setMessages } = useMessageStore();

  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const { group, hasStory, hasUnviewed, refresh } = useCreatorStory(participant.id);
  const [modalOpen,         setModalOpen]         = useState(false);
const [modalPos,          setModalPos]          = useState({ x: 0, y: 0 });
const [reportOpen,        setReportOpen]        = useState(false);
const [avatarOpen,        setAvatarOpen]        = useState(false);
const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
const [avatarDropdownPos,  setAvatarDropdownPos]  = useState({ top: 0, left: 0 });
const avatarWrapRef = useRef<HTMLDivElement>(null);
  const [blockConfirm,      setBlockConfirm]      = useState(false);
  const [unblockConfirm,    setUnblockConfirm]    = useState(false);
  const [restrictConfirm,   setRestrictConfirm]   = useState(false);
  const [unrestrictConfirm, setUnrestrictConfirm] = useState(false);

  const {
    isBlocked, isRestricted,
    block, unblock, restrict, unrestrict,
    fetchStatus,
  } = useBlockRestrict({ userId: participant.id });

  const menuBtnRef    = useRef<HTMLButtonElement>(null);

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasStory) { setAvatarOpen(true); return; }
    if (avatarWrapRef.current) {
      const rect = avatarWrapRef.current.getBoundingClientRect();
      const dropdownWidth          = 190;
      const dropdownHeightEstimate = 100;
      const padding                = 8;
      let top  = rect.bottom + 8;
      let left = rect.left;
      if (left + dropdownWidth > window.innerWidth - padding) left = window.innerWidth - dropdownWidth - padding;
      if (left < padding) left = padding;
      if (top + dropdownHeightEstimate > window.innerHeight - padding) top = window.innerHeight - dropdownHeightEstimate - padding;
      if (top < padding) top = padding;
      setAvatarDropdownPos({ top, left });
    }
    setAvatarDropdownOpen(true);
  };

  const handleOpenModal = () => {
    fetchStatus();
    if (menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect();
      setModalPos({ x: rect.right, y: rect.bottom + 6 });
    }
    setModalOpen(true);
  };

  const handleClearChat = useCallback(async () => {
    updateConversations((prev) =>
      prev.map((c) => c.id === conversation.id ? { ...c, lastMessage: "" } : c)
    );
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

  useEffect(() => {
    if (!avatarDropdownOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setAvatarDropdownOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [avatarDropdownOpen]);

  const showStatus = isRecording || isTyping || participant.isOnline;

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
        @keyframes rec-wave { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
        .rec-bar { display: inline-block; width: 2px; height: 10px; background-color: #EF4444; border-radius: 1px; transform-origin: center; animation: rec-wave 0.9s ease-in-out infinite; }
        .rec-bar:nth-child(2) { animation-delay: 0.12s; }
        .rec-bar:nth-child(3) { animation-delay: 0.24s; }
        .rec-bar:nth-child(4) { animation-delay: 0.36s; }
        @keyframes rec-mic-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.7; } }
        .rec-mic { animation: rec-mic-pulse 1.4s ease-in-out infinite; color: #EF4444; }
        .header-icon-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 8px; border-radius: 8px; transition: all 0.15s ease; color: #A3A3C2; }
        .header-icon-btn:hover { color: #FFFFFF; background-color: #1C1C2E; }
        @keyframes _avatarCtxPop {
          0%   { opacity: 0; transform: scale(0.88) translateY(-6px); }
          60%  { opacity: 1; transform: scale(1.02) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .avatar-ctx-popup { animation: _avatarCtxPop 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards; transform-origin: top left; }
        .avatar-ctx-popup::before { content: ''; position: absolute; inset: 0; border-radius: 14px; background: rgba(8,8,18,0.88); -webkit-backdrop-filter: blur(32px); backdrop-filter: blur(32px); z-index: -1; }
        .avatar-ctx-item:hover  { background-color: rgba(255,255,255,0.05) !important; }
        .avatar-ctx-item:active { background-color: rgba(255,255,255,0.08) !important; }
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
          onSelectMode={onSelectMode}
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
          backgroundColor: "var(--background)",
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

          <div ref={avatarWrapRef} style={{ position: "relative", flexShrink: 0 }}>
            {storyViewerOpen && group && (
              <StoryViewer groups={[group]} startGroupIndex={0} onClose={() => { setStoryViewerOpen(false); refresh(); }} />
            )}
            <AvatarWithStoryRing
              src={participant.avatarUrl ?? null}
              alt={participant.name}
              size={36}
              hasStory={hasStory}
              hasUnviewed={hasUnviewed}
              borderColor="var(--background)"
              onClick={handleAvatarClick}
            />
            {participant.isOnline && (
              <div style={{ position: "absolute", bottom: "1px", right: "1px", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10B981", border: "2px solid var(--background)", zIndex: 10 }} />
            )}
          </div>

          {avatarDropdownOpen && typeof document !== "undefined" && createPortal(
            <>
              <div onMouseDown={() => setAvatarDropdownOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 500 }} />
              <div
                className="avatar-ctx-popup"
                style={{ position: "fixed", top: avatarDropdownPos.top, left: avatarDropdownPos.left, zIndex: 501, backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", fontFamily: "'Inter', sans-serif", width: "190px", overflow: "hidden" }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div style={{ padding: "6px 0" }}>
                  {[
                    { label: "View story",         action: () => { setAvatarDropdownOpen(false); setStoryViewerOpen(true); } },
                    { label: "View profile photo", action: () => { setAvatarDropdownOpen(false); setAvatarOpen(true); } },
                  ].map((item) => (
                    <button
                      key={item.label}
                      className="avatar-ctx-item"
                      onClick={item.action}
                      onTouchEnd={(e) => { e.preventDefault(); item.action(); }}
                      style={{ display: "flex", alignItems: "center", width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.85)", fontSize: "13px", fontFamily: "'Inter', sans-serif", textAlign: "left", letterSpacing: "0.01em", transition: "background-color 0.12s ease" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </>,
            document.body
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: 0, overflow: "hidden" }}>
            <div className={`chat-header-name${showStatus ? " chat-header-name--up" : ""}`} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", minWidth: 0 }} onClick={() => router.push(`/${participant.username}`)}>
              <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "calc(100vw - 200px)" }}>{participant.name}</span>
              {participant.isVerified && <Sparkles size={14} color="#8B5CF6" strokeWidth={1.8} style={{ flexShrink: 0 }} />}
            </div>
            {isRecording ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Mic size={12} strokeWidth={2} className="rec-mic" />
                <div style={{ display: "flex", gap: "2px", alignItems: "center", height: "12px" }}>
                  <span className="rec-bar" /><span className="rec-bar" /><span className="rec-bar" /><span className="rec-bar" />
                </div>
                <span style={{ fontSize: "12px", color: "#EF4444", whiteSpace: "nowrap", fontWeight: 600 }}>recording...</span>
              </div>
            ) : isTyping ? (
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