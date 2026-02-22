"use client";

import { useState } from "react";

interface BalanceCardProps {
  balance: number;
  onProceed: (amount: number) => void;
}

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000];
const MIN_AMOUNT = 500;
const PAYSTACK_FEE_RATE = 0.015;
const PAYSTACK_FEE_FLAT = 100;

export default function BalanceCard({ balance, onProceed }: BalanceCardProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [focused, setFocused] = useState(false);

  const fmt = (n: number) =>
    "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const amount = selected ?? (custom ? parseInt(custom.replace(/\D/g, ""), 10) : 0);
  const fee = amount ? Math.round(amount * PAYSTACK_FEE_RATE + PAYSTACK_FEE_FLAT) : 0;
  const canProceed = amount >= MIN_AMOUNT;

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(null);
    const raw = e.target.value.replace(/\D/g, "");
    setCustom(raw);
  };

  const handlePreset = (val: number) => {
    setSelected(val);
    setCustom("");
  };

  return (
    <div style={{ padding: "24px 20px 0", fontFamily: "'Inter', sans-serif" }}>

      {/* Balance row */}
      <p style={{ fontSize: "11px", fontWeight: 500, color: "#6B6B8A", margin: "0 0 4px", letterSpacing: "0.04em" }}>
        Wallet balance
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <span style={{ fontSize: "28px", fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.5px", lineHeight: 1 }}>
          {fmt(balance)}
        </span>

        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            backgroundColor: open ? "transparent" : "#8B5CF6",
            color: open ? "#6B6B8A" : "#fff",
            border: open ? "1px solid #2A2A3D" : "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.01em",
            transition: "all 0.2s",
          }}
        >
          {open ? "Cancel" : "Add funds"}
        </button>
      </div>

      {/* Collapsible top-up section */}
      {open && (
        <div style={{ borderTop: "1px solid #1E1E2E", paddingTop: "20px", paddingBottom: "20px" }}>
          <p style={{ fontSize: "11px", fontWeight: 500, color: "#6B6B8A", margin: "0 0 12px", letterSpacing: "0.04em" }}>
            Select amount
          </p>

          {/* Preset chips */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            {PRESET_AMOUNTS.map((amt) => {
              const active = selected === amt;
              return (
                <button
                  key={amt}
                  onClick={() => handlePreset(amt)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: `1px solid ${active ? "#8B5CF6" : "#2A2A3D"}`,
                    backgroundColor: active ? "rgba(139,92,246,0.1)" : "transparent",
                    color: active ? "#A78BFA" : "#94A3B8",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    transition: "all 0.15s",
                  }}
                >
                  ₦{amt.toLocaleString()}
                </button>
              );
            })}
          </div>

          {/* Custom input */}
          <input
            type="text"
            inputMode="numeric"
            value={custom ? `₦${parseInt(custom).toLocaleString()}` : ""}
            onChange={handleCustomChange}
            onFocus={() => { setFocused(true); setSelected(null); }}
            onBlur={() => setFocused(false)}
            placeholder="Custom amount"
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
              marginBottom: "16px",
            }}
          />

          {/* Fee note */}
          {amount >= MIN_AMOUNT && (
            <p style={{ fontSize: "11px", color: "#6B6B8A", margin: "0 0 12px" }}>
              Processing fee ≈ ₦{fee.toLocaleString()}
            </p>
          )}

          {/* Proceed button */}
          <button
            onClick={() => { if (canProceed) { onProceed(amount); setOpen(false); } }}
            disabled={!canProceed}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: canProceed ? "#8B5CF6" : "#1E1E2E",
              color: canProceed ? "#fff" : "#6B6B8A",
              fontSize: "13px",
              fontWeight: 600,
              cursor: canProceed ? "pointer" : "not-allowed",
              fontFamily: "'Inter', sans-serif",
              transition: "opacity 0.15s",
              marginBottom: "10px",
            }}
            onMouseEnter={(e) => { if (canProceed) (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
            onMouseLeave={(e) => { if (canProceed) (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            Proceed to Checkout
          </button>

          <p style={{ fontSize: "11px", color: "#6B6B8A", textAlign: "center", margin: 0 }}>
            Secured by Paystack
          </p>
        </div>
      )}
    </div>
  );
}