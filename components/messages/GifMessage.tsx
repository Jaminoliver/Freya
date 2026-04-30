// components/messages/GifMessage.tsx
"use client";

import { useState, useRef } from "react";
import { MoreVertical, Bookmark } from "lucide-react";
import { MessageActionModal } from "@/components/messages/MessageActionModal";
import { ReadTick } from "@/components/messages/ReadTick";
import type { Message, Conversation } from "@/lib/types/messages";

interface Props {
  message:         Message;
  conversation:    Conversation;
  isOwn:           boolean;
  time:            string;
  isSameGroup?:    boolean;
  onClick?:        () => void;
  onReply?:        (message: Message) => void;
  onDelete?:       (message: Message, deleteFor: "me" | "everyone") => void;
  onSelect?:       (messageId: number) => void;
  onSaveGif?:      (gifUrl: string) => void;
  replyToMessage?: Message | null;
}

export function GifMessage({ message, conversation, isOwn, time, isSameGroup, onClick, onReply, onDelete, onSelect, onSaveGif, replyToMessage }: Props) {
  const { participant } = conversation;
  const [loaded,     setLoaded]     = useState(false);
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [swipeX,     setSwipeX]     = useState(0);
  const [swiping,    setSwiping]    = useState(false);

  const longPressTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX      = useRef(0);
  const touchStartY      = useRef(0);
  const didSwipe         = useRef(false);
  const swipeTriggered   = useRef(false);

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
    if (ady > adx * 1.8 && ady > 5) { cancelLongPress(); didSwipe.current = true; return; }
    const swipeDir = isOwn ? dx < 0 : dx > 0;
    if (swipeDir && adx > 5) {
      cancelLongPress();
      didSwipe.current = true;
      e.preventDefault();
      const clamped = isOwn ? Math.max(dx, -55) : Math.min(dx, 55);
      setSwiping(true);
      setSwipeX(clamped);
      if (!swipeTriggered.current && adx > 30) {
        swipeTriggered.current = true;
        onReply?.(message);
      }
    }
  };

  const endLongPress    = () => { cancelLongPress(); setSwiping(false); setSwipeX(0); };
  const cancelLongPress = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  if (!message.gifUrl) return null;

  return (
    <>
      <style>{`.gif-dot-btn { display: flex; } @media (max-width: 767px) { .gif-dot-btn { display: none !important; } }`}</style>

      {sheetOpen && (
        <MessageActionModal
          message={message}
          isOwn={isOwn}
          onCopy={() => {}}
          onReply={() => { onReply?.(message); setSheetOpen(false); }}
          onDeleteForMe={() => { onDelete?.(message, "me"); setSheetOpen(false); }}
          onDeleteForEveryone={() => { onDelete?.(message, "everyone"); setSheetOpen(false); }}
          onSelect={onSelect}
          onSaveGif={onSaveGif && message.gifUrl ? () => onSaveGif(message.gifUrl!) : undefined}
          onClose={() => setSheetOpen(false)}
        />
      )}

      <div
        style={{
          display:        "flex",
          flexDirection:  isOwn ? "row-reverse" : "row",
          alignItems:     "flex-end",
          gap:            "6px",
          alignSelf:      isOwn ? "flex-end" : "flex-start",
          maxWidth:       "80%",
          fontFamily:     "'Inter', sans-serif",
        }}
      >
        {/* Dot menu — desktop only */}
        <button
          className="gif-dot-btn"
          onClick={() => setSheetOpen(true)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#4A4A6A", padding: "4px", borderRadius: "6px", alignItems: "center", transition: "color 0.15s", flexShrink: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#4A4A6A")}
        >
          <MoreVertical size={15} strokeWidth={1.8} />
        </button>
      

      <div
        onTouchStart={startLongPress}
        onTouchMove={moveLongPress}
        onTouchEnd={endLongPress}
        onTouchCancel={endLongPress}
        onContextMenu={(e) => { e.preventDefault(); setSheetOpen(true); }}
        style={{
          transform:  `translateX(${swipeX}px)`,
          transition: swiping ? "none" : "transform 0.25s ease",
          touchAction: "pan-y",
          display:    "flex",
          flexDirection: isOwn ? "row-reverse" : "row",
          alignItems: "flex-end",
          gap:        "8px",
        }}
      >
        {!isOwn && !isSameGroup && (
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "#2A2A3D" }}>
            {participant.avatarUrl
              ? <img src={participant.avatarUrl} alt={participant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontSize: "14px", fontWeight: 700 }}>{participant.name[0].toUpperCase()}</div>
            }
          </div>
        )}
        {!isOwn && isSameGroup && <div style={{ width: "36px", flexShrink: 0 }} />}

        <div
          onClick={onClick}
          style={{
            position:        "relative",
            borderRadius:    "14px",
            overflow:        "hidden",
            backgroundColor: "#1C1C2E",
            width:           "220px",
            minHeight:       loaded ? undefined : "160px",
            cursor:          onClick ? "pointer" : "default",
            boxShadow:       "0 2px 10px rgba(0,0,0,0.25)",
          }}
        >
        <style>{`
          @keyframes gifFade { from { opacity: 0; } to { opacity: 1; } }
          @keyframes gifSkeletonPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        `}</style>

        {console.log("[GIF REPLY] replyToMessage:", replyToMessage, "msg.replyToId:", message.replyToId) as any}
        {replyToMessage && (
          <div style={{ borderLeft: "3px solid #8B5CF6", backgroundColor: "rgba(139,92,246,0.15)", margin: "8px 8px 4px", borderRadius: "6px", padding: "5px 8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#8B5CF6", marginBottom: "2px" }}>
                {replyToMessage.senderId === message.senderId ? (isOwn ? "You" : conversation.participant.name) : (isOwn ? conversation.participant.name : "You")}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#A3A3C2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {replyToMessage.text
                  ? replyToMessage.text
                  : replyToMessage.type === "gif" ? "GIF"
                  : replyToMessage.type === "media" || replyToMessage.type === "ppv" ? "Photo"
                  : "Media"}
              </p>
            </div>
            {replyToMessage.type === "gif" && replyToMessage.gifUrl && (
              <img src={replyToMessage.gifUrl} alt="GIF" style={{ width: "36px", height: "36px", borderRadius: "4px", objectFit: "cover", flexShrink: 0 }} />
            )}
            {(replyToMessage.type === "media" || replyToMessage.type === "ppv") && replyToMessage.mediaUrls?.[message.replyToMediaIndex ?? 0] && (
              <img src={replyToMessage.mediaUrls[message.replyToMediaIndex ?? 0]} alt="" style={{ width: "36px", height: "36px", borderRadius: "4px", objectFit: "cover", flexShrink: 0 }} />
            )}
          </div>
        )}
        {!loaded && (
          <div style={{
            position:        "absolute",
            inset:           0,
            backgroundColor: "#1C1C2E",
            backgroundImage: "linear-gradient(90deg, #1C1C2E, #24243B, #1C1C2E)",
            backgroundSize:  "200% 100%",
            animation:       "gifSkeletonPulse 1.2s ease-in-out infinite",
          }} />
        )}

        <img
          src={message.gifUrl}
          alt="GIF"
          loading="lazy"
          draggable={false}
          onLoad={() => setLoaded(true)}
          style={{
            width:     "100%",
            height:    "auto",
            display:   "block",
            opacity:   loaded ? 1 : 0,
            animation: loaded ? "gifFade 0.25s ease both" : undefined,
          }}
        />

        {/* Time + ticks overlay */}
        <div style={{
          position:       "absolute",
          bottom:         "6px",
          right:          "8px",
          display:        "flex",
          alignItems:     "center",
          gap:            "4px",
          padding:        "3px 7px",
          borderRadius:   "10px",
          backgroundColor: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
        }}>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.9)", lineHeight: 1 }}>{time}</span>
          {isOwn && <ReadTick status={message.status} isDelivered={message.isDelivered} isRead={message.isRead ?? false} />}
        </div>

        {/* GIF badge */}
        <div style={{
          position:        "absolute",
          top:             "6px",
          left:            "8px",
          padding:         "2px 7px",
          borderRadius:    "6px",
          backgroundColor: "rgba(0,0,0,0.55)",
          backdropFilter:  "blur(4px)",
          fontSize:        "10px",
          fontWeight:      700,
          color:           "#FFFFFF",
          letterSpacing:   "0.4px",
          lineHeight:      1,
        }}>
          GIF
        </div>
      </div>
      </div>
    </div>
  </>
  );
}