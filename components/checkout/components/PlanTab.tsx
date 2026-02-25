"use client";

import * as React from "react";
import type { SubscriptionTier } from "@/lib/types/checkout";

interface Plan {
  key: SubscriptionTier;
  label: string;
  price: number;
  months: number;
  savings?: number;
}

interface PlanTabProps {
  plans: Plan[];
  selected: SubscriptionTier;
  onChange: (tier: SubscriptionTier) => void;
  symbol: string;
}

export default function PlanTab({ plans, selected, onChange, symbol }: PlanTabProps) {
  const hasSavings = plans.some((p) => p.key !== selected && p.savings && p.savings > 0);
  return (
    <div style={{
      display: "flex", gap: "6px", overflowX: "auto",
      paddingBottom: "2px", paddingTop: hasSavings ? "12px" : "0",
      scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
    }}>
      {plans.filter((p) => p.key !== selected).map((plan) => {
        const months = parseInt(String(plan.months), 10);
        const price = typeof plan.price === "string" ? parseFloat(plan.price) : plan.price;
        const label = months === 1
          ? `Basic · ${symbol}${price.toLocaleString()}/mo`
          : `${months}mo · ${symbol}${price.toLocaleString()}`;
        const showSavings = plan.savings !== undefined && plan.savings > 0;
        return (
          <button
            key={plan.key}
            onClick={() => onChange(plan.key)}
            style={{
              position: "relative", flexShrink: 0,
              padding: "7px 12px", borderRadius: "8px",
              backgroundColor: "transparent",
              border: "1px solid #2A2A3D",
              cursor: "pointer", transition: "all 0.15s ease",
              fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap",
            }}
          >
            {showSavings && (
              <span style={{
                position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)",
                backgroundColor: "#22C55E", color: "#fff",
                fontSize: "9px", fontWeight: 700,
                padding: "1px 5px", borderRadius: "999px",
                whiteSpace: "nowrap",
              }}>
                -{plan.savings}%
              </span>
            )}
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B6B8A" }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type { Plan };