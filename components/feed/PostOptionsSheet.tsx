"use client";

import { useEffect, useRef } from "react";
import { Bookmark, UserPlus, ThumbsDown, Flag, Ban, ShieldOff } from "lucide-react";
import { createPortal } from "react-dom";

interface PostOptionsSheetProps {
  isOpen:             boolean;
  onClose:            () => void;
  onSavePost:         () => void;
  onSaveCreator:      () => void;
  onNotInterested:    () => void;
  onReport:           () => void;
  onBlockCreator:     () => void;
  onUnblockCreator?:  () => void;
  onRestrictCreator?: () => void;
  onUnrestrictCreator?: () => void;
  savedPost?:         boolean;
  savedCreator?:      boolean;
  isBlocked?:         boolean;
  isRestricted?:      boolean;
}

export default function PostOptionsSheet({
  isOpen,
  onClose,
  onSavePost,
  onSaveCreator,
  onNotInterested,
  onReport,
  onBlockCreator,
  onUnblockCreator,
  onRestrictCreator,
  onUnrestrictCreator,
  savedPost       = false,
  savedCreator    = false,
  isBlocked       = false,
  isRestricted    = false,
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

  // Restrict is dormant (faded, non-clickable) when user is blocked
  const restrictDormant = isBlocked;

  const items = [
    {
      icon:    <Bookmark size={18} />,
      label:   savedPost ? "Unsave post" : "Save post",
      action:  onSavePost,
      danger:  false,
      warn:    false,
      filled:  savedPost,
      dormant: false,
    },
    {
      icon:    <UserPlus size={18} />,
      label:   savedCreator ? "Unsave creator" : "Save creator",
      action:  onSaveCreator,
      danger:  false,
      warn:    false,
      filled:  savedCreator,
      dormant: false,
    },
    {
      icon:    <ThumbsDown size={18} />,
      label:   "Not interested",
      action:  onNotInterested,
      danger:  false,
      warn:    false,
      filled:  false,
      dormant: false,
    },
    {
      icon:    <Flag size={18} />,
      label:   "Report",
      action:  onReport,
      danger:  false,
      warn:    false,
      filled:  false,
      dormant: false,
    },
    {
      icon:    <ShieldOff size={18} />,
      label:   isRestricted ? "Unrestrict creator" : "Restrict creator",
      action:  restrictDormant
        ? undefined
        : isRestricted
          ? onUnrestrictCreator
          : onRestrictCreator,
      danger:  false,
      warn:    !restrictDormant,
      filled:  false,
      dormant: restrictDormant,
    },
    {
      icon:    <Ban size={18} />,
      label:   isBlocked ? "Unblock creator" : "Block creator",
      action:  isBlocked ? onUnblockCreator : onBlockCreator,
      danger:  true,
      warn:    false,
      filled:  false,
      dormant: false,
    },
  ];

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
              onClick={() => {
                if (item.dormant || !item.action) return;
                item.action();
                onClose();
              }}
              disabled={item.dormant}
              style={{
                width:           "100%",
                display:         "flex",
                alignItems:      "center",
                gap:             "14px",
                padding:         "14px 20px",
                border:          "none",
                backgroundColor: "transparent",
                color:           item.dormant
                  ? "#3A3A4D"
                  : item.danger
                    ? isBlocked && item.label.startsWith("Unblock") ? "#10B981" : "#EF4444"
                    : item.warn
                      ? isRestricted && item.label.startsWith("Unrestrict") ? "#10B981" : "#F59E0B"
                      : item.filled
                        ? "#8B5CF6"
                        : "#C4C4D4",
                fontSize:        "15px",
                fontFamily:      "'Inter', sans-serif",
                fontWeight:      item.filled ? 600 : 400,
                textAlign:       "left",
                cursor:          item.dormant ? "default" : "pointer",
                opacity:         item.dormant ? 0.35 : 1,
                transition:      "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!item.dormant) e.currentTarget.style.backgroundColor = "#1C1C2E";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <span style={{ opacity: item.dormant ? 0.35 : item.danger || item.warn ? 1 : item.filled ? 1 : 0.7 }}>
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