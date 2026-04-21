// components/messages/GifMessage.tsx
"use client";

import { useState } from "react";
import { ReadTick } from "@/components/messages/ReadTick";
import type { Message, Conversation } from "@/lib/types/messages";

interface Props {
  message:        Message;
  conversation:   Conversation;
  isOwn:          boolean;
  time:           string;
  isSameGroup?:   boolean;
  onClick?:       () => void;
}

export function GifMessage({ message, conversation, isOwn, time, isSameGroup, onClick }: Props) {
  const { participant } = conversation;
  const [loaded, setLoaded] = useState(false);

  if (!message.gifUrl) return null;

  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  isOwn ? "row-reverse" : "row",
        alignItems:     "flex-end",
        gap:            "8px",
        alignSelf:      isOwn ? "flex-end" : "flex-start",
        maxWidth:       "80%",
        fontFamily:     "'Inter', sans-serif",
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
  );
}