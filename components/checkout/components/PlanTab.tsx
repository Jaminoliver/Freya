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
  return (
    <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px", scrollbarWidth: "none" }}>
      {plans.map((plan) => {
        const active = selected === plan.key;
        const perMonth = plan.months > 1 ? Math.round(plan.price / plan.months) : plan.price;
        return (
          <button
            key={plan.key}
            onClick={() => onChange(plan.key)}
            style={{
              position: "relative", flexShrink: 0,
              padding: "7px 14px", borderRadius: "8px",
              backgroundColor: active ? "rgba(139,92,246,0.12)" : "transparent",
              border: active ? "1px solid #8B5CF6" : "1px solid #2A2A3D",
              cursor: "pointer", transition: "all 0.15s ease",
              fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap",
            }}
          >
            {plan.savings && (
              <span style={{
                position: "absolute", top: "-8px", left: "50%", transform: "translateX(-50%)",
                backgroundColor: "#22C55E", color: "#fff",
                fontSize: "9px", fontWeight: 700,
                padding: "1px 5px", borderRadius: "999px",
              }}>
                -{plan.savings}%
              </span>
            )}
            <span style={{ fontSize: "12px", fontWeight: 600, color: active ? "#A78BFA" : "#6B6B8A" }}>
              {plan.months === 1 ? "Basic" : `${plan.months}mo`} · {symbol}{perMonth.toLocaleString()}/mo
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type { Plan };