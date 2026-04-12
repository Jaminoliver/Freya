"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
  postPrice?: number;
  postTitle?: string;
  postId?: number;
  onSuccess?: () => void;
  onSubscriptionSuccess?: () => void;
  onViewContent?: () => void;
  onGoToSubscriptions?: () => void;
  autoCloseOnSuccess?: boolean;
}

const TIER_LABEL: Record<SubscriptionTier, string> = {
  monthly: "Basic",
  three_month: "3 Months",
  six_month: "6 Months",
};

export default function CheckoutModal({
  isOpen, onClose, type, creator,
  monthlyPrice = 2000, threeMonthPrice, sixMonthPrice, initialTier = "monthly",
  postPrice = 0, postTitle, postId,
  onSuccess, onSubscriptionSuccess, onViewContent, onGoToSubscriptions,
  autoCloseOnSuccess = false,
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
  const [mounted, setMounted] = React.useState(false);

  const successRef = React.useRef(false);
  const autoCloseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Required for SSR — portal target only exists in browser
  React.useEffect(() => { setMounted(true); }, []);

  // Cleanup auto-close timer on unmount
  React.useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      fetch("/api/wallet/balance")
        .then((r) => r.json())
        .then((data) => setWalletBalance(data.balanceNaira ?? 0))
        .catch(() => setWalletBalance(0));
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && !successRef.current) {
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
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    successRef.current = false;
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
    successRef.current = true;
    setScreen("success");
    onSuccess?.();
    if (type === "subscription") onSubscriptionSuccess?.();

    // Auto-close after brief success flash if enabled
    if (autoCloseOnSuccess) {
      autoCloseTimerRef.current = setTimeout(() => {
        handleClose();
      }, 1200);
    }
  };

  const handleNext = async () => {
    if (screen === "plan") {
      if (getAmount() === 0) {
        setLoading(true);
        setError(null);
        try {
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "subscription",
              amount: 0,
              creatorId: creator.id,
              selectedTier,
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

      console.log("[CheckoutModal] handleNext postId:", postId, "type:", type);

      if (selectedMethod === "freya_wallet") {
        setLoading(true);
        try {
          const payload = {
            type: type === "tips" ? "tip" : type === "subscription" ? "subscription" : "ppv",
            amount: getAmount(),
            creatorId: creator.id,
            selectedTier: type === "subscription" ? selectedTier : undefined,
            postId: (type === "ppv" || type === "tips") ? postId : undefined,
          };
          console.log("[CheckoutModal] wallet payload:", payload);
          const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
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

      if (selectedMethod === "bank_transfer") {
        if (virtualAccount) {
          handlePaymentSuccess();
          return;
        }

        setLoading(true);
        try {
          const res = await fetch("/api/checkout/initialize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentMethod: "BANK_TRANSFER",
              type: type === "tips" ? "tip" : type === "subscription" ? "subscription" : "ppv",
              amount: getAmount(),
              creatorId: creator.id,
              selectedTier: type === "subscription" ? selectedTier : undefined,
              postId: (type === "ppv" || type === "tips") ? postId : undefined,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            setError(data.message ?? "Failed to generate bank account. Please try again.");
            return;
          }

          if (data.accountNumber) {
            setVirtualAccount({
              accountNumber: data.accountNumber,
              bankName: data.bankName,
              accountName: data.accountName,
              expiresAt: data.expiresAt,
              amount: data.amount,
              reference: data.reference,
            });
          } else {
            setError("Bank account details unavailable. Please try again.");
          }
        } catch (err) {
          console.error("[Checkout] Bank transfer init error:", err);
          setError("Something went wrong. Please try again.");
        } finally {
          setLoading(false);
        }
        return;
      }

      if (selectedMethod === "card") {
        setLoading(true);
        try {
          const res = await fetch("/api/checkout/initialize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentMethod: "CARD",
              type: type === "tips" ? "tip" : type === "subscription" ? "subscription" : "ppv",
              amount: getAmount(),
              creatorId: creator.id,
              selectedTier: type === "subscription" ? selectedTier : undefined,
              postId: (type === "ppv" || type === "tips") ? postId : undefined,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            setError(data.message ?? "Failed to initialize payment");
            return;
          }

          if (data.checkoutUrl) {
            window.location.href = data.checkoutUrl;
          } else {
            setError("No checkout URL returned. Please try again.");
          }
        } catch (err) {
          console.error("[Checkout] Card init error:", err);
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
  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        onTouchMove={(e) => e.preventDefault()}
        style={{
          position: "fixed", inset: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          zIndex: 9998,
          opacity: isClosing ? 0 : 1,
          transition: "opacity 0.2s ease",
        }}
      />

      {/* Modal */}
      <div
        onTouchMove={(e) => e.stopPropagation()}
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
          overflowY: "scroll",
          WebkitOverflowScrolling: "touch",
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
            loading={loading}
            error={error}
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

        {screen === "success" && autoCloseOnSuccess && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 24px",
            gap: "16px",
          }}>
            <style>{`
              @keyframes successCheck {
                0%   { transform: scale(0); opacity: 0; }
                50%  { transform: scale(1.2); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes successFade {
                0%   { opacity: 0; transform: translateY(8px); }
                100% { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #22C55E, #16A34A)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "successCheck 0.5s ease-out forwards",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#FFFFFF",
              animation: "successFade 0.4s ease-out 0.3s forwards",
              opacity: 0,
            }}>
              Subscribed!
            </span>
            <span style={{
              fontSize: "13px",
              color: "#6B6B8A",
              animation: "successFade 0.4s ease-out 0.5s forwards",
              opacity: 0,
            }}>
              @{creator.username}
            </span>
          </div>
        )}

        {screen === "success" && !autoCloseOnSuccess && (
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
    </>,
    document.body
  );
}