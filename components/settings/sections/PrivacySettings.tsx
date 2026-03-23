"use client";

import { useState, useEffect } from "react";
import { Ban, ShieldOff, UserX, UserMinus } from "lucide-react";

interface BlockedUser {
  id: number;
  blocked_user_id: string;
  reason: string | null;
  created_at: string;
  blocked_user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface RestrictedUser {
  id: number;
  restricted_user_id: string;
  reason: string | null;
  created_at: string;
  restricted_user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

type Tab = "blocked" | "restricted";

function UserRow({
  avatarUrl,
  displayName,
  username,
  date,
  actionLabel,
  actionColor,
  onAction,
}: {
  avatarUrl: string | null;
  displayName: string;
  username: string;
  date: string;
  actionLabel: string;
  actionColor: string;
  onAction: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [removed, setRemoved] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      await onAction();
      setRemoved(true);
    } finally {
      setLoading(false);
    }
  };

  if (removed) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 0",
        borderBottom: "1px solid #1E1E2E",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          backgroundColor: "#2A2A3D",
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#8B5CF6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 700,
            }}
          >
            {displayName[0].toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {displayName}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#8B5CF6" }}>@{username}</p>
        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#4A4A6A" }}>
          {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <button
        onClick={handle}
        disabled={loading}
        style={{
          padding: "7px 14px",
          borderRadius: "8px",
          border: `1px solid ${actionColor}`,
          backgroundColor: "transparent",
          color: actionColor,
          fontSize: "12px",
          fontWeight: 600,
          cursor: loading ? "default" : "pointer",
          fontFamily: "'Inter', sans-serif",
          opacity: loading ? 0.5 : 1,
          transition: "all 0.15s ease",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = `${actionColor}18`; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
      >
        {loading ? "..." : actionLabel}
      </button>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div
      style={{
        backgroundColor: "#1C1C2E",
        border: "1.5px dashed #2A2A3D",
        borderRadius: "10px",
        padding: "40px 16px",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>
        {label}
      </p>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "#1C1C2E", animation: "pulse 1.4s ease-in-out infinite" }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: "120px", height: "14px", borderRadius: "6px", backgroundColor: "#1C1C2E", marginBottom: "6px", animation: "pulse 1.4s ease-in-out infinite" }} />
            <div style={{ width: "80px", height: "12px", borderRadius: "6px", backgroundColor: "#1C1C2E", animation: "pulse 1.4s ease-in-out infinite" }} />
          </div>
          <div style={{ width: "70px", height: "32px", borderRadius: "8px", backgroundColor: "#1C1C2E", animation: "pulse 1.4s ease-in-out infinite" }} />
        </div>
      ))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
    </div>
  );
}

export default function PrivacySettings({ onBack }: { onBack?: () => void }) {
  const [tab, setTab] = useState<Tab>("blocked");
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [restrictedUsers, setRestrictedUsers] = useState<RestrictedUser[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);
  const [loadingRestricted, setLoadingRestricted] = useState(true);

  useEffect(() => {
    fetch("/api/users/block")
      .then((r) => r.json())
      .then((d) => setBlockedUsers(d.blockedUsers ?? []))
      .finally(() => setLoadingBlocked(false));

    fetch("/api/users/restrict")
      .then((r) => r.json())
      .then((d) => setRestrictedUsers(d.restrictedUsers ?? []))
      .finally(() => setLoadingRestricted(false));
  }, []);

  const unblock = async (userId: string) => {
    await fetch("/api/users/block", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setBlockedUsers((prev) => prev.filter((u) => u.blocked_user_id !== userId));
  };

  const unrestrict = async (userId: string) => {
    await fetch("/api/users/restrict", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setRestrictedUsers((prev) => prev.filter((u) => u.restricted_user_id !== userId));
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "blocked",    label: "Blocked",    icon: <UserX     size={14} strokeWidth={1.8} />, count: blockedUsers.length },
    { key: "restricted", label: "Restricted", icon: <UserMinus size={14} strokeWidth={1.8} />, count: restrictedUsers.length },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#F1F5F9", margin: 0 }}>Privacy & Blocking</h2>
      </div>

      <p style={{ fontSize: "13px", color: "#6B6B8A", margin: "0 0 20px" }}>
        Manage blocked and restricted users
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1E1E2E", marginBottom: "16px" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "12px 8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? "#8B5CF6" : "#64748B",
              borderBottom: tab === t.key ? "2px solid #8B5CF6" : "2px solid transparent",
              marginBottom: "-1px",
              transition: "all 0.15s",
            }}
          >
            {t.icon}
            {t.label}
            {t.count > 0 && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  backgroundColor: tab === t.key ? "#8B5CF6" : "#2A2A3D",
                  borderRadius: "10px",
                  padding: "1px 7px",
                  minWidth: "18px",
                  textAlign: "center",
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Blocked list */}
      {tab === "blocked" && (
        <>
          {loadingBlocked ? (
            <SkeletonRows />
          ) : blockedUsers.length === 0 ? (
            <EmptyState label="No blocked users" />
          ) : (
            <div>
              {blockedUsers.map((u) => (
                <UserRow
                  key={u.id}
                  avatarUrl={u.blocked_user.avatar_url}
                  displayName={u.blocked_user.display_name ?? u.blocked_user.username}
                  username={u.blocked_user.username}
                  date={u.created_at}
                  actionLabel="Unblock"
                  actionColor="#10B981"
                  onAction={() => unblock(u.blocked_user_id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Restricted list */}
      {tab === "restricted" && (
        <>
          {loadingRestricted ? (
            <SkeletonRows />
          ) : restrictedUsers.length === 0 ? (
            <EmptyState label="No restricted users" />
          ) : (
            <div>
              {restrictedUsers.map((u) => (
                <UserRow
                  key={u.id}
                  avatarUrl={u.restricted_user.avatar_url}
                  displayName={u.restricted_user.display_name ?? u.restricted_user.username}
                  username={u.restricted_user.username}
                  date={u.created_at}
                  actionLabel="Remove"
                  actionColor="#F59E0B"
                  onAction={() => unrestrict(u.restricted_user_id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}