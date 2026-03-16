"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { MediaGrid } from "@/components/messages/MediaGrid";
import { TypingBubble } from "@/components/messages/TypingBubble";
import type { Message, Conversation } from "@/lib/types/messages";

interface Props {
  messages:       Message[];
  conversation:   Conversation;
  currentUserId?: string;
  isTyping?:      boolean;
  onReply?:       (message: Message) => void;
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

function formatMessageTime(raw: string): string {
  if (!raw) return "";
  const date = new Date(raw);
  if (isNaN(date.getTime())) return raw;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
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

export function MessagesList({ messages, conversation, currentUserId = "me", isTyping = false, onReply }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  return (
    <div style={{
      flex:                    1,
      minHeight:               0,
      overflowY:               messages.length > 0 || isTyping ? "auto" : "hidden",
      overflowX:               "hidden",
      padding:                 "80px 16px 100px",
      display:                 "flex",
      flexDirection:           "column",
      gap:                     "4px",
      scrollbarWidth:          "none",
      overscrollBehavior:      "contain",
      touchAction:             "pan-y",
      WebkitOverflowScrolling: "touch" as any,
      fontFamily:              "'Inter',sans-serif",
    }}>
      {messages.map((msg, i) => {
        const isOwn       = msg.senderId === currentUserId;
        const prevMsg     = messages[i - 1];
        const isSameGroup = prevMsg && prevMsg.senderId === msg.senderId;
        const showTime    = !prevMsg || (
          new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000
        );

        return (
          <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: isSameGroup ? "2px" : "10px" }}>
            {showTime && (
              <div style={{ textAlign: "center", margin: "6px 0" }}>
                <span style={{ fontSize: "11px", color: "#4A4A6A" }}>{formatMessageTime(msg.createdAt)}</span>
              </div>
            )}

            {msg.type === "text" && (
              <MessageBubble
                message={msg}
                conversation={conversation}
                isOwn={isOwn}
                isRead={msg.isRead ?? false}
                time={formatMessageTime(msg.createdAt)}
                onReply={onReply}
                replyToMessage={msg.replyToId ? messages.find((m) => m.id === msg.replyToId) ?? null : null}
              />
            )}

            {(msg.type === "media" || msg.type === "ppv") && msg.mediaUrls && (
              <div style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-end", gap: "8px", maxWidth: "75%", alignSelf: isOwn ? "flex-end" : "flex-start" }}>
                {!isOwn && !isSameGroup && <InlineAvatar src={conversation.participant.avatarUrl} name={conversation.participant.name} />}
                {!isOwn && isSameGroup  && <div style={{ width: "36px", flexShrink: 0 }} />}

                <div style={{ backgroundColor: "#1E1E2E", borderRadius: "12px", overflow: "hidden", width: "280px" }}>
                  <MediaGrid mediaUrls={msg.mediaUrls} isPPV={msg.type === "ppv"} price={msg.ppv?.price} isUnlocked={msg.ppv?.isUnlocked} />
                  {msg.text && (
                    <div style={{ padding: "8px 12px 4px" }}>
                      <p style={{ margin: 0, fontSize: "13px", color: "#A3A3C2", lineHeight: 1.4 }}>{msg.text}</p>
                    </div>
                  )}
                  {msg.type === "ppv" && msg.ppv && !msg.ppv.isUnlocked && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderTop: "1px solid #2A2A3D" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#F5A623" }}>₦{msg.ppv.price.toLocaleString()} to unlock</span>
                      <button style={{ padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer", backgroundColor: "#8B5CF6", color: "#FFFFFF", fontSize: "13px", fontWeight: 600, fontFamily: "'Inter',sans-serif" }}>Unlock</button>
                    </div>
                  )}
                  {msg.type === "ppv" && msg.ppv && isOwn && (
                    <div style={{ padding: "4px 12px 8px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                      <span style={{ fontSize: "11px", color: "#4A4A6A" }}>₦{msg.ppv.price.toLocaleString()} · {msg.ppv.unlockedCount} unlocked</span>
                      <ReadTick isRead={msg.isRead ?? false} />
                    </div>
                  )}
                  {isOwn && msg.type !== "ppv" && (
                    <div style={{ padding: "2px 8px 6px", display: "flex", justifyContent: "flex-end" }}>
                      <ReadTick isRead={msg.isRead ?? false} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {isTyping && <TypingBubble />}
      <div ref={bottomRef} />
    </div>
  );
}