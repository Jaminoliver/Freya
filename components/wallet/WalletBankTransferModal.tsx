"use client";

import { useEffect, useState } from "react";

interface VirtualAccountInfo {
  accountNumber: string;
  bankName:      string;
  accountName:   string;
  expiresAt:     string | null;
  amount:        number;
  reference:     string;
}

interface WalletBankTransferModalProps {
  isOpen:    boolean;
  account:   VirtualAccountInfo | null;
  onClose:   () => void;
  onConfirm: () => void; // called when user taps "I've sent the money"
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}m ${secs}s remaining`;
}

export default function WalletBankTransferModal({
  isOpen, account, onClose, onConfirm,
}: WalletBankTransferModalProps) {
  const [isClosing, setIsClosing]   = useState(false);
  const [countdown, setCountdown]   = useState("");
  const [copied,    setCopied]      = useState(false);

  useEffect(() => {
    if (!isOpen || !account?.expiresAt) return;
    const id = setInterval(() => setCountdown(formatExpiry(account.expiresAt)), 1000);
    setCountdown(formatExpiry(account.expiresAt));
    return () => clearInterval(id);
  }, [isOpen, account?.expiresAt]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => { setIsClosing(false); onClose(); }, 200);
  };

  const handleCopy = async () => {
  if (!account) return;
  try {
    await navigator.clipboard.writeText(account.accountNumber);
  } catch {
    // iOS Safari fallback
    const el = document.createElement("input");
    el.value = account.accountNumber;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    el.setSelectionRange(0, 99999);
    document.execCommand("copy");
    document.body.removeChild(el);
  }
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

  if (!isOpen && !isClosing) return null;
  if (!account) return null;

  const S: Record<string, React.CSSProperties> = {
    backdrop: {
      position: "fixed", inset: 0,
      backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      zIndex: 9998,
      opacity: isClosing ? 0 : 1, transition: "opacity 0.2s ease",
    },
    modal: {
      position: "fixed", top: "50%", left: "50%",
      transform: isClosing
        ? "translate(-50%, -48%) scale(0.97)"
        : "translate(-50%, -50%) scale(1)",
      zIndex: 9999,
      width: "min(440px, calc(100vw - 32px))",
      backgroundColor: "#0F0F1A",
      borderRadius: "16px",
      border: "1px solid #1E1E2E",
      boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      padding: "28px 24px 24px",
      fontFamily: "'Inter', sans-serif",
      opacity: isClosing ? 0 : 1,
      transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
    header: {
      display: "flex", alignItems: "center",
      justifyContent: "space-between", marginBottom: "24px",
    },
    title: { fontSize: "17px", fontWeight: 700, color: "#F1F5F9", margin: 0 },
    closeBtn: {
      background: "none", border: "none", color: "#6B6B8A",
      cursor: "pointer", fontSize: "22px", padding: "0 4px", lineHeight: 1,
    },
    card: {
      backgroundColor: "#13131F",
      border: "1px solid #1E1E2E",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "16px",
    },
    amountRow: {
      textAlign: "center" as const, marginBottom: "20px",
      paddingBottom: "20px", borderBottom: "1px solid #1E1E2E",
    },
    amountLabel: { fontSize: "12px", color: "#6B6B8A", marginBottom: "4px" },
    amountValue: { fontSize: "28px", fontWeight: 700, color: "#F1F5F9" },
    row: {
      display: "flex", justifyContent: "space-between",
      alignItems: "center", marginBottom: "12px",
    },
    rowLabel: { fontSize: "12px", color: "#6B6B8A" },
    rowValue: { fontSize: "14px", fontWeight: 600, color: "#F1F5F9" },
    accountNumRow: {
      display: "flex", justifyContent: "space-between",
      alignItems: "center", marginBottom: "12px",
    },
    accountNum: { fontSize: "22px", fontWeight: 700, color: "#8B5CF6", letterSpacing: "0.05em" },
    copyBtn: {
      background: "none", border: "1px solid #2A2A3D",
      borderRadius: "6px", color: "#8B5CF6",
      cursor: "pointer", fontSize: "12px", fontWeight: 500,
      padding: "6px 12px", fontFamily: "'Inter', sans-serif",
      transition: "all 0.15s",
    },
    expiry: {
      textAlign: "center" as const, fontSize: "12px",
      color: "#EAB308", marginTop: "4px",
    },
    note: {
      backgroundColor: "rgba(139,92,246,0.06)",
      border: "1px solid rgba(139,92,246,0.15)",
      borderRadius: "10px", padding: "12px 14px",
      fontSize: "12px", color: "#9B8FC0", lineHeight: 1.5,
      marginBottom: "20px",
    },
    confirmBtn: {
      width: "100%", padding: "14px",
      backgroundColor: "#8B5CF6", border: "none",
      borderRadius: "10px", color: "#FFFFFF",
      fontSize: "15px", fontWeight: 600,
      cursor: "pointer", fontFamily: "'Inter', sans-serif",
      marginBottom: "10px",
    },
    cancelBtn: {
      width: "100%", padding: "12px",
      backgroundColor: "transparent",
      border: "1px solid #2A2A3D",
      borderRadius: "10px", color: "#6B6B8A",
      fontSize: "14px", cursor: "pointer",
      fontFamily: "'Inter', sans-serif",
    },
  };

  return (
    <>
      <div style={S.backdrop} onClick={handleClose} />
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.header}>
          <p style={S.title}>Bank Transfer</p>
          <button style={S.closeBtn} onClick={handleClose}>×</button>
        </div>

        <div style={S.card}>
          <div style={S.amountRow}>
            <p style={{ ...S.amountLabel, margin: "0 0 4px" }}>Transfer exactly</p>
            <p style={{ ...S.amountValue, margin: 0 }}>
              ₦{account.amount.toLocaleString()}
            </p>
          </div>

          <div style={S.row}>
            <span style={S.rowLabel}>Bank</span>
            <span style={S.rowValue}>{account.bankName}</span>
          </div>

          <div style={S.row}>
            <span style={S.rowLabel}>Account name</span>
            <span style={S.rowValue}>{account.accountName}</span>
          </div>

          <div style={S.accountNumRow}>
            <div>
              <p style={{ ...S.rowLabel, marginBottom: "4px" }}>Account number</p>
              <p style={{ ...S.accountNum, margin: 0 }}>{account.accountNumber}</p>
            </div>
            <button style={S.copyBtn} onClick={handleCopy}>
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>

          {countdown ? (
            <p style={S.expiry}>⏱ {countdown}</p>
          ) : null}
        </div>

        <p style={S.note}>
          Transfer the exact amount shown. Your wallet will be credited automatically
          once the transfer is confirmed — usually within 1–5 minutes.
        </p>

        <button style={S.confirmBtn} onClick={onConfirm}>
          I&apos;ve sent the money
        </button>
        <button style={S.cancelBtn} onClick={handleClose}>
          Cancel
        </button>
      </div>
    </>
  );
}