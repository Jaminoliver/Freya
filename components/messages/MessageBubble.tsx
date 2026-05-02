"use client";

import { useState, useRef } from "react";
import { MoreVertical, Film } from "lucide-react";
import { ReadTick } from "@/components/messages/ReadTick";
import { MessageActionModal } from "@/components/messages/MessageActionModal";
import { ReactionPills } from "@/components/messages/ReactionPills";
import type { Message, Conversation } from "@/lib/types/messages";

interface Props {
  message:              Message;
  conversation:         Conversation;
  isOwn:                boolean;
  isRead:               boolean;
  isDelivered?:         boolean;
  time:                 string;
  onReply?:             (message: Message) => void;
  onDelete?:            (message: Message, deleteFor: "me" | "everyone") => void;
  onSelect?:            (messageId: number) => void;
  replyToMessage?:      Message | null;
  onStoryReplyClick?:   (storyId: number) => void;
  onScrollToMessage?:   (messageId: number) => void;
  onReact?:             (message: Message, emoji: string) => void;
}

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

export function MessageBubble({
  message, conversation, isOwn, isRead, isDelivered, time,
  onReply, onDelete, onSelect, replyToMessage, onStoryReplyClick, onScrollToMessage, onReact,
}: Props) {
  const { participant } = conversation;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [swipeX,    setSwipeX]    = useState(0);
  const [swiping,   setSwiping]   = useState(false);

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

  // ── Story reply preview ───────────────────────────────────────────────────
  const storyReplyId      = (message as any).storyReplyStoryId as number | null | undefined;
  const storyReplyThumb   = (message as any).storyReplyThumbnailUrl as string | null | undefined;
  const hasStoryReply     = !!storyReplyId;

  const storyReplyPreview = hasStoryReply ? (
    <div
      onClick={(e) => { e.stopPropagation(); if (storyReplyId) onStoryReplyClick?.(storyReplyId); }}
      style={{
        cursor:          "pointer",
        marginBottom:    8,
        borderRadius:    10,
        overflow:        "hidden",
        border:          `1px solid ${isOwn ? "rgba(255,255,255,0.18)" : "rgba(139,92,246,0.3)"}`,
        background:      isOwn ? "rgba(0,0,0,0.2)" : "rgba(139,92,246,0.08)",
        display:         "flex",
        alignItems:      "stretch",
        maxWidth:        220,
        transition:      "opacity 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {/* Thumbnail */}
      <div style={{ width: 52, height: 72, flexShrink: 0, position: "relative", backgroundColor: "#1C1C2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {storyReplyThumb ? (
          <img
            src={storyReplyThumb}
            alt="story"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <Film size={20} color="#6D6D8A" />
        )}
        {/* Overlay gradient */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 60%, rgba(0,0,0,0.35) 100%)" }} />
      </div>

      {/* Label */}
      <div style={{ flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: isOwn ? "rgba(255,255,255,0.5)" : "#8B5CF6", fontFamily: "Inter,sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Story
        </span>
        <span style={{ fontSize: 12, color: isOwn ? "rgba(255,255,255,0.75)" : "#C4B5FD", fontFamily: "Inter,sans-serif", fontWeight: 500, lineHeight: 1.3 }}>
          Tap to view
        </span>
      </div>
    </div>
  ) : null;

  // ── Normal reply preview ──────────────────────────────────────────────────
  const replyPreview = replyToMessage ? (
  <div onClick={(e) => { e.stopPropagation(); onScrollToMessage?.(replyToMessage.id); }} style={{ cursor: "pointer", borderLeft: `3px solid ${isOwn ? "rgba(255,255,255,0.5)" : "#8B5CF6"}`, backgroundColor: isOwn ? "rgba(0,0,0,0.15)" : "rgba(139,92,246,0.1)", borderRadius: "8px", padding: "5px 8px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: isOwn ? "rgba(255,255,255,0.7)" : "#8B5CF6", marginBottom: "2px" }}>
        {replyToMessage.senderId === message.senderId ? (isOwn ? "You" : participant.name) : (isOwn ? participant.name : "You")}
      </p>
      <p style={{ margin: 0, fontSize: "12px", color: isOwn ? "rgba(255,255,255,0.65)" : "#A3A3C2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
        {replyToMessage.text
          ? replyToMessage.text
          : replyToMessage.type === "gif"
          ? "GIF"
          : replyToMessage.type === "media" || replyToMessage.type === "ppv"
          ? (replyToMessage.mediaUrls?.[0]?.match(/\.(mp4|mov|webm|avi|mkv)(\?|$)/i) || replyToMessage.mediaUrls?.[0]?.includes("#video") ? "Video" : "Photo")
          : "Media"}
      </p>
    </div>

    {/* Thumbnail */}
    {replyToMessage.type === "gif" && replyToMessage.gifUrl && (
      <img src={replyToMessage.gifUrl} alt="GIF" style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
    )}
    {(replyToMessage.type === "media" || replyToMessage.type === "ppv") && replyToMessage.mediaUrls?.[message.replyToMediaIndex ?? 0] && (
      replyToMessage.mediaUrls[message.replyToMediaIndex ?? 0].match(/\.(mp4|mov|webm|avi|mkv)(\?|$)/i) || replyToMessage.mediaUrls[message.replyToMediaIndex ?? 0].includes("#video")
        ? <div style={{ width: "40px", height: "40px", borderRadius: "6px", backgroundColor: "#1C1C2E", flexShrink: 0, position: "relative", overflow: "hidden" }}>
            <video src={replyToMessage.mediaUrls[message.replyToMediaIndex ?? 0].replace("#video", "")} muted playsInline preload="metadata" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onLoadedMetadata={(e) => { (e.currentTarget as HTMLVideoElement).currentTime = 0.5; }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
        : <img src={replyToMessage.thumbnailUrl ?? replyToMessage.mediaUrls[message.replyToMediaIndex ?? 0]} alt="" style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
    )}
  </div>
) : null;

  if ((message as any).isDeleted) {
    return (
      <div style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-end", gap: "8px", alignSelf: isOwn ? "flex-end" : "flex-start", maxWidth: "80%" }}>
        {!isOwn && (
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "#2A2A3D" }}>
            {participant.avatarUrl
              ? <img src={participant.avatarUrl} alt={participant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontSize: "14px", fontWeight: 700 }}>{participant.name[0].toUpperCase()}</div>
            }
          </div>
        )}
        <div style={{ backgroundColor: isOwn ? "rgba(139,92,246,0.15)" : "rgba(30,30,46,0.5)", borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "8px 12px 6px", maxWidth: "100%", border: "1px solid rgba(74,74,106,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
              <circle cx="7" cy="7" r="6" stroke="#4A4A6A" strokeWidth="1.2"/>
              <path d="M4.5 9.5L9.5 4.5" stroke="#4A4A6A" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <p style={{ margin: 0, fontSize: "13px", color: "#4A4A6A", fontStyle: "italic", lineHeight: 1.5 }}>
              {isOwn ? "You deleted this message" : "This message was deleted"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "3px", marginTop: "3px" }}>
            <span style={{ fontSize: "10px", color: "#4A4A6A", lineHeight: 1, opacity: 0.6 }}>{time}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media (max-width: 767px) { .msg-dot-btn { display: none !important; } }
      `}</style>

      {sheetOpen && (
        <MessageActionModal
          message={message}
          isOwn={isOwn}
          onCopy={() => { if (message.text) copyToClipboard(message.text); }}
          onReply={() => onReply?.(message)}
          onDeleteForMe={() => onDelete?.(message, "me")}
          onDeleteForEveryone={() => onDelete?.(message, "everyone")}
          onSelect={onSelect}
          onReact={(emoji) => onReact?.(message, emoji)}
          onClose={() => setSheetOpen(false)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", alignSelf: isOwn ? "flex-end" : "flex-start", maxWidth: "80%", gap: "2px" }}>
      <div style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-end", gap: "6px" }}>
        <div style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center" }}>
          <button
            onClick={() => setSheetOpen(true)}
            className="msg-dot-btn"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#4A4A6A", padding: "4px", borderRadius: "6px", display: "flex", alignItems: "center", transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#4A4A6A")}
          >
            <MoreVertical size={15} strokeWidth={1.8} />
          </button>
        </div>

        <div
          onTouchStart={startLongPress}
          onTouchMove={moveLongPress}
          onTouchEnd={endLongPress}
          onTouchCancel={endLongPress}
          onContextMenu={(e) => { e.preventDefault(); setSheetOpen(true); }}
          style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-end", gap: "8px", fontFamily: "'Inter', sans-serif", transform: `translateX(${swipeX}px)`, transition: swiping ? "none" : "transform 0.25s ease", userSelect: "none", WebkitUserSelect: "none", touchAction: "pan-y" }}
        >
          {!isOwn && (
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "#2A2A3D" }}>
              {participant.avatarUrl
                ? <img src={participant.avatarUrl} alt={participant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontSize: "14px", fontWeight: 700 }}>{participant.name[0].toUpperCase()}</div>
              }
            </div>
          )}

          <div style={{ backgroundColor: isOwn ? "#8B5CF6" : "#1E1E2E", borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "8px 12px 6px", maxWidth: "100%", cursor: "pointer" }}>
            {storyReplyPreview}
            {replyPreview}
            <p style={{ margin: 0, fontSize: "14px", color: "#FFFFFF", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {message.text}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "3px", marginTop: "3px" }}>
              <span style={{ fontSize: "10px", color: isOwn ? "rgba(255,255,255,0.55)" : "#4A4A6A", lineHeight: 1 }}>{time}</span>
              {isOwn && <ReadTick status={message.status} isDelivered={isDelivered} isRead={isRead} />}
            </div>
          </div>
        </div>
      </div>
      <ReactionPills reactions={message.reactions ?? []} isOwn={isOwn} onToggle={(emoji) => onReact?.(message, emoji)} />
      </div>
    </>
  );
}