"use client";

import { useState, useEffect, useCallback } from "react";
import { useNav } from "@/lib/hooks/useNav";

interface Fan {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  subscribed_at: string;
  expires_at: string | null;
  status: "active" | "expired" | "cancelled";
  total_spent: number;
}

const fmt = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLOR: Record<string, string> = {
  active:    "#10B981",
  expired:   "#F59E0B",
  cancelled: "#EF4444",
};

// ─── Skeleton ─────────────────────────────────

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
  width, height, style,
}: {
  width?: string | number; height?: string | number; style?: React.CSSProperties;
}) {
  return <div style={{ ...shimmerStyle, width: width ?? "100%", height: height ?? "14px", borderRadius: "6px", ...style }} />;
}

function FansSkeleton() {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "12px 0",
              borderBottom: i < 4 ? "1px solid #1A1A2E" : "none",
            }}
          >
            {/* Avatar */}
            <SkeletonBlock width={40} height={40} style={{ borderRadius: "50%", flexShrink: 0 }} />

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
              <SkeletonBlock width="40%" height={12} />
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <SkeletonBlock width="25%" height={10} />
                <SkeletonBlock width="45px" height={16} style={{ borderRadius: "4px" }} />
              </div>
              <SkeletonBlock width="55%" height={10} />
            </div>

            {/* Spent */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
              <SkeletonBlock width="70px" height={13} />
              <SkeletonBlock width="50px" height={10} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Main ─────────────────────────────────────

export default function FansSettings({ onBack }: { onBack?: () => void }) {
  const { navigate } = useNav();

  const [fans, setFans] = useState<Fan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "cancelled">("all");

  const filters: { key: typeof filter; label: string }[] = [
    { key: "all",       label: "All"       },
    { key: "active",    label: "Active"    },
    { key: "cancelled", label: "Cancelled" },
  ];

  const fetchFans = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/fans/list?status=${status}`);
      const data = await res.json();
      if (data.fans) setFans(data.fans);
    } catch (err) {
      console.error("[FansSettings]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFans(filter);
  }, [filter, fetchFans]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const goToFan = (username: string) => navigate(`/${username}?from=fans`);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", scrollbarWidth: "none", padding: "0 0 12px", marginBottom: "20px", position: "sticky", top: 0, zIndex: 10, backgroundColor: "var(--background)" }}>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "7px 16px", borderRadius: "20px", border: "none",
              backgroundColor: filter === f.key ? "#FFFFFF" : "#1A1A2A",
              color: filter === f.key ? "#0A0A0F" : "#94A3B8",
              fontSize: "12px", fontWeight: filter === f.key ? 600 : 500,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Fan count */}
      {!loading && (
        <p style={{ fontSize: "11px", fontWeight: 500, color: "#6B6B8A", margin: "0 0 12px", letterSpacing: "0.04em" }}>
          {fans.length} {fans.length === 1 ? "fan" : "fans"}
        </p>
      )}

      {/* List */}
      {loading ? (
        <FansSkeleton />
      ) : fans.length === 0 ? (
        <div style={{ backgroundColor: "#1C1C2E", border: "1.5px dashed #2A2A3D", borderRadius: "10px", padding: "32px 16px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0 }}>No fans yet</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {fans.map((fan, i) => (
            <div
              key={fan.id}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "12px 0",
                borderBottom: i < fans.length - 1 ? "1px solid #1A1A2E" : "none",
              }}
            >
              {/* Avatar */}
              <button
                onClick={() => goToFan(fan.username)}
                style={{
                  width: "40px", height: "40px", borderRadius: "50%",
                  flexShrink: 0, overflow: "hidden", border: "none",
                  cursor: "pointer", padding: 0, background: "none",
                }}
              >
                {fan.avatar_url ? (
                  <img
                    src={fan.avatar_url} alt={fan.display_name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "14px", fontWeight: 700, color: "#fff",
                  }}>
                    {(fan.display_name || fan.username).charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <button
                  onClick={() => goToFan(fan.username)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
                >
                  <p style={{
                    fontSize: "13px", fontWeight: 600, color: "#F1F5F9",
                    margin: "0 0 2px", whiteSpace: "nowrap",
                    overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {fan.display_name || fan.username}
                  </p>
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => goToFan(fan.username)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    <span style={{ fontSize: "11px", color: "#8B5CF6", fontWeight: 500 }}>@{fan.username}</span>
                  </button>
                  <span style={{
                    fontSize: "10px", fontWeight: 600,
                    color: STATUS_COLOR[fan.status],
                    backgroundColor: `${STATUS_COLOR[fan.status]}18`,
                    borderRadius: "4px", padding: "1px 5px",
                    textTransform: "capitalize",
                  }}>
                    {fan.status}
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "#6B6B8A", margin: "3px 0 0" }}>
                  Subscribed {formatDate(fan.subscribed_at)}
                </p>
              </div>

              {/* Spent */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", flexShrink: 0 }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#10B981" }}>{fmt(fan.total_spent)}</span>
                <span style={{ fontSize: "10px", color: "#6B6B8A" }}>total spent</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}