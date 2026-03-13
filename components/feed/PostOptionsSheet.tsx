"use client";

import { useEffect, useRef } from "react";
import { Bookmark, UserPlus, ThumbsDown, Flag, Ban } from "lucide-react";
import { createPortal } from "react-dom";

interface PostOptionsSheetProps {
  isOpen:          boolean;
  onClose:         () => void;
  onSavePost:      () => void;
  onSaveCreator:   () => void;
  onNotInterested: () => void;
  onReport:        () => void;
  onBlockCreator:  () => void;
  savedPost?:      boolean;
  savedCreator?:   boolean;
}

const options = (
  savedPost: boolean,
  savedCreator: boolean,
  handlers: {
    onSavePost:     () => void;
    onSaveCreator:  () => void;
    onNotInterested: () => void;
    onReport:       () => void;
    onBlockCreator: () => void;
  }
) => [
  {
    icon:   <Bookmark size={18} />,
    label:  savedPost ? "Unsave post" : "Save post",
    action: handlers.onSavePost,
    danger: false,
    filled: savedPost,
  },
  {
    icon:   <UserPlus size={18} />,
    label:  savedCreator ? "Unsave creator" : "Save creator",
    action: handlers.onSaveCreator,
    danger: false,
    filled: savedCreator,
  },

  {
    icon:   <ThumbsDown size={18} />,
    label:  "Not interested",
    action: handlers.onNotInterested,
    danger: false,
    filled: false,
  },
  {
    icon:   <Flag size={18} />,
    label:  "Report",
    action: handlers.onReport,
    danger: false,
    filled: false,
  },
  {
    icon:   <Ban size={18} />,
    label:  "Block creator",
    action: handlers.onBlockCreator,
    danger: true,
    filled: false,
  },
];

export default function PostOptionsSheet({
  isOpen,
  onClose,
  onSavePost,
  onSaveCreator,
  onNotInterested,
  onReport,
  onBlockCreator,
  savedPost    = false,
  savedCreator = false,
}: PostOptionsSheetProps) {
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

  if (typeof window === "undefined" || !isOpen) return null;

  const items = options(savedPost, savedCreator, {
    onSavePost,
    onSaveCreator,
    onNotInterested,
    onReport,
    onBlockCreator,
  });

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:        "fixed",
          inset:           0,
          zIndex:          200,
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter:  "blur(2px)",
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          position:        "fixed",
          bottom:          0,
          left:            "50%",
          transform:       "translateX(-50%)",
          zIndex:          201,
          backgroundColor: "#13131F",
          borderRadius:    "20px 20px 0 0",
          padding:         "0 0 calc(env(safe-area-inset-bottom) + 12px)",
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
                color:           item.danger ? "#EF4444" : item.filled ? "#8B5CF6" : "#C4C4D4",
                fontSize:        "15px",
                fontFamily:      "'Inter', sans-serif",
                fontWeight:      item.filled ? 600 : 400,
                textAlign:       "left",
                cursor:          "pointer",
                transition:      "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span style={{ opacity: item.danger ? 1 : item.filled ? 1 : 0.7 }}>
                {item.icon}
              </span>
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