"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ImageIcon, Star, Pin, BellOff } from "lucide-react";
import { ConversationActionModal } from "@/components/messages/ConversationActionModal";
import { updateConversations } from "@/app/(main)/messages/page";
import type { Conversation } from "@/lib/types/messages";
import { useCreatorStory } from "@/lib/hooks/useCreatorStory";
import { AvatarWithStoryRing } from "@/components/ui/AvatarWithStoryRing";
import StoryViewer from "@/components/story/StoryViewer";

interface Props {
  conversation:  Conversation;
  isActive:      boolean;
  isTyping?:     boolean;
  isFavourited?: boolean;
  onSelect:      () => void;
}

const prefetchMap = new Map<number, any[]>();

export function ConversationRow({ conversation, isActive, isTyping = false, isFavourited = false, onSelect }: Props) {
  const { participant, lastMessage, lastMessageAt, unreadCount, hasMedia, isPinned, isMuted } = conversation;
  const router = useRouter();

  const [hovered,        setHovered]        = useState(false);
  const [modalOpen,      setModalOpen]      = useState(false);
  const [menuPos,        setMenuPos]        = useState({ x: 0, y: 0 });
  const [imgBroken,      setImgBroken]      = useState(false);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);

  const { group, hasStory, hasUnviewed, refresh } = useCreatorStory(participant.id);

  const rowRef         = useRef<HTMLDivElement>(null);
  const touchStartY    = useRef<number>(0);
  const touchStartX    = useRef<number>(0);
  const didScroll      = useRef<boolean>(false);
  const longPressFired = useRef<boolean>(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasTouched     = useRef<boolean>(false);

  const openMenu = (x: number, y: number) => {
    setMenuPos({ x, y });
    setModalOpen(true);
  };

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current    = e.touches[0].clientY;
      touchStartX.current    = e.touches[0].clientX;
      didScroll.current      = false;
      longPressFired.current = false;
      wasTouched.current     = true;

      longPressTimer.current = setTimeout(() => {
        if (didScroll.current) return;
        longPressFired.current = true;

        const eatClick = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault(); document.removeEventListener("click", eatClick, true); };
        document.addEventListener("click", eatClick, true);
        const eatTouchEnd = (ev: TouchEvent) => { ev.stopPropagation(); document.removeEventListener("touchend", eatTouchEnd, true); };
        document.addEventListener("touchend", eatTouchEnd, true);

        openMenu(touchStartX.current, touchStartY.current);
      }, 500);
    };

    const onTouchMove = (e: TouchEvent) => {
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
      if (dy > 6 || dx > 6) {
        didScroll.current = true;
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (longPressFired.current) { longPressFired.current = false; return; }
      const avatarEl = (el as HTMLElement).querySelector("[data-avatar-ring]");
      if (avatarEl && avatarEl.contains(e.target as Node)) return;
      if (!didScroll.current) onSelect();
      setTimeout(() => { wasTouched.current = false; }, 50);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove",  onTouchMove,  { passive: true });
    el.addEventListener("touchend",   onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
    };
  }, [onSelect]);

  const handleClick = () => {
    if (wasTouched.current) return;
    onSelect();
  };

  const handleCleared = () => {
    if (isActive) router.push("/messages");
  };

  const formattedTime = (() => {
    if (!lastMessageAt) return "";
    const date = new Date(lastMessageAt);
    if (isNaN(date.getTime())) return lastMessageAt;
    const now    = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffM  = Math.floor(diffMs / 60000);
    const diffH  = Math.floor(diffMs / 3600000);
    const diffD  = Math.floor(diffMs / 86400000);
    if (diffM < 1)   return "now";
    if (diffM < 60)  return `${diffM}m`;
    if (diffH < 24)  return `${diffH}h`;
    if (diffD === 1) return "Yesterday";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  })();

  // ── Colors matched to notification page ──────────────────────────────────
  const bg = isActive
    ? "#111120"
    : hovered
    ? "#0D0D1A"
    : "transparent";

  const showInitial = !participant.avatarUrl || imgBroken;

  return (
    <>
      <style>{`
        .conv-row, .conv-row * {
          -webkit-user-select:   none !important;
          -moz-user-select:      none !important;
          user-select:           none !important;
          -webkit-touch-callout: none !important;
        }
        .conv-row { touch-action: pan-y; -webkit-tap-highlight-color: transparent; }
        .conv-row:not(.conv-row--active):active { background-color: #0D0D1A !important; }
      `}</style>

      {modalOpen && (
        <ConversationActionModal
          conversationId={conversation.id}
          participant={participant}
          isPinned={isPinned}
          isArchived={conversation.isArchived}
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setModalOpen(false)}
          onCleared={handleCleared}
        />
      )}

      <div
        ref={rowRef}
        className={`conv-row${isActive ? " conv-row--active" : ""}`}
        onClick={handleClick}
        onMouseEnter={() => {
  setHovered(true);
  if (!prefetchMap.has(conversation.id)) {
    fetch(`/api/conversations/${conversation.id}/messages`)
      .then(r => r.json())
      .then(d => prefetchMap.set(conversation.id, d.messages ?? []));
  }
}}
        onMouseLeave={() => setHovered(false)}
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu(e.clientX, e.clientY);
        }}
        style={{
          display:                 "flex",
          alignItems:              "center",
          gap:                     "12px",
          padding:                 "14px 20px",
          cursor:                  "pointer",
          backgroundColor:         bg,
          borderBottom:            "1px solid #1A1A2A",
          transition:              "background-color 0.15s ease",
          position:                "relative",
          fontFamily:              "'Inter', sans-serif",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* Unread left bar — matching notification page */}
        {unreadCount > 0 && (
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: "3px", backgroundColor: "#8B5CF6", borderRadius: "0 2px 2px 0",
          }} />
        )}

        <div style={{ position: "relative", flexShrink: 0 }}>
          {storyViewerOpen && group && (
            <StoryViewer groups={[group]} startGroupIndex={0} onClose={() => { setStoryViewerOpen(false); refresh(); }} />
          )}
          <AvatarWithStoryRing
            src={participant.avatarUrl ?? null}
            alt={participant.name}
            size={52}
            hasStory={hasStory}
            hasUnviewed={hasUnviewed}
            borderColor="#0A0A0F"
            data-avatar-ring
            onClick={(e) => { e.stopPropagation(); if (hasStory && group) setStoryViewerOpen(true); }}
          />
          {participant.isOnline && (
            <div style={{ position: "absolute", bottom: "1px", right: "1px", width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#10B981", border: "2px solid #0A0A0F", zIndex: 10 }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}>
              {participant.name}
            </span>
            {participant.isVerified && <Sparkles size={13} color="#8B5CF6" strokeWidth={1.8} />}
            <span style={{ fontSize: "12px", color: "#8B5CF6", whiteSpace: "nowrap" }}>
              @{participant.username}
            </span>
            {isFavourited && <Star size={12} color="#F59E0B" fill="#F59E0B" strokeWidth={0} style={{ flexShrink: 0 }} />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {!isTyping && hasMedia && <ImageIcon size={12} color="#6B6B8A" strokeWidth={1.8} />}
            <span style={{ fontSize: "13px", color: isTyping ? "#8B5CF6" : "#6B6B8A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px", fontStyle: isTyping ? "italic" : "normal", fontWeight: unreadCount > 0 ? 600 : 400 }}>
              {isTyping ? "typing..." : lastMessage}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {isPinned && <Pin size={11} color="#4A4A6A" strokeWidth={1.8} style={{ transform: "rotate(45deg)" }} />}
            <span style={{ fontSize: "12px", color: unreadCount > 0 ? "#8B5CF6" : "#4A4A6A", fontWeight: unreadCount > 0 ? 500 : 400 }}>
              {formattedTime}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {isMuted && <BellOff size={12} color="#4A4A6A" strokeWidth={1.6} />}
            {unreadCount > 0 && (
              <div style={{ minWidth: "18px", height: "18px", borderRadius: "9px", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", fontSize: "11px", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </div>
            )}
          </div>
        </div>

        {hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); openMenu(e.clientX, e.clientY); }}
            style={{ position: "absolute", top: "10px", right: "12px", background: "none", border: "none", cursor: "pointer", color: "#4A4A6A", display: "flex", alignItems: "center", padding: "2px", transition: "color 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#6B6B8A")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#4A4A6A")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="2"  r="1.2" fill="currentColor"/>
              <circle cx="7" cy="7"  r="1.2" fill="currentColor"/>
              <circle cx="7" cy="12" r="1.2" fill="currentColor"/>
            </svg>
          </button>
        )}
      </div>
    </>
  );
}