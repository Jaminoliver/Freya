"use client";

import * as React from "react";
import type { Currency, CurrencyOption } from "@/lib/types/checkout";

const CURRENCIES: CurrencyOption[] = [
  { code: "NGN", flag: "🇳🇬", symbol: "₦", label: "NGN" },
  { code: "GHS", flag: "🇬🇭", symbol: "₵", label: "GHS" },
  { code: "KES", flag: "🇰🇪", symbol: "KSh", label: "KES" },
];

interface CurrencySwitcherProps {
  selected: Currency;
  onChange: (currency: Currency) => void;
}

export default function CurrencySwitcher({ selected, onChange }: CurrencySwitcherProps) {
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      {CURRENCIES.map((c) => {
        const active = selected === c.code;
        return (
          <button
            key={c.code}
            onClick={() => onChange(c.code)}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "5px 10px", borderRadius: "20px",
              backgroundColor: active ? "#7C3AED" : "transparent",
              border: active ? "1px solid #7C3AED" : "1px solid #2A2A3D",
              cursor: "pointer", transition: "all 0.15s ease",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <span style={{ fontSize: "12px" }}>{c.flag}</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: active ? "#fff" : "#6B6B8A" }}>
              {c.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { CURRENCIES };