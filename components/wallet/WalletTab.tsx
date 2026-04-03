"use client";

import BalanceCard from "./BalanceCard";
import AutoRechargeToggle from "./AutoRechargeToggle";
import TransactionItem, { Transaction } from "./TransactionItem";
import { useState } from "react";

export interface WalletTabProps {
  balance:              number;
  autoRecharge:         boolean;
  transactions:         Transaction[];
  onAutoRechargeChange: (val: boolean) => void;
  onTopUp:              (amount: number, cardId?: number) => void;
  onPaymentConfirmed?:  () => void;
}

const PAGE_SIZE = 10;

export default function WalletTab({
  balance, autoRecharge, transactions,
  onAutoRechargeChange, onTopUp, onPaymentConfirmed,
}: WalletTabProps) {
  const [filter, setFilter] = useState("All");
  const [page,   setPage]   = useState(1);
  const filters = ["All", "Credits", "Debits", "Subscriptions", "Tips", "PPV"];

  const filtered = transactions.filter((t) => {
    if (filter === "All")           return true;
    if (filter === "Credits")       return t.type === "topup";
    if (filter === "Debits")        return t.type !== "topup";
    if (filter === "Subscriptions") return t.type === "subscription" || t.type === "premium";
    if (filter === "Tips")          return t.type === "tip";
    if (filter === "PPV")           return t.type === "ppv";
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilterChange(val: string) {
    setFilter(val);
    setPage(1);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <BalanceCard
        balance={balance}
        onProceedCard={onTopUp}
        onPaymentConfirmed={onPaymentConfirmed}
      />
      <AutoRechargeToggle enabled={autoRecharge} onChange={onAutoRechargeChange} />

      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <p style={{
            fontSize: "10px", fontWeight: 600, color: "#6B6B8A",
            letterSpacing: "0.08em", textTransform: "uppercase",
            margin: 0, fontFamily: "'Inter', sans-serif",
          }}>
            Transactions
          </p>
          <select
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value)}
            style={{
              backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D",
              borderRadius: "6px", color: "#F1F5F9", fontSize: "12px",
              padding: "4px 8px", fontFamily: "'Inter', sans-serif",
              outline: "none", cursor: "pointer", colorScheme: "dark",
            }}
          >
            {filters.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <p style={{
            textAlign: "center", color: "#6B6B8A", fontSize: "13px",
            padding: "24px 0", fontFamily: "'Inter', sans-serif",
          }}>
            No transactions yet
          </p>
        ) : (
          <>
            {paginated.map((t) => <TransactionItem key={t.id} transaction={t} />)}

            {totalPages > 1 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 0 4px", fontFamily: "'Inter', sans-serif",
              }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    backgroundColor: page === 1 ? "#1A1A2E" : "#1C1C2E",
                    border: "1px solid #2A2A3D", borderRadius: "6px",
                    color: page === 1 ? "#3A3A5C" : "#F1F5F9",
                    fontSize: "12px", fontWeight: 500,
                    padding: "6px 14px", cursor: page === 1 ? "not-allowed" : "pointer",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  ← Prev
                </button>

                <span style={{ fontSize: "11px", color: "#6B6B8A" }}>
                  {page} of {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    backgroundColor: page === totalPages ? "#1A1A2E" : "#1C1C2E",
                    border: "1px solid #2A2A3D", borderRadius: "6px",
                    color: page === totalPages ? "#3A3A5C" : "#F1F5F9",
                    fontSize: "12px", fontWeight: 500,
                    padding: "6px 14px", cursor: page === totalPages ? "not-allowed" : "pointer",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}