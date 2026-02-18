"use client";

import { Sparkles } from "lucide-react";

interface FanOwnProfileCTAProps {
  onBecomeCreator: () => void;
}

export default function FanOwnProfileCTA({ onBecomeCreator }: FanOwnProfileCTAProps) {
  return (
    <div
      style={{
        backgroundColor: "#141420",
        borderRadius: "16px",
        padding: "24px",
        border: "1px solid #1F1F2A",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        fontFamily: "'Inter', sans-serif",
        flexWrap: "wrap",
      }}
    >
      {/* Left: Icon + Text */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flex: 1,
          minWidth: "250px",
        }}
      >
        {/* Sparkle Icon */}
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(255, 107, 107, 0.15), rgba(255, 142, 83, 0.15))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Sparkles size={24} color="#FF6B6B" strokeWidth={2} />
        </div>

        {/* Text */}
        <p
          style={{
            fontSize: "15px",
            lineHeight: "1.5",
            color: "#E2E8F0",
            margin: 0,
          }}
        >
          You're currently a fan. Become a creator to start posting content and earning.
        </p>
      </div>

      {/* Right: Button */}
      <button
        onClick={onBecomeCreator}
        style={{
          padding: "12px 28px",
          borderRadius: "10px",
          background: "linear-gradient(135deg, #FF6B6B, #FF8E53)",
          border: "none",
          color: "#FFFFFF",
          fontSize: "15px",
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          cursor: "pointer",
          flexShrink: 0,
          transition: "opacity 0.2s ease",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.9";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
      >
        Become a Creator
      </button>
    </div>
  );
}