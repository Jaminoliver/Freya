"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { MediaGrid } from "@/components/messages/MediaGrid";
import type { Message, Conversation } from "@/lib/types/messages";

interface Props {
  messages:       Message[];
  conversation:   Conversation;
  currentUserId?: string;
}

function InlineAvatar({ src, name }: { src: string | null; name: string }) {
  return (
    <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "#2A2A3D" }}>
      {src
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: "14px", fontWeight: 700 }}>{name[0].toUpperCase()}</div>
      }
    </div>
  );
}

export function MessagesList({ messages, conversation, currentUserId = "me" }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 16px", display: "flex", flexDirection: "column", gap: "16px", scrollbarWidth: "none", fontFamily: "'Inter',sans-serif" }}>
      {messages.map((msg) => {
        const isOwn = msg.senderId === currentUserId;

        return (
          <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "11px", color: "#4A4A6A" }}>{msg.createdAt}</span>
            </div>

            {msg.type === "text" && (
              <MessageBubble message={msg} conversation={conversation} isOwn={isOwn} />
            )}

            {(msg.type === "media" || msg.type === "ppv") && msg.mediaUrls && (
              <div style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-end", gap: "10px", maxWidth: "75%", alignSelf: isOwn ? "flex-end" : "flex-start" }}>
                {!isOwn && <InlineAvatar src={conversation.participant.avatarUrl} name={conversation.participant.name} />}

                <div style={{ backgroundColor: "#1E1E2E", borderRadius: "12px", overflow: "hidden", width: "300px" }}>
                  <MediaGrid
                    mediaUrls={msg.mediaUrls}
                    isPPV={msg.type === "ppv"}
                    price={msg.ppv?.price}
                    isUnlocked={msg.ppv?.isUnlocked}
                  />

                  {msg.text && (
                    <div style={{ padding: "10px 14px 6px" }}>
                      <p style={{ margin: 0, fontSize: "13px", color: "#A3A3C2", lineHeight: 1.4 }}>{msg.text}</p>
                    </div>
                  )}

                  {msg.type === "ppv" && msg.ppv && !msg.ppv.isUnlocked && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid #2A2A3D" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#F5A623" }}>₦{msg.ppv.price.toLocaleString()} to unlock</span>
                      <button style={{ padding: "6px 16px", borderRadius: "20px", border: "none", cursor: "pointer", backgroundColor: "#8B5CF6", color: "#FFFFFF", fontSize: "13px", fontWeight: 600, fontFamily: "'Inter',sans-serif" }}>
                        Unlock
                      </button>
                    </div>
                  )}

                  {msg.type === "ppv" && msg.ppv && isOwn && (
                    <div style={{ padding: "4px 14px 10px" }}>
                      <span style={{ fontSize: "11px", color: "#4A4A6A" }}>
                        Sent · ₦{msg.ppv.price.toLocaleString()} · {msg.ppv.unlockedCount} unlocked
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}