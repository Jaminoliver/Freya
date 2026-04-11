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

export default function FansSettings({ onBack }: { onBack?: () => void }) {
  const { navigate } = useNav();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else if (onBack) {
      onBack();
    }
  };

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

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <button
          onClick={handleBack}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#F1F5F9", margin: 0 }}>My Fans</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1E1E2E", marginBottom: "20px" }}>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "8px 16px", fontSize: "13px", fontWeight: 500,
              fontFamily: "'Inter', sans-serif", background: "none", border: "none",
              cursor: "pointer",
              color: filter === f.key ? "#8B5CF6" : "#64748B",
              borderBottom: filter === f.key ? "2px solid #8B5CF6" : "2px solid transparent",
              marginBottom: "-1px", transition: "color 0.15s ease", whiteSpace: "nowrap",
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
        <p style={{ fontSize: "12px", color: "#6B6B8A" }}>Loading...</p>
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