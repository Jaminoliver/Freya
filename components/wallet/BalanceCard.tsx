"use client";

import { useState, useEffect, useRef } from "react";

interface BalanceCardProps {
  balance: number;
  onProceedCard: (amount: number) => void;
  onProceedBankTransfer: (amount: number) => void;
  bankAccount?: {
    accountNumber: string;
    bankName: string;
    accountName: string;
    onusReference: string;
    amount: number;
  } | null;
  bankTransferLoading?: boolean;
  onPaymentConfirmed?: () => void;
}

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000];
const MIN_AMOUNT = 500;
const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 10 * 60 * 1000; // 10 minutes

function calculateFee(amount: number): number {
  return Math.min(Math.round(amount * 0.015), 2000);
}

type TransferStatus = "idle" | "waiting" | "success" | "expired";

export default function BalanceCard({
  balance,
  onProceedCard,
  onProceedBankTransfer,
  bankAccount,
  bankTransferLoading,
  onPaymentConfirmed,
}: BalanceCardProps) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"card" | "bank">("card");
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [focused, setFocused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [transferStatus, setTransferStatus] = useState<TransferStatus>("idle");

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBalanceRef = useRef<number>(balance);

  const fmt = (n: number) =>
    "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const amount = selected ?? (custom ? parseInt(custom.replace(/\D/g, ""), 10) : 0);
  const fee = amount ? calculateFee(amount) : 0;
  const canProceed = amount >= MIN_AMOUNT;

  // Start polling when bank account is shown
  useEffect(() => {
    if (!bankAccount) {
      stopPolling();
      if (transferStatus === "waiting") setTransferStatus("idle");
      return;
    }

    lastBalanceRef.current = balance;
    setTransferStatus("waiting");
    startPolling();

    // Auto-expire after 10 minutes
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setTransferStatus("expired");
    }, POLL_TIMEOUT);

    return () => stopPolling();
  }, [bankAccount]);

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/wallet/balance");
        if (!res.ok) return;
        const { balance: newBalance } = await res.json();
        if (newBalance > lastBalanceRef.current) {
          stopPolling();
          setTransferStatus("success");
          onPaymentConfirmed?.();
          setTimeout(() => setOpen(false), 2500);
        }
      } catch {
        // silently retry
      }
    }, POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(null);
    const raw = e.target.value.replace(/\D/g, "");
    setCustom(raw);
  };

  const handlePreset = (val: number) => {
    setSelected(val);
    setCustom("");
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProceed = () => {
    if (!canProceed) return;
    if (method === "card") {
      onProceedCard(amount);
      setOpen(false);
    } else {
      setTransferStatus("idle");
      onProceedBankTransfer(amount);
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
            disabled={!canProceed || bankTransferLoading}
            style={{
              width: "100%", padding: "11px", borderRadius: "8px", border: "none",
              backgroundColor: canProceed ? "#8B5CF6" : "#1E1E2E",
              color: canProceed ? "#fff" : "#6B6B8A",
              fontSize: "13px", fontWeight: 600,
              cursor: canProceed && !bankTransferLoading ? "pointer" : "not-allowed",
              fontFamily: "'Inter', sans-serif", transition: "opacity 0.15s", marginBottom: "10px",
            }}
          >
            {bankTransferLoading
              ? "Generating account..."
              : method === "card"
              ? "Proceed to Checkout"
              : "Generate Bank Account"}
          </button>

          <p style={{ fontSize: "11px", color: "#6B6B8A", textAlign: "center", margin: 0 }}>
            {method === "card" ? "Secured by PayOnUs" : "Powered by PayOnUs"}
          </p>

          {/* Bank account details */}
          {method === "bank" && bankAccount && (
            <div style={{
              marginTop: "20px",
              backgroundColor: "#1C1C2E",
              border: `1.5px solid ${
                transferStatus === "success" ? "#22C55E" :
                transferStatus === "expired" ? "#EF4444" : "#2A2A3D"
              }`,
              borderRadius: "10px", padding: "16px",
              transition: "border-color 0.3s",
            }}>

              {/* ── Status bar ── */}
              {transferStatus === "waiting" && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  backgroundColor: "rgba(139,92,246,0.08)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  borderRadius: "8px", padding: "10px 14px", marginBottom: "16px",
                }}>
                  <div style={{
                    width: "16px", height: "16px", flexShrink: 0,
                    border: "2px solid #2A2A3D",
                    borderTop: "2px solid #8B5CF6",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#A78BFA", margin: "0 0 1px" }}>
                      Waiting for payment...
                    </p>
                    <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0 }}>
                      Transfer ₦{bankAccount.amount.toLocaleString()} to confirm automatically
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
                    <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0 }}>
                      ₦{bankAccount.amount.toLocaleString()} has been added to your wallet
                    </p>
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
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#EF4444", margin: "0 0 1px" }}>
                      Session expired
                    </p>
                    <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0 }}>
                      Generate a new account to continue
                    </p>
                  </div>
                </div>
              )}

              <p style={{ fontSize: "11px", fontWeight: 600, color: "#8B5CF6", margin: "0 0 12px", letterSpacing: "0.06em" }}>
                TRANSFER DETAILS
              </p>

              {[
                { label: "Bank", value: bankAccount.bankName },
                { label: "Account Name", value: bankAccount.accountName },
                { label: "Amount", value: `₦${bankAccount.amount.toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#6B6B8A" }}>{label}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#F1F5F9" }}>{value}</span>
                </div>
              ))}

              {/* Account number with copy */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                backgroundColor: "#0A0A0F", borderRadius: "8px", padding: "10px 12px", marginTop: "4px",
              }}>
                <div>
                  <p style={{ fontSize: "10px", color: "#6B6B8A", margin: "0 0 2px" }}>Account Number</p>
                  <p style={{ fontSize: "18px", fontWeight: 700, color: "#F1F5F9", margin: 0, letterSpacing: "2px" }}>
                    {bankAccount.accountNumber}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(bankAccount.accountNumber)}
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
                  ⏱ Transfer exactly ₦{bankAccount.amount.toLocaleString()} before this account expires
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}