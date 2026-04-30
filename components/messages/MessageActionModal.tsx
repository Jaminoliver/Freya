"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Copy, CornerUpLeft, Trash2, X, CheckSquare, Bookmark } from "lucide-react";
import type { Message } from "@/lib/types/messages";

interface Props {
  message: Message;
  isOwn:   boolean;
  onCopy:              () => void;
  onReply:             () => void;
  onDeleteForMe:       () => void;
  onDeleteForEveryone: () => void;
  onSelect?:           (messageId: number) => void;
  onSaveGif?:          () => void;
  onClose:             () => void;
}

interface MenuItem {
  icon:    React.ReactNode;
  label:   string;
  danger?: boolean;
  action:  () => void;
}

export function MessageActionModal({
  message, isOwn,
  onCopy, onReply, onDeleteForMe, onDeleteForEveryone, onSelect, onSaveGif, onClose,
}: Props) {
  const [closing, setClosing] = useState(false);
  const [ready,   setReady]   = useState(false);

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

  const menuItems: MenuItem[] = [
    ...(onSaveGif ? [{
      icon:   <Bookmark size={20} strokeWidth={1.6} />,
      label:  "Save GIF",
      action: () => { onSaveGif(); triggerClose(); },
    }] : []),
    {
      icon:   <Copy size={20} strokeWidth={1.6} />,
      label:  "Copy",
      action: () => { onCopy(); triggerClose(); },
    },
    {
      icon:   <CornerUpLeft size={20} strokeWidth={1.6} />,
      label:  "Reply",
      action: () => { onReply(); triggerClose(); },
    },
    {
      icon:   <CheckSquare size={20} strokeWidth={1.6} />,
      label:  "Select",
      action: () => { triggerClose(); setTimeout(() => onSelect?.(message.id), 300); },
    },
    {
      icon:   <Trash2 size={20} strokeWidth={1.6} />,
      label:  "Delete for me",
      danger: true,
      action: () => { onDeleteForMe(); triggerClose(); },
    },
    ...(isOwn ? [{
      icon:   <Trash2 size={20} strokeWidth={1.6} />,
      label:  "Delete for everyone",
      danger: true,
      action: () => { onDeleteForEveryone(); triggerClose(); },
    }] : []),
  ];

  const dangerStart = menuItems.findIndex((m) => m.danger);

  return createPortal(
    <>
      <style>{`
        @keyframes _maSheetUp   { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }
        @keyframes _maSheetDown { from { transform: translateX(-50%) translateY(0);    } to { transform: translateX(-50%) translateY(100%); } }
        @keyframes _maFadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes _maFadeOut   { from { opacity: 1; } to { opacity: 0; } }
        .ma-sheet, .ma-sheet * {
          -webkit-user-select:   none !important;
          user-select:           none !important;
          -webkit-touch-callout: none !important;
        }
        .ma-sheet button { -webkit-tap-highlight-color: transparent !important; }
        .ma-sheet button:active { background-color: transparent !important; opacity: 1 !important; }
        .ma-sheet::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px 20px 0 0;
          background: rgba(8, 8, 18, 0.88);
          -webkit-backdrop-filter: blur(32px);
          backdrop-filter: blur(32px);
          z-index: -1;
        }
        .ma-item:hover  { background-color: rgba(255,255,255,0.05) !important; }
        .ma-item:active { background-color: rgba(255,255,255,0.08) !important; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={ready ? triggerClose : undefined}
        style={{
          position:        "fixed",
          inset:           0,
          backgroundColor: "rgba(0,0,0,0.65)",
          zIndex:          500,
          animation:       closing ? "_maFadeOut 0.28s ease forwards" : "_maFadeIn 0.18s ease",
          pointerEvents:   "auto",
        }}
      />

      {/* Sheet */}
      <div
        className="ma-sheet"
        style={{
          position:        "fixed",
          bottom:          0,
          left:            "50%",
          transform:       "translateX(-50%)",
          width:           "100%",
          maxWidth:        "520px",
          backgroundColor: "transparent",
          borderRadius:    "20px 20px 0 0",
          border:          "1px solid rgba(255,255,255,0.08)",
          borderBottom:    "none",
          boxShadow:       "0 -12px 40px rgba(0,0,0,0.5)",
          zIndex:          501,
          fontFamily:      "'Inter', sans-serif",
          animation:       closing ? "_maSheetDown 0.28s cubic-bezier(0.32,0.72,0,1) forwards" : "_maSheetUp 0.32s cubic-bezier(0.32,0.72,0,1)",
          paddingBottom:   "env(safe-area-inset-bottom, 24px)",
          display:         "flex",
          flexDirection:   "column",
        }}
      >
        {!ready && <div style={{ position: "absolute", inset: 0, zIndex: 999 }} />}

        {/* Drag handle */}
        <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "rgba(255,255,255,0.12)", margin: "12px auto 0" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "16px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{
            margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.45)",
            fontFamily: "'Inter', sans-serif",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            flex: 1, letterSpacing: "0.01em",
          }}>
            {message.text ?? "Media"}
          </p>
          <button
            onClick={triggerClose}
            style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <X size={16} color="rgba(255,255,255,0.45)" strokeWidth={2} />
          </button>
        </div>

        {/* Menu items */}
        <div style={{ padding: "6px 0", pointerEvents: ready ? "auto" : "none" }}>
          {menuItems.map((item, i) => (
            <div key={item.label}>
              {i === dangerStart && (
                <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
              )}
              <button
                className="ma-item"
                onClick={item.action}
                onTouchStart={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
                onTouchEnd={(e)   => { e.currentTarget.style.backgroundColor = "transparent"; item.action(); }}
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "space-between",
                  width:          "100%",
                  padding:        "14px 20px",
                  background:     "none",
                  border:         "none",
                  cursor:         "pointer",
                  color:          item.danger ? "#EF4444" : "rgba(255,255,255,0.85)",
                  fontSize:       "15px",
                  fontFamily:     "'Inter', sans-serif",
                  textAlign:      "left",
                  transition:     "background-color 0.12s ease",
                  letterSpacing:  "0.01em",
                }}
              >
                <span>{item.label}</span>
                <span style={{ color: item.danger ? "#EF4444" : "rgba(255,255,255,0.25)", display: "flex" }}>{item.icon}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </>,
    document.body!
  );
}