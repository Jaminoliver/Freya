"use client";

import { useState, useEffect, useCallback } from "react";

type EarningsTab = "overview" | "history";

const fmt = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const TYPE_COLOR: Record<string, string> = {
  Subscription: "#8B5CF6",
  PPV:          "#EC4899",
  Tip:          "#10B981",
  "On Request": "#F59E0B",
  Message:      "#3B82F6",
};

interface EarningsSummary {
  totalEarned: number;
  available: number;
  thisMonth: {
    subscriptions: number;
    tips: number;
    ppv: number;
    messages: number;
    on_request: number;
    total: number;
  };
}

interface EarningEntry {
  id: number;
  amount: number;
  type: string;
  date: string;
  fan: string;
  username: string;
  avatar_url: string | null;
  status: string;
}

// ─── Skeleton ────────────────────────────────

const SHIMMER_KEYFRAMES = `
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
`;

const shimmerStyle: React.CSSProperties = {
  backgroundImage: "linear-gradient(90deg, #0F0F1A 0px, #1A1A2E 80px, #0F0F1A 160px)",
  backgroundSize: "600px 100%",
  animation: "shimmer 1.6s infinite linear",
  borderRadius: "6px",
};

function SkeletonBlock({
  width,
  height,
  style,
}: {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        ...shimmerStyle,
        width: width ?? "100%",
        height: height ?? "14px",
        borderRadius: "6px",
        ...style,
      }}
    />
  );
}

// ─── Main Component ───────────────────────────

export default function EarningsSettings({
  onBack,
  onWithdraw,
}: {
  onBack?: () => void;
  onWithdraw?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<EarningsTab>("overview");

  const TABS: { key: EarningsTab; label: string }[] = [
    { key: "overview", label: "Overview"        },
    { key: "history",  label: "Earning History" },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", scrollbarWidth: "none", padding: "0 0 12px", marginBottom: "24px", position: "sticky", top: 0, zIndex: 10, backgroundColor: "var(--background)" }}>
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
              whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab onWithdraw={onWithdraw} />}
      {activeTab === "history"  && <HistoryTabContent />}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────

function OverviewTab({ onWithdraw }: { onWithdraw?: () => void }) {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/earnings/summary")
      .then((r) => r.json())
      .then((data) => { if (!data.error) setSummary(data); })
      .catch((err) => console.error("[Earnings Summary]", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <style>{SHIMMER_KEYFRAMES}</style>
        <div style={{ display: "flex", gap: "24px", paddingBottom: "24px", marginBottom: "24px", borderBottom: "1px solid #1E1E2E" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            <SkeletonBlock width="60%" height={11} />
            <SkeletonBlock width="80%" height={28} />
          </div>
          <div style={{ width: "1px", backgroundColor: "#1E1E2E", margin: "0 0" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            <SkeletonBlock width="60%" height={11} />
            <SkeletonBlock width="80%" height={28} />
            <SkeletonBlock width={80} height={28} style={{ borderRadius: "6px", marginTop: "4px" }} />
          </div>
        </div>
        <SkeletonBlock width="40%" height={11} style={{ marginBottom: "12px" }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #1A1A2E" }}>
            <SkeletonBlock width="40%" height={13} />
            <SkeletonBlock width="25%" height={13} />
          </div>
        ))}
      </>
    );
  }

  const thisMonth = [
    { label: "Subscriptions", value: fmt(summary?.thisMonth.subscriptions ?? 0) },
    { label: "Tips",          value: fmt(summary?.thisMonth.tips ?? 0) },
    { label: "PPV Content",   value: fmt(summary?.thisMonth.ppv ?? 0) },
    { label: "Messages",      value: fmt(summary?.thisMonth.messages ?? 0) },
    { label: "On Request",    value: fmt(summary?.thisMonth.on_request ?? 0) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", borderBottom: "1px solid #1E1E2E", paddingBottom: "24px", marginBottom: "24px" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "11px", fontWeight: 500, color: "#94A3B8", margin: "0 0 4px", letterSpacing: "0.04em" }}>Total earned</p>
          <p style={{ fontSize: "26px", fontWeight: 700, color: "#F1F5F9", margin: 0, letterSpacing: "-0.5px" }}>{fmt(summary?.totalEarned ?? 0)}</p>
        </div>
        <div style={{ width: "1px", backgroundColor: "#1E1E2E", margin: "0 24px" }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "11px", fontWeight: 500, color: "#94A3B8", margin: "0 0 4px", letterSpacing: "0.04em" }}>Available to withdraw</p>
          <p style={{ fontSize: "26px", fontWeight: 700, color: "#10B981", margin: 0, letterSpacing: "-0.5px" }}>{fmt(summary?.available ?? 0)}</p>
          <button
            onClick={onWithdraw}
            style={{
              marginTop: "8px", backgroundColor: "transparent",
              border: "1px solid #2A2A3D", borderRadius: "6px",
              padding: "5px 12px", fontSize: "12px", fontWeight: 500,
              color: "#94A3B8", cursor: "pointer",
              fontFamily: "'Inter', sans-serif", transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
          >
            Withdraw
          </button>
        </div>
      </div>

      <p style={{ fontSize: "11px", fontWeight: 500, color: "#94A3B8", margin: "0 0 12px", letterSpacing: "0.04em" }}>This month</p>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {thisMonth.map((row, i) => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: i < thisMonth.length - 1 ? "1px solid #1A1A2E" : "none" }}>
            <span style={{ fontSize: "13px", color: "#CBD5E1" }}>{row.label}</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#F1F5F9" }}>{row.value}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid #1E1E2E", marginTop: "4px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#F1F5F9" }}>Total</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#8B5CF6" }}>{fmt(summary?.thisMonth.total ?? 0)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Fan Avatar ───────────────────────────────

function FanAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [error, setError] = useState(false);
  const initial = (name.charAt(0) ?? "?").toUpperCase();

  if (avatarUrl && !error) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setError(true)}
        style={{
          width: "36px", height: "36px", borderRadius: "50%",
          objectFit: "cover", display: "block", flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div style={{
      width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "13px", fontWeight: 700, color: "#fff",
    }}>
      {initial}
    </div>
  );
}

// ─── History Tab ──────────────────────────────

function HistoryTabContent() {
  const [filter, setFilter] = useState("All");
  const [history, setHistory] = useState<EarningEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const filters = ["All", "Subscription", "PPV", "Tip", "On Request", "Message"];

  const fetchHistory = useCallback(async (type: string, p: number) => {
    setLoading(true);
    try {
      const param = type === "All" ? "all" : type;
      const res = await fetch(`/api/earnings/history?type=${param}&page=${p}`);
      const data = await res.json();
      if (data.history) setHistory(data.history);
      if (data.total !== undefined) setTotal(data.total);
    } catch (err) {
      console.error("[Earnings History]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchHistory(filter, 1);
  }, [filter, fetchHistory]);

  useEffect(() => {
    fetchHistory(filter, page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", marginBottom: "16px", scrollbarWidth: "none", position: "sticky", top: 0, zIndex: 10, backgroundColor: "var(--background)", paddingTop: "8px" }}>
        {filters.map((f) => (
          <button
            key={f} onClick={() => setFilter(f)}
            style={{
              padding: "5px 12px", borderRadius: "50px",
              border: `1px solid ${filter === f ? "#8B5CF6" : "#2A2A3D"}`,
              backgroundColor: filter === f ? "#8B5CF6" : "transparent",
              color: filter === f ? "#fff" : "#94A3B8",
              fontSize: "12px", fontWeight: 500, cursor: "pointer",
              fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s",
            }}
          >{f}</button>
        ))}
      </div>

      {loading ? (
        <>
          <style>{SHIMMER_KEYFRAMES}</style>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #1A1A2E" }}>
              <SkeletonBlock width={36} height={36} style={{ borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <SkeletonBlock width="50%" height={13} />
                <SkeletonBlock width="35%" height={11} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                <SkeletonBlock width={70} height={13} />
                <SkeletonBlock width={50} height={11} />
              </div>
            </div>
          ))}
        </>
      ) : history.length === 0 ? (
        <div style={{ backgroundColor: "#1C1C2E", border: "1.5px dashed #2A2A3D", borderRadius: "10px", padding: "32px 16px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>No earnings yet</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {history.map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #1A1A2E" }}>
                <FanAvatar name={item.fan} avatarUrl={item.avatar_url} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "#F1F5F9", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.fan}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "11px", color: "#6B6B8A" }}>{item.username}</span>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: TYPE_COLOR[item.type] ?? "#94A3B8", backgroundColor: `${TYPE_COLOR[item.type] ?? "#94A3B8"}18`, borderRadius: "4px", padding: "1px 5px" }}>{item.type}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", flexShrink: 0 }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#10B981" }}>+{fmt(item.amount)}</span>
                  <span style={{ fontSize: "11px", color: "#6B6B8A" }}>{item.date}</span>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #1E1E2E" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "7px 14px", borderRadius: "8px",
                  border: "1px solid #2A2A3D", background: "transparent",
                  color: page === 1 ? "#3A3A4D" : "#94A3B8",
                  fontSize: "12px", fontWeight: 500, cursor: page === 1 ? "default" : "pointer",
                  fontFamily: "'Inter', sans-serif", transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => { if (page !== 1) e.currentTarget.style.borderColor = "#8B5CF6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3D"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                Prev
              </button>

              <span style={{ fontSize: "12px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>
                {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "7px 14px", borderRadius: "8px",
                  border: "1px solid #2A2A3D", background: "transparent",
                  color: page === totalPages ? "#3A3A4D" : "#94A3B8",
                  fontSize: "12px", fontWeight: 500, cursor: page === totalPages ? "default" : "pointer",
                  fontFamily: "'Inter', sans-serif", transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => { if (page !== totalPages) e.currentTarget.style.borderColor = "#8B5CF6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3D"; }}
              >
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}