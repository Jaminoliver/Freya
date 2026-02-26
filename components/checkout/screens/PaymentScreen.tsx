"use client";

import * as React from "react";
import { ArrowLeft, X, Lock } from "lucide-react";
import type { Currency, PaymentMethod, PaymentMethodId, CheckoutType, SubscriptionTier, VirtualAccountDisplay } from "@/lib/types/checkout";
import CurrencySwitcher, { CURRENCIES } from "../components/CurrencySwitcher";
import PaymentMethodCard from "../components/PaymentMethodCard";

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "freya_wallet",          name: "Freya Wallet",   subtitle: "Instant payment",        color: "#7C3AED", letter: "F" },
  { id: "kyshi_virtual_account", name: "Bank Transfer",  subtitle: "Virtual bank transfer",  color: "#8B5CF6", letter: "B" },
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
  const [copied, setCopied] = React.useState(false);
  const [transferStatus, setTransferStatus] = React.useState<TransferStatus>("idle");

  const pollRef    = React.useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const vaRef      = React.useRef<VirtualAccountDisplay | null>(null);

  const currencyOption = CURRENCIES.find((c) => c.code === currency)!;
  const symbol = currencyOption.symbol;

  const isBankTransfer = selectedMethod === "kyshi_virtual_account";
  const isWallet = selectedMethod === "freya_wallet";
  const insufficientBalance = isWallet && walletBalance < amount;
  const canProceed = selectedMethod !== null && !insufficientBalance && !loading && transferStatus !== "waiting";

  const fmt = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const orderLabel = tier
    ? `${label} · ${TIER_LABEL[tier]}`
    : type === "tips" ? `Tip to ${label}` : label;

  // ── Polling ──────────────────────────────────────────────────────────────
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
        // Tips: poll transaction status by reference
        // Subscriptions: poll subscription status by creatorId
        if (type === "tips") {
          const ref = vaRef.current?.reference;
          if (!ref) return;
          const res = await fetch(`/api/tips/status?reference=${ref}`);
          if (!res.ok) return;
          const { completed } = await res.json();
          if (completed) {
            stopPolling();
            setTransferStatus("success");
            onPaymentConfirmed?.();
            setTimeout(() => onClose(), 2500);
          }
        } else {
          const res = await fetch(`/api/subscriptions/status?creatorId=${creatorId}`);
          if (!res.ok) return;
          const { active } = await res.json();
          if (active) {
            stopPolling();
            setTransferStatus("success");
            onPaymentConfirmed?.();
            setTimeout(() => onClose(), 2500);
          }
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ctaLabel = () => {
    if (loading) return isBankTransfer && !virtualAccount ? "Generating account..." : "Processing...";
    if (isBankTransfer && virtualAccount) return "I've Completed the Transfer";
    if (isBankTransfer) return "Generate Bank Account";
    return "Pay Now";
  };

  const successMessage = type === "tips" ? "Tip sent successfully!" : "You are now subscribed";

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

      {/* Virtual account details */}
      {isBankTransfer && virtualAccount && (
        <div style={{
          margin: "0 20px 16px",
          backgroundColor: "#1C1C2E",
          border: `1.5px solid ${
            transferStatus === "success" ? "#22C55E" :
            transferStatus === "expired" ? "#EF4444" : "#2A2A3D"
          }`,
          borderRadius: "10px", padding: "16px",
          transition: "border-color 0.3s",
        }}>

          {transferStatus === "waiting" && (
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              backgroundColor: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.25)",
              borderRadius: "8px", padding: "10px 14px", marginBottom: "16px",
            }}>
              <div style={{
                width: "16px", height: "16px", flexShrink: 0,
                border: "2px solid #2A2A3D", borderTop: "2px solid #8B5CF6",
                borderRadius: "50%", animation: "spin 0.8s linear infinite",
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#A78BFA", margin: "0 0 1px" }}>
                  Waiting for payment...
                </p>
                <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0 }}>
                  Transfer {fmt(virtualAccount.amount ?? 0)} to confirm automatically
                </p>
              </div>
            </div>
          )}

          {transferStatus === "success" && (
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              backgroundColor: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: "8px", padding: "10px 14px", marginBottom: "16px",
            }}>
              <span style={{ fontSize: "20px" }}>✅</span>
              <div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#22C55E", margin: "0 0 1px" }}>
                  Payment received!
                </p>
                <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0 }}>{successMessage}</p>
              </div>
            </div>
          )}

          {transferStatus === "expired" && (
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              backgroundColor: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "8px", padding: "10px 14px", marginBottom: "16px",
            }}>
              <span style={{ fontSize: "20px" }}>⏱</span>
              <div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#EF4444", margin: "0 0 1px" }}>Session expired</p>
                <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0 }}>Generate a new account to continue</p>
              </div>
            </div>
          )}

          <p style={{ fontSize: "11px", fontWeight: 600, color: "#8B5CF6", margin: "0 0 12px", letterSpacing: "0.06em" }}>
            TRANSFER DETAILS
          </p>

          {[
            { label: "Bank", value: virtualAccount.bankName },
            { label: "Account Name", value: virtualAccount.accountName },
            { label: "Amount", value: fmt(virtualAccount.amount ?? 0) },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "#6B6B8A" }}>{label}</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#F1F5F9" }}>{value}</span>
            </div>
          ))}

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            backgroundColor: "#0A0A0F", borderRadius: "8px", padding: "10px 12px", marginTop: "4px",
          }}>
            <div>
              <p style={{ fontSize: "10px", color: "#6B6B8A", margin: "0 0 2px" }}>Account Number</p>
              <p style={{ fontSize: "18px", fontWeight: 700, color: "#F1F5F9", margin: 0, letterSpacing: "2px" }}>
                {virtualAccount.accountNumber}
              </p>
            </div>
            <button
              onClick={() => handleCopy(virtualAccount.accountNumber)}
              style={{
                backgroundColor: copied ? "rgba(34,197,94,0.1)" : "rgba(139,92,246,0.1)",
                border: `1px solid ${copied ? "#22C55E" : "#8B5CF6"}`,
                color: copied ? "#22C55E" : "#A78BFA",
                borderRadius: "6px", padding: "6px 12px",
                fontSize: "12px", fontWeight: 600, cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {transferStatus !== "success" && transferStatus !== "expired" && (
            <p style={{ fontSize: "11px", color: "#F59E0B", margin: "12px 0 0", textAlign: "center" }}>
              ⏱ Transfer exactly {fmt(virtualAccount.amount ?? 0)} before this account expires
            </p>
          )}
        </div>
      )}

      {/* CTA — hide when waiting or success */}
      {transferStatus !== "waiting" && transferStatus !== "success" && (
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
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: canProceed ? "#fff" : "#4A4A6A" }}>
              {ctaLabel()}
            </span>
          </button>
        </div>
      )}

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