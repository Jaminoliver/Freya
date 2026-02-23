"use client";

import * as React from "react";
import type { User } from "@/lib/types/profile";
import type {
  CheckoutType, CheckoutScreen, Currency, PaymentMethodId, SubscriptionTier,
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
  // Subscription
  monthlyPrice?: number;
  threeMonthPrice?: number;
  sixMonthPrice?: number;
  initialTier?: SubscriptionTier;
  // PPV / locked post
  postPrice?: number;
  postTitle?: string;
  // Callbacks
  onSuccess?: () => void;
  onViewContent?: () => void;
  onGoToSubscriptions?: () => void;
}

export default function CheckoutModal({
  isOpen, onClose, type, creator,
  monthlyPrice = 2000, threeMonthPrice, sixMonthPrice, initialTier = "monthly",
  postPrice = 0, postTitle,
  onSuccess, onViewContent, onGoToSubscriptions,
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

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setScreen(type === "tips" ? "tip_input" : type === "subscription" ? "plan" : "payment");
      setSelectedMethod(null);
      setIsClosing(false);
    }
  }, [isOpen, type]);

  // Lock body scroll when open
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

  // Compute amount based on context
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
    if (type === "subscription") return "Basic";
    return postTitle ?? "Locked Content";
  };

  const handleNext = () => {
    if (screen === "plan") setScreen("payment");
    else if (screen === "tip_input") setScreen("payment");
    else if (screen === "payment") {
      onSuccess?.();
      setScreen("success");
    }
  };

  const handleBack = () => {
    if (screen === "payment") {
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
      {/* Backdrop */}
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

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: isClosing ? "translate(-50%, -48%) scale(0.97)" : "translate(-50%, -50%) scale(1)",
          zIndex: 9999,
          width: "min(420px, calc(100vw - 32px))",
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
        {/* Screen: Plan selection */}
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

        {/* Screen: Tip input */}
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

        {/* Screen: Payment */}
        {screen === "payment" && (
          <PaymentScreen
            type={type}
            currency={currency}
            onCurrencyChange={setCurrency}
            selectedMethod={selectedMethod}
            onMethodChange={setSelectedMethod}
            amount={getAmount()}
            label={getPaymentLabel()}
            tier={type === "subscription" ? selectedTier : undefined}
            onNext={handleNext}
            onBack={handleBack}
            onClose={handleClose}
          />
        )}

        {/* Screen: Success */}
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