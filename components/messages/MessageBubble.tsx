"use client";

import { useRef, useState } from "react";
import { Copy, CornerUpLeft, X, MoreVertical } from "lucide-react";
import type { Message, Conversation } from "@/lib/types/messages";

interface Props {
  message:        Message;
  conversation:   Conversation;
  isOwn:          boolean;
  isRead:         boolean;
  time:           string;
  onReply?:       (message: Message) => void;
  replyToMessage?: Message | null;
}

function ReadTick({ isRead }: { isRead: boolean }) {
  const color = isRead ? "#A78BFA" : "rgba(255,255,255,0.5)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
      {isRead ? (
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
          <path d="M1 5L4.5 8.5L10 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 5L9.5 8.5L15 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 5L4 8L9 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  );
}

// ✅ Safe clipboard — works on mobile HTTP too
function copyToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text: string) {
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.opacity  = "0";
  document.body.appendChild(el);
  el.focus();
  el.select();
  try { document.execCommand("copy"); } catch {}
  document.body.removeChild(el);
}

export function MessageBubble({ message, conversation, isOwn, isRead, time, onReply, replyToMessage }: Props) {
  const { participant } = conversation;

  const [sheetOpen,   setSheetOpen]   = useState(false);
  const [hovered,     setHovered]     = useState(false);
  const [swipeX,      setSwipeX]      = useState(0);
  const [swiping,     setSwiping]     = useState(false);

  const longPressTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX      = useRef(0);
  const touchStartY      = useRef(0);
  const didSwipe         = useRef(false);
  const swipeTriggered   = useRef(false);

  // ─── Long press ───────────────────────────────────────────
  const startLongPress = (e: React.TouchEvent) => {
    touchStartX.current    = e.touches[0].clientX;
    touchStartY.current    = e.touches[0].clientY;
    didSwipe.current       = false;
    swipeTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!didSwipe.current) { setSheetOpen(true); setSwiping(false); setSwipeX(0); }
    }, 500);
  };

  const moveLongPress = (e: React.TouchEvent) => {
    const dx  = e.touches[0].clientX - touchStartX.current;
    const dy  = e.touches[0].clientY - touchStartY.current;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    // If clearly vertical — cancel long press, let scroll happen
    if (ady > adx * 1.8 && ady > 5) {
      cancelLongPress();
      didSwipe.current = true;
      return;
    }

    // ✅ Both own (swipe left) and incoming (swipe right)
    const swipeDir = isOwn ? dx < 0 : dx > 0;

    if (swipeDir && adx > 5) {
      cancelLongPress();
      didSwipe.current = true;
      // ✅ Prevent page scroll while swiping horizontally
      e.preventDefault();
      const clamped = isOwn ? Math.max(dx, -55) : Math.min(dx, 55);
      setSwiping(true);
      setSwipeX(clamped);
      // ✅ Trigger at 30px
      if (!swipeTriggered.current && adx > 30) {
        swipeTriggered.current = true;
        onReply?.(message);
      }
    }
  };

  const endLongPress = () => { cancelLongPress(); setSwiping(false); setSwipeX(0); };
  const cancelLongPress = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const handleCopy  = () => { if (message.text) copyToClipboard(message.text); setSheetOpen(false); };
  const handleReply = () => { onReply?.(message); setSheetOpen(false); };

  // ─── Reply preview inside bubble ──────────────────────────
  const replyPreview = replyToMessage ? (
    <div style={{
      borderLeft:      `3px solid ${isOwn ? "rgba(255,255,255,0.5)" : "#8B5CF6"}`,
      backgroundColor: isOwn ? "rgba(0,0,0,0.15)" : "rgba(139,92,246,0.1)",
      borderRadius:    "8px",
      padding:         "5px 8px",
      marginBottom:    "6px",
    }}>
      <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: isOwn ? "rgba(255,255,255,0.7)" : "#8B5CF6", marginBottom: "2px" }}>
        {replyToMessage.senderId === message.senderId
          ? (isOwn ? "You" : participant.name)
          : (isOwn ? participant.name : "You")}
      </p>
      <p style={{ margin: 0, fontSize: "12px", color: isOwn ? "rgba(255,255,255,0.65)" : "#A3A3C2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
        {replyToMessage.text ?? "Media"}
      </p>
    </div>
  ) : null;

  return (
    <>
      {/* ✅ Always in DOM — hides dot button on mobile */}
      <style>{`
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @media (max-width: 767px) { .msg-dot-btn { display: none !important; } }
      `}</style>

      {/* ── Bottom sheet (mobile) ── */}
      {sheetOpen && (
        <>
          <div onClick={() => setSheetOpen(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 300 }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#1C1C2E", borderRadius: "20px 20px 0 0", padding: "12px 0 32px", zIndex: 301, fontFamily: "'Inter', sans-serif", animation: "sheetUp 0.22s ease" }}>
            <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2A2A3D", margin: "0 auto 16px" }} />
            <div style={{ padding: "0 20px 12px", borderBottom: "1px solid #2A2A3D", marginBottom: "8px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#A3A3C2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{message.text ?? "Media"}</p>
            </div>
            {[
              { label: "Copy",   icon: <Copy size={18} color="#A3A3C2" strokeWidth={1.8} />,        action: handleCopy,                    danger: false },
              { label: "Reply",  icon: <CornerUpLeft size={18} color="#A3A3C2" strokeWidth={1.8} />, action: handleReply,                   danger: false },
              { label: "Cancel", icon: <X size={18} color="#EF4444" strokeWidth={1.8} />,            action: () => setSheetOpen(false),     danger: true  },
            ].map(({ label, icon, action, danger }) => (
              <button key={label} onClick={action}
                style={{ display: "flex", alignItems: "center", gap: "16px", width: "100%", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", color: danger ? "#EF4444" : "#FFFFFF", fontSize: "15px", fontFamily: "'Inter', sans-serif" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >{icon}{label}</button>
            ))}
          </div>
        </>
      )}

      {/* ── Row wrapper (bubble + dot button) ── */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); }}
        style={{
          display:       "flex",
          flexDirection: isOwn ? "row-reverse" : "row",
          alignItems:    "flex-end",
          gap:           "6px",
          alignSelf:     isOwn ? "flex-end" : "flex-start",
          maxWidth:      "80%",
        }}
      >
        {/* ── Desktop 3-dot button ── */}
        <div style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center" }}>
          <button
            onClick={() => setSheetOpen(true)}
            style={{
              background:    "none",
              border:        "none",
              cursor:        "pointer",
              color:         "#4A4A6A",
              padding:       "4px",
              borderRadius:  "6px",
              display:       "flex",
              alignItems:    "center",
              transition:    "color 0.15s",
            }}
            className="msg-dot-btn"
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#4A4A6A")}
          >
            <MoreVertical size={15} strokeWidth={1.8} />
          </button>

          {/* dot dropdown removed — uses bottom sheet instead */}
        </div>

        {/* ── Bubble ── */}
        <div
          onTouchStart={startLongPress}
          onTouchMove={moveLongPress}
          onTouchEnd={endLongPress}
          onTouchCancel={endLongPress}
          onContextMenu={(e) => { e.preventDefault(); setSheetOpen(true); }}
          style={{
            display:       "flex",
            flexDirection: isOwn ? "row-reverse" : "row",
            alignItems:    "flex-end",
            gap:           "8px",
            fontFamily:    "'Inter', sans-serif",
            transform:     `translateX(${swipeX}px)`,
            transition:    swiping ? "none" : "transform 0.25s ease",
            userSelect:    "none",
            WebkitUserSelect: "none",
            touchAction:   "pan-y",
          }}
        >
          {/* Avatar — incoming only */}
          {!isOwn && (
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "#2A2A3D" }}>
              {participant.avatarUrl
                ? <img src={participant.avatarUrl} alt={participant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontSize: "14px", fontWeight: 700 }}>{participant.name[0].toUpperCase()}</div>
              }
            </div>
          )}

          <div style={{ backgroundColor: isOwn ? "#8B5CF6" : "#1E1E2E", borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "8px 12px 6px", maxWidth: "100%", cursor: "pointer" }}>
            {/* ✅ Reply preview inside bubble */}
            {replyPreview}

            <p style={{ margin: 0, fontSize: "14px", color: "#FFFFFF", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {message.text}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "3px", marginTop: "3px" }}>
              <span style={{ fontSize: "10px", color: isOwn ? "rgba(255,255,255,0.55)" : "#4A4A6A", lineHeight: 1 }}>{time}</span>
              {isOwn && <ReadTick isRead={isRead} />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}