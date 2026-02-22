"use client";

import { useState } from "react";

type EarningsTab = "overview" | "history";

const fmt = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SAMPLE_HISTORY = [
  { id: "1", fan: "Ada Okonkwo",  username: "@ada_o",    type: "Subscription", amount: 2000, date: "Feb 21, 2026", status: "completed" },
  { id: "2", fan: "Emeka Chukwu", username: "@emeka_c",  type: "PPV",          amount: 1500, date: "Feb 20, 2026", status: "completed" },
  { id: "3", fan: "Tunde Bello",  username: "@tunde_b",  type: "Tip",          amount: 500,  date: "Feb 19, 2026", status: "completed" },
  { id: "4", fan: "Chisom Eze",   username: "@chisom_e", type: "On Request",   amount: 5000, date: "Feb 18, 2026", status: "completed" },
  { id: "5", fan: "Fatima Musa",  username: "@fatima_m", type: "Subscription", amount: 2000, date: "Feb 17, 2026", status: "completed" },
  { id: "6", fan: "Seun Adeyemi", username: "@seun_a",   type: "PPV",          amount: 800,  date: "Feb 16, 2026", status: "pending"   },
  { id: "7", fan: "Ngozi Okafor", username: "@ngozi_ok", type: "Tip",          amount: 1000, date: "Feb 15, 2026", status: "completed" },
  { id: "8", fan: "Uche Obi",     username: "@uche_obi", type: "On Request",   amount: 3000, date: "Feb 14, 2026", status: "completed" },
];

const TYPE_COLOR: Record<string, string> = {
  Subscription: "#8B5CF6",
  PPV:          "#EC4899",
  Tip:          "#10B981",
  "On Request": "#F59E0B",
};

export default function EarningsSettings({ onBack }: { onBack?: () => void }) {
  const [activeTab, setActiveTab] = useState<EarningsTab>("overview");

  const TABS: { key: EarningsTab; label: string }[] = [
    { key: "overview", label: "Overview"        },
    { key: "history",  label: "Earning History" },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#F1F5F9", margin: 0 }}>
          Earnings
        </h2>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #1E1E2E", marginBottom: "24px" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 16px", fontSize: "13px", fontWeight: 500,
              fontFamily: "'Inter', sans-serif", background: "none", border: "none",
              cursor: "pointer",
              color: activeTab === tab.key ? "#8B5CF6" : "#64748B",
              borderBottom: activeTab === tab.key ? "2px solid #8B5CF6" : "2px solid transparent",
              marginBottom: "-1px", transition: "color 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "history"  && <HistoryTabContent />}
    </div>
  );
}

function OverviewTab() {
  const thisMonth = [
    { label: "Subscriptions", value: fmt(0) },
    { label: "Tips",          value: fmt(0) },
    { label: "PPV Content",   value: fmt(0) },
    { label: "Messages",      value: fmt(0) },
    { label: "On Request",    value: fmt(0) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* Two balances */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid #1E1E2E", paddingBottom: "24px", marginBottom: "24px" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "11px", fontWeight: 500, color: "#94A3B8", margin: "0 0 4px", letterSpacing: "0.04em" }}>
            Total earned
          </p>
          <p style={{ fontSize: "26px", fontWeight: 700, color: "#F1F5F9", margin: 0, letterSpacing: "-0.5px" }}>
            {fmt(0)}
          </p>
        </div>

        <div style={{ width: "1px", backgroundColor: "#1E1E2E", margin: "0 24px" }} />

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "11px", fontWeight: 500, color: "#94A3B8", margin: "0 0 4px", letterSpacing: "0.04em" }}>
            Available to withdraw
          </p>
          <p style={{ fontSize: "26px", fontWeight: 700, color: "#10B981", margin: 0, letterSpacing: "-0.5px" }}>
            {fmt(0)}
          </p>
          <button
            style={{
              marginTop: "8px",
              backgroundColor: "transparent",
              border: "1px solid #2A2A3D",
              borderRadius: "6px",
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 500,
              color: "#94A3B8",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* This month breakdown */}
      <p style={{ fontSize: "11px", fontWeight: 500, color: "#94A3B8", margin: "0 0 12px", letterSpacing: "0.04em" }}>
        This month
      </p>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {thisMonth.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "11px 0",
              borderBottom: i < thisMonth.length - 1 ? "1px solid #1A1A2E" : "none",
            }}
          >
            <span style={{ fontSize: "13px", color: "#CBD5E1" }}>{row.label}</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#F1F5F9" }}>{row.value}</span>
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid #1E1E2E", marginTop: "4px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#F1F5F9" }}>Total</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#8B5CF6" }}>{fmt(0)}</span>
        </div>
      </div>
    </div>
  );
}

function HistoryTabContent() {
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Subscription", "PPV", "Tip", "On Request"];
  const filtered = SAMPLE_HISTORY.filter((h) => filter === "All" || h.type === filter);

  return (
    <div>
      {/* Filter pills */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", marginBottom: "16px", scrollbarWidth: "none" }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "5px 12px", borderRadius: "50px",
              border: `1px solid ${filter === f ? "#8B5CF6" : "#2A2A3D"}`,
              backgroundColor: filter === f ? "#8B5CF6" : "transparent",
              color: filter === f ? "#fff" : "#94A3B8",
              fontSize: "12px", fontWeight: 500,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {filtered.map((item) => (
          <div
            key={item.id}
            style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #1A1A2E" }}
          >
            {/* Avatar */}
            <div
              style={{
                width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: 700, color: "#fff",
              }}
            >
              {item.fan.charAt(0)}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "#F1F5F9", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.fan}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "#6B6B8A" }}>{item.username}</span>
                <span
                  style={{
                    fontSize: "10px", fontWeight: 600,
                    color: TYPE_COLOR[item.type],
                    backgroundColor: `${TYPE_COLOR[item.type]}18`,
                    borderRadius: "4px", padding: "1px 5px",
                  }}
                >
                  {item.type}
                </span>
              </div>
            </div>

            {/* Amount + date */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", flexShrink: 0 }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#10B981" }}>+{fmt(item.amount)}</span>
              <span style={{ fontSize: "11px", color: "#6B6B8A" }}>{item.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}