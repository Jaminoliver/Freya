"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, Info, Lock, Heart, List, Eraser, Ban, Trash2, X } from "lucide-react";

interface Participant {
  name:      string;
  username:  string;
  avatarUrl?: string | null;
}

interface Props {
  conversationId: number;
  participant:    Participant;
  onClose:        () => void;
  onCleared:      () => void;
}

interface MenuItem {
  icon:    React.ReactNode;
  label:   string;
  danger?: boolean;
  action:  () => void;
}

export function ConversationActionModal({
  conversationId, participant, onClose, onCleared,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [ready,   setReady]   = useState(false);

  // Use setTimeout instead of onAnimationEnd — reliable on iOS Safari
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 320);
    return () => clearTimeout(t);
  }, []);

  const triggerClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 280);
  };

  const handleClear = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/conversations/${conversationId}/messages/clear`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forEveryone: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Clear failed");
      onCleared();
      triggerClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const menuItems: MenuItem[] = [
    { icon: <Bell   size={20} strokeWidth={1.6} />, label: "Mute",                                  action: triggerClose },
    { icon: <Info   size={20} strokeWidth={1.6} />, label: "Contact info",                          action: triggerClose },
    { icon: <Lock   size={20} strokeWidth={1.6} />, label: "Lock chat",                             action: triggerClose },
    { icon: <Heart  size={20} strokeWidth={1.6} />, label: "Add to Favorites",                      action: triggerClose },
    { icon: <List   size={20} strokeWidth={1.6} />, label: "Add to list",                           action: triggerClose },
    { icon: <Eraser size={20} strokeWidth={1.6} />, label: loading ? "Clearing..." : "Clear chat",  action: handleClear },
    { icon: <Ban    size={20} strokeWidth={1.6} />, label: `Block ${participant.name}`, danger: true, action: triggerClose },
    { icon: <Trash2 size={20} strokeWidth={1.6} />, label: "Delete chat",               danger: true, action: triggerClose },
  ];

  const dangerStart = menuItems.findIndex((m) => m.danger);

  return createPortal(
    <>
      <style>{`
        @keyframes _sheetUp   { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }
        @keyframes _sheetDown { from { transform: translateX(-50%) translateY(0); } to { transform: translateX(-50%) translateY(100%); } }
        @keyframes _fadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes _fadeOut   { from { opacity: 1; } to { opacity: 0; } }
        .action-sheet, .action-sheet * {
          -webkit-user-select:      none !important;
          -moz-user-select:         none !important;
          user-select:              none !important;
          -webkit-touch-callout:    none !important;
        }
        .action-sheet button {
          -webkit-tap-highlight-color: transparent !important;
        }
        .action-sheet button:active {
          background-color: transparent !important;
          opacity: 1 !important;
        }
      `}</style>

      {/* Backdrop — always pointer-events auto; ready gate removed to fix iOS double-tap bug */}
      <div
        onClick={ready ? triggerClose : undefined}
        style={{
          position:        "fixed",
          inset:           0,
          backgroundColor: "rgba(0,0,0,0.65)",
          zIndex:          500,
          animation:       closing ? "_fadeOut 0.28s ease forwards" : "_fadeIn 0.18s ease",
          pointerEvents:   "auto",
        }}
      />

      {/* Sheet */}
      <div
        className="action-sheet"
        style={{
          position:        "fixed",
          bottom:          0,
          left:            "50%",
          transform:       "translateX(-50%)",
          width:           "100%",
          maxWidth:        "520px",
          height:          "50vh",
          backgroundColor: "#1A1A28",
          borderRadius:    "20px 20px 0 0",
          zIndex:          501,
          fontFamily:      "'Inter', sans-serif",
          animation:       closing ? "_sheetDown 0.28s cubic-bezier(0.32,0.72,0,1) forwards" : "_sheetUp 0.32s cubic-bezier(0.32,0.72,0,1)",
          paddingBottom:   "env(safe-area-inset-bottom, 24px)",
          overflowY:       "auto",
          display:         "flex",
          flexDirection:   "column",
        }}>

        {/* Transparent overlay blocks touches during open animation */}
        {!ready && (
          <div style={{ position: "absolute", inset: 0, zIndex: 999 }} />
        )}

        {/* Drag handle */}
        <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#3A3A52", margin: "12px auto 0" }} />

        {/* Participant header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px 14px", borderBottom: "1px solid #252538" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "#2A2A3D" }}>
            {participant.avatarUrl
              ? <img src={participant.avatarUrl} alt={participant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: "18px", fontWeight: 700 }}>{participant.name[0].toUpperCase()}</div>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{participant.name}</p>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#8B5CF6" }}>@{participant.username}</p>
          </div>
          <button
            onClick={triggerClose}
            style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#2A2A3D", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <X size={16} color="#A3A3C2" strokeWidth={2} />
          </button>
        </div>

        {error && (
          <div style={{ margin: "8px 16px 0", padding: "10px 14px", backgroundColor: "rgba(239,68,68,0.1)", borderRadius: "8px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#EF4444" }}>{error}</p>
          </div>
        )}

        <div style={{ padding: "8px 0", pointerEvents: ready ? "auto" : "none" }}>
          {menuItems.map((item, i) => (
            <div key={item.label}>
              {i === dangerStart && (
                <div style={{ height: "1px", backgroundColor: "#252538", margin: "6px 0" }} />
              )}
              <button
                onClick={item.action}
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "space-between",
                  width:          "100%",
                  padding:        "15px 20px",
                  background:     "none",
                  border:         "none",
                  cursor:         "pointer",
                  color:          item.danger ? "#EF4444" : "#FFFFFF",
                  fontSize:       "15px",
                  fontFamily:     "'Inter', sans-serif",
                  textAlign:      "left",
                  transition:     "background-color 0.12s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#252538")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                onTouchStart={(e) => (e.currentTarget.style.backgroundColor = "#252538")}
                onTouchEnd={(e)   => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <span>{item.label}</span>
                <span style={{ color: item.danger ? "#EF4444" : "#6B6B8A" }}>{item.icon}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </>,
    document.body!
  );
}