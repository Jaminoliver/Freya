"use client";

import * as React from "react";
import { X, Check, ChevronRight } from "lucide-react";
import type { User } from "@/lib/types/profile";
import type { SubscriptionTier, Currency } from "@/lib/types/checkout";
import PlanTab, { type Plan } from "../components/PlanTab";
import { CURRENCIES } from "../components/CurrencySwitcher";

const PERKS = [
  "Full access to all content",
  "Direct messaging",
  "Exclusive behind-the-scenes content",
  "Early access to new releases",
  "Cancel anytime",
];

interface SubscriptionScreenProps {
  creator: User;
  monthlyPrice: number;
  threeMonthPrice?: number;
  sixMonthPrice?: number;
  selectedTier: SubscriptionTier;
  onTierChange: (tier: SubscriptionTier) => void;
  currency: Currency;
  autoRenew: boolean;
  onAutoRenewChange: (v: boolean) => void;
  onNext: () => void;
  onClose: () => void;
}

export default function SubscriptionScreen({
  creator, monthlyPrice, threeMonthPrice, sixMonthPrice,
  selectedTier, onTierChange, currency, autoRenew, onAutoRenewChange,
  onNext, onClose,
}: SubscriptionScreenProps) {
  const currencyOption = CURRENCIES.find((c) => c.code === currency)!;
  const symbol = currencyOption.symbol;

  const savingsPercent = (base: number, months: number, bundleTotal: number) =>
    Math.round(((base * months - bundleTotal) / (base * months)) * 100);

  const plans: Plan[] = [
    { key: "monthly", label: "Basic", price: monthlyPrice, months: 1 },
    ...(threeMonthPrice ? [{ key: "three_month" as SubscriptionTier, label: "3mo", price: threeMonthPrice, months: 3, savings: savingsPercent(monthlyPrice, 3, threeMonthPrice) }] : []),
    ...(sixMonthPrice ? [{ key: "six_month" as SubscriptionTier, label: "6mo", price: sixMonthPrice, months: 6, savings: savingsPercent(monthlyPrice, 6, sixMonthPrice) }] : []),
  ];

  const activePlan = plans.find((p) => p.key === selectedTier)!;
  const displayPrice = activePlan.months > 1
    ? Math.round(activePlan.price / activePlan.months)
    : activePlan.price;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Avatar */}
          <div style={{
            width: "40px", height: "40px", borderRadius: "50%",
            backgroundColor: "#2A2A3D", overflow: "hidden", flexShrink: 0,
            border: "2px solid #3A3A4D",
          }}>
            {creator.avatar_url
              ? <img src={creator.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: "#8B5CF6" }}>
                    {(creator.display_name || creator.username).charAt(0).toUpperCase()}
                  </span>
                </div>
            }
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#F1F5F9" }}>
                {creator.display_name || creator.username}
              </p>
              {creator.is_verified && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="7" fill="#8B5CF6" />
                  <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#6B6B8A" }}>@{creator.username}</p>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={18} color="#6B6B8A" />
        </button>
      </div>

      {/* Plan tabs */}
      <div style={{ padding: "0 20px 14px" }}>
        <PlanTab plans={plans} selected={selectedTier} onChange={onTierChange} symbol={symbol} />
      </div>

      <div style={{ height: "1px", backgroundColor: "#1E1E2E", margin: "0 20px" }} />

      {/* Perks */}
      <div style={{ padding: "14px 20px" }}>
        <p style={{ margin: "0 0 10px", fontSize: "10px", fontWeight: 700, color: "#6B6B8A", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Subscribe and get these benefits:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {PERKS.map((perk) => (
            <div key={perk} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={13} color="#22C55E" strokeWidth={2.5} />
              <span style={{ fontSize: "13px", color: "#C4C4D4" }}>{perk}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: "1px", backgroundColor: "#1E1E2E", margin: "0 20px" }} />

      {/* Auto-renew toggle */}
      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#F1F5F9" }}>Auto-renew</p>
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#6B6B8A" }}>Cancel anytime before renewal</p>
        </div>
        <button
          onClick={() => onAutoRenewChange(!autoRenew)}
          style={{
            width: "42px", height: "24px", borderRadius: "12px",
            backgroundColor: autoRenew ? "#8B5CF6" : "#2A2A3D",
            border: "none", cursor: "pointer", position: "relative",
            transition: "background-color 0.2s ease", flexShrink: 0,
          }}
        >
          <div style={{
            position: "absolute", top: "3px",
            left: autoRenew ? "21px" : "3px",
            width: "18px", height: "18px", borderRadius: "50%",
            backgroundColor: "#fff",
            transition: "left 0.2s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }} />
        </button>
      </div>

      {/* Price display */}
      <div style={{ padding: "4px 20px 16px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "#F1F5F9" }}>
          {symbol}{displayPrice.toLocaleString()} / month
        </p>
      </div>

      {/* CTA */}
      <div style={{ padding: "0 20px 8px" }}>
        <button
          onClick={onNext}
          style={{
            width: "100%", padding: "13px", borderRadius: "10px",
            background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            fontFamily: "'Inter', sans-serif", transition: "opacity 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>
            Subscribe · {symbol}{displayPrice.toLocaleString()}/month
          </span>
          <ChevronRight size={16} color="#fff" />
        </button>
      </div>

      {/* Footer */}
      <div style={{ padding: "6px 20px 18px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A" }}>
          Subscription renews automatically. Cancel anytime.{" "}
          <span style={{ color: "#8B5CF6", cursor: "pointer" }}>Terms of Service</span>
        </p>
      </div>
    </div>
  );
}