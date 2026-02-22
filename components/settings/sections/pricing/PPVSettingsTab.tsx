"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import BankAccountWarningBanner from "./BankAccountWarningBanner";

type SaveState = "idle" | "saving" | "saved";

export default function PPVSettingsTab() {
  const hasBankAccount = false;

  const [ppvEnabled, setPpvEnabled] = useState(false);
  const [defaultPrice, setDefaultPrice] = useState("500");
  const [allowFree, setAllowFree] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const handleSave = async () => {
    setSaveState("saving");
    await new Promise((r) => setTimeout(r, 900));
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2500);
  };

  const inputBase: React.CSSProperties = {
    borderRadius: "8px", padding: "10px 12px", fontSize: "14px",
    outline: "none", backgroundColor: "#141420", border: "1.5px solid #2A2A3D",
    color: "#F1F5F9", fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
  };

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!enabled)}
      style={{
        width: "42px", height: "24px", borderRadius: "12px", border: "none",
        backgroundColor: enabled ? "#8B5CF6" : "#2A2A3D",
        cursor: "pointer", position: "relative", flexShrink: 0,
        transition: "background-color 0.2s",
      }}
    >
      <div style={{
        width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#fff",
        position: "absolute", top: "3px",
        left: enabled ? "21px" : "3px",
        transition: "left 0.2s",
      }} />
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontFamily: "'Inter', sans-serif" }}>
      {!hasBankAccount && <BankAccountWarningBanner />}

      {/* PPV toggle */}
      <div style={{ backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: "#F1F5F9" }}>Enable Pay-Per-View</p>
            <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A" }}>Charge fans individually for locked posts</p>
          </div>
          <Toggle enabled={ppvEnabled} onChange={setPpvEnabled} />
        </div>
      </div>

      {/* Settings — only show if enabled */}
      {ppvEnabled && (
        <>
          {/* Default price */}
          <div style={{ backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "14px" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#6B6B8A", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>
              Default PPV Price
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#141420", border: "1.5px solid #2A2A3D", borderRadius: "8px", padding: "10px 12px" }}>
              <span style={{ fontSize: "14px", color: "#6B6B8A" }}>₦</span>
              <input
                type="number"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                disabled={!hasBankAccount}
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "14px", color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}
              />
            </div>
            <p style={{ fontSize: "11px", color: "#6B6B8A", margin: "5px 0 0" }}>
              Applied by default when locking a post. You can override per post.
            </p>
          </div>

          {/* Allow free for subscribers */}
          <div style={{ backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: "#F1F5F9" }}>Free for Paid Subscribers</p>
                <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A" }}>Paid subscribers can view PPV posts for free</p>
              </div>
              <Toggle enabled={allowFree} onChange={setAllowFree} />
            </div>
          </div>

          {/* Fee breakdown */}
          <div style={{ backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "14px" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#6B6B8A", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>Fee Breakdown</p>
            {[
              { label: "Freya commission", value: "18%" },
              { label: "Paystack processing", value: "1.5% + ₦100" },
              { label: "Minimum PPV price", value: "₦200" },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < arr.length - 1 ? "1px solid #2A2A3D" : "none" }}>
                <span style={{ fontSize: "13px", color: "#94A3B8" }}>{row.label}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#F1F5F9" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={handleSave}
        disabled={saveState === "saving"}
        style={{
          width: "100%", padding: "13px", borderRadius: "10px", border: "none",
          backgroundColor: saveState === "saved" ? "#059669" : "#8B5CF6",
          color: "#fff", fontSize: "14px", fontWeight: 600,
          cursor: saveState === "saving" ? "not-allowed" : "pointer",
          fontFamily: "'Inter', sans-serif", transition: "background-color 0.2s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        }}
      >
        {saveState === "saving" && <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} />}
        {saveState === "saved" && <Check size={14} />}
        {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save PPV Settings"}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}