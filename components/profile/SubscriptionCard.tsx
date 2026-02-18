"use client";

interface SubscriptionCardProps {
  monthlyPrice: number;
  threeMonthPrice?: number;
  sixMonthPrice?: number;
  onSubscribe?: () => void;
  isEditable?: boolean;
  onEditPricing?: () => void;
}

export default function SubscriptionCard({
  monthlyPrice,
  threeMonthPrice,
  sixMonthPrice,
  onSubscribe,
  isEditable = false,
  onEditPricing,
}: SubscriptionCardProps) {
  const formatNaira = (amount: number) => `₦${amount.toLocaleString()}`;

  if (isEditable) {
    return (
      <button
        onClick={onEditPricing}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 12px",
          borderRadius: "6px",
          backgroundColor: "transparent",
          border: "1px solid #8B5CF6",
          cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
          transition: "background-color 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
      >
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#FF6B6B" }}>
          {formatNaira(monthlyPrice)}/mo
        </span>
        <span style={{ fontSize: "12px", color: "#8B5CF6", fontWeight: 500 }}>
          · Edit Pricing
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onSubscribe}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 12px",
        borderRadius: "6px",
        background: "linear-gradient(135deg, #FF6B6B, #FF8E53)",
        border: "none",
        cursor: "pointer",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <span style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF" }}>
        Subscribe · {formatNaira(monthlyPrice)}/mo
      </span>
    </button>
  );
}