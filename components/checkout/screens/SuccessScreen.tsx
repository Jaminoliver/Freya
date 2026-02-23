"use client";

import * as React from "react";
import { X } from "lucide-react";
import type { User } from "@/lib/types/profile";
import type { CheckoutType, SubscriptionTier, Currency } from "@/lib/types/checkout";
import { CURRENCIES } from "../components/CurrencySwitcher";

interface SuccessScreenProps {
  type: CheckoutType;
  creator: User;
  amount: number;
  currency: Currency;
  tier?: SubscriptionTier;
  autoRenew?: boolean;
  onViewContent: () => void;
  onGoToSubscriptions: () => void;
  onClose: () => void;
}

const TIER_LABEL: Record<SubscriptionTier, string> = {
  monthly: "Basic · ₦/mo",
  three_month: "3-Month Bundle",
  six_month: "6-Month Bundle",
};

function getNextBillingDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function SuccessScreen({
  type, creator, amount, currency, tier, autoRenew = true,
  onViewContent, onGoToSubscriptions, onClose,
}: SuccessScreenProps) {
  const currencyOption = CURRENCIES.find((c) => c.code === currency)!;
  const symbol = currencyOption.symbol;
  const creatorName = creator.display_name || creator.username;

  const title = type === "tips"
    ? "Tip Sent!"
    : type === "subscription"
    ? "Subscription Active!"
    : "Unlocked!";

  const subtitle = type === "tips"
    ? `Your tip of ${symbol}${amount.toLocaleString()} was sent to ${creatorName}`
    : type === "subscription"
    ? `You're now subscribed to ${creatorName}`
    : `You've unlocked this content`;

  const planLabel = tier
    ? `Basic · ${symbol}${amount.toLocaleString()}/mo`
    : undefined;

  // Confetti dots animation
  const [showConfetti, setShowConfetti] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px 24px", position: "relative", overflow: "hidden" }}>
      {/* Close */}
      <button
        onClick={onClose}
        style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px", display: "flex" }}
      >
        <X size={18} color="#6B6B8A" />
      </button>

      {/* Success icon */}
      <div style={{ position: "relative", marginBottom: "16px", marginTop: "8px" }}>
        {/* Glow */}
        <div style={{
          position: "absolute", inset: "-8px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,197,94,0.2) 0%, transparent 70%)",
        }} />
        <div style={{
          width: "72px", height: "72px", borderRadius: "50%",
          background: "linear-gradient(135deg, #22C55E, #16A34A)",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
          boxShadow: "0 0 0 8px rgba(34,197,94,0.1)",
        }}>
          {/* Animated check */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M8 16l6 6 10-12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h2 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: 800, color: "#F1F5F9", textAlign: "center" }}>
        {title}
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#A3A3C2", textAlign: "center" }}>
        {subtitle}
      </p>

      {/* Creator row */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "50%",
          backgroundColor: "#2A2A3D", overflow: "hidden", flexShrink: 0,
          border: "2px solid #3A3A4D",
        }}>
          {creator.avatar_url
            ? <img src={creator.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#8B5CF6" }}>
                  {creatorName.charAt(0).toUpperCase()}
                </span>
              </div>
          }
        </div>
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#F1F5F9" }}>{creatorName}</p>
      </div>

      {/* Details card */}
      {type === "subscription" && planLabel && (
        <div style={{
          width: "100%", backgroundColor: "rgba(255,255,255,0.03)",
          border: "1px solid #2A2A3D", borderRadius: "12px",
          padding: "14px 16px", marginBottom: "20px",
          display: "flex", flexDirection: "column", gap: "10px",
        }}>
          {[
            { label: "Plan", value: planLabel },
            { label: "Next billing", value: getNextBillingDate() },
            { label: "Auto-renew", value: autoRenew ? "On" : "Off", valueColor: autoRenew ? "#22C55E" : "#EF4444" },
          ].map(({ label, value, valueColor }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#6B6B8A" }}>{label}</p>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: valueColor ?? "#F1F5F9" }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {type === "tips" && (
        <div style={{
          width: "100%", backgroundColor: "rgba(255,255,255,0.03)",
          border: "1px solid #2A2A3D", borderRadius: "12px",
          padding: "14px 16px", marginBottom: "20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#6B6B8A" }}>Amount sent</p>
          <p style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#22C55E" }}>
            {symbol}{amount.toLocaleString()}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          onClick={onViewContent}
          style={{
            width: "100%", padding: "13px", borderRadius: "10px",
            background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
            border: "none", cursor: "pointer",
            fontFamily: "'Inter', sans-serif", transition: "opacity 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>
            {type === "tips" ? `Visit ${creatorName}'s Profile` : `View ${creatorName}'s Content`}
          </span>
        </button>

        {type === "subscription" && (
          <button
            onClick={onGoToSubscriptions}
            style={{
              width: "100%", padding: "13px", borderRadius: "10px",
              backgroundColor: "transparent", border: "1px solid #2A2A3D",
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              transition: "border-color 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B5CF6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3D"; }}
          >
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#A3A3C2" }}>Go to Subscriptions</span>
          </button>
        )}
      </div>
    </div>
  );
}