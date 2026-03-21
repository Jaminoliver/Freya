"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Copy, CornerUpLeft, Trash2, X } from "lucide-react";
import type { Message } from "@/lib/types/messages";

interface Props {
  message: Message;
  isOwn:   boolean;
  onCopy:              () => void;
  onReply:             () => void;
  onDeleteForMe:       () => void;
  onDeleteForEveryone: () => void;
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
  onCopy, onReply, onDeleteForMe, onDeleteForEveryone, onClose,
}: Props) {
  const [closing, setClosing] = useState(false);
  const [ready,   setReady]   = useState(false);

  // setTimeout instead of onAnimationEnd — reliable on iOS Safari
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
          backgroundColor: "#1A1A28",
          borderRadius:    "20px 20px 0 0",
          zIndex:          501,
          fontFamily:      "'Inter', sans-serif",
          animation:       closing ? "_maSheetDown 0.28s cubic-bezier(0.32,0.72,0,1) forwards" : "_maSheetUp 0.32s cubic-bezier(0.32,0.72,0,1)",
          paddingBottom:   "env(safe-area-inset-bottom, 24px)",
          display:         "flex",
          flexDirection:   "column",
        }}
      >
        {/* Block touches during open animation */}
        {!ready && <div style={{ position: "absolute", inset: 0, zIndex: 999 }} />}

        {/* Drag handle */}
        <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#3A3A52", margin: "12px auto 0" }} />

        {/* Header — shows message preview */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "16px 20px 14px", borderBottom: "1px solid #252538" }}>
          <p style={{
            margin: 0, fontSize: "14px", color: "#A3A3C2",
            fontFamily: "'Inter', sans-serif",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            flex: 1,
          }}>
            {message.text ?? "Media"}
          </p>
          <button
            onClick={triggerClose}
            style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#2A2A3D", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <X size={16} color="#A3A3C2" strokeWidth={2} />
          </button>
        </div>

        {/* Menu items */}
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