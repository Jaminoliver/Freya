"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient }   from "@tanstack/react-query";
import { queryKeys, staleTimes }      from "@/lib/query/keys";
import WalletTab from "@/components/wallet/WalletTab";
import CardsTab from "@/components/wallet/CardsTab";
import TransactionsTab from "@/components/wallet/TransactionsTab";
import { WalletSkeleton } from "@/components/loadscreen/WalletSkeleton";
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
    case "TIP": return "tip";
    case "PPV_PURCHASE":
    case "PPV_MESSAGE":         return "premium";
    default:                    return "topup";
  }
}

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
        border: "3px solid #1E1E2E", borderTop: "3px solid #8B5CF6",
        borderRadius: "50%", animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "16px", fontWeight: 600, color: "#F1F5F9", margin: "0 0 6px" }}>
          Redirecting to checkout
        </p>
        <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0 }}>
          Secured by Monnify — please don&apos;t close this tab
        </p>
      </div>
    </div>
  );
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
  const queryClient  = useQueryClient();

  const [activeTab,     setActiveTab]     = useState<Tab>("wallet");
  const [autoRecharge,  setAutoRecharge]  = useState(false);
  const [redirecting,   setRedirecting]   = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"success" | "failed" | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.wallet(),
    queryFn:  async () => {
      const [balanceRes, txRes, cardsRes] = await Promise.all([
        fetch("/api/wallet/balance"),
        fetch("/api/wallet/transactions"),
        fetch("/api/wallet/cards"),
      ]);
      let balance      = 0;
      let transactions: Transaction[] = [];
      let cards: SavedCard[]          = [];

      if (balanceRes.ok) {
        const d = await balanceRes.json();
        balance = d.balanceNaira;
      }
      if (txRes.ok) {
        const { transactions: txData } = await txRes.json();
        transactions = txData.map((t: {
          id: string; category: string; amount: number;
          amountNaira: number; provider: string; description: string; date: string; type: string;
        }) => ({
          id:       t.id,
          type:     mapCategoryToType(t.category),
          label:    t.description ?? t.category,
          subtitle: t.provider,
          amount:   t.amountNaira,
          date:     new Date(t.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
          status:   "completed" as const,
        }));
      }
      if (cardsRes.ok) {
        const d = await cardsRes.json();
        cards = d.cards;
      }
      return { balance, transactions, cards };
    },
    staleTime: staleTimes.wallet,
  });

  const balance      = data?.balance      ?? 0;
  const transactions = data?.transactions ?? [];
  const cards        = data?.cards        ?? [];

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) { setPaymentStatus("success"); router.replace("/wallet"); }
  }, [searchParams, router]);

  const handlePaymentConfirmed = useCallback(async () => {
    await refetch();
    setPaymentStatus("success");
  }, [refetch]);

  async function handleTopUp(amount: number, cardId?: number) {
    try {
      setRedirecting(true);
      const body = cardId ? { amount, cardId } : { amount };
      const res  = await fetch("/api/wallet/topup/card", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setRedirecting(false); setPaymentStatus("failed"); return; }
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setRedirecting(false);
        await refetch();
        setPaymentStatus("success");
      }
    } catch {
      setRedirecting(false);
      setPaymentStatus("failed");
    }
  }

  async function handleAddCard() { await handleTopUp(100); }

  async function handleSetDefault(cardId: number) {
    try {
      await fetch("/api/wallet/cards/default", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      await refetch();
    } catch { /* silent */ }
  }

  async function handleRemoveCard(cardId: number) {
    try {
      await fetch("/api/wallet/cards/remove", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      await refetch();
    } catch { /* silent */ }
  }

  return (
    <>
      {redirecting && <CheckoutLoadingOverlay />}

      <div style={{
        maxWidth: "768px", margin: "0 auto",
        minHeight: "100vh", backgroundColor: "#0A0A0F",
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Header + tabs */}
        <div style={{ padding: "16px 18px", backgroundColor: "var(--background)"
        }}>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px", margin: 0 }}>Wallet</h1>
        </div>
        <div style={{ padding: "14px 18px", backgroundColor: "var(--background)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "7px 16px", borderRadius: "20px", border: "none",
                  backgroundColor: activeTab === tab.key ? "#FFFFFF" : "#1A1A2A",
                  color: activeTab === tab.key ? "#0A0A0F" : "#94A3B8",
                  fontSize: "12px", fontWeight: activeTab === tab.key ? 600 : 500,
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  whiteSpace: "nowrap", transition: "all 0.15s",
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

          {isLoading && <WalletSkeleton tab={activeTab} />}

          {!isLoading && (
            <div>
              {activeTab === "wallet" && (
                <WalletTab
                  balance={balance}
                  autoRecharge={autoRecharge}
                  transactions={transactions}
                  onAutoRechargeChange={setAutoRecharge}
                  onTopUp={handleTopUp}
                  onPaymentConfirmed={handlePaymentConfirmed}
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
                <TransactionsTab />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function WalletClient() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#0A0A0F" }} />}>
      <WalletContent />
    </Suspense>
  );
}