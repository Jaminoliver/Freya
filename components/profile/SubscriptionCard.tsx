"use client";

import * as React from "react";

interface SubscriptionCardProps {
  monthlyPrice:    number;
  threeMonthPrice?: number;
  sixMonthPrice?:   number;
  onSubscribe?:    (tier: "monthly" | "three_month" | "six_month") => void;
  isEditable?:     boolean;
  onEditPricing?:  () => void;
}

type TierKey = "monthly" | "three_month" | "six_month";

const SWEEP = `@keyframes sc-sweep{0%{left:-80%}100%{left:130%}}`;

const sweepBar: React.CSSProperties = {
  position: "absolute", top: 0, left: "-80%",
  width: "50%", height: "100%",
  background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)",
  transform: "skewX(-20deg)",
  animation: "sc-sweep 2.5s ease-in-out infinite",
};

const gradBtn: React.CSSProperties = {
  width: "100%", border: "none", cursor: "pointer",
  background: "linear-gradient(135deg,#8B5CF6,#EC4899)",
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "11px 18px", borderRadius: "50px",
  position: "relative", overflow: "hidden",
  fontFamily: "'Inter', sans-serif",
};

export default function SubscriptionCard({
  monthlyPrice,
  threeMonthPrice,
  sixMonthPrice,
  onSubscribe,
  isEditable = false,
  onEditPricing,
}: SubscriptionCardProps) {
  const [selected, setSelected] = React.useState<TierKey>("monthly");

  const isFree  = monthlyPrice === 0;
  const fmt     = (n: number) => `₦${n.toLocaleString()}`;
  const savePct = (base: number, months: number, bundle: number) =>
    Math.round(((base * months - bundle) / (base * months)) * 100);

  const tiers: Array<{ key: TierKey; label: string; price: number; months: number; savings?: number }> = [
    { key: "monthly",     label: "1 Month",  price: monthlyPrice,    months: 1 },
    ...(threeMonthPrice != null
      ? [{ key: "three_month" as TierKey, label: "3 Months", price: threeMonthPrice, months: 3, savings: savePct(monthlyPrice, 3, threeMonthPrice) }]
      : []),
    ...(sixMonthPrice != null
      ? [{ key: "six_month" as TierKey, label: "6 Months", price: sixMonthPrice, months: 6, savings: savePct(monthlyPrice, 6, sixMonthPrice) }]
      : []),
  ];

  const sel   = tiers.find((t) => t.key === selected)!;
  const note  = selected === "monthly"
    ? "Billed monthly"
    : `${fmt(sel.price)} total · save ${sel.savings}%`;

  // pill label: total for bundles, /mo for monthly
  const pillLabel = selected === "monthly"
    ? `${fmt(monthlyPrice)}/mo`
    : fmt(sel.price);

  // ── Editable ────────────────────────────────────────────────────
  if (isEditable) {
    return (
      <button
        onClick={onEditPricing}
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "5px 12px", borderRadius: "6px",
          backgroundColor: "transparent", border: "1px solid #8B5CF6",
          cursor: "pointer", fontFamily: "'Inter', sans-serif",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
      >
        <span style={{ fontSize: "12px", fontWeight: 700, color: isFree ? "#22C55E" : "#FB7150" }}>
          {isFree ? "Free" : `${fmt(monthlyPrice)}/mo`}
        </span>
        <span style={{ fontSize: "12px", color: "#8B5CF6", fontWeight: 500 }}>· Edit Pricing</span>
      </button>
    );
  }

  // ── Free ────────────────────────────────────────────────────────
  if (isFree) {
    return (
      <>
        <style>{SWEEP}</style>
        <button
          onClick={() => onSubscribe?.("monthly")}
          style={gradBtn}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff", position: "relative", zIndex: 1 }}>
            Subscribe
          </span>
          <span style={{
            fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.75)",
            background: "rgba(255,255,255,0.15)", padding: "4px 12px", borderRadius: "20px",
            position: "relative", zIndex: 1,
          }}>
            It's free
          </span>
          <span style={sweepBar} />
        </button>
      </>
    );
  }

  // ── Paid ────────────────────────────────────────────────────────
  return (
    <>
      <style>{SWEEP}</style>
      <div style={{
        background: "#0D0D18", border: "1px solid #1E1E35",
        borderRadius: "14px", overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}>

        {/* Duration tabs */}
        <div style={{ display: "flex", padding: "10px 10px 0", gap: "4px" }}>
          {tiers.map((tier) => {
            const isOn    = selected === tier.key;
            const hasSave = (tier.savings ?? 0) > 0;
            return (
              <button
                key={tier.key}
                onClick={() => setSelected(tier.key)}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                  gap: "4px", padding: "0 4px 10px", background: "transparent", border: "none",
                  borderBottom: `2px solid ${isOn ? "#8B5CF6" : "transparent"}`,
                  cursor: "pointer", transition: "border-color 0.15s",
                }}
              >
                <span style={{
                  fontSize: "9px", fontWeight: 700, color: "#fff",
                  background: hasSave ? "#EC4899" : "transparent",
                  padding: "1px 6px", borderRadius: "20px",
                  visibility: hasSave ? "visible" : "hidden",
                }}>
                  -{tier.savings}%
                </span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: isOn ? "#C4B5FD" : "#6B6B8A" }}>
                  {tier.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "#1E1E35" }} />

        {/* Price */}
        <div style={{ padding: "12px 14px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div>
              <span style={{ fontSize: "22px", fontWeight: 700, color: "#fff" }}>{fmt(sel.price)}</span>
              <span style={{ fontSize: "12px", color: "#6B6B8A", marginLeft: "4px" }}>
                {selected === "monthly" ? "/month" : `/ ${sel.months} months`}
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "2px" }}>{note}</div>
          </div>
          <span style={{ fontSize: "11px", color: "#6B6B8A" }}>Cancel anytime</span>
        </div>

        {/* CTA */}
        <div style={{ padding: "0 10px 10px" }}>
          <button
            onClick={() => onSubscribe?.(selected)}
            style={gradBtn}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff", position: "relative", zIndex: 1 }}>
              Subscribe
            </span>
            <span style={{
              fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.75)",
              background: "rgba(255,255,255,0.15)", padding: "3px 10px", borderRadius: "20px",
              position: "relative", zIndex: 1,
            }}>
              {pillLabel}
            </span>
            <span style={sweepBar} />
          </button>
        </div>

      </div>
    </>
  );
}