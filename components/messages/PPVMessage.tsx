"use client";

import { Lock, CheckCircle } from "lucide-react";
import { MediaGrid } from "@/components/messages/MediaGrid";
import type { Message, Conversation } from "@/lib/types/messages";

interface Props {
  message:      Message;
  conversation: Conversation;
  isOwn:        boolean;
  onUnlock?:    (messageId: string) => void;
  onClickMedia?: (index: number) => void;
}

export function PPVMessage({ message, conversation, isOwn, onUnlock, onClickMedia }: Props) {
  if (!message.ppv || !message.mediaUrls) return null;

  const { price, isUnlocked, unlockedCount } = message.ppv;

  const mediaItems = (message.mediaUrls ?? []).filter(Boolean).map((url) => ({
    url,
    type: url.match(/\.(mp4|mov|webm|avi|mkv)(\?|$)/i) ? "video" as const : "image" as const,
  }));

  return (
    <div
      style={{
        display:       "flex",
        flexDirection: isOwn ? "row-reverse" : "row",
        alignItems:    "flex-end",
        gap:           "10px",
        maxWidth:      "75%",
        alignSelf:     isOwn ? "flex-end" : "flex-start",
        fontFamily:    "'Inter', sans-serif",
      }}
    >
      {!isOwn && (
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "#2A2A3D" }}>
          {conversation.participant.avatarUrl ? (
            <img src={conversation.participant.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: "14px", fontWeight: 700 }}>
              {conversation.participant.name[0].toUpperCase()}
            </div>
          )}
        </div>
      )}

      <div style={{ backgroundColor: "#1E1E2E", borderRadius: "12px", overflow: "hidden", width: "300px" }}>
        <MediaGrid
          mediaItems={mediaItems}
          isPPV
          price={price}
          isUnlocked={isOwn || isUnlocked}
          onClickItem={onClickMedia}
        />

        {message.text && (
          <div style={{ padding: "10px 14px 6px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#A3A3C2", lineHeight: 1.4 }}>{message.text}</p>
          </div>
        )}

        {!isOwn && !isUnlocked && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid #2A2A3D" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Lock size={14} color="#F5A623" strokeWidth={1.8} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#F5A623" }}>₦{price.toLocaleString()} to unlock</span>
            </div>
            <button
              onClick={() => onUnlock?.(String(message.id))}
              style={{ padding: "6px 16px", borderRadius: "20px", border: "none", cursor: "pointer", backgroundColor: "#8B5CF6", color: "#FFFFFF", fontSize: "13px", fontWeight: 600, fontFamily: "'Inter', sans-serif", transition: "opacity 0.15s ease" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Unlock
            </button>
          </div>
        )}

        {!isOwn && isUnlocked && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 14px", borderTop: "1px solid #2A2A3D" }}>
            <CheckCircle size={14} color="#10B981" strokeWidth={1.8} />
            <span style={{ fontSize: "13px", color: "#10B981", fontWeight: 500 }}>Unlocked</span>
            <span style={{ fontSize: "12px", color: "#4A4A6A", marginLeft: "auto" }}>₦{price.toLocaleString()} paid</span>
          </div>
        )}

        {isOwn && (
          <div style={{ padding: "6px 14px 10px" }}>
            <span style={{ fontSize: "11px", color: isUnlocked ? "#10B981" : "#4A4A6A" }}>
              Sent · ₦{price.toLocaleString()} · {unlockedCount} unlocked
            </span>
          </div>
        )}
      </div>
    </div>
  );
}