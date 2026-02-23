"use client";

import * as React from "react";
import { X, ArrowRight } from "lucide-react";
import type { User } from "@/lib/types/profile";
import type { Currency } from "@/lib/types/checkout";
import { CURRENCIES } from "../components/CurrencySwitcher";
import CurrencySwitcher from "../components/CurrencySwitcher";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

interface TipScreenProps {
  creator: User;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  tipAmount: number;
  onTipAmountChange: (amount: number) => void;
  onNext: () => void;
  onClose: () => void;
}

export default function TipScreen({
  creator, currency, onCurrencyChange, tipAmount, onTipAmountChange, onNext, onClose,
}: TipScreenProps) {
  const [inputValue, setInputValue] = React.useState(tipAmount > 0 ? String(tipAmount) : "");
  const currencyOption = CURRENCIES.find((c) => c.code === currency)!;
  const symbol = currencyOption.symbol;

  const handleInput = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, "");
    setInputValue(cleaned);
    onTipAmountChange(Number(cleaned) || 0);
  };

  const handleQuick = (amount: number) => {
    setInputValue(String(amount));
    onTipAmountChange(amount);
  };

  const canProceed = tipAmount > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px" }}>
        <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#F1F5F9" }}>Send a Tip</p>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px", display: "flex" }}>
          <X size={18} color="#6B6B8A" />
        </button>
      </div>

      {/* Creator info */}
      <div style={{ padding: "0 20px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "44px", height: "44px", borderRadius: "50%",
          backgroundColor: "#2A2A3D", overflow: "hidden", flexShrink: 0,
          border: "2px solid #3A3A4D",
        }}>
          {creator.avatar_url
            ? <img src={creator.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "18px", fontWeight: 700, color: "#8B5CF6" }}>
                  {(creator.display_name || creator.username).charAt(0).toUpperCase()}
                </span>
              </div>
          }
        </div>
        <div>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#F1F5F9" }}>
            {creator.display_name || creator.username}
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#6B6B8A" }}>@{creator.username}</p>
        </div>
      </div>

      {/* Currency switcher */}
      <div style={{ padding: "0 20px 16px" }}>
        <CurrencySwitcher selected={currency} onChange={onCurrencyChange} />
      </div>

      <div style={{ height: "1px", backgroundColor: "#1E1E2E", margin: "0 20px" }} />

      {/* Amount input */}
      <div style={{ padding: "20px 20px 12px" }}>
        <p style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: 600, color: "#6B6B8A", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Enter amount
        </p>
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid #2A2A3D",
          borderRadius: "10px", padding: "12px 16px",
          transition: "border-color 0.15s ease",
        }}>
          <span style={{ fontSize: "22px", fontWeight: 700, color: "#6B6B8A", flexShrink: 0 }}>{symbol}</span>
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="0"
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: "22px", fontWeight: 700, color: "#F1F5F9",
              fontFamily: "'Inter', sans-serif", width: "100%",
            }}
          />
        </div>
      </div>

      {/* Quick amounts */}
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {QUICK_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => handleQuick(amount)}
              style={{
                flex: 1, padding: "7px 4px", borderRadius: "8px",
                backgroundColor: tipAmount === amount ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)",
                border: tipAmount === amount ? "1px solid #8B5CF6" : "1px solid #2A2A3D",
                cursor: "pointer", transition: "all 0.15s ease",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 600, color: tipAmount === amount ? "#A78BFA" : "#6B6B8A" }}>
                {symbol}{(amount / 1000).toFixed(amount >= 1000 ? 0 : 1)}k
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: "1px", backgroundColor: "#1E1E2E", margin: "0 20px" }} />

      {/* CTA */}
      <div style={{ padding: "16px 20px 18px" }}>
        <button
          onClick={onNext}
          disabled={!canProceed}
          style={{
            width: "100%", padding: "13px", borderRadius: "10px",
            background: canProceed ? "linear-gradient(135deg, #8B5CF6, #7C3AED)" : "#1E1E2E",
            border: "none", cursor: canProceed ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            fontFamily: "'Inter', sans-serif", transition: "all 0.15s ease",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 700, color: canProceed ? "#fff" : "#4A4A6A" }}>
            {canProceed ? `Send ${symbol}${Number(inputValue).toLocaleString()} Tip` : "Enter an amount"}
          </span>
          {canProceed && <ArrowRight size={16} color="#fff" />}
        </button>
      </div>
    </div>
  );
}