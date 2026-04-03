"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCheck, Trash2, BellOff } from "lucide-react";

interface Props {
  onClose:        () => void;
  onMarkAllRead:  () => void;
  onDeleteAll:    () => void;
  x?: number;
  y?: number;
}

export function NotificationsSettingsModal({ onClose, onMarkAllRead, onDeleteAll, x = 0, y = 0 }: Props) {
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
    sub:    string;
    danger: boolean;
    dummy:  boolean;
    action: () => void;
  }[] = [
    {
      icon:   <CheckCheck size={15} strokeWidth={1.6} />,
      label:  "Mark all as read",
      sub:    "Clear all unread indicators",
      danger: false,
      dummy:  false,
      action: () => { onClose(); onMarkAllRead(); },
    },
    {
      icon:   <BellOff size={15} strokeWidth={1.6} />,
      label:  "Mute notifications",
      sub:    "Coming soon",
      danger: false,
      dummy:  true,
      action: () => {},
    },
    {
      icon:   <Trash2 size={15} strokeWidth={1.6} />,
      label:  "Delete all",
      sub:    "Remove all notifications",
      danger: true,
      dummy:  false,
      action: () => { onClose(); onDeleteAll(); },
    },
  ];

  return createPortal(
    <>
      <style>{`
        @keyframes _notifSettingsPop {
          0%   { opacity: 0; transform: scale(0.88) translateY(-4px); }
          60%  { opacity: 1; transform: scale(1.02) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .notif-settings-popup {
          animation: _notifSettingsPop 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards;
          transform-origin: top right;
        }
        .notif-settings-popup::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: rgba(10, 10, 20, 0.92);
          -webkit-backdrop-filter: blur(40px);
          backdrop-filter: blur(40px);
          z-index: -1;
        }
        .notif-settings-item { transition: background-color 0.12s ease; }
        .notif-settings-item:hover { background-color: rgba(255,255,255,0.05) !important; }
        .notif-settings-item:active { background-color: rgba(255,255,255,0.09) !important; }
        .notif-settings-item--dummy { cursor: default !important; }
        .notif-settings-item--dummy:hover { background-color: transparent !important; }
      `}</style>

      <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 500 }} />

      <div
        ref={ref}
        className="notif-settings-popup"
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
        <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Notifications
          </p>
        </div>

        <div style={{ padding: "6px 0 6px" }}>
          {menuItems.map((item) => (
            <button
              key={item.label}
              className={`notif-settings-item${item.dummy ? " notif-settings-item--dummy" : ""}`}
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
                color:      item.danger ? "rgba(239,68,68,0.7)" : item.dummy ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.45)",
                display:    "flex",
                flexShrink: 0,
              }}>
                {item.icon}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 }}>
                <span style={{
                  fontSize:   "13px",
                  fontWeight: 500,
                  color:      item.danger ? "#EF4444" : item.dummy ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.88)",
                  whiteSpace: "nowrap",
                }}>
                  {item.label}
                </span>
                <span style={{
                  fontSize:     "11px",
                  color:        "rgba(255,255,255,0.25)",
                  whiteSpace:   "nowrap",
                  overflow:     "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {item.sub}
                </span>
              </div>
              {!item.dummy && (
                <span style={{ marginLeft: "auto", fontSize: "10px", color: item.danger ? "#EF4444" : "#8B5CF6", flexShrink: 0 }}>
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