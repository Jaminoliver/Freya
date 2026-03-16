"use client";

import { useState, useEffect } from "react";
import { SubscriptionList } from "@/components/subscription/SubscriptionCard";
import { SubscriptionsSkeleton } from "@/components/loadscreen/SubscriptionsSkeleton";
import { Search, SlidersHorizontal, ArrowUpDown, UserX, UserMinus } from "lucide-react";
import { useAppStore, isStale } from "@/lib/store/appStore";

type ContentTab = "creators" | "blocked" | "restricted";

const CACHE_KEY = "__subscriptions__";

function preloadImages(urls: string[]): void {
  for (const url of urls) {
    if (!url) continue;
    const img = new Image();
    img.src = url;
  }
}

// ── Blocked / Restricted user row ─────────────────────────────────────────────

function UserRow({
  user,
  actionLabel,
  actionColor,
  onAction,
}: {
  user:         { id: string; username: string; display_name: string | null; avatar_url: string | null };
  actionLabel:  string;
  actionColor:  string;
  onAction:     () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try { await onAction(); } finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "13px", padding: "12px 0", borderBottom: "1px solid #1E1E2E", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "#2A2A3D" }}>
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "16px", fontWeight: 700 }}>
            {(user.display_name ?? user.username)[0].toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>
          {user.display_name ?? user.username}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#6B6B8A" }}>@{user.username}</p>
      </div>
      <button
        onClick={handle}
        disabled={loading}
        style={{ padding: "7px 16px", borderRadius: "8px", border: `1px solid ${actionColor}`, backgroundColor: "transparent", color: actionColor, fontSize: "13px", fontWeight: 600, cursor: loading ? "default" : "pointer", fontFamily: "'Inter', sans-serif", opacity: loading ? 0.5 : 1, transition: "all 0.15s ease", flexShrink: 0 }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = `${actionColor}18`; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
      >
        {loading ? "..." : actionLabel}
      </button>
    </div>
  );
}

// ── Blocked list ──────────────────────────────────────────────────────────────

function BlockedList() {
  const [users,   setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/block")
      .then((r) => r.json())
      .then((d) => setUsers(d.blockedUsers ?? []))
      .finally(() => setLoading(false));
  }, []);

  const unblock = async (userId: string) => {
    await fetch("/api/users/block", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId }),
    });
    setUsers((prev) => prev.filter((u) => u.blocked_user_id !== userId));
  };

  if (loading) return <SubscriptionsSkeleton count={3} />;

  if (users.length === 0) {
    return (
      <div style={{ backgroundColor: "#1C1C2E", border: "1.5px dashed #2A2A3D", borderRadius: "10px", padding: "32px 16px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>No blocked users</p>
      </div>
    );
  }

  return (
    <div>
      {users.map((u) => (
        <UserRow
          key={u.id}
          user={u.blocked_user}
          actionLabel="Unblock"
          actionColor="#10B981"
          onAction={() => unblock(u.blocked_user_id)}
        />
      ))}
    </div>
  );
}

// ── Restricted list ───────────────────────────────────────────────────────────

function RestrictedList() {
  const [users,   setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/restrict")
      .then((r) => r.json())
      .then((d) => setUsers(d.restrictedUsers ?? []))
      .finally(() => setLoading(false));
  }, []);

  const unrestrict = async (userId: string) => {
    await fetch("/api/users/restrict", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId }),
    });
    setUsers((prev) => prev.filter((u) => u.restricted_user_id !== userId));
  };

  if (loading) return <SubscriptionsSkeleton count={3} />;

  if (users.length === 0) {
    return (
      <div style={{ backgroundColor: "#1C1C2E", border: "1.5px dashed #2A2A3D", borderRadius: "10px", padding: "32px 16px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>No restricted users</p>
      </div>
    );
  }

  return (
    <div>
      {users.map((u) => (
        <UserRow
          key={u.id}
          user={u.restricted_user}
          actionLabel="Remove"
          actionColor="#F59E0B"
          onAction={() => unrestrict(u.restricted_user_id)}
        />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const [contentTab, setContentTab] = useState<ContentTab>("creators");

  const { contentFeeds, setContentFeed } = useAppStore();
  const cached = contentFeeds[CACHE_KEY];
  const fresh  = cached && !isStale(cached.fetchedAt);

  const [subscriptions, setSubscriptions] = useState<any[]>(fresh ? cached.posts : []);
  const [loading,       setLoading]       = useState(!fresh);
  const [revealed,      setRevealed]      = useState(false);

  const fetchSubscriptions = async (force = false) => {
    if (!force && fresh) return;
    setLoading(true);
    try {
      const res  = await fetch("/api/subscriptions/mine");
      const data = await res.json();
      if (data.subscriptions) {
        const subs = data.subscriptions;
        setSubscriptions(subs);
        setContentFeed(CACHE_KEY, { posts: subs, media: [], fetchedAt: Date.now() });
        const urls: string[] = [];
        for (const s of subs.slice(0, 6)) {
          if (s.banner_url) urls.push(s.banner_url);
          if (s.avatar_url) urls.push(s.avatar_url);
        }
        preloadImages(urls);
      }
    } catch (err) {
      console.error("[SubscriptionsPage]", err);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => setRevealed(true));
    }
  };

  useEffect(() => {
    if (fresh) { setRevealed(true); return; }
    fetchSubscriptions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tabs: { key: ContentTab; label: string; icon?: React.ReactNode }[] = [
    { key: "creators",  label: "Creators"   },
    { key: "blocked",    label: "Blocked",    icon: <UserX    size={13} strokeWidth={1.8} /> },
    { key: "restricted", label: "Restricted", icon: <UserMinus size={13} strokeWidth={1.8} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "28px 28px 0", borderBottom: "1px solid #1F1F2A" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#F1F5F9", margin: "0 0 3px" }}>
          Subscriptions
        </h1>
        <p style={{ fontSize: "13px", color: "#6B6B8A", margin: "0 0 18px" }}>
          Manage your active and expired subscriptions
        </p>

        <div style={{ display: "flex", width: "100%" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setContentTab(tab.key)}
              style={{
                flex:         1,
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                gap:          "5px",
                padding:      "14px 8px",
                background:   "none",
                border:       "none",
                cursor:       "pointer",
                fontFamily:   "'Inter', sans-serif",
                fontSize:     "13px",
                fontWeight:   contentTab === tab.key ? 600 : 400,
                color:        contentTab === tab.key ? "#8B5CF6" : "#64748B",
                borderBottom: contentTab === tab.key ? "2px solid #8B5CF6" : "2px solid transparent",
                marginBottom: "-1px",
                transition:   "all 0.15s",
                whiteSpace:   "nowrap",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Icons row — only for following/posts */}
      {contentTab === "creators" && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", padding: "14px 28px" }}>
          {[Search, SlidersHorizontal, ArrowUpDown].map((Icon, i) => (
            <button
              key={i}
              style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #2A2A3D", backgroundColor: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.color = "#8B5CF6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3D"; e.currentTarget.style.color = "#6B6B8A"; }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: contentTab === "blocked" || contentTab === "restricted" ? "0 28px 28px" : "0 28px 28px" }}>
        {contentTab === "creators" && (
          loading
            ? <SubscriptionsSkeleton count={6} />
            : (
              <div style={{ opacity: revealed ? 1 : 0, transition: "opacity 0.35s ease" }}>
                <SubscriptionList subscriptions={subscriptions} onRefresh={() => fetchSubscriptions(true)} />
              </div>
            )
        )}

        {contentTab === "blocked"    && <BlockedList    />}
        {contentTab === "restricted" && <RestrictedList />}
      </div>
    </div>
  );
}