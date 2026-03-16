"use client";

import { useRef, useState } from "react";
import { Sparkles, X, ImageIcon } from "lucide-react";
import type { Conversation } from "@/lib/types/messages";

interface Props {
  conversation: Conversation;
  isActive:     boolean;
  isTyping?:    boolean;
  onSelect:     () => void;
}

export function ConversationRow({ conversation, isActive, isTyping = false, onSelect }: Props) {
  const { participant, lastMessage, lastMessageAt, unreadCount, hasMedia } = conversation;

  const [hovered,  setHovered]  = useState(false);
  const [touching, setTouching] = useState(false);

  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const didScroll   = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    didScroll.current   = false;
    setTouching(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    if (dy > 6 || dx > 6) {
      didScroll.current = true;
      setTouching(false);
    }
  };

  const handleTouchEnd = () => {
    setTouching(false);
    if (!didScroll.current) onSelect();
  };

  const formattedTime = (() => {
    if (!lastMessageAt) return "";
    const date = new Date(lastMessageAt);
    if (isNaN(date.getTime())) return lastMessageAt;
    const now   = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffM  = Math.floor(diffMs / 60000);
    const diffH  = Math.floor(diffMs / 3600000);
    const diffD  = Math.floor(diffMs / 86400000);
    if (diffM < 1)  return "now";
    if (diffM < 60) return `${diffM}m`;
    if (diffH < 24) return `${diffH}h`;
    if (diffD === 1) return "Yesterday";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  })();

  const bg = isActive
    ? "#1C1C2E"
    : touching || hovered
    ? "#14141F"
    : "transparent";

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:                 "flex",
        alignItems:              "center",
        gap:                     "12px",
        padding:                 "14px 16px",
        cursor:                  "pointer",
        backgroundColor:         bg,
        borderBottom:            "1px solid #1E1E2E",
        transition:              "background-color 0.15s ease",
        position:                "relative",
        fontFamily:              "'Inter', sans-serif",
        WebkitTapHighlightColor: "transparent",
        userSelect:              "none",
      }}
    >
      {/* Avatar + online dot */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", overflow: "hidden", backgroundColor: "#2A2A3D" }}>
          {participant.avatarUrl ? (
            <img src={participant.avatarUrl} alt={participant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontSize: "18px", fontWeight: 700 }}>
              {participant.name[0].toUpperCase()}
            </div>
          )}
        </div>
        {participant.isOnline && (
          <div style={{ position: "absolute", bottom: "1px", right: "1px", width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#10B981", border: "2px solid #0D0D1A" }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}>
            {participant.name}
          </span>
          {participant.isVerified && <Sparkles size={13} color="#8B5CF6" strokeWidth={1.8} />}
          {/* ✅ Username → purple (#8B5CF6) */}
          <span style={{ fontSize: "12px", color: "#8B5CF6", whiteSpace: "nowrap" }}>
            @{participant.username}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {!isTyping && hasMedia && <ImageIcon size={12} color="#A3A3C2" strokeWidth={1.8} />}
          {/* ✅ Last message → lighter (#A3A3C2) */}
          <span style={{ fontSize: "13px", color: isTyping ? "#8B5CF6" : "#A3A3C2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px", fontStyle: isTyping ? "italic" : "normal", fontWeight: unreadCount > 0 ? 600 : 400 }}>
            {isTyping ? "typing..." : lastMessage}
          </span>
        </div>
      </div>

      {/* Right — timestamp + unread */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
        <span style={{ fontSize: "12px", color: unreadCount > 0 ? "#8B5CF6" : "#4A4A6A", fontWeight: unreadCount > 0 ? 500 : 400 }}>
          {formattedTime}
        </span>
        {unreadCount > 0 && (
          <div style={{
            minWidth:        "18px",
            height:          "18px",
            borderRadius:    "9px",
            backgroundColor: "#8B5CF6",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            padding:         "0 5px",
            fontSize:        "11px",
            fontWeight:      700,
            color:           "#FFFFFF",
            fontFamily:      "'Inter', sans-serif",
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </div>

      {/* Dismiss X — desktop hover only */}
      {hovered && (
        <button
          onClick={(e) => e.stopPropagation()}
          style={{ position: "absolute", top: "10px", right: "12px", background: "none", border: "none", cursor: "pointer", color: "#4A4A6A", display: "flex", alignItems: "center", padding: "2px", transition: "color 0.15s ease" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#A3A3C2")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#4A4A6A")}
        >
          <X size={14} strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}