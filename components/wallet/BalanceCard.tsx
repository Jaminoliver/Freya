"use client";

import { useState } from "react";

// Declare MonnifySDK on window
declare global {
  interface Window {
    MonnifySDK: {
      initialize: (config: {
        amount: number;
        currency: string;
        reference: string;
        customerName: string;
        customerEmail: string;
        apiKey: string;
        contractCode: string;
        paymentDescription: string;
        isTestMode: boolean;
        metadata: Record<string, any>;
        paymentMethods?: string[];
        onComplete: (response: any) => void;
        onClose: (data: any) => void;
      }) => void;
    };
  }
}

interface BalanceCardProps {
  balance: number;
  onPaymentComplete: (reference: string) => void;
  onPaymentFailed: () => void;
}

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000];
const MIN_AMOUNT = 500;

function calculateFee(amount: number): number {
  return Math.min(Math.round(amount * 0.015), 2000);
}

export default function BalanceCard({
  balance,
  onPaymentComplete,
  onPaymentFailed,
}: BalanceCardProps) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"card" | "bank">("card");
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const fmt = (n: number) =>
    "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const amount = selected ?? (custom ? parseInt(custom.replace(/\D/g, ""), 10) : 0);
  const fee = amount ? calculateFee(amount) : 0;
  const canProceed = amount >= MIN_AMOUNT;

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(null);
    const raw = e.target.value.replace(/\D/g, "");
    setCustom(raw);
  };

  const handlePreset = (val: number) => {
    setSelected(val);
    setCustom("");
  };

  const handleProceed = async () => {
    if (!canProceed || loading) return;
    setLoading(true);

    try {
      // Call our API to initialize the transaction
      const endpoint = method === "card"
        ? "/api/wallet/topup/card"
        : "/api/wallet/topup/virtual-account";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("[BalanceCard] API error:", data.message);
        onPaymentFailed();
        setLoading(false);
        return;
      }

      // Check if MonnifySDK is loaded
      if (typeof window === "undefined" || !window.MonnifySDK) {
        // Fallback: redirect to checkout URL if SDK not loaded
        if (data.authorizationUrl || data.checkoutUrl) {
          window.location.href = data.authorizationUrl || data.checkoutUrl;
          return;
        }
        console.error("[BalanceCard] MonnifySDK not loaded and no checkout URL");
        onPaymentFailed();
        setLoading(false);
        return;
      }

      // Launch Monnify inline checkout modal
      window.MonnifySDK.initialize({
        amount: data.amountNaira,
        currency: "NGN",
        reference: data.reference,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        apiKey: data.apiKey,
        contractCode: data.contractCode,
        paymentDescription: data.paymentDescription,
        isTestMode: data.isTestMode,
        metadata: data.metadata || {},
        paymentMethods: method === "card" ? ["CARD"] : ["ACCOUNT_TRANSFER"],
        onComplete: (response: any) => {
          console.log("[Monnify SDK] Payment complete:", response);
          setLoading(false);
          setOpen(false);
          setSelected(null);
          setCustom("");
          // Webhook handles DB update, but we can refresh UI immediately
          if (response.paymentStatus === "PAID" || response.status === "SUCCESS") {
            onPaymentComplete(data.reference);
          } else {
            onPaymentFailed();
          }
        },
        onClose: (data: any) => {
          console.log("[Monnify SDK] Modal closed:", data);
          setLoading(false);
        },
      });
    } catch (error) {
      console.error("[BalanceCard] Error:", error);
      onPaymentFailed();
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px 20px 0", fontFamily: "'Inter', sans-serif" }}>

      {/* Balance row */}
      <p style={{ fontSize: "11px", fontWeight: 500, color: "#6B6B8A", margin: "0 0 4px", letterSpacing: "0.04em" }}>
        Wallet balance
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <span style={{ fontSize: "28px", fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.5px", lineHeight: 1 }}>
          {fmt(balance)}
        </span>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            backgroundColor: open ? "transparent" : "#8B5CF6",
            color: open ? "#6B6B8A" : "#fff",
            border: open ? "1px solid #2A2A3D" : "none",
            borderRadius: "8px", padding: "8px 16px",
            fontSize: "13px", fontWeight: 600, cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {open ? "Cancel" : "Add funds"}
        </button>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid #1E1E2E", paddingTop: "20px", paddingBottom: "20px" }}>

          {/* Payment method toggle */}
          <p style={{ fontSize: "11px", fontWeight: 500, color: "#6B6B8A", margin: "0 0 10px", letterSpacing: "0.04em" }}>
            Payment method
          </p>
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            {(["card", "bank"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                style={{
                  flex: 1, padding: "10px",
                  borderRadius: "8px",
                  border: `1.5px solid ${method === m ? "#8B5CF6" : "#2A2A3D"}`,
                  backgroundColor: method === m ? "rgba(139,92,246,0.1)" : "transparent",
                  color: method === m ? "#A78BFA" : "#64748B",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif", transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                }}
              >
                {m === "card" ? "💳 Card" : "🏦 Bank Transfer"}
              </button>
            ))}
          </div>

          {/* Amount selector */}
          <p style={{ fontSize: "11px", fontWeight: 500, color: "#6B6B8A", margin: "0 0 12px", letterSpacing: "0.04em" }}>
            Select amount
          </p>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            {PRESET_AMOUNTS.map((amt) => {
              const active = selected === amt;
              return (
                <button
                  key={amt}
                  onClick={() => handlePreset(amt)}
                  style={{
                    padding: "6px 14px", borderRadius: "6px",
                    border: `1px solid ${active ? "#8B5CF6" : "#2A2A3D"}`,
                    backgroundColor: active ? "rgba(139,92,246,0.1)" : "transparent",
                    color: active ? "#A78BFA" : "#94A3B8",
                    fontSize: "13px", fontWeight: 500, cursor: "pointer",
                    fontFamily: "'Inter', sans-serif", transition: "all 0.15s",
                  }}
                >
                  ₦{amt.toLocaleString()}
                </button>
              );
            })}
          </div>

          <input
            type="text"
            inputMode="numeric"
            value={custom ? `₦${parseInt(custom).toLocaleString()}` : ""}
            onChange={handleCustomChange}
            onFocus={() => { setFocused(true); setSelected(null); }}
            onBlur={() => setFocused(false)}
            placeholder="Custom amount"
            style={{
              width: "100%", backgroundColor: "transparent", border: "none",
              borderBottom: `1px solid ${focused ? "#8B5CF6" : "#2A2A3D"}`,
              borderRadius: 0, padding: "8px 0", fontSize: "13px", color: "#F1F5F9",
              outline: "none", boxSizing: "border-box", fontFamily: "'Inter', sans-serif",
              transition: "border-color 0.2s", marginBottom: "16px",
            }}
          />

          {amount >= MIN_AMOUNT && method === "card" && (
            <p style={{ fontSize: "11px", color: "#6B6B8A", margin: "0 0 12px" }}>
              Processing fee ≈ ₦{fee.toLocaleString()} (1.5%, max ₦2,000)
            </p>
          )}

          {amount >= MIN_AMOUNT && method === "bank" && (
            <p style={{ fontSize: "11px", color: "#6B6B8A", margin: "0 0 12px" }}>
              Transfer exact amount — account expires in 30 minutes
            </p>
          )}

          {/* Proceed button */}
          <button
            onClick={handleProceed}
            disabled={!canProceed || loading}
            style={{
              width: "100%", padding: "11px", borderRadius: "8px", border: "none",
              backgroundColor: canProceed && !loading ? "#8B5CF6" : "#1E1E2E",
              color: canProceed && !loading ? "#fff" : "#6B6B8A",
              fontSize: "13px", fontWeight: 600,
              cursor: canProceed && !loading ? "pointer" : "not-allowed",
              fontFamily: "'Inter', sans-serif", transition: "opacity 0.15s", marginBottom: "10px",
            }}
          >
            {loading
              ? "Opening checkout..."
              : method === "card"
              ? "Pay with Card"
              : "Pay with Bank Transfer"}
          </button>

          <p style={{ fontSize: "11px", color: "#6B6B8A", textAlign: "center", margin: 0 }}>
            Secured by Monnify
          </p>
        </div>
      )}
    </div>
  );
}