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
      <style>{`
        .rp-wrap-receiver { padding-left: 74px; }
        .rp-wrap-own      { padding-right: 10px; }
        @media (max-width: 767px) {
          .rp-wrap-receiver { padding-left: 52px; }
          .rp-wrap-own      { padding-right: 10px; }
        }
      `}</style>
      <div className={isOwn ? "rp-wrap-own" : "rp-wrap-receiver"} style={{
        display:        "flex",
        flexWrap:       "wrap",
        gap:            "4px",
        justifyContent: isOwn ? "flex-end" : "flex-start",
      }}>
        {reactions.flatMap((r) => {
          // 2-person chat: max 2 pills per emoji (one mine + one theirs)
          if (r.count >= 2) {
            if (r.reactedByMe) {
              return [
                <ReactionPill key={`${r.emoji}-other`} emoji={r.emoji} isMine={false} onToggle={onToggle} />,
                <ReactionPill key={`${r.emoji}-mine`}  emoji={r.emoji} isMine={true}  onToggle={onToggle} />,
              ];
            }
            return [
              <ReactionPill key={`${r.emoji}-1`} emoji={r.emoji} isMine={false} onToggle={onToggle} />,
              <ReactionPill key={`${r.emoji}-2`} emoji={r.emoji} isMine={false} onToggle={onToggle} />,
            ];
          }
          return [
            <ReactionPill key={r.emoji} emoji={r.emoji} isMine={r.reactedByMe} onToggle={onToggle} />,
          ];
        })}
      </div>
    </>
  );
}

function ReactionPill({
  emoji,
  isMine,
  onToggle,
}: {
  emoji:    string;
  isMine:   boolean;
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
    onToggle?.(emoji);
  };

  return (
    <button
      className="r-pill"
      onClick={handleClick}
      style={{
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        width:           "28px",
        height:          "28px",
        borderRadius:    "50%",
        padding:         0,
        border:          isMine ? "1.5px solid #8B5CF6" : "1.5px solid rgba(255,255,255,0.06)",
        backgroundColor: isMine ? "rgba(139,92,246,0.22)" : "rgba(20,20,32,0.92)",
        marginTop:       "-4px",
        cursor:          "pointer",
        fontFamily:      "'Inter', sans-serif",
        lineHeight:      1,
        boxShadow:       isMine ? "0 0 0 2px rgba(139,92,246,0.18)" : "0 1px 4px rgba(0,0,0,0.4)",
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
      <span style={{ fontSize: "15px", lineHeight: 1 }}>{emoji}</span>
    </button>
  );
}