"use client";

import * as React from "react";
import type { PaymentMethod, PaymentMethodId } from "@/lib/types/checkout";
import BankTransferDetails from "./BankTransferDetails";

interface PaymentMethodCardProps {
  method: PaymentMethod;
  selected: boolean;
  onSelect: (id: PaymentMethodId) => void;
  symbol: string;
  amount: number;
}

export default function PaymentMethodCard({ method, selected, onSelect, symbol, amount }: PaymentMethodCardProps) {
  const isBankTransfer = method.id === "payonus" || method.id === "kyshi";
  const showBankDetails = selected && isBankTransfer;

  const mockAccountNumbers: Record<string, string> = {
    payonus: "0123456789",
    kyshi: "9876543210",
  };
  const mockBankNames: Record<string, string> = {
    payonus: "Payonus MFB",
    kyshi: "Kyshi MFB",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      <button
        onClick={() => onSelect(method.id)}
        style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "14px 16px", borderRadius: showBankDetails ? "10px 10px 0 0" : "10px",
          backgroundColor: selected ? "rgba(139,92,246,0.06)" : "rgba(255,255,255,0.02)",
          border: selected ? "1px solid #8B5CF6" : "1px solid #2A2A3D",
          borderBottom: showBankDetails ? "none" : undefined,
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
          <BankTransferDetails
            accountNumber={mockAccountNumbers[method.id] ?? "0000000000"}
            bankName={mockBankNames[method.id] ?? ""}
            amount={`${symbol}${amount.toLocaleString()}`}
          />
        </div>
      )}
    </div>
  );
}