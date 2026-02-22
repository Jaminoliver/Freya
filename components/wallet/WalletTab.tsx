"use client";

import BalanceCard from "./BalanceCard";
import AutoRechargeToggle from "./AutoRechargeToggle";
import TransactionItem, { Transaction } from "./TransactionItem";
import { useState } from "react";

interface WalletTabProps {
  balance: number;
  autoRecharge: boolean;
  transactions: Transaction[];
  onAutoRechargeChange: (val: boolean) => void;
  onTopUp: (amount: number) => void;
}

export default function WalletTab({
  balance, autoRecharge,
  transactions, onAutoRechargeChange, onTopUp,
}: WalletTabProps) {
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Credits", "Debits", "Subscriptions", "Tips", "PPV"];

  const filtered = transactions.filter((t) => {
    if (filter === "All") return true;
    if (filter === "Credits") return t.type === "topup";
    if (filter === "Debits") return t.type !== "topup";
    if (filter === "Subscriptions") return t.type === "subscription" || t.type === "premium";
    if (filter === "Tips") return t.type === "tip";
    if (filter === "PPV") return t.type === "ppv";
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <BalanceCard balance={balance} onProceed={onTopUp} />
      <AutoRechargeToggle enabled={autoRecharge} onChange={onAutoRechargeChange} />

      {/* Transactions section */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <p style={{ fontSize: "10px", fontWeight: 600, color: "#6B6B8A", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0, fontFamily: "'Inter', sans-serif" }}>
            Transactions
          </p>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "6px",
              color: "#F1F5F9", fontSize: "12px", padding: "4px 8px",
              fontFamily: "'Inter', sans-serif", outline: "none", cursor: "pointer",
              colorScheme: "dark",
            }}
          >
            {filters.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", color: "#6B6B8A", fontSize: "13px", padding: "24px 0", fontFamily: "'Inter', sans-serif" }}>
            No transactions yet
          </p>
        ) : (
          filtered.map((t) => <TransactionItem key={t.id} transaction={t} />)
        )}
      </div>
    </div>
  );
}