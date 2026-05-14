// components/feed/SubscribeBannerPill.tsx
"use client";

import * as React from "react";

interface SubscribeBannerPillProps {
  isSubscribed: boolean;
  isFree?:      boolean;
  loading?:     boolean;
  onClick?:     () => void;
}

export default function SubscribeBannerPill({
  isSubscribed,
  isFree    = false,
  loading   = false,
  onClick,
}: SubscribeBannerPillProps) {
  const background = isSubscribed
    ? "#22C55E"
    : "linear-gradient(135deg, #8B5CF6, #EC4899)";

  const label = isSubscribed
    ? "Subscribed"
    : loading
      ? "Subscribing..."
      : isFree
        ? "Subscribe for Free"
        : "Subscribe";

  const animation = isSubscribed
    ? "freyaSubbedPop 0.4s ease-out"
    : loading
      ? undefined
      : "freyaSubPulse 2.2s ease-in-out infinite";

  const handleClick = () => {
    if (isSubscribed || loading) return;
    onClick?.();
  };

  return (
    <>
      <style>{`
        @keyframes freyaSubPulse  { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        @keyframes freyaSubbedPop { 0% { transform: scale(1); } 40% { transform: scale(1.12); } 100% { transform: scale(1); } }
        @keyframes freyaGlow { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
      `}</style>
      <button
        onClick={handleClick}
        style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "8px 18px", borderRadius: "999px",
          background, border: "none",
          color: "#FFFFFF", fontSize: "13px", fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          cursor: isSubscribed ? "default" : loading ? "wait" : "pointer",
          whiteSpace: "nowrap", flexShrink: 0,
          animation: isSubscribed ? "freyaSubbedPop 0.4s ease-out" : loading ? undefined : "freyaSubPulse 1.3s ease-in-out infinite",
          opacity: loading ? 0.8 : 1,
          transition: "background 0.3s ease, opacity 0.15s",
          position: "relative", overflow: "hidden",
        }}
      >
        {!isSubscribed && !loading && (
          <span style={{
            position: "absolute", top: 0, left: 0,
            width: "300%", height: "100%", pointerEvents: "none",
            background: "linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.5) 50%, transparent 75%)",
            backgroundSize: "200% 100%",
            animation: "freyaGlow 3.5s linear infinite",
          }} />
        )}
        {isSubscribed && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {label}
      </button>
    </>
  );
}