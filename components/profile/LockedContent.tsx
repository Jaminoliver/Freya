import * as React from "react";

export interface LockedContentProps {
  price: number;
  mediaCount?: number;
  onUnlock?: () => void;
}

const formatNaira = (amount: number) => `₦${amount.toLocaleString()}`;

export function LockedContent({ price, mediaCount = 0, onUnlock }: LockedContentProps) {
  return (
    <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", border: "1px solid #1E1E2E", aspectRatio: "16/9", backgroundColor: "#13131F" }}>

      {/* Blurred gradient background */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(13,13,31,1), rgba(236,72,153,0.1))",
        backdropFilter: "blur(12px)",
      }} />

      {/* Large faded lock watermark */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.04 }}>
        <svg width="180" height="180" fill="currentColor" color="#fff" viewBox="0 0 24 24">
          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 1, height: "100%",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "24px", textAlign: "center",
        fontFamily: "'Inter', sans-serif",
      }}>

        {/* Lock icon circle */}
        <div style={{
          width: "56px", height: "56px", borderRadius: "50%", marginBottom: "14px",
          backgroundColor: "rgba(139,92,246,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="26" height="26" fill="none" stroke="#8B5CF6" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#F1F5F9", margin: "0 0 6px" }}>
          Locked Content
        </h3>
        <p style={{ fontSize: "13px", color: "#64748B", margin: "0 0 20px" }}>
          {mediaCount > 0
            ? `This post contains ${mediaCount} locked ${mediaCount === 1 ? "item" : "items"}`
            : "This content is locked"}
        </p>

        <p style={{ fontSize: "20px", fontWeight: 700, color: "#8B5CF6", margin: "0 0 16px" }}>
          {formatNaira(price)}
        </p>

        <button
          onClick={onUnlock}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 24px", borderRadius: "8px", border: "none",
            background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
            color: "#fff", fontSize: "14px", fontWeight: 600,
            fontFamily: "'Inter', sans-serif", cursor: "pointer",
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
          Unlock for {formatNaira(price)}
        </button>

        <p style={{ fontSize: "11px", color: "#475569", marginTop: "12px" }}>
          One-time purchase · Instant access
        </p>
      </div>
    </div>
  );
}