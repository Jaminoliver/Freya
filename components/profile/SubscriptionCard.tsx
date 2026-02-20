"use client";

import * as React from "react";

interface SubscriptionCardProps {
  monthlyPrice: number;
  threeMonthPrice?: number;
  sixMonthPrice?: number;
  onSubscribe?: (tier: "monthly" | "three_month" | "six_month") => void;
  isEditable?: boolean;
  onEditPricing?: () => void;
}

export default function SubscriptionCard({
  monthlyPrice,
  threeMonthPrice,
  sixMonthPrice,
  onSubscribe,
  isEditable = false,
  onEditPricing,
}: SubscriptionCardProps) {
  const [selected, setSelected] = React.useState<"monthly" | "three_month" | "six_month">("monthly");

  const formatNaira = (amount: number) => `₦${amount.toLocaleString()}`;
  const savingsPercent = (base: number, months: number, bundleTotal: number) =>
    Math.round(((base * months - bundleTotal) / (base * months)) * 100);

  if (isEditable) {
    return (
      <button
        onClick={onEditPricing}
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "5px 12px", borderRadius: "6px",
          backgroundColor: "transparent", border: "1px solid #8B5CF6",
          cursor: "pointer", fontFamily: "'Inter', sans-serif",
          transition: "background-color 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
      >
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#FF6B6B" }}>
          {formatNaira(monthlyPrice)}/mo
        </span>
        <span style={{ fontSize: "12px", color: "#8B5CF6", fontWeight: 500 }}>
          · Edit Pricing
        </span>
      </button>
    );
  }

  type TierKey = "monthly" | "three_month" | "six_month";

  const tiers: Array<{ key: TierKey; label: string; price: number; months: number; savings?: number }> = [
    { key: "monthly", label: "1 Month", price: monthlyPrice, months: 1 },
    ...(threeMonthPrice ? [{ key: "three_month" as TierKey, label: "3 Months", price: threeMonthPrice, months: 3, savings: savingsPercent(monthlyPrice, 3, threeMonthPrice) }] : []),
    ...(sixMonthPrice ? [{ key: "six_month" as TierKey, label: "6 Months", price: sixMonthPrice, months: 6, savings: savingsPercent(monthlyPrice, 6, sixMonthPrice) }] : []),
  ];

  const selectedTier = tiers.find((t) => t.key === selected)!;
  const displayPrice = selected === "monthly"
    ? `${formatNaira(monthlyPrice)}/mo`
    : `${formatNaira(Math.round(selectedTier.price / selectedTier.months))}/mo`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>

      {/* Tier tabs */}
      <div style={{ display: "flex", gap: "6px" }}>
        {tiers.map((tier) => {
          const isActive = selected === tier.key;
          return (
            <button
              key={tier.key}
              onClick={() => setSelected(tier.key)}
              style={{
                position: "relative",
                flex: 1,
                padding: "5px 8px",
                borderRadius: "6px",
                backgroundColor: isActive ? "rgba(139,92,246,0.15)" : "transparent",
                border: isActive ? "1px solid #8B5CF6" : "1px solid #2A2A3D",
                color: isActive ? "#A78BFA" : "#64748B",
                fontSize: "11px", fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                cursor: "pointer", transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              {tier.savings && (
                <span style={{
                  position: "absolute", top: "-8px", left: "50%", transform: "translateX(-50%)",
                  backgroundColor: "#22C55E", color: "#fff",
                  fontSize: "9px", fontWeight: 700,
                  padding: "1px 5px", borderRadius: "999px",
                  whiteSpace: "nowrap",
                }}>
                  -{tier.savings}%
                </span>
              )}
              {tier.label}
            </button>
          );
        })}
      </div>

      {/* Subscribe CTA */}
      <button
        onClick={() => onSubscribe?.(selected)}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          padding: "5px 12px", borderRadius: "6px",
          background: "linear-gradient(135deg, #FF6B6B, #FF8E53)",
          border: "none", cursor: "pointer",
          fontFamily: "'Inter', sans-serif", width: "100%",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
      >
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF" }}>
          Subscribe · {displayPrice}
        </span>
      </button>

    </div>
  );
}