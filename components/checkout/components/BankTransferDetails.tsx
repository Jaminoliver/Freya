"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";

interface BankTransferDetailsProps {
  accountNumber: string;
  bankName: string;
  amount: string;
  onCopy?: () => void;
}

export default function BankTransferDetails({ accountNumber, bankName, amount, onCopy }: BankTransferDetailsProps) {
  const [copied, setCopied] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(30 * 60); // 30 minutes

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(accountNumber).catch(() => {});
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      backgroundColor: "rgba(255,255,255,0.03)",
      border: "1px solid #2A2A3D",
      borderRadius: "10px",
      padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: "10px",
    }}>
      <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, color: "#6B6B8A", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Transfer to this account:
      </p>

      {/* Account number + copy */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#F1F5F9", letterSpacing: "0.04em" }}>
            {accountNumber}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6B6B8A" }}>{bankName}</p>
        </div>
        <button
          onClick={handleCopy}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "32px", height: "32px", borderRadius: "8px",
            backgroundColor: copied ? "rgba(34,197,94,0.1)" : "rgba(139,92,246,0.1)",
            border: copied ? "1px solid #22C55E" : "1px solid #8B5CF6",
            cursor: "pointer", transition: "all 0.2s ease",
          }}
        >
          {copied
            ? <Check size={14} color="#22C55E" />
            : <Copy size={14} color="#8B5CF6" />
          }
        </button>
      </div>

      {/* Amount + timer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#F59E0B" }}>
          Send exactly {amount}
        </p>
        <p style={{ margin: 0, fontSize: "12px", color: timeLeft < 60 ? "#EF4444" : "#6B6B8A" }}>
          Expires in{" "}
          <span style={{ fontWeight: 700, color: timeLeft < 60 ? "#EF4444" : "#A78BFA" }}>
            {formatTime(timeLeft)}
          </span>
        </p>
      </div>
    </div>
  );
}