// components/messages/TipMessage.tsx
"use client";

import { useState } from "react";
import type { Message, Conversation } from "@/lib/types/messages";

interface Props {
  message:      Message;
  conversation: Conversation;
  isOwn:        boolean;
  time:         string;
}

export function TipMessage({ message, conversation, isOwn, time }: Props) {
  const [bounced, setBounced] = useState(false);

  if (!message.tip) return null;

  const amountNaira = (message.tip.amount / 100).toLocaleString("en-NG");
  const participantName = conversation.participant.name;

  const headline = isOwn
    ? `You tipped ${participantName}`
    : `${participantName} tipped you`;

  return (
    <div
      style={{
        display:        "flex",
        justifyContent: "center",
        width:          "100%",
        padding:        "6px 0",
        fontFamily:     "'Inter', sans-serif",
      }}
    >
      <style>{`
        @keyframes tipPulse {
          0%   { transform: scale(1);   box-shadow: 0 4px 20px rgba(245,166,35,0.25); }
          50%  { transform: scale(1.04); box-shadow: 0 6px 28px rgba(245,166,35,0.45); }
          100% { transform: scale(1);   box-shadow: 0 4px 20px rgba(245,166,35,0.25); }
        }
        @keyframes tipShine {
          0%   { left: -80%; }
          100% { left: 130%; }
        }
        .tip-bubble-root {
          animation: tipPulse 2.4s ease-in-out 1;
        }
      `}</style>

      <div
        className="tip-bubble-root"
        onMouseEnter={() => setBounced(true)}
        onMouseLeave={() => setBounced(false)}
        style={{
          position:       "relative",
          display:        "flex",
          alignItems:     "center",
          gap:            "10px",
          padding:        "10px 16px",
          borderRadius:   "24px",
          background:     "linear-gradient(135deg, #F5A623, #F97316)",
          boxShadow:      "0 4px 20px rgba(245,166,35,0.3)",
          overflow:       "hidden",
          maxWidth:       "85%",
          transform:      bounced ? "scale(1.03)" : "scale(1)",
          transition:     "transform 0.15s ease",
        }}
      >
        {/* Sweep shine */}
        <span style={{
          position:      "absolute",
          top:           0,
          left:          "-80%",
          width:         "40%",
          height:        "100%",
          background:    "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
          transform:     "skewX(-20deg)",
          animation:     "tipShine 2.8s ease-in-out 1",
          pointerEvents: "none",
        }} />

        {/* Banknote icon */}
        <div style={{
          width:          "32px",
          height:         "32px",
          borderRadius:   "50%",
          backgroundColor: "rgba(255,255,255,0.22)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          flexShrink:     0,
          position:       "relative",
          zIndex:         1,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="2.5" />
            <path d="M6 12h.01M18 12h.01" />
          </svg>
        </div>

        {/* Text */}
        <div style={{
          display:       "flex",
          flexDirection: "column",
          gap:           "2px",
          minWidth:      0,
          position:      "relative",
          zIndex:        1,
        }}>
          <span style={{
            fontSize:      "11px",
            fontWeight:    600,
            color:         "rgba(255,255,255,0.85)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            lineHeight:    1,
          }}>
            {headline}
          </span>
          <span style={{
            fontSize:   "18px",
            fontWeight: 800,
            color:      "#FFFFFF",
            letterSpacing: "-0.3px",
            lineHeight: 1.1,
          }}>
            ₦{amountNaira}
          </span>
        </div>

        {/* Time */}
        <span style={{
          fontSize:   "10px",
          color:      "rgba(255,255,255,0.7)",
          marginLeft: "4px",
          flexShrink: 0,
          position:   "relative",
          zIndex:     1,
        }}>
          {time}
        </span>
      </div>
    </div>
  );
}