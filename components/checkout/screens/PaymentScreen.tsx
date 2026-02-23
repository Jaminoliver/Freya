"use client";

import * as React from "react";
import { ArrowLeft, X, Lock } from "lucide-react";
import type { Currency, PaymentMethod, PaymentMethodId, CheckoutType, SubscriptionTier } from "@/lib/types/checkout";
import CurrencySwitcher, { CURRENCIES } from "../components/CurrencySwitcher";
import PaymentMethodCard from "../components/PaymentMethodCard";

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "freya_wallet", name: "Freya Wallet", subtitle: "Instant payment", balance: 12500, color: "#7C3AED", letter: "F" },
  { id: "payonus",      name: "Payonus",      subtitle: "Virtual bank transfer",                              color: "#8B5CF6", letter: "P" },
  { id: "kyshi",        name: "Kyshi",         subtitle: "Virtual bank transfer",                              color: "#6D28D9", letter: "K" },
];

interface PaymentScreenProps {
  type: CheckoutType;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  selectedMethod: PaymentMethodId | null;
  onMethodChange: (id: PaymentMethodId) => void;
  amount: number;
  label: string;
  tier?: SubscriptionTier;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}

const TIER_LABEL: Record<SubscriptionTier, string> = {
  monthly: "1 month",
  three_month: "3 months",
  six_month: "6 months",
};

export default function PaymentScreen({
  type, currency, onCurrencyChange, selectedMethod, onMethodChange,
  amount, label, tier, onNext, onBack, onClose,
}: PaymentScreenProps) {
  const currencyOption = CURRENCIES.find((c) => c.code === currency)!;
  const symbol = currencyOption.symbol;

  const isBankTransfer = selectedMethod === "payonus" || selectedMethod === "kyshi";
  const canProceed = selectedMethod !== null;

  const orderLabel = tier
    ? `${label} · ${TIER_LABEL[tier]}`
    : type === "tips"
    ? `Tip to ${label}`
    : label;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px", display: "flex" }}>
          <ArrowLeft size={18} color="#6B6B8A" />
        </button>
        <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#F1F5F9" }}>Payment</p>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px", display: "flex" }}>
          <X size={18} color="#6B6B8A" />
        </button>
      </div>

      {/* Currency switcher */}
      <div style={{ padding: "0 20px 14px" }}>
        <CurrencySwitcher selected={currency} onChange={onCurrencyChange} />
      </div>

      {/* Order summary line */}
      <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: "13px", color: "#A3A3C2" }}>{orderLabel}</p>
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#F1F5F9" }}>
          {symbol}{amount.toLocaleString()}
        </p>
      </div>

      <div style={{ height: "1px", backgroundColor: "#1E1E2E", margin: "0 20px" }} />

      {/* Payment methods */}
      <div style={{ padding: "14px 20px" }}>
        <p style={{ margin: "0 0 10px", fontSize: "10px", fontWeight: 700, color: "#6B6B8A", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Select payment method
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {PAYMENT_METHODS.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              selected={selectedMethod === method.id}
              onSelect={onMethodChange}
              symbol={symbol}
              amount={amount}
            />
          ))}
        </div>
      </div>

      <div style={{ height: "1px", backgroundColor: "#1E1E2E", margin: "0 20px" }} />

      {/* Total */}
      <div style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#F1F5F9" }}>Total</p>
          <p style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#F1F5F9" }}>
            {symbol}{amount.toLocaleString()}
          </p>
        </div>
        <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#6B6B8A" }}>
          {type === "subscription" ? "Billed monthly until cancelled" : "One-time payment"}
        </p>
      </div>

      {/* CTA */}
      <div style={{ padding: "0 20px 8px" }}>
        <button
          onClick={onNext}
          disabled={!canProceed}
          style={{
            width: "100%", padding: "13px", borderRadius: "10px",
            background: canProceed ? "linear-gradient(135deg, #8B5CF6, #7C3AED)" : "#1E1E2E",
            border: "none", cursor: canProceed ? "pointer" : "not-allowed",
            fontFamily: "'Inter', sans-serif", transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { if (canProceed) e.currentTarget.style.opacity = "0.9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <span style={{ fontSize: "14px", fontWeight: 700, color: canProceed ? "#fff" : "#4A4A6A" }}>
            {isBankTransfer ? "I've Completed the Transfer" : "Continue"}
          </span>
        </button>
      </div>

      {/* Security note */}
      <div style={{ padding: "8px 20px 18px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
        <Lock size={11} color="#6B6B8A" />
        <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A" }}>
          Secured. Charges appear as "Freya Credits"
        </p>
      </div>
    </div>
  );
}