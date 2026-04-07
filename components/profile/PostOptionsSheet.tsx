"use client";

import { useEffect, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";

interface CreatorPostOptionsSheetProps {
  isOpen:      boolean;
  onClose:     () => void;
  onEdit:      () => void;
  onDelete:    () => void;
  onEditPPV?:  () => void;
}

export default function CreatorPostOptionsSheet({
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onEditPPV,
}: CreatorPostOptionsSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (typeof window === "undefined") return null;

  const group1 = [
    {
      icon:   <Pencil size={22} strokeWidth={1.6} />,
      label:  "Edit caption",
      action: onEdit,
      color:  "#FFFFFF",
    },
    ...(onEditPPV ? [{
      icon:   <span style={{ fontSize: "18px", fontWeight: 700, fontFamily: "'Inter', sans-serif", lineHeight: 1 }}>₦</span>,
      label:  "Edit PPV price",
      action: onEditPPV,
      color:  "#FFFFFF",
    }] : []),
  ];

  const group2 = [
    {
      icon:   <Trash2 size={22} strokeWidth={1.6} />,
      label:  "Delete post",
      action: onDelete,
      color:  "#EF4444",
    },
  ];

  const cardStyle: React.CSSProperties = {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius:    "14px",
    overflow:        "hidden",
    marginBottom:    "10px",
  };

  const listBtnBase: React.CSSProperties = {
    width:           "100%",
    display:         "flex",
    alignItems:      "center",
    gap:             "16px",
    padding:         "17px 20px",
    border:          "none",
    backgroundColor: "transparent",
    fontSize:        "16px",
    fontFamily:      "'Inter', sans-serif",
    fontWeight:      400,
    textAlign:       "left",
    cursor:          "pointer",
    transition:      "background-color 0.12s ease",
    letterSpacing:   "0.01em",
  };

  return createPortal(
    <>
      <style>{`
        .creator-opts-sheet::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px 24px 0 0;
          background: rgba(8, 8, 18, 0.92);
          -webkit-backdrop-filter: blur(40px);
          backdrop-filter: blur(40px);
          z-index: -1;
        }
        .creator-opts-list-btn:hover  { background-color: rgba(255,255,255,0.06) !important; }
        .creator-opts-list-btn:active { background-color: rgba(255,255,255,0.10) !important; }
        .creator-opts-cancel:hover    { background-color: rgba(255,255,255,0.06) !important; }
        .creator-opts-cancel:active   { background-color: rgba(255,255,255,0.10) !important; }
      `}</style>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position:        "fixed",
            inset:           0,
            zIndex:          200,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter:  "blur(2px)",
          }}
        />
      )}

      {/* Sheet */}
      {isOpen && (
        <div
          ref={sheetRef}
          className="creator-opts-sheet"
          style={{
            position:      "fixed",
            bottom:        0,
            left:          "50%",
            transform:     "translateX(-50%)",
            zIndex:        201,
            borderRadius:  "24px 24px 0 0",
            border:        "1px solid rgba(255,255,255,0.08)",
            borderBottom:  "none",
            boxShadow:     "0 -12px 48px rgba(0,0,0,0.6)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
            width:         "100%",
            maxWidth:      "480px",
            fontFamily:    "'Inter', sans-serif",
          }}
        >
          {/* Handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 12px" }}>
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "rgba(255,255,255,0.18)" }} />
          </div>

          <div style={{ padding: "4px 14px 0" }}>

            {/* Group 1 — edit actions */}
            <div style={cardStyle}>
              {group1.map((item, i) => (
                <div key={i}>
                  {i > 0 && <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "0 20px" }} />}
                  <button
                    className="creator-opts-list-btn"
                    onClick={() => { item.action?.(); onClose(); }}
                    style={{ ...listBtnBase, color: item.color }}
                  >
                    <span style={{ display: "flex", flexShrink: 0 }}>{item.icon}</span>
                    {item.label}
                  </button>
                </div>
              ))}
            </div>

            {/* Group 2 — danger */}
            <div style={cardStyle}>
              {group2.map((item, i) => (
                <button
                  key={i}
                  className="creator-opts-list-btn"
                  onClick={() => { item.action?.(); onClose(); }}
                  style={{ ...listBtnBase, color: item.color }}
                >
                  <span style={{ display: "flex", flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            {/* Cancel */}
            <button
              className="creator-opts-cancel"
              onClick={onClose}
              style={{
                width:           "100%",
                padding:         "17px",
                border:          "none",
                borderRadius:    "14px",
                backgroundColor: "rgba(255,255,255,0.07)",
                color:           "rgba(255,255,255,0.5)",
                fontSize:        "16px",
                fontWeight:      500,
                fontFamily:      "'Inter', sans-serif",
                cursor:          "pointer",
                transition:      "background-color 0.12s ease",
                letterSpacing:   "0.01em",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}