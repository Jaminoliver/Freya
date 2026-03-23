"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, MoreVertical, Star, Bell, Pin, Images, Search, Eraser, Flag, Ban, ShieldOff } from "lucide-react";
import { Sparkles } from "lucide-react";
import { ReportModal } from "@/components/messages/ReportModal";
import BlockConfirmModal from "@/components/ui/BlockConfirmModal";
import { useBlockRestrict } from "@/lib/hooks/useBlockRestrict";
import { clearCachedMessages, updateConversations } from "@/app/(main)/messages/page";
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

  const [dropdownOpen,      setDropdownOpen]      = useState(false);
  const [reportOpen,        setReportOpen]        = useState(false);
  const [avatarOpen,        setAvatarOpen]        = useState(false);
  const [confirmClear,      setConfirmClear]      = useState(false);
  const [blockConfirm,      setBlockConfirm]      = useState(false);
  const [unblockConfirm,    setUnblockConfirm]    = useState(false);
  const [restrictConfirm,   setRestrictConfirm]   = useState(false);
  const [unrestrictConfirm, setUnrestrictConfirm] = useState(false);

  const {
    isBlocked, isRestricted,
    block, unblock, restrict, unrestrict,
    fetchStatus,
  } = useBlockRestrict({ userId: participant.id });

  const handleClearChat = useCallback(async () => {
    setConfirmClear(false);
    try {
      await fetch(`/api/conversations/${conversation.id}`, { method: "DELETE" });
      updateConversations((prev) =>
        prev.map((c) => c.id === conversation.id ? { ...c, lastMessage: "", lastMessageAt: c.lastMessageAt } : c)
      );
      clearCachedMessages(conversation.id);
      setMessages([]);
      onMessagesCleared?.();
    } catch (err) {
      console.error("[ChatHeader] clear chat error:", err);
    }
  }, [conversation.id, onMessagesCleared]);

  const handleBlock = useCallback(async () => {
    await block();
    onBack();
  }, [block, onBack]);

  const handleRestrict = useCallback(async () => {
    await restrict();
    onBack();
  }, [restrict, onBack]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!avatarOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setAvatarOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [avatarOpen]);

  const showStatus   = isTyping || participant.isOnline;
  const restrictDormant = isBlocked;

  const menuItems = [
    { icon: Star,      label: "Favourite",     action: () => setDropdownOpen(false),                                                           danger: false, warn: false, dormant: false },
    { icon: Bell,      label: "Notifications", action: () => setDropdownOpen(false),                                                           danger: false, warn: false, dormant: false },
    { icon: Pin,       label: "Pin chat",      action: () => setDropdownOpen(false),                                                           danger: false, warn: false, dormant: false },
    { icon: Images,    label: "Gallery",       action: () => { setDropdownOpen(false); router.push(`/messages/${conversation.id}/gallery`); }, danger: false, warn: false, dormant: false },
    { icon: Search,    label: "Find in chat",  action: () => setDropdownOpen(false),                                                           danger: false, warn: false, dormant: false },
    { icon: Eraser,    label: "Clear chat",    action: () => { setDropdownOpen(false); setConfirmClear(true); },                               danger: false, warn: false, dormant: false },
    {
      icon:    ShieldOff,
      label:   isRestricted ? "Unrestrict" : "Restrict",
      action:  restrictDormant ? undefined : () => { setDropdownOpen(false); isRestricted ? setUnrestrictConfirm(true) : setRestrictConfirm(true); },
      danger:  false,
      warn:    !restrictDormant,
      dormant: restrictDormant,
    },
    {
      icon:    Ban,
      label:   isBlocked ? "Unblock" : "Block",
      action:  () => { setDropdownOpen(false); isBlocked ? setUnblockConfirm(true) : setBlockConfirm(true); },
      danger:  true,
      warn:    false,
      dormant: false,
    },
    { icon: Flag, label: "Report", action: () => { setDropdownOpen(false); setReportOpen(true); }, danger: true, warn: false, dormant: false },
  ];

  return (
    <>
      <style>{`
        @keyframes dropdownIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .chat-dropdown { animation: dropdownIn 0.15s ease forwards; }
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

      {/* Clear chat confirmation */}
      {confirmClear && (
        <div onClick={() => setConfirmClear(false)} style={{ position: "fixed", inset: 0, zIndex: 998, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "16px", padding: "24px", width: "300px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", fontFamily: "'Inter', sans-serif" }}>
            <p style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>Clear chat?</p>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#A3A3C2" }}>This will clear all messages for you. This can't be undone.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setConfirmClear(false)} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #2A2A3D", backgroundColor: "transparent", color: "#A3A3C2", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Cancel</button>
              <button onClick={handleClearChat} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", backgroundColor: "#EF4444", color: "#FFFFFF", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Clear</button>
            </div>
          </div>
        </div>
      )}

      {reportOpen && (
        <ReportModal context="message" username={participant.username} reportedUserId={participant.id} onClose={() => setReportOpen(false)} />
      )}

      <BlockConfirmModal isOpen={blockConfirm}      onClose={() => setBlockConfirm(false)}      onConfirm={handleBlock}    type="block"    username={participant.username} />
      <BlockConfirmModal isOpen={unblockConfirm}    onClose={() => setUnblockConfirm(false)}    onConfirm={unblock}        type="block"    username={participant.username} />
      <BlockConfirmModal isOpen={restrictConfirm}   onClose={() => setRestrictConfirm(false)}   onConfirm={handleRestrict} type="restrict" username={participant.username} />
      <BlockConfirmModal isOpen={unrestrictConfirm} onClose={() => setUnrestrictConfirm(false)} onConfirm={unrestrict}     type="restrict" username={participant.username} />

      {/* MOBILE ONLY — fixed to viewport so keyboard can't push it */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
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

          <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 }}>
            <div className={`chat-header-name${showStatus ? " chat-header-name--up" : ""}`} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }} onClick={() => router.push(`/${participant.username}`)}>
              <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap" }}>{participant.name}</span>
              {participant.isVerified && <Sparkles size={14} color="#8B5CF6" strokeWidth={1.8} />}
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

        <div ref={dropdownRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => { setDropdownOpen((o) => !o); if (!dropdownOpen) fetchStatus(); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: dropdownOpen ? "#8B5CF6" : "#A3A3C2", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px", transition: "all 0.15s ease", backgroundColor: dropdownOpen ? "rgba(139,92,246,0.1)" : "transparent" }}
            onMouseEnter={(e) => { if (!dropdownOpen) { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "#1C1C2E"; }}}
            onMouseLeave={(e) => { if (!dropdownOpen) { e.currentTarget.style.color = "#A3A3C2"; e.currentTarget.style.backgroundColor = "transparent"; }}}
          >
            <MoreVertical size={20} strokeWidth={1.8} />
          </button>

          {dropdownOpen && (
            <div
              className="chat-dropdown"
              style={{ position: "fixed", top: "64px", right: "16px", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "12px", padding: "6px", minWidth: "190px", zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", maxHeight: "calc(100vh - 80px)", overflowY: "auto" }}
            >
              {menuItems.map(({ icon: Icon, label, action, danger, warn, dormant }) => (
                <button
                  key={label}
                  onClick={() => { if (!dormant && action) action(); }}
                  disabled={dormant}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px", width: "100%",
                    padding: "10px 12px", borderRadius: "8px", border: "none",
                    cursor: dormant ? "default" : "pointer",
                    backgroundColor: "transparent",
                    color: dormant
                      ? "#3A3A4D"
                      : danger
                        ? (label === "Unblock" ? "#10B981" : "#EF4444")
                        : warn
                          ? (label === "Unrestrict" ? "#10B981" : "#F59E0B")
                          : "#FFFFFF",
                    fontSize: "14px", fontFamily: "'Inter', sans-serif", textAlign: "left",
                    opacity: dormant ? 0.35 : 1,
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => { if (!dormant) e.currentTarget.style.backgroundColor = "#2A2A3D"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <Icon
                    size={15}
                    color={
                      dormant ? "#3A3A4D"
                      : danger ? (label === "Unblock" ? "#10B981" : "#EF4444")
                      : warn   ? (label === "Unrestrict" ? "#10B981" : "#F59E0B")
                      : "#A3A3C2"
                    }
                    strokeWidth={1.8}
                  />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}