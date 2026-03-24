"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, BellOff, CheckCheck, MousePointer2 } from "lucide-react";

interface Props {
  onClose:          () => void;
  onWelcomeMessage: () => void;
  x?: number;
  y?: number;
}

export function MessagesSettingsModal({ onClose, onWelcomeMessage, x = 0, y = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const menuItems: {
    icon:   React.ReactNode;
    label:  string;
    sub?:   string;
    danger: boolean;
    dummy:  boolean;
    action: () => void;
  }[] = [
    {
      icon:   <MessageCircle size={15} strokeWidth={1.6} />,
      label:  "Welcome message",
      sub:    "Auto-send to new subscribers",
      danger: false,
      dummy:  false,
      action: () => { onClose(); onWelcomeMessage(); },
    },
    {
      icon:   <BellOff size={15} strokeWidth={1.6} />,
      label:  "Mute all notifications",
      sub:    "Silence message alerts",
      danger: false,
      dummy:  true,
      action: () => {},
    },
    {
      icon:   <CheckCheck size={15} strokeWidth={1.6} />,
      label:  "Mark all as read",
      sub:    "Clear unread counts",
      danger: false,
      dummy:  true,
      action: () => {},
    },
    {
      icon:   <MousePointer2 size={15} strokeWidth={1.6} />,
      label:  "Select chats",
      sub:    "Bulk manage conversations",
      danger: false,
      dummy:  true,
      action: () => {},
    },
  ];

  return createPortal(
    <>
      <style>{`
        @keyframes _msgSettingsPop {
          0%   { opacity: 0; transform: scale(0.88) translateY(-4px); }
          60%  { opacity: 1; transform: scale(1.02) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .msg-settings-popup {
          animation: _msgSettingsPop 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards;
          transform-origin: top right;
        }
        .msg-settings-popup::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: rgba(10, 10, 20, 0.92);
          -webkit-backdrop-filter: blur(40px);
          backdrop-filter: blur(40px);
          z-index: -1;
        }
        .msg-settings-item { transition: background-color 0.12s ease; }
        .msg-settings-item:hover { background-color: rgba(255,255,255,0.05) !important; }
        .msg-settings-item:active { background-color: rgba(255,255,255,0.09) !important; }
        .msg-settings-item--dummy { cursor: default !important; }
        .msg-settings-item--dummy:hover { background-color: transparent !important; }
      `}</style>

      <div
        onMouseDown={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 500 }}
      />

      <div
        ref={ref}
        className="msg-settings-popup"
        style={{
          position:        "fixed",
          top:             y,
          right:           10,
          zIndex:          501,
          backgroundColor: "transparent",
          border:          "1px solid rgba(255,255,255,0.07)",
          borderRadius:    "16px",
          boxShadow:       "0 16px 48px rgba(0,0,0,0.6)",
          fontFamily:      "'Inter', sans-serif",
          width:           "240px",
          overflow:        "hidden",
        }}
      >
        {/* Header label */}
        <div style={{
          padding:      "12px 14px 8px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Messages settings
          </p>
        </div>

        {/* Menu items */}
        <div style={{ padding: "6px 0 6px" }}>
          {menuItems.map((item) => (
            <button
              key={item.label}
              className={`msg-settings-item${item.dummy ? " msg-settings-item--dummy" : ""}`}
              onClick={() => { if (!item.dummy) item.action(); }}
              onTouchEnd={(e) => { e.preventDefault(); if (!item.dummy) item.action(); }}
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        "12px",
                width:      "100%",
                padding:    "10px 14px",
                background: "none",
                border:     "none",
                cursor:     item.dummy ? "default" : "pointer",
                textAlign:  "left",
                fontFamily: "'Inter', sans-serif",
                opacity:    item.dummy ? 0.38 : 1,
              }}
            >
              <span style={{
                color:      item.dummy ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.45)",
                display:    "flex",
                flexShrink: 0,
              }}>
                {item.icon}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 }}>
                <span style={{
                  fontSize:   "13px",
                  fontWeight: 500,
                  color:      item.dummy ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.88)",
                  whiteSpace: "nowrap",
                }}>
                  {item.label}
                </span>
                {item.sub && (
                  <span style={{
                    fontSize:     "11px",
                    color:        "rgba(255,255,255,0.25)",
                    whiteSpace:   "nowrap",
                    overflow:     "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {item.sub}
                  </span>
                )}
              </div>
              {!item.dummy && (
                <span style={{
                  marginLeft: "auto",
                  fontSize:   "10px",
                  color:      "#8B5CF6",
                  flexShrink: 0,
                }}>
                  ›
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body!
  );
}