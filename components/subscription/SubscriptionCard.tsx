"use client";

import { useState, useMemo } from "react";
import { MoreHorizontal, BadgeCheck, Star, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

type SubscriptionStatus = "active" | "expired" | "attention";

interface Subscription {
  id: number;
  creatorId: string;
  creatorName: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  isVerified: boolean;
  status: SubscriptionStatus;
  newPosts: number;
  expiresAt: string;
  price: number;
  autoRenew: boolean;
}

const STATUS_COLOR: Record<SubscriptionStatus, string> = {
  active:    "#10B981",
  expired:   "#EF4444",
  attention: "#F59E0B",
};

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active:    "Active",
  expired:   "Expired",
  attention: "Attention",
};

// ── Subscription List ─────────────────────────────────────────────────────────

export function SubscriptionList({
  subscriptions,
  onRefresh,
}: {
  subscriptions: Subscription[];
  onRefresh?: () => void;
}) {
  const [filter, setFilter] = useState("all");

  // Fix #8 — memoize counts so they don't recalculate every render
  const counts = useMemo(() => ({
    all:       subscriptions.length,
    active:    subscriptions.filter((s) => s.status === "active").length,
    expired:   subscriptions.filter((s) => s.status === "expired").length,
    attention: subscriptions.filter((s) => s.status === "attention").length,
  }), [subscriptions]);

  const filtered = useMemo(
    () => filter === "all" ? subscriptions : subscriptions.filter((s) => s.status === filter),
    [subscriptions, filter]
  );

  if (subscriptions.length === 0) {
    return (
      <div style={{ backgroundColor: "#1C1C2E", border: "1.5px dashed #2A2A3D", borderRadius: "10px", padding: "32px 16px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>No subscriptions yet</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <SubscriptionFilterTabs active={filter} counts={counts} onChange={setFilter} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
        {filtered.map((s) => (
          <SubscriptionCard
            key={s.id}
            subscription={s}
            onCancelled={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}

// ── Subscription Card ─────────────────────────────────────────────────────────

export function SubscriptionCard({
  subscription: s,
  onCancelled,
}: {
  subscription: Subscription;
  onCancelled?: () => void;
}) {
  const router = useRouter();
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Cancel subscription? You'll keep access until the period ends.")) return;
    setCancelling(true);
    try {
      const res  = await fetch(`/api/subscriptions/${s.id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (data.success) onCancelled?.();
      else alert(data.error ?? "Failed to cancel");
    } catch {
      alert("Something went wrong");
    } finally {
      setCancelling(false);
      setMenuOpen(false);
    }
  };

  return (
    <div style={{ backgroundColor: "transparent", borderRadius: "12px", overflow: "hidden", fontFamily: "'Inter', sans-serif", position: "relative" }}>

      {/* Banner cover — Fix #5: Next Image, Fix #7: Link with prefetch */}
      <Link
        href={`/${s.username}`}
        prefetch
        style={{ display: "block", position: "relative", height: "160px", cursor: "pointer", textDecoration: "none" }}
      >
        {/* Banner */}
        {s.banner_url ? (
          <Image
            src={s.banner_url}
            alt={s.creatorName}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            style={{ objectFit: "cover" }}
            priority={false}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1C1C2E, #2A2A3D)" }} />
        )}

        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 100%)", zIndex: 1 }} />

        {/* Top badges */}
        <div style={{ position: "absolute", top: "10px", left: "10px", display: "flex", gap: "6px", zIndex: 2 }}>
          {s.price === 0 && (
            <span style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", borderRadius: "20px", padding: "2px 9px", fontSize: "10px", fontWeight: 700, color: "#fff" }}>Free</span>
          )}
          {s.newPosts > 0 && (
            <span style={{ backgroundColor: "rgba(139,92,246,0.8)", backdropFilter: "blur(6px)", borderRadius: "20px", padding: "2px 9px", fontSize: "10px", fontWeight: 700, color: "#fff" }}>{s.newPosts} new</span>
          )}
        </div>

        {/* Status dot + three-dot menu */}
        <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", alignItems: "center", gap: "6px", zIndex: 2 }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: STATUS_COLOR[s.status], boxShadow: `0 0 6px ${STATUS_COLOR[s.status]}` }} />
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v); }}
              style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                style={{ position: "absolute", top: "34px", right: 0, backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "8px", overflow: "hidden", minWidth: "140px", zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
              >
                {s.status === "active" && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    style={{ width: "100%", padding: "10px 14px", backgroundColor: "transparent", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 500, color: "#EF4444", textAlign: "left", fontFamily: "'Inter', sans-serif" }}
                  >
                    {cancelling ? "Cancelling…" : "Cancel subscription"}
                  </button>
                )}
                <button
                  onClick={(e) => { e.preventDefault(); setMenuOpen(false); }}
                  style={{ width: "100%", padding: "10px 14px", backgroundColor: "transparent", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 500, color: "#94A3B8", textAlign: "left", fontFamily: "'Inter', sans-serif" }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Avatar + name — Fix #6: no pravatar fallback, use initials div instead */}
        <div style={{ position: "absolute", bottom: "12px", left: "12px", display: "flex", alignItems: "center", gap: "10px", zIndex: 2 }}>
          <div style={{ position: "relative", width: "72px", height: "72px", borderRadius: "50%", border: "3px solid rgba(255,255,255,0.9)", overflow: "hidden", flexShrink: 0, backgroundColor: "#2A2A3D" }}>
            {s.avatar_url ? (
              <Image
                src={s.avatar_url}
                alt={s.creatorName}
                fill
                sizes="72px"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: 700, color: "#8B5CF6" }}>
                {s.creatorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{s.creatorName}</span>
              {s.isVerified && <BadgeCheck size={14} color="#A78BFA" />}
            </div>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>@{s.username}</span>
          </div>
        </div>

        {/* Favorite + Message icons */}
        <div style={{ position: "absolute", bottom: "12px", right: "12px", display: "flex", gap: "8px", zIndex: 2 }}>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Star size={15} strokeWidth={1.6} />
          </button>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageCircle size={15} strokeWidth={1.6} />
          </button>
        </div>
      </Link>

      {/* Divider */}
      <div style={{ height: "1px", backgroundColor: "#1E1E2E", margin: "0 4px" }} />

      {/* Body */}
      <div style={{ padding: "10px 4px", display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "transparent" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {s.status === "active" ? (
            <>
              <button style={{ flex: 1, padding: "8px 4px", borderRadius: "7px", border: "1px solid #2A2A3D", backgroundColor: "transparent", color: "#94A3B8", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Subscribed</button>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                style={{ flex: 1, padding: "8px 4px", borderRadius: "7px", border: "none", backgroundColor: "#8B5CF6", color: "#fff", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
              >Manage</button>
            </>
          ) : (
            <>
              <Link
                href={`/${s.username}`}
                prefetch
                style={{ flex: 1, padding: "8px 4px", borderRadius: "7px", border: "none", backgroundColor: "#8B5CF6", color: "#fff", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
              >Resubscribe</Link>
              <button style={{ flex: 1, padding: "8px 4px", borderRadius: "7px", border: "1px solid #2A2A3D", backgroundColor: "transparent", color: "#94A3B8", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>For free</button>
            </>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: STATUS_COLOR[s.status] }}>{STATUS_LABEL[s.status]}</span>
          <span style={{ fontSize: "11px", color: "#6B6B8A" }}>{s.status === "active" ? "Expires" : "Expired"} {s.expiresAt}</span>
        </div>
      </div>
    </div>
  );
}

// ── Filter tabs ────────────────────────────────────────────────────────────────

interface FilterTabsProps {
  active: string;
  counts: Record<string, number>;
  onChange: (val: string) => void;
}

export function SubscriptionFilterTabs({ active, counts, onChange }: FilterTabsProps) {
  const tabs = [
    { key: "all",       label: "All"               },
    { key: "active",    label: "Active"             },
    { key: "expired",   label: "Expired"            },
    { key: "attention", label: "Attention required" },
  ];

  return (
    <div style={{ display: "flex", gap: "6px", overflowX: "auto", scrollbarWidth: "none", paddingBottom: "2px" }}>
      {tabs.map((t) => {
        const isActive = active === t.key;
        const count    = counts[t.key] ?? 0;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              padding: "6px 14px", borderRadius: "50px",
              border: `1px solid ${isActive ? "#8B5CF6" : "#2A2A3D"}`,
              backgroundColor: isActive ? "#8B5CF6" : "transparent",
              color: isActive ? "#fff" : "#94A3B8",
              fontSize: "12px", fontWeight: 500,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s",
            }}
          >
            {t.label}{count > 0 ? ` [${count}]` : ""}
          </button>
        );
      })}
    </div>
  );
}