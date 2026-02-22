"use client";

export default function BankAccountWarningBanner({ onAddBank }: { onAddBank?: () => void }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
        backgroundColor: "rgba(245,158,11,0.08)", border: "1.5px solid rgba(245,158,11,0.25)",
        borderRadius: "10px", padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p style={{ fontSize: "12px", color: "#F59E0B", margin: 0, fontFamily: "'Inter', sans-serif" }}>
          You must add a bank account before you can set your price or accept tips.
        </p>
      </div>
      <button
        onClick={onAddBank}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "12px", color: "#8B5CF6", fontWeight: 600,
          fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", padding: 0,
        }}
      >
        Add Bank Account →
      </button>
    </div>
  );
}