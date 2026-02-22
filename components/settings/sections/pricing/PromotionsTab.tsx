"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import BankAccountWarningBanner from "./BankAccountWarningBanner";

type SaveState = "idle" | "saving" | "saved";

export default function PromotionsTab() {
  const hasBankAccount = false;

  const [trialEnabled, setTrialEnabled] = useState(false);
  const [trialDays, setTrialDays] = useState("7");

  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountPercent, setDiscountPercent] = useState("20");
  const [discountDays, setDiscountDays] = useState("30");

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
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: "'Inter', sans-serif" }}>
      {!hasBankAccount && <BankAccountWarningBanner />}

      {/* Profile Promotion Campaign */}
      <div style={{ backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "16px" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, color: "#6B6B8A", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 4px" }}>
          Profile Promotion Campaign
        </p>
        <p style={{ fontSize: "12px", color: "#64748B", margin: "0 0 14px" }}>
          Offer a free trial or discounted subscription to new or expired subscribers.
        </p>

        {/* Free Trial */}
        <div style={{ padding: "12px 0", borderBottom: "1px solid #2A2A3D" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: trialEnabled ? "12px" : 0 }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: "#F1F5F9" }}>Free Trial</p>
              <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A" }}>Give new subscribers a free trial period</p>
            </div>
            <Toggle enabled={trialEnabled} onChange={setTrialEnabled} />
          </div>
          {trialEnabled && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
              <label style={{ fontSize: "12px", color: "#94A3B8", whiteSpace: "nowrap" }}>Trial duration:</label>
              <input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                style={{ ...inputBase, width: "70px", textAlign: "center" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
              />
              <span style={{ fontSize: "12px", color: "#94A3B8" }}>days</span>
            </div>
          )}
        </div>

        {/* Discount */}
        <div style={{ padding: "12px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: discountEnabled ? "12px" : 0 }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: "#F1F5F9" }}>Discounted Subscription</p>
              <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A" }}>Offer a % discount for a limited period</p>
            </div>
            <Toggle enabled={discountEnabled} onChange={setDiscountEnabled} />
          </div>
          {discountEnabled && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={{ fontSize: "12px", color: "#94A3B8", whiteSpace: "nowrap" }}>Discount:</label>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  style={{ ...inputBase, width: "70px", textAlign: "center" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
                />
                <span style={{ fontSize: "12px", color: "#94A3B8" }}>%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={{ fontSize: "12px", color: "#94A3B8", whiteSpace: "nowrap" }}>For:</label>
                <input
                  type="number"
                  value={discountDays}
                  onChange={(e) => setDiscountDays(e.target.value)}
                  style={{ ...inputBase, width: "70px", textAlign: "center" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
                />
                <span style={{ fontSize: "12px", color: "#94A3B8" }}>days</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save */}
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
        {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save Promotions"}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}