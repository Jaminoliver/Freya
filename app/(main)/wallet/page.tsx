"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WalletTab from "@/components/wallet/WalletTab";
import CardsTab from "@/components/wallet/CardsTab";
import HistoryTab from "@/components/wallet/HistoryTab";
import { Transaction } from "@/components/wallet/TransactionItem";
import { SavedCard } from "@/lib/types/checkout";

type Tab = "wallet" | "cards" | "history";

const TABS: { key: Tab; label: string }[] = [
  { key: "wallet",  label: "Wallet"  },
  { key: "cards",   label: "Cards"   },
  { key: "history", label: "History" },
];

function mapCategoryToType(category: string): Transaction["type"] {
  switch (category) {
    case "WALLET_TOPUP":        return "topup";
    case "SUBSCRIPTION_PAYMENT":
    case "AUTO_SUBSCRIPTION":   return "subscription";
    case "CREATOR_EARNING":     return "premium";
    case "PAYOUT":              return "topup";
    default:                    return "topup";
  }
}

// ─── Checkout Loading Overlay ─────────────────────────────────────────────────

function CheckoutLoadingOverlay() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      backgroundColor: "#0A0A0F",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: "20px", fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        width: "48px", height: "48px",
        border: "3px solid #1E1E2E",
        borderTop: "3px solid #8B5CF6",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "16px", fontWeight: 600, color: "#F1F5F9", margin: "0 0 6px" }}>
          Redirecting to checkout
        </p>
        <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0 }}>
          Secured by PayOnUs — please don&apos;t close this tab
        </p>
      </div>
    </div>
  );
}

// ─── Payment Status Banner ────────────────────────────────────────────────────

function PaymentBanner({ status, onDismiss }: { status: "success" | "failed"; onDismiss: () => void }) {
  const success = status === "success";
  return (
    <div style={{
      margin: "0 0 16px", padding: "12px 16px", borderRadius: "10px",
      backgroundColor: success ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
      border: `1px solid ${success ? "#22C55E" : "#EF4444"}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "16px" }}>{success ? "✅" : "❌"}</span>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 600, color: success ? "#22C55E" : "#EF4444", margin: "0 0 2px" }}>
            {success ? "Payment successful" : "Payment failed"}
          </p>
          <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0 }}>
            {success
              ? "Your wallet balance has been updated."
              : "Your wallet was not charged. Please try again."}
          </p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{ background: "none", border: "none", color: "#6B6B8A", cursor: "pointer", fontSize: "18px", padding: "0 4px" }}
      >
        ×
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab]           = useState<Tab>("wallet");
  const [autoRecharge, setAutoRecharge]     = useState(false);
  const [balance, setBalance]               = useState(0);
  const [transactions, setTransactions]     = useState<Transaction[]>([]);
  const [cards, setCards]                   = useState<SavedCard[]>([]);
  const [loading, setLoading]               = useState(true);
  const [redirecting, setRedirecting]       = useState(false);
  const [paymentStatus, setPaymentStatus]   = useState<"success" | "failed" | null>(null);
  const [bankTransferLoading, setBankTransferLoading] = useState(false);
  const [bankAccount, setBankAccount]       = useState<{
    accountNumber: string;
    bankName: string;
    accountName: string;
    onusReference: string;
    amount: number;
  } | null>(null);

  // Handle return from checkout via ?ref= param
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setPaymentStatus("success");
      router.replace("/wallet");
    }
  }, [searchParams, router]);

  const fetchWalletData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [balanceRes, txRes, cardsRes] = await Promise.all([
        fetch("/api/wallet/balance"),
        fetch("/api/wallet/transactions"),
        fetch("/api/wallet/cards"),
      ]);

      if (balanceRes.ok) {
        const { balance } = await balanceRes.json();
        setBalance(balance);
      }

      if (txRes.ok) {
        const { transactions: txData } = await txRes.json();
        const mapped: Transaction[] = txData.map((t: {
          id: number;
          category: string;
          amount: number;
          provider: string;
          description: string;
          created_at: string;
        }) => ({
          id: String(t.id),
          type: mapCategoryToType(t.category),
          label: t.description ?? t.category,
          subtitle: t.provider,
          amount: t.amount,
          date: new Date(t.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
          status: "completed" as const,
        }));
        setTransactions(mapped);
      }

      if (cardsRes.ok) {
        const { cards } = await cardsRes.json();
        setCards(cards);
      }
    } catch (error) {
      console.error("[WalletPage] Failed to fetch wallet data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // ─── Payment Confirmed (bank transfer polling success) ──────────────────────

  const handlePaymentConfirmed = useCallback(async () => {
    await fetchWalletData(true);
    setBankAccount(null);
    setPaymentStatus("success");
  }, [fetchWalletData]);

  // ─── Card Top-Up ────────────────────────────────────────────────────────────

  async function handleTopUp(amount: number, cardId?: number) {
    try {
      setRedirecting(true);
      const body = cardId ? { amount, cardId } : { amount };

      const res = await fetch("/api/wallet/topup/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setRedirecting(false);
        setPaymentStatus("failed");
        return;
      }

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setRedirecting(false);
        await fetchWalletData();
        setPaymentStatus("success");
      }
    } catch (error) {
      setRedirecting(false);
      console.error("[WalletPage] Card top-up failed:", error);
      setPaymentStatus("failed");
    }
  }

  // ─── Bank Transfer Top-Up (PayOnUs Dynamic Account) ────────────────────────

  async function handleBankTransfer(amount: number) {
    try {
      setBankTransferLoading(true);
      setBankAccount(null);

      const res = await fetch("/api/wallet/topup/virtual-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPaymentStatus("failed");
        return;
      }

      setBankAccount({
        accountNumber: data.accountNumber,
        bankName:      data.bankName,
        accountName:   data.accountName,
        onusReference: data.onusReference,
        amount:        data.amount,
      });
    } catch (error) {
      console.error("[WalletPage] Bank transfer failed:", error);
      setPaymentStatus("failed");
    } finally {
      setBankTransferLoading(false);
    }
  }

  async function handleAddCard() {
    await handleTopUp(100);
  }

  async function handleSetDefault(cardId: number) {
    try {
      await fetch("/api/wallet/cards/default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      await fetchWalletData();
    } catch (error) {
      console.error("[WalletPage] Set default failed:", error);
    }
  }

  async function handleRemoveCard(cardId: number) {
    try {
      await fetch("/api/wallet/cards/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      await fetchWalletData();
    } catch (error) {
      console.error("[WalletPage] Remove card failed:", error);
    }
  }

  return (
    <>
      {redirecting && <CheckoutLoadingOverlay />}

      <div style={{
        maxWidth: "768px", margin: "0 auto",
        minHeight: "100vh", backgroundColor: "#0A0A0F",
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: "24px 24px 0", borderBottom: "1px solid #1E1E2E" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#F1F5F9", margin: "0 0 2px" }}>
            Wallet
          </h1>
          <p style={{ fontSize: "13px", color: "#6B6B8A", margin: "0 0 20px" }}>
            Freya Credits
          </p>

          <div style={{ display: "flex" }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "10px 20px", fontSize: "15px", fontWeight: 500,
                  background: "none", border: "none", cursor: "pointer",
                  color: activeTab === tab.key ? "#8B5CF6" : "#64748B",
                  borderBottom: activeTab === tab.key ? "2px solid #8B5CF6" : "2px solid transparent",
                  marginBottom: "-1px", transition: "color 0.15s ease",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: "20px 24px 100px" }}>
          {paymentStatus && (
            <PaymentBanner
              status={paymentStatus}
              onDismiss={() => setPaymentStatus(null)}
            />
          )}

          {loading ? (
            <p style={{ textAlign: "center", color: "#6B6B8A", fontSize: "14px", padding: "40px 0", fontFamily: "'Inter', sans-serif" }}>
              Loading...
            </p>
          ) : (
            <>
              {activeTab === "wallet" && (
                <WalletTab
                  balance={balance}
                  autoRecharge={autoRecharge}
                  transactions={transactions}
                  onAutoRechargeChange={setAutoRecharge}
                  onTopUp={(amount) => handleTopUp(amount)}
                  onBankTransfer={(amount) => handleBankTransfer(amount)}
                  bankTransferLoading={bankTransferLoading}
                  bankAccount={bankAccount}
                  onPaymentConfirmed={handlePaymentConfirmed}
                />
              )}

              {activeTab === "cards" && (
                <CardsTab
                  cards={cards.map((c) => ({
                    id: String(c.id),
                    last_four: c.lastFour,
                    card_type: c.cardType,
                    expiry: "••/••",
                    is_default: c.isDefault,
                  }))}
                  onAddCard={handleAddCard}
                  onSetDefault={(id) => handleSetDefault(Number(id))}
                  onRemoveCard={(id) => handleRemoveCard(Number(id))}
                />
              )}

              {activeTab === "history" && (
                <HistoryTab transactions={transactions} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}