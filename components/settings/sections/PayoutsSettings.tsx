"use client";

import { useState } from "react";
import { MoreVertical, Plus } from "lucide-react";

type PayoutsTab = "request" | "history" | "settings";

const fmt = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TABS: { key: PayoutsTab; label: string }[] = [
  { key: "request",  label: "Request Payout"  },
  { key: "history",  label: "Payout History"  },
  { key: "settings", label: "Payout Settings" },
];

const SAMPLE_HISTORY = [
  { id: "1", amount: 15000, date: "Feb 18, 2026", bank: "GTBank •••• 4521", status: "completed" },
  { id: "2", amount: 8000,  date: "Feb 10, 2026", bank: "GTBank •••• 4521", status: "completed" },
  { id: "3", amount: 5000,  date: "Jan 28, 2026", bank: "GTBank •••• 4521", status: "failed"    },
];

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  completed: { color: "#10B981", bg: "rgba(16,185,129,0.1)"  },
  pending:   { color: "#F59E0B", bg: "rgba(245,158,11,0.1)"  },
  failed:    { color: "#EF4444", bg: "rgba(239,68,68,0.1)"   },
};

export default function PayoutsSettings({ onBack }: { onBack?: () => void }) {
  const [activeTab, setActiveTab] = useState<PayoutsTab>("request");

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#F1F5F9", margin: 0, fontFamily: "'Inter', sans-serif" }}>
          Payouts
        </h2>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #1E1E2E", marginBottom: "20px", overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 14px", fontSize: "13px", fontWeight: 500,
              fontFamily: "'Inter', sans-serif", background: "none", border: "none",
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              color: activeTab === tab.key ? "#8B5CF6" : "#64748B",
              borderBottom: activeTab === tab.key ? "2px solid #8B5CF6" : "2px solid transparent",
              marginBottom: "-1px", transition: "color 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "request"  && <RequestTab />}
      {activeTab === "history"  && <HistoryTab />}
      {activeTab === "settings" && <SettingsTab />}
    </div>
  );
}

// ── Request Payout ────────────────────────────────────────────────────────────
function RequestTab() {
  const [amount, setAmount] = useState("");
  const hasBankAccount = false;
  const available = 0;
  const fee = 10;
  const numAmount = parseFloat(amount) || 0;
  const youReceive = numAmount > fee ? numAmount - fee : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "14px", borderBottom: "1px solid #1E1E2E" }}>
        <span style={{ fontSize: "13px", color: "#94A3B8", fontFamily: "'Inter', sans-serif" }}>Available for Withdrawal</span>
        <span style={{ fontSize: "16px", fontWeight: 700, color: "#10B981", fontFamily: "'Inter', sans-serif" }}>{fmt(available)}</span>
      </div>

      <div>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", margin: "0 0 8px", fontFamily: "'Inter', sans-serif" }}>Amount</p>
        <input
          type="number"
          placeholder="Enter amount (min ₦5,000)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: "100%", borderRadius: "10px", padding: "12px 14px", fontSize: "14px", outline: "none", backgroundColor: "#141420", border: "1.5px solid #2A2A3D", color: "#F1F5F9", boxSizing: "border-box", fontFamily: "'Inter', sans-serif" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
        />
        <p style={{ fontSize: "11px", color: "#6B6B8A", margin: "6px 0 0", fontFamily: "'Inter', sans-serif" }}>Minimum withdrawal: ₦5,000</p>
      </div>

      <div>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", margin: "0 0 8px", fontFamily: "'Inter', sans-serif" }}>Payout to</p>
        {hasBankAccount ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "12px 14px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#8B5CF620", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#8B5CF6" }}>GT</span>
            </div>
            <div>
              <p style={{ margin: "0 0 1px", fontSize: "13px", fontWeight: 600, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>GTBank</p>
              <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>•••• •••• 4521 · Savings</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", backgroundColor: "rgba(245,158,11,0.06)", border: "1.5px solid rgba(245,158,11,0.25)", borderRadius: "10px", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontSize: "12px", color: "#F59E0B", fontFamily: "'Inter', sans-serif" }}>No bank account added</span>
            </div>
            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#8B5CF6", fontWeight: 600, fontFamily: "'Inter', sans-serif", padding: 0, whiteSpace: "nowrap" }}>
              Add bank account
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "12px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>Paystack transfer fee:</span>
          <span style={{ fontSize: "12px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>₦10 flat</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>You receive:</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: youReceive > 0 ? "#10B981" : "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>
            {youReceive > 0 ? fmt(youReceive) : "₦—"}
          </span>
        </div>
      </div>

      <button
        disabled={!hasBankAccount || numAmount < 5000}
        style={{
          width: "100%", padding: "13px", borderRadius: "10px", border: "none",
          backgroundColor: hasBankAccount && numAmount >= 5000 ? "#8B5CF6" : "#1C1C2E",
          color: hasBankAccount && numAmount >= 5000 ? "#fff" : "#6B6B8A",
          fontSize: "14px", fontWeight: 600,
          cursor: hasBankAccount && numAmount >= 5000 ? "pointer" : "not-allowed",
          fontFamily: "'Inter', sans-serif", transition: "background-color 0.15s",
        }}
      >
        {!hasBankAccount ? "Add bank account to enable" : numAmount < 5000 ? "Minimum ₦5,000" : "Request Payout"}
      </button>

      <p style={{ fontSize: "11px", color: "#6B6B8A", textAlign: "center", margin: 0, fontFamily: "'Inter', sans-serif" }}>
        Payouts are processed within 1–3 business days.
      </p>
    </div>
  );
}

// ── Payout History ────────────────────────────────────────────────────────────
function HistoryTab() {
  if (SAMPLE_HISTORY.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 16px" }}>
        <p style={{ fontSize: "13px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>No payouts yet</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {SAMPLE_HISTORY.map((item) => {
        const ss = STATUS_STYLE[item.status];
        return (
          <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "12px 0", borderBottom: "1px solid #1E1E2E" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>{fmt(item.amount)}</p>
              <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>{item.bank} · {item.date}</p>
            </div>
            <span style={{ fontSize: "11px", fontWeight: 600, color: ss.color, backgroundColor: ss.bg, borderRadius: "5px", padding: "2px 8px", fontFamily: "'Inter', sans-serif", textTransform: "capitalize", flexShrink: 0 }}>
              {item.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Payout Settings (Bank Accounts) ──────────────────────────────────────────
function SettingsTab() {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const mockBanks = [
    { id: "b1", bank: "GTBank", initials: "GT", accountNumber: "•••• •••• 4521", type: "Savings", isDefault: true },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, color: "#6B6B8A", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0, fontFamily: "'Inter', sans-serif" }}>
          Bank Accounts
        </p>
        <button style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "8px", border: "1.5px solid #8B5CF6", backgroundColor: "transparent", color: "#8B5CF6", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
          <Plus size={13} /> Add Account
        </button>
      </div>

      {mockBanks.length === 0 ? (
        <div style={{ backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "32px 16px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>No bank accounts added yet</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {mockBanks.map((bank) => (
            <div key={bank.id} style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "12px 14px", position: "relative" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#8B5CF6", fontFamily: "'Inter', sans-serif" }}>{bank.initials}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 1px", fontSize: "13px", fontWeight: 600, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>{bank.bank}</p>
                <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>{bank.accountNumber} · {bank.type}</p>
              </div>
              {bank.isDefault && (
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#8B5CF6", border: "1.5px solid #8B5CF6", borderRadius: "5px", padding: "2px 8px", fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
                  Default
                </span>
              )}
              <div style={{ position: "relative" }}>
                <button onClick={() => setMenuOpen(menuOpen === bank.id ? null : bank.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex", padding: "2px 4px" }}>
                  <MoreVertical size={16} />
                </button>
                {menuOpen === bank.id && (
                  <div style={{ position: "absolute", right: 0, top: "100%", backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "8px", minWidth: "140px", zIndex: 10, overflow: "hidden" }}>
                    {!bank.isDefault && (
                      <button onClick={() => setMenuOpen(null)} style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#F1F5F9", fontFamily: "'Inter', sans-serif", textAlign: "left" }}>
                        Set as Default
                      </button>
                    )}
                    <button onClick={() => setMenuOpen(null)} style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#EF4444", fontFamily: "'Inter', sans-serif", textAlign: "left" }}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}