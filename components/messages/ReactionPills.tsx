"use client";

import { useEffect, useState } from "react";
import type { MessageReaction } from "@/lib/types/messages";

interface Props {
  reactions: MessageReaction[];
  isOwn:     boolean;
  onToggle?: (emoji: string) => void;
}

export function ReactionPills({ reactions, isOwn, onToggle }: Props) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes _rPillPop {
          0%   { transform: scale(0);    opacity: 0; }
          55%  { transform: scale(1.24); opacity: 1; }
          78%  { transform: scale(0.9);  opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes _rPillBump {
          0%   { transform: scale(1);    }
          32%  { transform: scale(1.28); }
          62%  { transform: scale(0.88); }
          100% { transform: scale(1);    }
        }
        @keyframes _rCount {
          from { transform: translateY(5px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        .r-pill { -webkit-tap-highlight-color: transparent; }
        .r-pill:active { opacity: 0.72; }
      `}</style>
      <div style={{
        display:        "flex",
        flexWrap:       "wrap",
        gap:            "4px",
        justifyContent: isOwn ? "flex-end" : "flex-start",
        paddingLeft:    isOwn ? 0 : "54px",
        paddingRight:   isOwn ? "10px" : 0,
      }}>
        {reactions.map((r) => (
          <ReactionPill key={r.emoji} reaction={r} onToggle={onToggle} />
        ))}
      </div>
    </>
  );
}

function ReactionPill({
  reaction,
  onToggle,
}: {
  reaction: MessageReaction;
  onToggle?: (emoji: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [bumping, setBumping] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClick = () => {
    if (bumping) return;
    setBumping(true);
    setTimeout(() => setBumping(false), 420);
    onToggle?.(reaction.emoji);
  };

  return (
    <button
      className="r-pill"
      onClick={handleClick}
      style={{
        display:         "flex",
        alignItems:      "center",
        gap:             "4px",
        padding:         "0",
        border:          "none",
        backgroundColor: "transparent",
        marginTop:       "-4px",
        cursor:          "pointer",
        fontFamily:      "'Inter', sans-serif",
        lineHeight:      1,
        animation:       !mounted
          ? undefined
          : bumping
          ? "_rPillBump 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards"
          : "_rPillPop  0.42s cubic-bezier(0.34,1.56,0.64,1) forwards",
        transform:       mounted ? undefined : "scale(0)",
        opacity:         mounted ? undefined : 0,
        transition:      "border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease",
      }}
    >
      <span style={{ fontSize: "20px", lineHeight: 1 }}>{reaction.emoji}</span>
      
    </button>
  );
}