"use client";

import { useState, useEffect, useCallback } from "react";

const fmt = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const FILTERS = ["All", "Top-ups", "Subscriptions", "Tips", "PPV"];
const FILTER_MAP: Record<string, string> = {
  "All": "all",
  "Top-ups": "topups",
  "Subscriptions": "subscriptions",
  "Tips": "tips",
  "PPV": "ppv",
};

const TYPE_ICON: Record<string, { icon: string; color: string; bg: string }> = {
  "Wallet top-up":  { icon: "↑", color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  "Subscription":   { icon: "★", color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  "Auto-renewal":   { icon: "↻", color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  "Tip":            { icon: "♥", color: "#EC4899", bg: "rgba(236,72,153,0.12)" },
  "PPV unlock":     { icon: "🔓", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  "PPV message":    { icon: "✉", color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  "Withdrawal":     { icon: "↓", color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  "Refund":         { icon: "↩", color: "#6B6B8A", bg: "rgba(107,107,138,0.12)" },
};

interface TxItem {
  id: string;
  type: "credit" | "debit";
  amount: number;
  amountNaira: number;
  category: string;
  label: string;
  sublabel: string;
  provider: string;
  method: string;
  date: string;
  source: "wallet" | "direct";
}

export default function TransactionsTab() {
  const [filter, setFilter] = useState("All");
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async (filterKey: string) => {
    setLoading(true);
    try {
      const param = FILTER_MAP[filterKey] || "all";
      const res = await fetch(`/api/wallet/all-transactions?filter=${param}&limit=50`);
      const data = await res.json();
      if (data.transactions) setTransactions(data.transactions);
    } catch (err) {
      console.error("[TransactionsTab] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions(filter);
  }, [filter, fetchTransactions]);

  const getIcon = (label: string) => {
    const match = TYPE_ICON[label] ?? { icon: "•", color: "#6B6B8A", bg: "rgba(107,107,138,0.12)" };
    return match;
  };

  return (
    <div>
      {/* Filter chips */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", marginBottom: "16px", scrollbarWidth: "none" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "5px 12px", borderRadius: "50px",
              border: `1px solid ${filter === f ? "#8B5CF6" : "#2A2A3D"}`,
              backgroundColor: filter === f ? "#8B5CF6" : "transparent",
              color: filter === f ? "#fff" : "#94A3B8",
              fontSize: "12px", fontWeight: 500, cursor: "pointer",
              fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0,
              transition: "all 0.15s",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <p style={{ fontSize: "12px", color: "#6B6B8A", textAlign: "center", padding: "24px 0", fontFamily: "'Inter', sans-serif" }}>
          Loading...
        </p>
      )}

      {/* Empty state */}
      {!loading && transactions.length === 0 && (
        <div style={{ backgroundColor: "#1C1C2E", border: "1.5px dashed #2A2A3D", borderRadius: "10px", padding: "32px 16px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>
            No transactions yet
          </p>
        </div>
      )}

      {/* Transaction list */}
      {!loading && transactions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {transactions.map((tx) => {
            const icon = getIcon(tx.label);
            const isCredit = tx.type === "credit";
            return (
              <div key={tx.id} style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "12px 0", borderBottom: "1px solid #1A1A2E",
              }}>
                {/* Icon */}
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                  backgroundColor: icon.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "14px", color: icon.color,
                }}>
                  {icon.icon}
                </div>

                {/* Label + sublabel */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: "13px", fontWeight: 500, color: "#F1F5F9", margin: "0 0 2px",
                    fontFamily: "'Inter', sans-serif",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {tx.label}
                  </p>
                  <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>
                    {tx.sublabel} · {new Date(tx.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>

                {/* Amount */}
                <span style={{
                  fontSize: "13px", fontWeight: 600, flexShrink: 0,
                  color: isCredit ? "#10B981" : "#F1F5F9",
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {isCredit ? "+" : "-"}{fmt(tx.amountNaira)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}