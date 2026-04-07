"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, UserPlus, ThumbsDown, Flag, Ban, ShieldOff } from "lucide-react";
import { createPortal } from "react-dom";

interface PostOptionsSheetProps {
  isOpen:               boolean;
  onClose:              () => void;
  onSavePost:           () => void;
  onSaveCreator:        () => void;
  onNotInterested:      () => void;
  onReport:             () => void;
  onBlockCreator:       () => void;
  onUnblockCreator?:    () => void;
  onRestrictCreator?:   () => void;
  onUnrestrictCreator?: () => void;
  savedPost?:           boolean;
  savedCreator?:        boolean;
  isBlocked?:           boolean;
  isRestricted?:        boolean;
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
  savedPost    = false,
  savedCreator = false,
  isBlocked    = false,
  isRestricted = false,
}: PostOptionsSheetProps) {
  const sheetRef  = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{ message: string; key: number } | null>(null);
  const [localSavedPost,    setLocalSavedPost]    = useState(savedPost);
  const [localSavedCreator, setLocalSavedCreator] = useState(savedCreator);

  // Sync when props eventually arrive from server
  useEffect(() => { setLocalSavedPost(savedPost); },    [savedPost]);
  useEffect(() => { setLocalSavedCreator(savedCreator); }, [savedCreator]);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

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

  const restrictDormant = isBlocked;

  const quickItems = [
    {
      icon:   <Bookmark size={26} strokeWidth={1.6} fill={localSavedPost ? "currentColor" : "none"} />,
      label:  localSavedPost ? "Unsave" : "Save",
      color:  localSavedPost ? "#8B5CF6" : "#FFFFFF",
      action: () => {
        setLocalSavedPost(p => !p);
        showToast(localSavedPost ? "Post removed from saved" : "Post saved");
        onSavePost();
        setTimeout(onClose, 800);
      },
    },
    {
      icon:   <UserPlus size={26} strokeWidth={1.6} fill={localSavedCreator ? "currentColor" : "none"} />,
      label:  localSavedCreator ? "Unsave creator" : "Save creator",
      color:  localSavedCreator ? "#8B5CF6" : "#FFFFFF",
      action: () => {
        setLocalSavedCreator(c => !c);
        showToast(localSavedCreator ? "Creator removed from saved" : "Creator saved");
        onSaveCreator();
        setTimeout(onClose, 800);
      },
    },
    {
      icon:   <ThumbsDown size={26} strokeWidth={1.6} />,
      label:  "Not interested",
      color:  "#FFFFFF",
      action: () => { onNotInterested(); onClose(); },
    },
  ];

  const group1 = [
    {
      icon:    <ShieldOff size={22} strokeWidth={1.6} />,
      label:   isRestricted ? "Unrestrict creator" : "Restrict creator",
      action:  restrictDormant ? undefined : isRestricted ? onUnrestrictCreator : onRestrictCreator,
      color:   restrictDormant ? "rgba(255,255,255,0.2)" : isRestricted ? "#10B981" : "#F59E0B",
      dormant: restrictDormant,
    },
  ];

  const group2 = [
    {
      icon:   <Flag size={22} strokeWidth={1.6} />,
      label:  "Report",
      action: onReport,
      color:  "#EF4444",
    },
    {
      icon:   <Ban size={22} strokeWidth={1.6} />,
      label:  isBlocked ? "Unblock creator" : "Block creator",
      action: isBlocked ? onUnblockCreator : onBlockCreator,
      color:  isBlocked ? "#10B981" : "#EF4444",
    },
  ];

  const cardStyle: React.CSSProperties = {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius:    "14px",
    overflow:        "hidden",
    marginBottom:    "10px",
  };

  const listBtnBase: React.CSSProperties = {
    width:          "100%",
    display:        "flex",
    alignItems:     "center",
    gap:            "16px",
    padding:        "17px 20px",
    border:         "none",
    backgroundColor:"transparent",
    fontSize:       "16px",
    fontFamily:     "'Inter', sans-serif",
    fontWeight:     400,
    textAlign:      "left",
    cursor:         "pointer",
    transition:     "background-color 0.12s ease",
    letterSpacing:  "0.01em",
  };

  return createPortal(
    <>
      <style>{`
        .post-opts-sheet::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px 24px 0 0;
          background: rgba(8, 8, 18, 0.92);
          -webkit-backdrop-filter: blur(40px);
          backdrop-filter: blur(40px);
          z-index: -1;
        }
        .post-opts-list-btn:hover  { background-color: rgba(255,255,255,0.06) !important; }
        .post-opts-list-btn:active { background-color: rgba(255,255,255,0.10) !important; }
        .post-opts-quick:hover     { background-color: rgba(255,255,255,0.13) !important; }
        .post-opts-quick:active    { background-color: rgba(255,255,255,0.17) !important; }
        .post-opts-cancel:hover    { background-color: rgba(255,255,255,0.06) !important; }
        .post-opts-cancel:active   { background-color: rgba(255,255,255,0.10) !important; }
        @keyframes _toastLife {
          0%   { opacity: 0; transform: translateX(-50%) translateY(10px); }
          12%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          78%  { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div key={toast.key} style={{
          position:        "fixed",
          bottom:          "calc(env(safe-area-inset-bottom) + 24px)",
          left:            "50%",
          transform:       "translateX(-50%)",
          zIndex:          300,
          backgroundColor: "rgba(20,20,32,0.95)",
          border:          "1px solid rgba(255,255,255,0.1)",
          borderRadius:    "12px",
          padding:         "12px 20px",
          fontSize:        "14px",
          fontFamily:      "'Inter', sans-serif",
          fontWeight:      500,
          color:           "#FFFFFF",
          whiteSpace:      "nowrap",
          boxShadow:       "0 8px 32px rgba(0,0,0,0.4)",
          backdropFilter:  "blur(20px)",
          animation:       "_toastLife 2.6s ease forwards",
          pointerEvents:   "none",
        }}>
          {toast.message}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)" }}
      />}

      {/* Sheet */}
      {isOpen && <div
        ref={sheetRef}
        className="post-opts-sheet"
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

          {/* Quick icon grid */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            {quickItems.map((item, i) => (
              <button
                key={i}
                className="post-opts-quick"
                onClick={item.action}
                style={{
                  flex:           1,
                  display:        "flex",
                  flexDirection:  "column",
                  alignItems:     "center",
                  justifyContent: "center",
                  gap:            "10px",
                  padding:        "20px 8px",
                  border:         "none",
                  borderRadius:   "14px",
                  backgroundColor:"rgba(255,255,255,0.07)",
                  color:          item.color,
                  fontSize:       "13px",
                  fontFamily:     "'Inter', sans-serif",
                  fontWeight:     500,
                  cursor:         "pointer",
                  transition:     "background-color 0.12s ease",
                  letterSpacing:  "0.01em",
                  textAlign:      "center",
                  lineHeight:     1.3,
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          {/* Group 1 — restrict */}
          <div style={cardStyle}>
            {group1.map((item, i) => (
              <button
                key={i}
                className="post-opts-list-btn"
                onClick={() => { if (item.dormant || !item.action) return; item.action(); onClose(); }}
                style={{ ...listBtnBase, color: item.color, cursor: item.dormant ? "default" : "pointer", opacity: item.dormant ? 0.3 : 1 }}
              >
                <span style={{ display: "flex", flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Group 2 — danger */}
          <div style={cardStyle}>
            {group2.map((item, i) => (
              <div key={i}>
                {i > 0 && <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "0 20px" }} />}
                <button
                  className="post-opts-list-btn"
                  onClick={() => { if (!item.action) return; item.action(); onClose(); }}
                  style={{ ...listBtnBase, color: item.color }}
                >
                  <span style={{ display: "flex", flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                </button>
              </div>
            ))}
          </div>

          {/* Cancel */}
          <button
            className="post-opts-cancel"
            onClick={onClose}
            style={{
              width:          "100%",
              padding:        "17px",
              border:         "none",
              borderRadius:   "14px",
              backgroundColor:"rgba(255,255,255,0.07)",
              color:          "rgba(255,255,255,0.5)",
              fontSize:       "16px",
              fontWeight:     500,
              fontFamily:     "'Inter', sans-serif",
              cursor:         "pointer",
              transition:     "background-color 0.12s ease",
              letterSpacing:  "0.01em",
            }}
          >
            Cancel
          </button>
        </div>
      </div>}
    </>,
    document.body
  );
}