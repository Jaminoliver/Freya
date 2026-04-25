"use client";

import * as React from "react";
import type { PaymentMethod, PaymentMethodId } from "@/lib/types/checkout";

interface PaymentMethodCardProps {
  method: PaymentMethod;
  selected: boolean;
  onSelect: (id: PaymentMethodId) => void;
  symbol: string;
  amount: number;
  virtualAccount?: {
    accountNumber: string;
    bankName: string;
    accountName: string;
    expiresAt: string;
  } | null;
  transferStatus?: "idle" | "waiting" | "success" | "expired";
}

function CopyRow({ label, value, large }: { label: string; value: string; large?: boolean }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0A0A0F", borderRadius: "8px", padding: "10px 12px" }}>
      <div>
        <p style={{ fontSize: "10px", color: "#6B6B8A", margin: "0 0 2px" }}>{label}</p>
        <p style={{ fontSize: large ? "18px" : "13px", fontWeight: 700, color: "#F1F5F9", margin: 0, letterSpacing: large ? "2px" : "0" }}>{value}</p>
      </div>
      <button onClick={copy} style={{ backgroundColor: copied ? "rgba(34,197,94,0.1)" : "rgba(139,92,246,0.1)", border: `1px solid ${copied ? "#22C55E" : "#8B5CF6"}`, color: copied ? "#22C55E" : "#A78BFA", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export default function PaymentMethodCard({
  method,
  selected,
  onSelect,
  symbol,
  amount,
  virtualAccount,
  transferStatus = "idle",
}: PaymentMethodCardProps) {
  const isBankTransfer = method.id === "bank_transfer";
  const showBankDetails = selected && isBankTransfer;

  const borderColor = selected ? "#8B5CF6" : "#2A2A3D";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      <button
        onClick={() => onSelect(method.id)}
        style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "14px 16px",
          borderRadius: showBankDetails ? "10px 10px 0 0" : "10px",
          backgroundColor: selected ? "rgba(139,92,246,0.06)" : "rgba(255,255,255,0.02)",
          borderTop: `1px solid ${borderColor}`,
          borderLeft: `1px solid ${borderColor}`,
          borderRight: `1px solid ${borderColor}`,
          borderBottom: showBankDetails ? "none" : `1px solid ${borderColor}`,
          cursor: "pointer", width: "100%", textAlign: "left",
          transition: "all 0.15s ease",
        }}
      >
        {/* Icon */}
        <div style={{
          width: "36px", height: "36px", borderRadius: "8px",
          backgroundColor: method.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>{method.letter}</span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#F1F5F9" }}>{method.name}</p>
          {method.balance !== undefined ? (
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#22C55E", fontWeight: 500 }}>
              Balance: {symbol}{method.balance.toLocaleString()}
            </p>
          ) : (
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6B6B8A" }}>{method.subtitle}</p>
          )}
        </div>

        {/* Radio */}
        <div style={{
          width: "18px", height: "18px", borderRadius: "50%",
          border: selected ? "2px solid #8B5CF6" : "2px solid #3A3A4D",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "border-color 0.15s ease",
        }}>
          {selected && (
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%",
              backgroundColor: "#8B5CF6",
            }} />
          )}
        </div>
      </button>

      {/* Bank transfer details (expanded inline) */}
      {showBankDetails && (
        <div style={{
          border: "1px solid #8B5CF6", borderTop: "none",
          borderRadius: "0 0 10px 10px",
          padding: "12px",
          backgroundColor: "rgba(139,92,246,0.03)",
        }}>
          {virtualAccount ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes successPop {
                  0%   { transform: scale(0); opacity: 0; }
                  60%  { transform: scale(1.2); opacity: 1; }
                  100% { transform: scale(1); opacity: 1; }
                }
              `}</style>

              {transferStatus === "waiting" && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "8px", padding: "10px 14px" }}>
                  <div style={{ width: "14px", height: "14px", flexShrink: 0, border: "2px solid #2A2A3D", borderTop: "2px solid #8B5CF6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#A78BFA", margin: "0 0 1px" }}>Waiting for payment...</p>
                    <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0 }}>Transfer will confirm automatically</p>
                  </div>
                </div>
              )}

              {transferStatus === "success" && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "8px", padding: "10px 14px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#22C55E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: "successPop 0.4s ease-out forwards" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#22C55E", margin: "0 0 1px" }}>Payment received!</p>
                    <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0 }}>Redirecting you now...</p>
                  </div>
                </div>
              )}

              {transferStatus === "expired" && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "10px 14px" }}>
                  <span style={{ fontSize: "18px" }}>⏱</span>
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#EF4444", margin: "0 0 1px" }}>Session expired</p>
                    <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0 }}>Please select a new payment method</p>
                  </div>
                </div>
              )}
              {[
                { label: "Bank", value: virtualAccount.bankName },
                { label: "Account Name", value: virtualAccount.accountName },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#6B6B8A" }}>{label}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#F1F5F9" }}>{value}</span>
                </div>
              ))}
              <CopyRow label="Amount" value={`${symbol}${amount.toLocaleString()}`} />
              <CopyRow label="Account Number" value={virtualAccount.accountNumber} large />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "8px 0" }}>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ width: "14px", height: "14px", border: "2px solid #2A2A3D", borderTop: "2px solid #8B5CF6", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: "13px", color: "#6B6B8A" }}>Generating account...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}