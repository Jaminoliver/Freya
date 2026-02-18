"use client";

import { Check } from "lucide-react";

interface SubscribedBannerProps {
  renewalDate: string; // e.g., "Mar 15, 2026"
  onManageSubscription: () => void;
}

export default function SubscribedBanner({
  renewalDate,
  onManageSubscription,
}: SubscribedBannerProps) {
  return (
    <div
      style={{
        backgroundColor: "#141420",
        borderRadius: "12px",
        padding: "16px 24px",
        border: "1px solid #1F1F2A",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Left: Checkmark + Status Text */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {/* Green Checkmark */}
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            backgroundColor: "#10B981",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check size={14} color="#FFFFFF" strokeWidth={3} />
        </div>

        {/* Status Text */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#10B981",
            }}
          >
            Subscribed
          </span>
          <span
            style={{
              fontSize: "14px",
              color: "#94A3B8",
            }}
          >
            Renews {renewalDate}
          </span>
        </div>
      </div>

      {/* Right: Manage Subscription Link */}
      <button
        onClick={onManageSubscription}
        style={{
          background: "none",
          border: "none",
          fontSize: "14px",
          fontWeight: 600,
          color: "#8B5CF6",
          cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
          padding: "4px 8px",
          borderRadius: "6px",
          transition: "background-color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(139, 92, 246, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        Manage Subscription
      </button>
    </div>
  );
}