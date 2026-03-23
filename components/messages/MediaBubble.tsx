"use client";

import { useState, useRef } from "react";
import { MediaGrid } from "@/components/messages/MediaGrid";
import { ReadTick } from "@/components/messages/ReadTick";
import { MessageActionModal } from "@/components/messages/MessageActionModal";
import type { Message, Conversation } from "@/lib/types/messages";

interface InlineAvatarProps {
  src: string | null;
  name: string;
}

function InlineAvatar({ src, name }: InlineAvatarProps) {
  return (
    <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "#2A2A3D" }}>
      {src
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: "14px", fontWeight: 700 }}>{name[0].toUpperCase()}</div>
      }
    </div>
  );
}

interface Props {
  msg:           Message;
  isOwn:         boolean;
  isSameGroup:   boolean;
  conversation:  Conversation;
  mediaItems:    { url: string; type: "image" | "video" }[];
  unlocking:     Set<number>;
  currentUserId: string;
  onReply?:      (msg: Message) => void;
  onDelete?:     (msg: Message, deleteFor: "me" | "everyone") => void;
  onUnlock:      (msg: Message) => void;
  onOpenLightbox:(msg: Message, i: number) => void;
}

export function MediaBubble({
  msg,
  isOwn,
  isSameGroup,
  conversation,
  mediaItems,
  unlocking,
  currentUserId,
  onReply,
  onDelete,
  onUnlock,
  onOpenLightbox,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMove        = useRef(false);

  const startPress = () => {
    didMove.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!didMove.current) setSheetOpen(true);
    }, 500);
  };

  const cancelPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const onMove = () => {
    didMove.current = true;
    cancelPress();
  };

  return (
    <>
      {sheetOpen && (
        <MessageActionModal
          message={msg}
          isOwn={isOwn}
          onCopy={() => {}}
          onReply={() => { onReply?.(msg); setSheetOpen(false); }}
          onDeleteForMe={() => { onDelete?.(msg, "me"); setSheetOpen(false); }}
          onDeleteForEveryone={() => { onDelete?.(msg, "everyone"); setSheetOpen(false); }}
          onClose={() => setSheetOpen(false)}
        />
      )}

      <div
        onTouchStart={startPress}
        onTouchMove={onMove}
        onTouchEnd={cancelPress}
        onTouchCancel={cancelPress}
        onContextMenu={(e) => { e.preventDefault(); setSheetOpen(true); }}
        style={{
          display:           "flex",
          flexDirection:     isOwn ? "row-reverse" : "row",
          alignItems:        "flex-end",
          gap:               "8px",
          maxWidth:          "75%",
          userSelect:        "none",
          WebkitUserSelect:  "none",
          // @ts-ignore
          WebkitTouchCallout: "none",
        }}
      >
        {!isOwn && !isSameGroup && (
          <InlineAvatar src={conversation.participant.avatarUrl} name={conversation.participant.name} />
        )}
        {!isOwn && isSameGroup && <div style={{ width: "36px", flexShrink: 0 }} />}

        <div style={{ backgroundColor: "#1E1E2E", borderRadius: "12px", overflow: "hidden", width: "280px" }}>
          <MediaGrid
            mediaItems={mediaItems}
            isPPV={msg.type === "ppv"}
            price={msg.ppv?.price}
            isUnlocked={isOwn || msg.ppv?.isUnlocked}
            thumbnailUrl={msg.thumbnailUrl}
            onClickItem={(i) => onOpenLightbox(msg, i)}
            isSending={msg.status === "sending"}
            uploadProgress={msg.uploadProgress}
            isFailed={msg.status === "failed"}
          />

          {msg.text && (
            <div style={{ padding: "8px 12px 4px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#A3A3C2", lineHeight: 1.4 }}>{msg.text}</p>
            </div>
          )}

          {msg.type === "ppv" && msg.ppv && !msg.ppv.isUnlocked && !isOwn && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderTop: "1px solid #2A2A3D" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#F5A623" }}>
                ₦{(msg.ppv.price / 100).toLocaleString()} to unlock
              </span>
              <button
                onClick={() => onUnlock(msg)}
                disabled={unlocking.has(msg.id)}
                style={{
                  padding:         "6px 14px",
                  borderRadius:    "20px",
                  border:          "none",
                  cursor:          unlocking.has(msg.id) ? "default" : "pointer",
                  backgroundColor: unlocking.has(msg.id) ? "#4A4A6A" : "#8B5CF6",
                  color:           "#FFFFFF",
                  fontSize:        "13px",
                  fontWeight:      600,
                  fontFamily:      "'Inter', sans-serif",
                  transition:      "background-color 0.15s",
                }}
              >
                {unlocking.has(msg.id) ? "Unlocking..." : "Unlock"}
              </button>
            </div>
          )}

          {msg.type === "ppv" && msg.ppv && isOwn && (
            <div style={{ padding: "4px 12px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", color: "#4A4A6A" }}>
                ₦{(msg.ppv.price / 100).toLocaleString()} · {msg.ppv.unlockedCount} unlocked
              </span>
              <ReadTick status={msg.status} isDelivered={msg.isDelivered} isRead={msg.isRead ?? false} />
            </div>
          )}

          {msg.type === "ppv" && msg.ppv?.isUnlocked && !isOwn && (
            <div style={{ padding: "6px 12px 8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L5.5 10.5L12 3" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: "12px", color: "#10B981", fontWeight: 600 }}>Unlocked</span>
              <span style={{ fontSize: "12px", color: "#4A4A6A" }}>· ₦{(msg.ppv.price / 100).toLocaleString()} paid</span>
            </div>
          )}

          {isOwn && msg.type !== "ppv" && (
            <div style={{ padding: "2px 8px 6px", display: "flex", justifyContent: "flex-end" }}>
              <ReadTick status={msg.status} isDelivered={msg.isDelivered} isRead={msg.isRead ?? false} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}