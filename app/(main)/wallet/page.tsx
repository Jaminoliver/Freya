"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WalletTab from "@/components/wallet/WalletTab";
import CardsTab from "@/components/wallet/CardsTab";
import HistoryTab from "@/components/wallet/HistoryTab";
import { WalletSkeleton } from "@/components/loadscreen/WalletSkeleton";
import { Transaction } from "@/components/wallet/TransactionItem";
import { SavedCard } from "@/lib/types/checkout";
import { useAppStore, isStale } from "@/lib/store/appStore";

type Tab = "wallet" | "cards" | "history";

const CACHE_KEY = "__wallet__";

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
    case "TIP":                 return "topup";
    case "PPV_PURCHASE":
    case "PPV_MESSAGE":         return "premium";
    default:                    return "topup";
  }
}

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

function WalletContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const { contentFeeds, setContentFeed } = useAppStore();
  const cached = contentFeeds[CACHE_KEY];
  const fresh  = cached && !isStale(cached.fetchedAt);

  const cachedData = fresh ? (cached.posts as unknown as {
    balance: number; transactions: Transaction[]; cards: SavedCard[];
  }) : null;

  const [activeTab,      setActiveTab]      = useState<Tab>("wallet");
  const [autoRecharge,   setAutoRecharge]   = useState(false);
  const [balance,        setBalance]        = useState(cachedData?.balance ?? 0);
  const [transactions,   setTransactions]   = useState<Transaction[]>(cachedData?.transactions ?? []);
  const [cards,          setCards]          = useState<SavedCard[]>(cachedData?.cards ?? []);
  const [loading,        setLoading]        = useState(!fresh);
  const [revealed,       setRevealed]       = useState(fresh ?? false);
  const [paymentStatus,  setPaymentStatus]  = useState<"success" | "failed" | null>(null);

  // Handle redirect-based success (fallback if SDK not available)
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) { setPaymentStatus("success"); router.replace("/wallet"); }
  }, [searchParams, router]);

  const fetchWalletData = useCallback(async (silent = false) => {
    if (!silent && fresh) { setRevealed(true); return; }
    if (!silent) setLoading(true);
    try {
      const [balanceRes, txRes, cardsRes] = await Promise.all([
        fetch("/api/wallet/balance"),
        fetch("/api/wallet/transactions"),
        fetch("/api/wallet/cards"),
      ]);

      let newBalance = balance;
      let newTx: Transaction[] = transactions;
      let newCards: SavedCard[] = cards;

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        newBalance = data.balanceNaira;
        setBalance(newBalance);
      }

      if (txRes.ok) {
        const { transactions: txData } = await txRes.json();
        newTx = txData.map((t: {
          id: string; category: string; amount: number;
          amountNaira: number; provider: string; description: string; date: string; type: string;
        }) => ({
          id:       t.id,
          type:     mapCategoryToType(t.category),
          label:    t.description ?? t.category,
          subtitle: t.provider,
          amount:   t.amount,
          date:     new Date(t.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
          status:   "completed" as const,
        }));
        setTransactions(newTx);
      }

      if (cardsRes.ok) {
        const data = await cardsRes.json();
        newCards = data.cards;
        setCards(newCards);
      }

      setContentFeed(CACHE_KEY, {
        posts:     [{ balance: newBalance, transactions: newTx, cards: newCards }] as any,
        media:     [],
        fetchedAt: Date.now(),
      });

    } catch (err) {
      console.error("[WalletPage] Failed to fetch wallet data:", err);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => setRevealed(true));
    }
  }, [fresh, balance, transactions, cards, setContentFeed]);

  useEffect(() => {
    if (fresh) { setRevealed(true); return; }
    fetchWalletData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Called when Monnify SDK completes payment
  const handlePaymentComplete = useCallback(async (reference: string) => {
    console.log("[WalletPage] Payment complete, reference:", reference);
    setPaymentStatus("success");
    // Small delay to let webhook process
    setTimeout(() => fetchWalletData(true), 2000);
  }, [fetchWalletData]);

  const handlePaymentFailed = useCallback(() => {
    setPaymentStatus("failed");
  }, []);

  async function handleAddCard() {
    // Trigger a small card payment to save the card
    // The Monnify SDK will handle this inline
  }

  async function handleSetDefault(cardId: number) {
    try {
      await fetch("/api/wallet/cards/default", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      await fetchWalletData(true);
    } catch { /* silent */ }
  }

  async function handleRemoveCard(cardId: number) {
    try {
      await fetch("/api/wallet/cards/remove", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      await fetchWalletData(true);
    } catch { /* silent */ }
  }

  return (
    <div style={{
      maxWidth: "768px", margin: "0 auto",
      minHeight: "100vh", backgroundColor: "#0A0A0F",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header + tabs */}
      <div style={{ padding: "24px 24px 0", borderBottom: "1px solid #1E1E2E" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#F1F5F9", margin: "0 0 2px" }}>Wallet</h1>
        <p style={{ fontSize: "13px", color: "#6B6B8A", margin: "0 0 20px" }}>Freya Credits</p>
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

      <div style={{ padding: "20px 24px 100px" }}>
        {paymentStatus && (
          <PaymentBanner status={paymentStatus} onDismiss={() => setPaymentStatus(null)} />
        )}

        {loading && <WalletSkeleton tab={activeTab} />}

        {!loading && (
          <div style={{ opacity: revealed ? 1 : 0, transition: "opacity 0.35s ease" }}>
            {activeTab === "wallet" && (
              <WalletTab
                balance={balance}
                autoRecharge={autoRecharge}
                transactions={transactions}
                onAutoRechargeChange={setAutoRecharge}
                onPaymentComplete={handlePaymentComplete}
                onPaymentFailed={handlePaymentFailed}
              />
            )}
            {activeTab === "cards" && (
              <CardsTab
                cards={cards.map((c) => ({
                  id: String(c.id), last_four: c.lastFour,
                  card_type: c.cardType, expiry: "••/••", is_default: c.isDefault,
                }))}
                onAddCard={handleAddCard}
                onSetDefault={(id) => handleSetDefault(Number(id))}
                onRemoveCard={(id) => handleRemoveCard(Number(id))}
              />
            )}
            {activeTab === "history" && (
              <HistoryTab transactions={transactions} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#0A0A0F" }} />}>
      <WalletContent />
    </Suspense>
  );
}