"use client";

import { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
import BankAccountWarningBanner from "./BankAccountWarningBanner";

const MAX_DISCOUNT = 50;
const STEP = 5;
type SaveState = "idle" | "saving" | "saved";

const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

export default function SubscriptionTiersTab() {
  const hasBankAccount = false;

  const [monthlyPrice, setMonthlyPrice] = useState(0);
  const [monthlyInput, setMonthlyInput] = useState("");
  const [threeMonthDiscount, setThreeMonthDiscount] = useState(0);
  const [sixMonthDiscount, setSixMonthDiscount] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [focused, setFocused] = useState(false);

  const threeBase = monthlyPrice * 3;
  const sixBase = monthlyPrice * 6;
  const threeMonthPrice = Math.round(threeBase * (1 - threeMonthDiscount / 100));
  const sixMonthPrice = Math.round(sixBase * (1 - sixMonthDiscount / 100));

  useEffect(() => {
    setThreeMonthDiscount(0);
    setSixMonthDiscount(0);
  }, [monthlyPrice]);

  const handleMonthlyChange = (val: string) => {
    setMonthlyInput(val);
    const num = parseInt(val.replace(/\D/g, ""), 10);
    if (!isNaN(num) && num > 0) setMonthlyPrice(num);
    else setMonthlyPrice(0);
  };

  const handleMonthlyBlur = () => {
    setFocused(false);
    if (!monthlyInput.trim() || monthlyPrice === 0) {
      setMonthlyPrice(0); setMonthlyInput("");
    } else if (monthlyPrice < 1000) {
      setMonthlyPrice(1000); setMonthlyInput("1000");
    } else {
      setMonthlyInput(String(monthlyPrice));
    }
  };

  const handleSave = async () => {
    setSaveState("saving");
    await new Promise((r) => setTimeout(r, 900));
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2500);
  };

  const stepBtn = (onClick: () => void, disabled: boolean, label: string) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "26px", height: "26px",
        borderRadius: "6px",
        border: "1px solid #2A2A3D",
        backgroundColor: "transparent",
        color: disabled ? "#2A2A3D" : "#94A3B8",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "14px", fontWeight: 500,
        flexShrink: 0, transition: "all 0.15s",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {!hasBankAccount && <BankAccountWarningBanner />}

      {/* Price per month */}
      <div style={{ padding: "20px 0 24px", borderBottom: "1px solid #1E1E2E" }}>
        <p style={{ fontSize: "11px", fontWeight: 500, color: "#94A3B8", margin: "0 0 4px", letterSpacing: "0.04em" }}>
          Price per month
        </p>

        <p style={{ fontSize: "28px", fontWeight: 700, color: monthlyPrice > 0 ? "#F1F5F9" : "#64748B", margin: "0 0 16px", letterSpacing: "-0.5px" }}>
          {monthlyPrice > 0 ? formatNaira(monthlyPrice) : "Free"}
        </p>

        <input
          type="text"
          inputMode="numeric"
          value={monthlyInput}
          onChange={(e) => handleMonthlyChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleMonthlyBlur}
          placeholder="Leave empty for free"
          style={{
            width: "100%",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: `1px solid ${focused ? "#8B5CF6" : "#2A2A3D"}`,
            borderRadius: 0,
            padding: "8px 0",
            fontSize: "13px",
            color: "#F1F5F9",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "'Inter', sans-serif",
            transition: "border-color 0.2s",
            marginBottom: "8px",
          }}
        />

        <p style={{ fontSize: "11px", color: "#94A3B8", margin: 0 }}>
          Min ₦1,000 · Recommended ₦2,000–₦25,000
          {monthlyPrice > 0 && ` · ~$${(monthlyPrice / 1600).toFixed(2)} USD`}
        </p>
      </div>

      {/* Bundle Pricing */}
      <div style={{ padding: "24px 0", borderBottom: "1px solid #1E1E2E" }}>
        <p style={{ fontSize: "11px", fontWeight: 500, color: "#94A3B8", margin: "0 0 4px", letterSpacing: "0.04em" }}>
          Bundle pricing
        </p>
        <p style={{ fontSize: "11px", color: "#64748B", margin: "0 0 20px" }}>
          Discount for longer commitments. Max 50% off, steps of 5%.
        </p>

        <div style={{ display: "flex", gap: "24px" }}>
          {/* 3 Months */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <p style={{ fontSize: "12px", color: "#CBD5E1", margin: 0 }}>3 months</p>
              {threeMonthDiscount > 0 && (
                <span style={{ fontSize: "11px", color: "#34D399" }}>{threeMonthDiscount}% off</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* − left: increases discount, lowers price */}
              {stepBtn(
                () => setThreeMonthDiscount((d) => Math.min(d + STEP, MAX_DISCOUNT)),
                threeMonthDiscount >= MAX_DISCOUNT || monthlyPrice === 0,
                "−"
              )}
              <span style={{ flex: 1, textAlign: "center", fontSize: "13px", color: monthlyPrice > 0 ? "#F1F5F9" : "#64748B", fontWeight: 500 }}>
                {monthlyPrice > 0 ? formatNaira(threeMonthPrice) : "—"}
              </span>
              {/* + right: decreases discount, raises price */}
              {stepBtn(
                () => setThreeMonthDiscount((d) => Math.max(d - STEP, 0)),
                threeMonthDiscount === 0 || monthlyPrice === 0,
                "+"
              )}
            </div>
            {monthlyPrice > 0 && threeMonthDiscount > 0 && (
              <p style={{ fontSize: "11px", color: "#34D399", margin: "6px 0 0", textAlign: "center" }}>
                saves {formatNaira(threeBase - threeMonthPrice)}
              </p>
            )}
          </div>

          {/* Divider */}
          <div style={{ width: "1px", backgroundColor: "#1E1E2E" }} />

          {/* 6 Months */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <p style={{ fontSize: "12px", color: "#CBD5E1", margin: 0 }}>6 months</p>
              {sixMonthDiscount > 0 && (
                <span style={{ fontSize: "11px", color: "#34D399" }}>{sixMonthDiscount}% off</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* − left: increases discount, lowers price */}
              {stepBtn(
                () => setSixMonthDiscount((d) => Math.min(d + STEP, MAX_DISCOUNT)),
                sixMonthDiscount >= MAX_DISCOUNT || monthlyPrice === 0,
                "−"
              )}
              <span style={{ flex: 1, textAlign: "center", fontSize: "13px", color: monthlyPrice > 0 ? "#F1F5F9" : "#64748B", fontWeight: 500 }}>
                {monthlyPrice > 0 ? formatNaira(sixMonthPrice) : "—"}
              </span>
              {/* + right: decreases discount, raises price */}
              {stepBtn(
                () => setSixMonthDiscount((d) => Math.max(d - STEP, 0)),
                sixMonthDiscount === 0 || monthlyPrice === 0,
                "+"
              )}
            </div>
            {monthlyPrice > 0 && sixMonthDiscount > 0 && (
              <p style={{ fontSize: "11px", color: "#34D399", margin: "6px 0 0", textAlign: "center" }}>
                saves {formatNaira(sixBase - sixMonthPrice)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ paddingTop: "24px" }}>
        <button
          onClick={handleSave}
          disabled={saveState === "saving"}
          style={{
            width: "100%", padding: "11px",
            borderRadius: "8px", border: "none",
            backgroundColor: saveState === "saved" ? "#059669" : "#8B5CF6",
            color: "#fff", fontSize: "13px", fontWeight: 600,
            cursor: saveState === "saving" ? "not-allowed" : "pointer",
            fontFamily: "'Inter', sans-serif",
            transition: "opacity 0.15s, background-color 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}
          onMouseEnter={(e) => { if (saveState === "idle") (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
        >
          {saveState === "saving" && <Loader2 size={13} style={{ animation: "spin 0.9s linear infinite" }} />}
          {saveState === "saved" && <Check size={13} />}
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save pricing"}
        </button>
      </div>
    </div>
  );
}