"use client";

import { useEffect, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";

interface CreatorPostOptionsSheetProps {
  isOpen:    boolean;
  onClose:   () => void;
  onEdit:    () => void;
  onDelete:  () => void;
}

export default function CreatorPostOptionsSheet({
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: CreatorPostOptionsSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (typeof window === "undefined") return null;

  const items = [
    { icon: <Pencil size={18} />, label: "Edit caption", action: onEdit,   danger: false },
    { icon: <Trash2 size={18} />, label: "Delete post",  action: onDelete, danger: true  },
  ];

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:        "fixed",
          inset:           0,
          zIndex:          100,
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter:  "blur(2px)",
          opacity:         isOpen ? 1 : 0,
          pointerEvents:   isOpen ? "auto" : "none",
          transition:      "opacity 0.25s ease",
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          position:        "fixed",
          bottom:          0,
          left:            "50%",
          transform:       isOpen ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(100%)",
          zIndex:          101,
          backgroundColor: "#13131F",
          borderRadius:    "20px 20px 0 0",
          padding:         "0 0 calc(env(safe-area-inset-bottom) + 12px)",
          transition:      "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
          width:           "100%",
          maxWidth:        "480px",
          boxShadow:       "0 -8px 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2A2A3D" }} />
        </div>

        {/* Options */}
        <div style={{ padding: "4px 0 8px" }}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.action(); onClose(); }}
              style={{
                width:           "100%",
                display:         "flex",
                alignItems:      "center",
                gap:             "14px",
                padding:         "14px 20px",
                border:          "none",
                backgroundColor: "transparent",
                color:           item.danger ? "#EF4444" : "#C4C4D4",
                fontSize:        "15px",
                fontFamily:      "'Inter', sans-serif",
                fontWeight:      400,
                textAlign:       "left",
                cursor:          "pointer",
                transition:      "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span style={{ opacity: 0.7 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: "1px", backgroundColor: "#2A2A3D", margin: "4px 0" }} />

        {/* Cancel */}
        <div style={{ padding: "8px 16px 0" }}>
          <button
            onClick={onClose}
            style={{
              width:           "100%",
              padding:         "14px",
              border:          "none",
              borderRadius:    "12px",
              backgroundColor: "transparent",
              color:           "#C4C4D4",
              fontSize:        "15px",
              fontWeight:      500,
              fontFamily:      "'Inter', sans-serif",
              cursor:          "pointer",
              transition:      "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            Cancel
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}