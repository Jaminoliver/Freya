"use client";

export default function PrivacySettings({ onBack }: { onBack?: () => void }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#F1F5F9", margin: 0, fontFamily: "'Inter', sans-serif" }}>Privacy</h2>
      </div>
      <div style={{ color: "#A3A3C2", fontSize: "14px", fontFamily: "'Inter', sans-serif" }}>Privacy settings coming soon.</div>
    </div>
  );
}