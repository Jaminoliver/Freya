"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link2, BellOff, Star, Trash2, Eraser, ShieldOff, Ban, Flag } from "lucide-react";
import { FavouritesModal } from "@/components/messages/FavouritesModal";

interface Participant {
  id:         string;
  name:       string;
  username:   string;
  avatarUrl?: string | null;
  role?:      string;
}

interface Props {
  conversationId:  number;
  participant:     Participant;
  isBlocked:       boolean;
  isRestricted:    boolean;
  onClose:         () => void;
  onClearChat:     () => void;
  onDeleteChat:    () => void;
  onBlock:         () => void;
  onUnblock:       () => void;
  onRestrict:      () => void;
  onUnrestrict:    () => void;
  onReport:        () => void;
  x?:              number;
  y?:              number;
}

export function ChatActionModal({
  conversationId,
  participant,
  isBlocked,
  isRestricted,
  onClose,
  onClearChat,
  onDeleteChat,
  onBlock,
  onUnblock,
  onRestrict,
  onUnrestrict,
  onReport,
  x = 0,
  y = 0,
}: Props) {
  const [pos, setPos] = useState({ top: -9999, left: -9999 });
  const [confirmAction, setConfirmAction] = useState<null | "clear" | "delete">(null);
  const [showFavourites, setShowFavourites] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const restrictDormant = isBlocked;

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const pad = 10;
    let left = x - rect.width - 40;
    let top = y;

    if (top + rect.height + pad > window.innerHeight) {
      top = y - rect.height;
    }

    if (left < pad) left = pad;
    if (left + rect.width + pad > window.innerWidth) left = window.innerWidth - rect.width - pad;
    if (top < pad) top = pad;

    setPos({ top, left });
  }, [x, y]);

  const showFavouritesRef = useRef(false);
  showFavouritesRef.current = showFavourites;

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (showFavouritesRef.current) return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (showFavouritesRef.current) return;
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${participant.username}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    } else {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    onClose();
  };

  const menuItems: {
    icon: React.ReactNode;
    label: string;
    danger: boolean;
    warn: boolean;
    dormant: boolean;
    action: (() => void) | undefined;
  }[] = [
    { icon: <Link2    size={15} strokeWidth={1.6} />, label: "Copy link to profile", danger: false, warn: false, dormant: false, action: handleCopyLink },
    { icon: <BellOff  size={15} strokeWidth={1.6} />, label: "Mute notifications",  danger: false, warn: false, dormant: false, action: onClose },
    { icon: <Star     size={15} strokeWidth={1.6} />, label: "Favourites",           danger: false, warn: false, dormant: false, action: () => setShowFavourites(true) },
    { icon: <Trash2   size={15} strokeWidth={1.6} />, label: "Delete chat",          danger: false, warn: false, dormant: false, action: () => setConfirmAction("delete") },
    { icon: <Eraser   size={15} strokeWidth={1.6} />, label: "Clear chat",           danger: false, warn: false, dormant: false, action: () => setConfirmAction("clear") },
    {
      icon: <ShieldOff size={15} strokeWidth={1.6} />,
      label: isRestricted ? "Unrestrict" : "Restrict",
      danger: false,
      warn: !restrictDormant,
      dormant: restrictDormant,
      action: restrictDormant ? undefined : () => { onClose(); isRestricted ? onUnrestrict() : onRestrict(); },
    },
    {
      icon: <Ban size={15} strokeWidth={1.6} />,
      label: isBlocked ? "Unblock" : "Block",
      danger: true,
      warn: false,
      dormant: false,
      action: () => { onClose(); isBlocked ? onUnblock() : onBlock(); },
    },
    {
      icon: <Flag size={15} strokeWidth={1.6} />,
      label: "Report",
      danger: true,
      warn: false,
      dormant: false,
      action: () => { onClose(); onReport(); },
    },
  ];

  const dangerStart = menuItems.findIndex((m) => m.danger || m.warn);

  const getColor = (item: typeof menuItems[number]) => {
    if (item.dormant) return "#3A3A4D";
    if (item.danger) {
      if (item.label === "Unblock") return "#10B981";
      return "#EF4444";
    }
    if (item.warn) {
      if (item.label === "Unrestrict") return "#10B981";
      return "#F59E0B";
    }
    return "rgba(255,255,255,0.85)";
  };

  const getIconColor = (item: typeof menuItems[number]) => {
    if (item.dormant) return "#3A3A4D";
    if (item.danger) {
      if (item.label === "Unblock") return "#10B981";
      return "#EF4444";
    }
    if (item.warn) {
      if (item.label === "Unrestrict") return "#10B981";
      return "#F59E0B";
    }
    return "rgba(255,255,255,0.4)";
  };

  return createPortal(
    <>
      <style>{`
        @keyframes _chatCtxPop {
          0%   { opacity: 0; transform: scale(0.85); }
          60%  { opacity: 1; transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
        .chat-ctx-popup {
          animation: _chatCtxPop 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards;
          transform-origin: top right;
        }
        .chat-ctx-popup::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 14px;
          background: rgba(8, 8, 18, 0.88);
          -webkit-backdrop-filter: blur(32px);
          backdrop-filter: blur(32px);
          z-index: -1;
        }
        .chat-ctx-item:hover { background-color: rgba(255,255,255,0.05) !important; }
        .chat-ctx-item:active { background-color: rgba(255,255,255,0.08) !important; }
      `}</style>

      <div onMouseDown={() => { if (!showFavouritesRef.current) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 500 }} />

      <div
        ref={ref}
        className="chat-ctx-popup"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          zIndex: 501,
          backgroundColor: "transparent",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          fontFamily: "'Inter', sans-serif",
          width: "230px",
          overflow: "hidden",
        }}
      >
        {/* User info */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "#2A2A3D" }}>
            {participant.avatarUrl
              ? <img src={participant.avatarUrl} alt={participant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: "13px", fontWeight: 700 }}>{participant.name[0].toUpperCase()}</div>
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{participant.name}</p>
            <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#8B5CF6" }}>@{participant.username}</p>
          </div>
        </div>

        {/* Confirm clear / delete */}
        {confirmAction ? (
          <div style={{ padding: "14px" }}>
            <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>
              {confirmAction === "delete" ? "Delete chat?" : "Clear chat?"}
            </p>
            <p style={{ margin: "0 0 12px", fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
              {confirmAction === "delete"
                ? "This conversation will be permanently deleted."
                : "Messages will be cleared for you only."}
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setConfirmAction(null)}
                onTouchEnd={() => setConfirmAction(null)}
                style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={() => { confirmAction === "delete" ? onDeleteChat() : onClearChat(); onClose(); }}
                onTouchEnd={(e) => { e.preventDefault(); confirmAction === "delete" ? onDeleteChat() : onClearChat(); onClose(); }}
                style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", backgroundColor: confirmAction === "delete" ? "#EF4444" : "#8B5CF6", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
              >
                {confirmAction === "delete" ? "Delete" : "Clear"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: "6px 0" }}>
            {menuItems.map((item, i) => {
              const isFirstDanger = i === dangerStart;
              return (
                <div key={item.label}>
                  {isFirstDanger && <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "4px 0" }} />}
                  <button
                    className="chat-ctx-item"
                    onClick={() => { if (!item.dormant && item.action) item.action(); }}
                    onTouchEnd={(e) => { e.preventDefault(); if (!item.dormant && item.action) item.action(); }}
                    disabled={item.dormant}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      width: "100%",
                      padding: "9px 14px",
                      background: "none",
                      border: "none",
                      cursor: item.dormant ? "default" : "pointer",
                      color: getColor(item),
                      fontSize: "13px",
                      fontFamily: "'Inter', sans-serif",
                      textAlign: "left",
                      opacity: item.dormant ? 0.35 : 1,
                    }}
                  >
                    <span style={{ color: getIconColor(item), display: "flex", flexShrink: 0 }}>{item.icon}</span>
                    {item.label}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showFavourites && (
        <FavouritesModal
          conversationId={conversationId}
          participantAvatarUrl={participant.avatarUrl}
          onClose={() => { setShowFavourites(false); onClose(); }}
        />
      )}
    </>,
    document.body!
  );
}