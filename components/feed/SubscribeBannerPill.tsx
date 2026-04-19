// components/feed/SubscribeBannerPill.tsx
"use client";

import * as React from "react";

interface SubscribeBannerPillProps {
  isSubscribed: boolean;
  isRenewal?:   boolean;
  isFree?:      boolean;
  loading?:     boolean;
  onClick?:     () => void;
}

export default function SubscribeBannerPill({
  isSubscribed,
  isRenewal = false,
  isFree    = false,
  loading   = false,
  onClick,
}: SubscribeBannerPillProps) {
  const background = isSubscribed
    ? "#22C55E"
    : isRenewal
      ? "linear-gradient(135deg, #F97316, #EF4444)"
      : "linear-gradient(135deg, #8B5CF6, #EC4899)";

  const label = isSubscribed
    ? "Subscribed"
    : loading
      ? (isRenewal ? "Resubscribing..." : "Subscribing...")
      : isRenewal
        ? (isFree ? "Resubscribe for Free" : "Resubscribe")
        : (isFree ? "Subscribe for Free" : "Subscribe");

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
          animation,
          opacity: loading ? 0.8 : 1,
          transition: "background 0.3s ease, opacity 0.15s",
        }}
      >
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