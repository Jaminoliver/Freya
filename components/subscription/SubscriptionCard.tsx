"use client";

import { MoreHorizontal, BadgeCheck, Star, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type SubscriptionStatus = "active" | "expired" | "attention";

interface Subscription {
  id: string;
  creatorName: string;
  username: string;
  avatar_url: string | null;
  coverImage?: string;
  coverGradient?: string;
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

export const SAMPLE_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "1", creatorName: "Sofia Reyes", username: "sofiareyes",
    avatar_url: "https://i.pravatar.cc/150?img=47",
    coverImage: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80",
    isVerified: true, status: "active", newPosts: 4, expiresAt: "Mar 21", price: 0, autoRenew: true,
  },
  {
    id: "2", creatorName: "Isabella Chen", username: "isabellachen",
    avatar_url: "https://i.pravatar.cc/150?img=45",
    coverImage: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&q=80",
    isVerified: true, status: "active", newPosts: 0, expiresAt: "Apr 5", price: 2000, autoRenew: true,
  },
  {
    id: "3", creatorName: "Emma Rodriguez", username: "emmarodriguez",
    avatar_url: "https://i.pravatar.cc/150?img=44",
    coverImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80",
    isVerified: false, status: "expired", newPosts: 0, expiresAt: "Feb 1", price: 1500, autoRenew: false,
  },
];

export function SubscriptionCard({ subscription: s }: { subscription: Subscription }) {
  const router = useRouter();

  const coverBg = s.coverImage
    ? `url(${s.coverImage}) center/cover no-repeat`
    : s.coverGradient ?? "linear-gradient(135deg, #1C1C2E, #2A2A3D)";

  return (
    <div style={{
      backgroundColor: "transparent",
      borderRadius: "12px",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Banner cover */}
      <div
        onClick={() => router.push(`/${s.username}`)}
        style={{ position: "relative", height: "160px", background: coverBg, cursor: "pointer" }}
      >
        {/* Gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 100%)",
        }} />

        {/* Top badges */}
        <div style={{ position: "absolute", top: "10px", left: "10px", display: "flex", gap: "6px", zIndex: 2 }}>
          {s.price === 0 && (
            <span style={{
              backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
              borderRadius: "20px", padding: "2px 9px",
              fontSize: "10px", fontWeight: 700, color: "#fff",
            }}>Free</span>
          )}
          {s.newPosts > 0 && (
            <span style={{
              backgroundColor: "rgba(139,92,246,0.8)", backdropFilter: "blur(6px)",
              borderRadius: "20px", padding: "2px 9px",
              fontSize: "10px", fontWeight: 700, color: "#fff",
            }}>{s.newPosts} new</span>
          )}
        </div>

        {/* Status dot + three-dot */}
        <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", alignItems: "center", gap: "6px", zIndex: 2 }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            backgroundColor: STATUS_COLOR[s.status],
            boxShadow: `0 0 6px ${STATUS_COLOR[s.status]}`,
          }} />
          <button
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "28px", height: "28px", borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.5)", border: "none",
              cursor: "pointer", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>

        {/* Avatar + name on cover */}
        <div style={{
          position: "absolute", bottom: "12px", left: "12px",
          display: "flex", alignItems: "center", gap: "10px", zIndex: 2,
        }}>
          <img
            src={s.avatar_url ?? `https://i.pravatar.cc/150?u=${s.username}`}
            alt={s.creatorName}
            style={{
              width: "72px", height: "72px", borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.9)",
              objectFit: "cover", flexShrink: 0,
            }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
                {s.creatorName}
              </span>
              {s.isVerified && <BadgeCheck size={14} color="#A78BFA" />}
            </div>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>@{s.username}</span>
          </div>
        </div>

        {/* Favorite + Message icons — bottom right of cover */}
        <div style={{ position: "absolute", bottom: "12px", right: "12px", display: "flex", gap: "8px", zIndex: 2 }}>
          <button onClick={(e) => e.stopPropagation()} style={{
            width: "32px", height: "32px", borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.5)", border: "none",
            cursor: "pointer", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Star size={15} strokeWidth={1.6} />
          </button>
          <button onClick={(e) => e.stopPropagation()} style={{
            width: "32px", height: "32px", borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.5)", border: "none",
            cursor: "pointer", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <MessageCircle size={15} strokeWidth={1.6} />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", backgroundColor: "#1E1E2E", margin: "0 4px" }} />

      {/* Body */}
      <div style={{ padding: "10px 4px", display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "transparent" }}>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "6px" }}>
          {s.status === "active" ? (
            <>
              <button style={{
                flex: 1, padding: "8px 4px", borderRadius: "7px",
                border: "1px solid #2A2A3D", backgroundColor: "transparent",
                color: "#94A3B8", fontSize: "11px", fontWeight: 600,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}>Subscribed</button>
              <button style={{
                flex: 1, padding: "8px 4px", borderRadius: "7px",
                border: "none", backgroundColor: "#8B5CF6",
                color: "#fff", fontSize: "11px", fontWeight: 700,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}>Manage</button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push(`/subscriptions/checkout?creator=${s.username}`)}
                style={{
                  flex: 1, padding: "8px 4px", borderRadius: "7px",
                  border: "none", backgroundColor: "#8B5CF6",
                  color: "#fff", fontSize: "11px", fontWeight: 700,
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                }}>Subscribe</button>
              <button style={{
                flex: 1, padding: "8px 4px", borderRadius: "7px",
                border: "1px solid #2A2A3D", backgroundColor: "transparent",
                color: "#94A3B8", fontSize: "11px", fontWeight: 600,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}>For free</button>
            </>
          )}
        </div>

        {/* Status row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: STATUS_COLOR[s.status] }}>
            {STATUS_LABEL[s.status]}
          </span>
          <span style={{ fontSize: "11px", color: "#6B6B8A" }}>
            {s.status === "active" ? "Expires" : "Expired"} {s.expiresAt}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Filter tabs ────────────────────────────────────────────────────────────
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
        const count = counts[t.key] ?? 0;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              padding: "6px 14px",
              borderRadius: "50px",
              border: `1px solid ${isActive ? "#8B5CF6" : "#2A2A3D"}`,
              backgroundColor: isActive ? "#8B5CF6" : "transparent",
              color: isActive ? "#fff" : "#94A3B8",
              fontSize: "12px", fontWeight: 500,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              whiteSpace: "nowrap", flexShrink: 0,
              transition: "all 0.15s",
            }}
          >
            {t.label}{count > 0 ? ` [${count}]` : ""}
          </button>
        );
      })}
    </div>
  );
}