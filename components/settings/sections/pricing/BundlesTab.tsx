"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";

type SaveState = "idle" | "saving" | "saved";

const fmt = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Bundle {
  months: number;
  label: string;
  discount: number;
  enabled: boolean;
}

export default function BundlesTab() {
  const monthlyPrice = 2000; // placeholder — ideally passed from tier

  const [bundles, setBundles] = useState<Bundle[]>([
    { months: 3,  label: "3 Months",  discount: 10, enabled: true },
    { months: 6,  label: "6 Months",  discount: 15, enabled: true },
    { months: 12, label: "12 Months", discount: 20, enabled: true },
  ]);

  const [saveState, setSaveState] = useState<SaveState>("idle");

  const updateBundle = (months: number, key: keyof Bundle, value: number | boolean) => {
    setBundles((prev) =>
      prev.map((b) => (b.months === months ? { ...b, [key]: value } : b))
    );
  };

  const getPrice = (b: Bundle) => {
    const full = monthlyPrice * b.months;
    return full - (full * b.discount) / 100;
  };

  const handleSave = async () => {
    setSaveState("saving");
    await new Promise((r) => setTimeout(r, 900));
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2500);
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
      <div style={{ backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "14px" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, color: "#6B6B8A", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 4px" }}>
          Subscription Bundles
        </p>
        <p style={{ fontSize: "12px", color: "#64748B", margin: "0 0 14px" }}>
          Offer multiple months at a discounted rate to encourage longer commitments.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {bundles.map((bundle) => {
            const bundlePrice = getPrice(bundle);
            const fullPrice = monthlyPrice * bundle.months;

            return (
              <div key={bundle.months} style={{ backgroundColor: "#141420", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#F1F5F9", minWidth: "80px" }}>{bundle.label}</span>
                  <span style={{ fontSize: "12px", color: "#6B6B8A" }}>Save</span>
                  <input
                    type="number"
                    value={bundle.discount}
                    onChange={(e) => updateBundle(bundle.months, "discount", parseFloat(e.target.value) || 0)}
                    style={{
                      width: "56px", borderRadius: "6px", padding: "6px 8px",
                      fontSize: "13px", outline: "none", backgroundColor: "#1C1C2E",
                      border: "1.5px solid #2A2A3D", color: "#F1F5F9",
                      fontFamily: "'Inter', sans-serif", textAlign: "center",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
                  />
                  <span style={{ fontSize: "12px", color: "#6B6B8A" }}>%</span>
                  <span style={{ marginLeft: "auto", fontSize: "13px", fontWeight: 600, color: "#F1F5F9" }}>
                    {fmt(bundlePrice)}
                  </span>
                  <Toggle enabled={bundle.enabled} onChange={(v) => updateBundle(bundle.months, "enabled", v)} />
                </div>
                <p style={{ margin: 0, fontSize: "11px", color: "#10B981", fontFamily: "'Inter', sans-serif" }}>
                  Fan pays {fmt(bundlePrice)} instead of {fmt(fullPrice)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>
        💡 Bundles are calculated based on your active subscription tier price.
      </p>

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
        {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save Bundle Settings"}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}