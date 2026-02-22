"use client";

import { useState } from "react";
import TransactionItem, { Transaction } from "./TransactionItem";

interface HistoryTabProps {
  transactions: Transaction[];
}

const FILTERS = ["All", "Credits", "Debits", "Subscriptions", "Tips", "PPV"];

export default function HistoryTab({ transactions }: HistoryTabProps) {
  const [active, setActive] = useState("All");

  const filtered = transactions.filter((t) => {
    if (active === "All") return true;
    if (active === "Credits") return t.type === "topup";
    if (active === "Debits") return t.type !== "topup";
    if (active === "Subscriptions") return t.type === "subscription" || t.type === "premium";
    if (active === "Tips") return t.type === "tip";
    if (active === "PPV") return t.type === "ppv";
    return true;
  });

  return (
    <div>
      {/* Filter pills */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "4px",
          marginBottom: "16px",
          scrollbarWidth: "none",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActive(f)}
            style={{
              padding: "6px 16px",
              borderRadius: "50px",
              border: `1.5px solid ${active === f ? "#8B5CF6" : "#2A2A3D"}`,
              backgroundColor: active === f ? "#8B5CF6" : "transparent",
              color: active === f ? "#fff" : "#94A3B8",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
              flexShrink: 0,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p
          style={{
            textAlign: "center",
            color: "#6B6B8A",
            fontSize: "14px",
            padding: "40px 0",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          No transactions in this category
        </p>
      ) : (
        filtered.map((t) => <TransactionItem key={t.id} transaction={t} />)
      )}
    </div>
  );
}