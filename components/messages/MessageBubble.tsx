"use client";

import type { Message, Conversation } from "@/lib/types/messages";

interface Props {
  message:      Message;
  conversation: Conversation;
  isOwn:        boolean;
}

export function MessageBubble({ message, conversation, isOwn }: Props) {
  const { participant } = conversation;

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
      {/* Avatar — only for incoming */}
      {!isOwn && (
        <div
          style={{
            width:        "36px",
            height:       "36px",
            borderRadius: "50%",
            overflow:     "hidden",
            flexShrink:   0,
            backgroundColor: "#2A2A3D",
          }}
        >
          {participant.avatarUrl ? (
            <img
              src={participant.avatarUrl}
              alt={participant.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width:           "100%",
                height:          "100%",
                backgroundColor: "#8B5CF6",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                color:           "#FFFFFF",
                fontSize:        "14px",
                fontWeight:      700,
              }}
            >
              {participant.name[0].toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Bubble */}
      <div
        style={{
          backgroundColor: isOwn ? "#8B5CF6" : "#1E1E2E",
          borderRadius:    isOwn
            ? "18px 18px 4px 18px"
            : "18px 18px 18px 4px",
          padding:         "12px 16px",
          maxWidth:        "100%",
        }}
      >
        <p
          style={{
            margin:     0,
            fontSize:   "14px",
            color:      "#FFFFFF",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak:  "break-word",
          }}
        >
          {message.text}
        </p>
      </div>
    </div>
  );
}