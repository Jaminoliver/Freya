"use client";

export type TransactionType = "topup" | "subscription" | "ppv" | "tip" | "premium";

export interface Transaction {
  id: string;
  type: TransactionType;
  label: string;
  subtitle: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
}

const TYPE_CONFIG: Record<TransactionType, { direction: "credit" | "debit"; color: string; iconBg: string }> = {
  topup:        { direction: "credit", color: "#10B981", iconBg: "rgba(16,185,129,0.12)" },
  subscription: { direction: "debit",  color: "#EF4444", iconBg: "rgba(239,68,68,0.12)" },
  ppv:          { direction: "debit",  color: "#EF4444", iconBg: "rgba(239,68,68,0.12)" },
  tip:          { direction: "debit",  color: "#EF4444", iconBg: "rgba(239,68,68,0.12)" },
  premium:      { direction: "debit",  color: "#8B5CF6", iconBg: "rgba(139,92,246,0.12)" },
};

function ArrowUpIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function ArrowDownIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function StarIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={color} stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

interface TransactionItemProps {
  transaction: Transaction;
}

export default function TransactionItem({ transaction }: TransactionItemProps) {
  const cfg = TYPE_CONFIG[transaction.type];

  const fmt = (n: number) =>
    "₦" + Math.abs(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const icon =
    cfg.direction === "credit" ? (
      <ArrowUpIcon color={cfg.color} />
    ) : transaction.type === "premium" ? (
      <StarIcon color={cfg.color} />
    ) : (
      <ArrowDownIcon color={cfg.color} />
    );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 0",
        borderBottom: "1px solid #1A1A2E",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          backgroundColor: cfg.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#F1F5F9",
            margin: "0 0 2px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {transaction.label}
        </p>
        <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0 }}>
          {transaction.subtitle} · {transaction.date}
        </p>
      </div>

      {/* Amount */}
      <span
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: cfg.direction === "credit" ? "#10B981" : "#94A3B8",
          flexShrink: 0,
        }}
      >
        {cfg.direction === "credit" ? "+" : "-"}{fmt(transaction.amount)}
      </span>
    </div>
  );
}