"use client";

import { MoreHorizontal } from "lucide-react";

export function SubscriptionsHeader() {
  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .subs-header-fixed { display: none !important; }
        }
        .sh-icon-btn {
          background: none; border: none; cursor: pointer;
          color: #A3A3C2; display: flex; align-items: center;
          padding: 8px; border-radius: 8px; transition: all 0.15s ease;
        }
        .sh-icon-btn:hover { color: #FFFFFF; background-color: #1C1C2E; }
      `}</style>

      <div
        className="subs-header-fixed"
        style={{
          position:        "relative",
        height:          "56px",
        flexShrink:      0,
        backgroundColor: "var(--background)",
        zIndex:          100,
          fontFamily:      "'Inter', sans-serif",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "space-between",
          padding:         "0 18px",
        }}
      >
        <span style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>
          Subscriptions
        </span>

        <button className="sh-icon-btn" aria-label="More">
          <MoreHorizontal size={22} strokeWidth={1.8} />
        </button>
      </div>
    </>
  );
}