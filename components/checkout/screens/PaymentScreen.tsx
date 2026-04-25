"use client";

import * as React from "react";
import { ArrowLeft, X, Lock } from "lucide-react";
import type { Currency, PaymentMethod, PaymentMethodId, CheckoutType, SubscriptionTier, VirtualAccountDisplay } from "@/lib/types/checkout";
import CurrencySwitcher, { CURRENCIES } from "../components/CurrencySwitcher";
import PaymentMethodCard from "../components/PaymentMethodCard";

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "freya_wallet",  name: "Freya Wallet",   subtitle: "Instant payment",        color: "#7C3AED", letter: "F" },
  { id: "bank_transfer", name: "Bank Transfer",  subtitle: "Virtual bank transfer",  color: "#8B5CF6", letter: "B" },
  { id: "card",          name: "Card Payment",   subtitle: "Visa / Mastercard / Verve", color: "#6366F1", letter: "C" },
];

const POLL_INTERVAL = 3000;
const POLL_TIMEOUT  = 10 * 60 * 1000;

type TransferStatus = "idle" | "waiting" | "success" | "expired";

interface PaymentScreenProps {
  type: CheckoutType;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  selectedMethod: PaymentMethodId | null;
  onMethodChange: (id: PaymentMethodId) => void;
  amount: number;
  label: string;
  tier?: SubscriptionTier;
  virtualAccount?: VirtualAccountDisplay | null;
  walletBalance?: number;
  loading?: boolean;
  error?: string | null;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  onPaymentConfirmed?: () => void;
  creatorId?: string;
}

const TIER_LABEL: Record<SubscriptionTier, string> = {
  monthly: "1 month",
  three_month: "3 months",
  six_month: "6 months",
};

export default function PaymentScreen({
  type, currency, onCurrencyChange, selectedMethod, onMethodChange,
  amount, label, tier, virtualAccount, walletBalance = 0, loading = false, error,
  onNext, onBack, onClose, onPaymentConfirmed, creatorId,
}: PaymentScreenProps) {
  const [transferStatus, setTransferStatus] = React.useState<TransferStatus>("idle");

  const prevMethod = React.useRef<PaymentMethodId | null>(null);
  React.useEffect(() => {
    if (selectedMethod === "bank_transfer" && prevMethod.current !== "bank_transfer" && !virtualAccount) {
      onNext();
    }
    prevMethod.current = selectedMethod;
  }, [selectedMethod]);

  const pollRef    = React.useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const vaRef      = React.useRef<VirtualAccountDisplay | null>(null);

  const currencyOption = CURRENCIES.find((c) => c.code === currency)!;
  const symbol = currencyOption.symbol;

  const isBankTransfer = selectedMethod === "bank_transfer";
  const isCard = selectedMethod === "card";
  const isWallet = selectedMethod === "freya_wallet";
  const insufficientBalance = isWallet && walletBalance < amount;
  const canProceed = selectedMethod !== null && !insufficientBalance && !loading && transferStatus !== "waiting";

  const fmt = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const orderLabel = tier
    ? `${label} · ${TIER_LABEL[tier]}`
    : type === "tips" ? `Tip to ${label}` : label;

  // ── Polling for bank transfer ────────────────────────────────────────────
  React.useEffect(() => {
    if (!virtualAccount) {
      stopPolling();
      vaRef.current = null;
      if (transferStatus === "waiting") setTransferStatus("idle");
      return;
    }

    vaRef.current = virtualAccount;
    setTransferStatus("waiting");
    startPolling();

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setTransferStatus("expired");
    }, POLL_TIMEOUT);

    return () => stopPolling();
  }, [virtualAccount]);

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const ref = vaRef.current?.reference;
        if (!ref) return;
        const res = await fetch(`/api/checkout/status?reference=${ref}`);
        if (!res.ok) return;
        const { confirmed } = await res.json();
        if (confirmed) {
          stopPolling();
          setTransferStatus("success");
          setTimeout(() => onPaymentConfirmed?.(), 2000);
        }
      } catch {
        // silently retry
      }
    }, POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollRef.current)    { clearInterval(pollRef.current);  pollRef.current    = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }
  // ─────────────────────────────────────────────────────────────────────────

  

  const ctaLabel = () => {
    if (loading) {
      if (isCard) return "Redirecting to checkout...";
      return "Processing..."; // keep — we'll replace the button content below
    }
    if (isCard) return "Pay with Card";
    return "Pay Now";
  };


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

      {/* Order summary */}
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
            <div key={method.id}>
              <PaymentMethodCard
                method={{
                  ...method,
                  subtitle: method.id === "freya_wallet"
                    ? `Balance: ${fmt(walletBalance)}`
                    : method.subtitle,
                }}
                selected={selectedMethod === method.id}
                onSelect={onMethodChange}
                symbol={symbol}
                amount={amount}
                virtualAccount={method.id === "bank_transfer" ? virtualAccount : null}
                transferStatus={method.id === "bank_transfer" ? transferStatus : undefined}
              />
              {method.id === "freya_wallet" && selectedMethod === "freya_wallet" && insufficientBalance && (
                <p style={{ fontSize: "11px", color: "#EF4444", margin: "6px 0 0 4px" }}>
                  Insufficient balance — top up your wallet first
                </p>
              )}
            </div>
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

      {/* Error */}
      {error && (
        <div style={{ margin: "0 20px 12px", padding: "10px 14px", borderRadius: "8px", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <p style={{ margin: 0, fontSize: "12px", color: "#EF4444" }}>❌ {error}</p>
        </div>
      )}

      

      {/* CTA — hide for bank transfer and when waiting or success */}
      {!isBankTransfer && transferStatus !== "waiting" && transferStatus !== "success" && (
        <div style={{ padding: "0 20px 8px" }}>
          <button
            onClick={onNext}
            disabled={!canProceed}
            style={{
              width: "100%", padding: "13px", borderRadius: "10px",
              background: canProceed ? "linear-gradient(135deg, #8B5CF6, #7C3AED)" : "#1E1E2E",
              border: "none", cursor: canProceed ? "pointer" : "not-allowed",
              fontFamily: "'Inter', sans-serif", transition: "all 0.15s ease",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: "16px", height: "16px", borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  animation: "spin 0.7s linear infinite",
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                  {isCard ? "Redirecting..." : "Processing..."}
                </span>
              </>
            ) : (
              <span style={{ fontSize: "14px", fontWeight: 700, color: canProceed ? "#fff" : "#4A4A6A" }}>
                {ctaLabel()}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Security note */}
      <div style={{ padding: "8px 20px 18px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
        <Lock size={11} color="#6B6B8A" />
        <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A" }}>
          Secured by Monnify. Charges appear as &quot;Freya Credits&quot;
        </p>
      </div>
    </div>
  );
}