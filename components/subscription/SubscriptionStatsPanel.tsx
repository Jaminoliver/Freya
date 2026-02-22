"use client";

import { useRouter } from "next/navigation";

interface Stats {
  active: number;
  expired: number;
  total: number;
  monthlySpend: number;
  totalSpent: number;
}

interface Props {
  stats: Stats;
  autoRenewAll: boolean;
  onToggleAutoRenew: () => void;
}

const fmt = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 0 });

export function SubscriptionStatsPanel({ stats, autoRenewAll, onToggleAutoRenew }: Props) {
  const router = useRouter();

  return (
    <div
      className="hidden md:flex"
      style={{
        width: "280px", flexShrink: 0,
        backgroundColor: "#13131F", borderLeft: "1px solid #1F1F2A",
        padding: "24px 20px", flexDirection: "column", gap: "20px",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
        fontFamily: "'Inter', sans-serif", scrollbarWidth: "none",
      }}
    >
      {/* Header */}
      <div>
        <p style={{ fontSize: "10px", fontWeight: 600, color: "#6B6B8A", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
          Subscriptions
        </p>
        <p style={{ fontSize: "26px", fontWeight: 700, color: "#F1F5F9", margin: 0 }}>
          {stats.active} Active
        </p>
      </div>

      {/* Counts */}
      <div
        style={{
          backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D",
          borderRadius: "10px", overflow: "hidden",
        }}
      >
        {[
          { label: "Active",  value: stats.active,  color: "#10B981" },
          { label: "Expired", value: stats.expired, color: "#EF4444" },
          { label: "Total",   value: stats.total,   color: "#F1F5F9" },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "11px 14px",
              borderBottom: i < arr.length - 1 ? "1px solid #2A2A3D" : "none",
            }}
          >
            <span style={{ fontSize: "13px", color: "#94A3B8" }}>{row.label}</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: row.color }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Spend */}
      <div
        style={{
          backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D",
          borderRadius: "10px", overflow: "hidden",
        }}
      >
        {[
          { label: "Monthly Spend", value: fmt(stats.monthlySpend) },
          { label: "Total Spent",   value: fmt(stats.totalSpent)   },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "11px 14px",
              borderBottom: i < arr.length - 1 ? "1px solid #2A2A3D" : "none",
            }}
          >
            <span style={{ fontSize: "13px", color: "#94A3B8" }}>{row.label}</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#F1F5F9" }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Auto-renew all toggle */}
      <div
        style={{
          backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D",
          borderRadius: "10px", padding: "14px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#F1F5F9" }}>Auto-renew all</span>
          {/* Toggle */}
          <button
            onClick={onToggleAutoRenew}
            style={{
              width: "40px", height: "22px", borderRadius: "11px",
              border: "none", cursor: "pointer", padding: "2px",
              backgroundColor: autoRenewAll ? "#8B5CF6" : "#2A2A3D",
              display: "flex", alignItems: "center",
              justifyContent: autoRenewAll ? "flex-end" : "flex-start",
              transition: "all 0.2s ease", flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "18px", height: "18px", borderRadius: "50%",
                backgroundColor: "#fff", transition: "all 0.2s ease",
              }}
            />
          </button>
        </div>
        <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0 }}>
          Applies to all active subscriptions
        </p>
      </div>

      {/* Explore Creators */}
      <button
        onClick={() => router.push("/explore")}
        style={{
          width: "100%", padding: "11px",
          borderRadius: "10px", border: "1.5px solid #8B5CF6",
          backgroundColor: "transparent", color: "#8B5CF6",
          fontSize: "13px", fontWeight: 700, cursor: "pointer",
          fontFamily: "'Inter', sans-serif", letterSpacing: "0.02em",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        Explore Creators
      </button>
    </div>
  );
}