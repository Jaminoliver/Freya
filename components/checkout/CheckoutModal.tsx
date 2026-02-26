"use client";

import * as React from "react";
import type { User } from "@/lib/types/profile";
import type {
  CheckoutType, CheckoutScreen, Currency, PaymentMethodId, SubscriptionTier, VirtualAccountDisplay,
} from "@/lib/types/checkout";
import SubscriptionScreen from "./screens/SubscriptionScreen";
import TipScreen from "./screens/TipScreen";
import PaymentScreen from "./screens/PaymentScreen";
import SuccessScreen from "./screens/SuccessScreen";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CheckoutType;
  creator: User;
  monthlyPrice?: number;
  threeMonthPrice?: number;
  sixMonthPrice?: number;
  initialTier?: SubscriptionTier;
  tierId?: number;
  postPrice?: number;
  postTitle?: string;
  postId?: number;
  onSuccess?: () => void;
  onSubscriptionSuccess?: () => void;
  onViewContent?: () => void;
  onGoToSubscriptions?: () => void;
}

const TIER_LABEL: Record<SubscriptionTier, string> = {
  monthly: "Basic",
  three_month: "3 Months",
  six_month: "6 Months",
};

export default function CheckoutModal({
  isOpen, onClose, type, creator,
  monthlyPrice = 2000, threeMonthPrice, sixMonthPrice, initialTier = "monthly",
  tierId, postPrice = 0, postTitle, postId,
  onSuccess, onSubscriptionSuccess, onViewContent, onGoToSubscriptions,
}: CheckoutModalProps) {
  const [screen, setScreen] = React.useState<CheckoutScreen>(
    type === "tips" ? "tip_input"
    : type === "subscription" ? "plan"
    : "payment"
  );
  const [currency, setCurrency] = React.useState<Currency>("NGN");
  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethodId | null>(null);
  const [selectedTier, setSelectedTier] = React.useState<SubscriptionTier>(initialTier);
  const [autoRenew, setAutoRenew] = React.useState(true);
  const [tipAmount, setTipAmount] = React.useState(0);
  const [isClosing, setIsClosing] = React.useState(false);
  const [walletBalance, setWalletBalance] = React.useState<number>(0);
  const [virtualAccount, setVirtualAccount] = React.useState<VirtualAccountDisplay | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      fetch("/api/wallet/balance")
        .then((r) => r.json())
        .then(({ balance }) => setWalletBalance(balance ?? 0))
        .catch(() => setWalletBalance(0));
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      setScreen(type === "tips" ? "tip_input" : type === "subscription" ? "plan" : "payment");
      setSelectedMethod(null);
      setVirtualAccount(null);
      setError(null);
      setIsClosing(false);
      setSelectedTier(initialTier);
    }
  }, [isOpen, type, initialTier]);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const getAmount = (): number => {
    if (type === "tips") return tipAmount;
    if (type === "subscription") {
      if (selectedTier === "three_month") return threeMonthPrice ?? monthlyPrice * 3;
      if (selectedTier === "six_month") return sixMonthPrice ?? monthlyPrice * 6;
      return monthlyPrice;
    }
    return postPrice;
  };

  const getPaymentLabel = (): string => {
    if (type === "tips") return creator.display_name || creator.username;
    if (type === "subscription") return TIER_LABEL[selectedTier];
    return postTitle ?? "Locked Content";
  };

  const handlePaymentSuccess = () => {
    onSuccess?.();
    if (type === "subscription") onSubscriptionSuccess?.();
    setScreen("success");
  };

  const handleNext = async () => {
    if (screen === "plan") {
      if (getAmount() === 0) {
        setLoading(true);
        try {
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "subscription",
              amount: 0,
              creatorId: creator.id,
              tierId,
            }),
          });
          const data = await res.json();
          if (!res.ok) { setError(data.message ?? "Subscription failed"); return; }
          handlePaymentSuccess();
        } catch {
          setError("Something went wrong. Please try again.");
        } finally {
          setLoading(false);
        }
      } else {
        setScreen("payment");
      }
      return;
    }
    if (screen === "tip_input") { setScreen("payment"); return; }

    if (screen === "payment") {
      setError(null);

      // ── Freya Wallet payment ──
      if (selectedMethod === "freya_wallet") {
        setLoading(true);
        try {
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: type === "tips" ? "tip" : type === "subscription" ? "subscription" : "ppv",
              amount: getAmount(),
              creatorId: creator.id,
              tierId: type === "subscription" ? tierId : undefined,
              postId: type === "ppv" ? postId : undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.message ?? "Payment failed");
            return;
          }
          handlePaymentSuccess();
        } catch {
          setError("Something went wrong. Please try again.");
        } finally {
          setLoading(false);
        }
        return;
      }

      // ── Bank Transfer — generate virtual account ──
      if (selectedMethod === "kyshi_virtual_account") {
        if (virtualAccount) {
          handlePaymentSuccess();
          return;
        }

        setLoading(true);
        try {
          const endpoint =
            type === "subscription" ? "/api/subscriptions/checkout/virtual-account" :
            type === "tips"         ? "/api/tips/checkout/virtual-account" :
                                      "/api/ppv/checkout/virtual-account";

          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount:       getAmount(),
              creatorId:    creator.id,
              tierId:       type === "subscription" ? tierId : undefined,
              tierDuration: type === "subscription" ? selectedTier : undefined,
              postId:       type === "ppv" ? postId : undefined,
              currency,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            setError(data.message ?? "Failed to generate bank account");
            return;
          }
          setVirtualAccount({
            accountNumber: data.accountNumber,
            bankName:      data.bankName,
            accountName:   data.accountName,
            expiresAt:     data.expiresAt,
            amount:        data.amount,
            reference:     data.reference,
          });
        } catch (err) {
          console.error("[Checkout] VA fetch error:", err);
          setError("Something went wrong. Please try again.");
        } finally {
          setLoading(false);
        }
        return;
      }
    }
  };

  const handleBack = () => {
    if (screen === "payment") {
      setVirtualAccount(null);
      setError(null);
      if (type === "tips") setScreen("tip_input");
      else if (type === "subscription") setScreen("plan");
      else handleClose();
    } else {
      handleClose();
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          zIndex: 9998,
          opacity: isClosing ? 0 : 1,
          transition: "opacity 0.2s ease",
        }}
      />

      <div
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: isClosing ? "translate(-50%, -48%) scale(0.97)" : "translate(-50%, -50%) scale(1)",
          zIndex: 9999,
          width: "min(460px, calc(100vw - 32px))",
          maxHeight: "min(680px, calc(100vh - 48px))",
          backgroundColor: "#0F0F1A",
          borderRadius: "16px",
          border: "1px solid #1E1E2E",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.08)",
          overflowY: "auto",
          scrollbarWidth: "none",
          opacity: isClosing ? 0 : 1,
          transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          fontFamily: "'Inter', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {screen === "plan" && (
          <SubscriptionScreen
            creator={creator}
            monthlyPrice={monthlyPrice}
            threeMonthPrice={threeMonthPrice}
            sixMonthPrice={sixMonthPrice}
            selectedTier={selectedTier}
            onTierChange={setSelectedTier}
            currency={currency}
            autoRenew={autoRenew}
            onAutoRenewChange={setAutoRenew}
            onNext={handleNext}
            onClose={handleClose}
          />
        )}

        {screen === "tip_input" && (
          <TipScreen
            creator={creator}
            currency={currency}
            onCurrencyChange={setCurrency}
            tipAmount={tipAmount}
            onTipAmountChange={setTipAmount}
            onNext={handleNext}
            onClose={handleClose}
          />
        )}

        {screen === "payment" && (
          <PaymentScreen
            type={type}
            currency={currency}
            onCurrencyChange={setCurrency}
            selectedMethod={selectedMethod}
            onMethodChange={(id) => { setSelectedMethod(id); setVirtualAccount(null); setError(null); }}
            amount={getAmount()}
            label={getPaymentLabel()}
            tier={type === "subscription" ? selectedTier : undefined}
            virtualAccount={virtualAccount}
            walletBalance={walletBalance}
            loading={loading}
            error={error}
            creatorId={creator.id}
            onNext={handleNext}
            onBack={handleBack}
            onClose={handleClose}
            onPaymentConfirmed={handlePaymentSuccess}
          />
        )}

        {screen === "success" && (
          <SuccessScreen
            type={type}
            creator={creator}
            amount={getAmount()}
            currency={currency}
            tier={type === "subscription" ? selectedTier : undefined}
            autoRenew={autoRenew}
            onViewContent={() => { onViewContent?.(); handleClose(); }}
            onGoToSubscriptions={() => { onGoToSubscriptions?.(); handleClose(); }}
            onClose={handleClose}
          />
        )}
      </div>
    </>
  );
}