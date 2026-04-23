"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Archive, ArchiveRestore, User, Pin, PinOff, MailOpen, Star, Trash2 } from "lucide-react";
import { updateConversations, blockConversation, addArchivedId, removeArchivedId } from "@/app/(main)/messages/page";
import { FavouritesModal } from "@/components/messages/FavouritesModal";
import { useNav } from "@/lib/hooks/useNav";

interface Participant {
  name:       string;
  username:   string;
  avatarUrl?: string | null;
}

interface Props {
  conversationId: number;
  participant:    Participant;
  isPinned?:      boolean;
  isArchived?:    boolean;
  onClose:        () => void;
  onCleared:      () => void;
  onArchived?:    () => void;
  x?:             number;
  y?:             number;
}

export function ConversationActionModal({
  conversationId, participant, isPinned = false, isArchived = false, onClose, onCleared, onArchived, x = 0, y = 0,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [showFavourites, setShowFavourites] = useState(false);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });
  const ref = useRef<HTMLDivElement>(null);
  const { navigate } = useNav();

  const handleViewProfile = () => {
    onClose();
    navigate(`/${participant.username}`);
  };

  const handleMarkUnread = async () => {
    updateConversations((prev) =>
      prev.map((c) => c.id === conversationId ? { ...c, unreadCount: Math.max(1, c.unreadCount) } : c)
    );
    onClose();
    try {
      await fetch(`/api/conversations/${conversationId}/unread`, { method: "PATCH" });
    } catch {}
  };

  const handlePin = async () => {
    const newPinned = !isPinned;
    updateConversations((prev) =>
      prev.map((c) => c.id === conversationId ? { ...c, isPinned: newPinned } : c)
    );
    onClose();
    try {
      await fetch(`/api/conversations/${conversationId}/pin`, { method: "PATCH" });
    } catch {
      updateConversations((prev) =>
        prev.map((c) => c.id === conversationId ? { ...c, isPinned: !newPinned } : c)
      );
    }
  };

  const handleArchive = async () => {
    if (isArchived) {
      // Remove from archived tracking so realtime/main list can accept it
      removeArchivedId(conversationId);
      // Optimistically remove from archived list
      updateConversations((prev) =>
        prev.filter((c) => c.id !== conversationId)
      );
      onClose();
      onArchived?.();
      try {
        await fetch(`/api/conversations/${conversationId}/archive`, { method: "PATCH" });
        // Fetch fresh conversation and push into main list
        const res = await fetch(`/api/conversations/${conversationId}`);
        const data = await res.json();
        if (data.conversation) {
          updateConversations((prev) => {
            if (prev.some((c) => c.id === conversationId)) return prev;
            return [{ ...data.conversation, isArchived: false }, ...prev];
          });
        }
        window.dispatchEvent(new CustomEvent("conversation-unarchived", { detail: { id: conversationId } }));
        window.dispatchEvent(new Event("conversations-updated"));
      } catch {}
    } else {
      // Archive
      addArchivedId(conversationId);
      updateConversations((prev) =>
        prev.filter((c) => c.id !== conversationId)
      );
      onClose();
      onArchived?.();
      try {
        await fetch(`/api/conversations/${conversationId}/archive`, { method: "PATCH" });
        window.dispatchEvent(new Event("conversations-updated"));
      } catch {
        try {
          const res = await fetch(`/api/conversations/${conversationId}`);
          const data = await res.json();
          if (data.conversation) {
            updateConversations((prev) => {
              if (prev.some((c) => c.id === conversationId)) return prev;
              return [data.conversation, ...prev];
            });
          }
        } catch {}
      }
    }
  };

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const pad  = 10;
    let left = x - rect.width;
    let top  = y;

    if (top + rect.height + pad > window.innerHeight) top = y - rect.height;
    if (left < pad) left = pad;
    if (left + rect.width + pad > window.innerWidth) left = window.innerWidth - rect.width - pad;
    if (top < pad) top = pad;

    setPos({ top, left });
  }, [x, y]);

  const showFavouritesRef = useRef(false);
  showFavouritesRef.current = showFavourites;

  useEffect(() => {
    const down = (e: MouseEvent) => { if (showFavouritesRef.current) return; if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const key  = (e: KeyboardEvent) => { if (showFavouritesRef.current) return; if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown",   key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [onClose]);

  const executeDelete = async () => {
    setLoading(true);
    blockConversation(conversationId);
    updateConversations((prev) =>
      prev.filter((c) => c.id !== conversationId)
    );
    onCleared();
    onClose();

    try {
      await Promise.all([
        fetch(`/api/conversations/${conversationId}`, { method: "DELETE" }),
        fetch(`/api/favourites/chatlists/by-conversation/${conversationId}`, { method: "DELETE" }),
      ]);
      window.dispatchEvent(new Event("favourites-updated"));
    } catch {}
  };

  const menuItems = [
    {
      icon:   isArchived ? <ArchiveRestore size={15} strokeWidth={1.6} /> : <Archive size={15} strokeWidth={1.6} />,
      label:  isArchived ? "Unarchive chat" : "Archive chat",
      danger: false,
      action: handleArchive,
    },
    { icon: <User     size={15} strokeWidth={1.6} />, label: "View profile",    danger: false, action: handleViewProfile },
    { icon: isPinned ? <PinOff size={15} strokeWidth={1.6} /> : <Pin size={15} strokeWidth={1.6} />, label: isPinned ? "Unpin chat" : "Pin chat", danger: false, action: handlePin },
    { icon: <MailOpen size={15} strokeWidth={1.6} />, label: "Mark as unread",  danger: false, action: handleMarkUnread },
    { icon: <Star     size={15} strokeWidth={1.6} />, label: "Favourites",      danger: false, action: () => setShowFavourites(true) },
    { icon: <Trash2   size={15} strokeWidth={1.6} />, label: "Delete chat",     danger: true,  action: () => setConfirm(true) },
  ];

  const dangerStart = menuItems.findIndex((m) => m.danger);

  return createPortal(
    <>
      <style>{`
        @keyframes _ctxPop {
          0%   { opacity: 0; transform: scale(0.85); }
          60%  { opacity: 1; transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
        .ctx-popup {
          animation: _ctxPop 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards;
          transform-origin: top left;
        }
        .ctx-popup::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 14px;
          background: rgba(8, 8, 18, 0.88);
          -webkit-backdrop-filter: blur(32px);
          backdrop-filter: blur(32px);
          z-index: -1;
        }
        .ctx-item:hover { background-color: rgba(255,255,255,0.05) !important; }
        .ctx-item:active { background-color: rgba(255,255,255,0.08) !important; }
      `}</style>

      <div onMouseDown={() => { if (!showFavouritesRef.current) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 500 }} />

      <div
        ref={ref}
        className="ctx-popup"
        style={{
          position:        "fixed",
          top:             pos.top,
          left:            pos.left,
          zIndex:          501,
          backgroundColor: "transparent",
          border:          "1px solid rgba(255,255,255,0.08)",
          borderRadius:    "14px",
          boxShadow:       "0 12px 40px rgba(0,0,0,0.5)",
          fontFamily:      "'Inter', sans-serif",
          width:           "230px",
          overflow:        "hidden",
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

        {/* Confirm delete */}
        {confirm ? (
          <div style={{ padding: "14px" }}>
            <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>Delete chat?</p>
            <p style={{ margin: "0 0 12px", fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>This conversation will be permanently deleted.</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setConfirm(false)}
                onTouchEnd={() => setConfirm(false)}
                style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                onTouchEnd={executeDelete}
                disabled={loading}
                style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", backgroundColor: "#EF4444", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: "6px 0" }}>
            {menuItems.map((item, i) => (
              <div key={item.label}>
                {i === dangerStart && <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "4px 0" }} />}
                <button
                  className="ctx-item"
                  onClick={item.action}
                  onTouchEnd={(e) => { e.preventDefault(); item.action(); }}
                  style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", color: item.danger ? "#EF4444" : "rgba(255,255,255,0.85)", fontSize: "13px", fontFamily: "'Inter', sans-serif", textAlign: "left" }}
                >
                  <span style={{ color: item.danger ? "#EF4444" : "rgba(255,255,255,0.4)", display: "flex", flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                </button>
              </div>
            ))}
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