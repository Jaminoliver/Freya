"use client";

import { useState } from "react";
import WalletTab from "@/components/wallet/WalletTab";
import CardsTab, { SavedCard } from "@/components/wallet/CardsTab";
import HistoryTab from "@/components/wallet/HistoryTab";
import { Transaction } from "@/components/wallet/TransactionItem";

type Tab = "wallet" | "cards" | "history";

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "1", type: "topup",        label: "Wallet Top-Up",        subtitle: "Paystack",     amount: 5000,  date: "Feb 21", status: "completed" },
  { id: "2", type: "subscription", label: "Subscription Payment",  subtitle: "@artistname",  amount: 999,   date: "Feb 20", status: "completed" },
  { id: "3", type: "ppv",          label: "PPV Content",           subtitle: "@creatordoe",  amount: 500,   date: "Feb 19", status: "completed" },
  { id: "4", type: "premium",      label: "Premium Subscription",  subtitle: "@johncreator", amount: 1500,  date: "Feb 18", status: "pending"   },
  { id: "5", type: "topup",        label: "Wallet Top-Up",         subtitle: "Paystack",     amount: 10000, date: "Feb 15", status: "completed" },
];

const MOCK_CARDS: SavedCard[] = [
  { id: "c1", last_four: "1025", card_type: "Visa",       expiry: "01/30", is_default: true  },
  { id: "c2", last_four: "4829", card_type: "Mastercard", expiry: "12/28", is_default: false },
];

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<Tab>("wallet");
  const [autoRecharge, setAutoRecharge] = useState(false);

  const TABS: { key: Tab; label: string }[] = [
    { key: "wallet",  label: "Wallet"  },
    { key: "cards",   label: "Cards"   },
    { key: "history", label: "History" },
  ];

  const handleTopUp = (amount: number) => {
    console.log("Top up:", amount);
  };

  return (
    <div
      style={{
        maxWidth: "768px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#0A0A0F",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ padding: "24px 24px 0", borderBottom: "1px solid #1E1E2E" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#F1F5F9", margin: "0 0 2px", fontFamily: "'Inter', sans-serif" }}>
          Wallet
        </h1>
        <p style={{ fontSize: "13px", color: "#6B6B8A", margin: "0 0 20px", fontFamily: "'Inter', sans-serif" }}>
          Freya Credits
        </p>

        {/* Tab bar */}
        <div style={{ display: "flex" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 20px",
                fontSize: "15px",
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: activeTab === tab.key ? "#8B5CF6" : "#64748B",
                borderBottom: activeTab === tab.key ? "2px solid #8B5CF6" : "2px solid transparent",
                marginBottom: "-1px",
                transition: "color 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: "20px 24px 100px" }}>
        {activeTab === "wallet" && (
          <WalletTab
            balance={0}
            autoRecharge={autoRecharge}
            transactions={MOCK_TRANSACTIONS}
            onAutoRechargeChange={setAutoRecharge}
            onTopUp={handleTopUp}
          />
        )}

        {activeTab === "cards" && (
          <CardsTab
            cards={MOCK_CARDS}
            onAddCard={() => console.log("Add card")}
            onSetDefault={(id) => console.log("Set default:", id)}
            onRemoveCard={(id) => console.log("Remove card:", id)}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab transactions={MOCK_TRANSACTIONS} />
        )}
      </div>
    </div>
  );
}