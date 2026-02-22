"use client";

import { useState } from "react";
import { SubscriptionCard } from "@/components/subscription/SubscriptionCard";
import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";

type FilterTab = "all" | "active" | "expired" | "attention";
type ContentTab = "following" | "posts";

const SAMPLE_SUBSCRIPTIONS = [
  {
    id: "1",
    creatorName: "Elena Rodriguez",
    username: "elenacreates",
    avatar_url: "https://i.pravatar.cc/150?img=47",
    coverImage: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80",
    isVerified: true,
    status: "active" as const,
    newPosts: 4,
    expiresAt: "Mar 15, 2026",
    price: 2000,
    autoRenew: true,
  },
  {
    id: "2",
    creatorName: "Marcus Johnson",
    username: "marcusj",
    avatar_url: "https://i.pravatar.cc/150?img=11",
    coverImage: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80",
    isVerified: false,
    status: "expired" as const,
    newPosts: 0,
    expiresAt: "Feb 18, 2026",
    price: 2000,
    autoRenew: false,
  },
  {
    id: "3",
    creatorName: "Aisha Patel",
    username: "aishacreates",
    avatar_url: "https://i.pravatar.cc/150?img=45",
    coverImage: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&q=80",
    isVerified: true,
    status: "active" as const,
    newPosts: 2,
    expiresAt: "Mar 20, 2026",
    price: 1500,
    autoRenew: true,
  },
  {
    id: "4",
    creatorName: "Daniel Kim",
    username: "danielk",
    avatar_url: "https://i.pravatar.cc/150?img=13",
    coverImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80",
    isVerified: false,
    status: "attention" as const,
    newPosts: 7,
    expiresAt: "Feb 22, 2026",
    price: 3000,
    autoRenew: false,
  },
];

export default function SubscriptionsPage() {
  const [contentTab, setContentTab] = useState<ContentTab>("following");
  const [filterTab,  setFilterTab]  = useState<FilterTab>("all");

  const filterCounts = {
    all:       SAMPLE_SUBSCRIPTIONS.length,
    active:    SAMPLE_SUBSCRIPTIONS.filter((s) => s.status === "active").length,
    expired:   SAMPLE_SUBSCRIPTIONS.filter((s) => s.status === "expired").length,
    attention: SAMPLE_SUBSCRIPTIONS.filter((s) => s.status === "attention").length,
  };

  const filtered = SAMPLE_SUBSCRIPTIONS.filter((s) => {
    if (filterTab === "all")       return true;
    if (filterTab === "active")    return s.status === "active";
    if (filterTab === "expired")   return s.status === "expired";
    if (filterTab === "attention") return s.status === "attention";
    return true;
  });

  const FILTER_LABELS: { key: FilterTab; label: string }[] = [
    { key: "all",       label: `All [${filterCounts.all}]`                      },
    { key: "active",    label: `Active [${filterCounts.active}]`                },
    { key: "expired",   label: `Expired [${filterCounts.expired}]`              },
    { key: "attention", label: `Attention required [${filterCounts.attention}]` },
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

        {/* Content Tabs + icons on same row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex" }}>
            {(["following", "posts"] as ContentTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setContentTab(tab)}
                style={{
                  padding: "8px 16px", background: "none", border: "none",
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  fontSize: "14px", fontWeight: contentTab === tab ? 600 : 400,
                  color: contentTab === tab ? "#F1F5F9" : "#6B6B8A",
                  borderBottom: contentTab === tab ? "2px solid #8B5CF6" : "2px solid transparent",
                  marginBottom: "-1px", transition: "all 0.15s ease",
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "6px", flexShrink: 0, marginBottom: "4px" }}>
            {[Search, SlidersHorizontal, ArrowUpDown].map((Icon, i) => (
              <button
                key={i}
                style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  border: "1px solid #2A2A3D", backgroundColor: "transparent",
                  color: "#6B6B8A", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.color = "#8B5CF6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3D"; e.currentTarget.style.color = "#6B6B8A"; }}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 28px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "8px", flex: 1, overflowX: "auto", scrollbarWidth: "none" }}>
          {FILTER_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterTab(key)}
              style={{
                padding: "5px 12px", borderRadius: "20px", fontSize: "12px",
                fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif",
                border: `1px solid ${filterTab === key ? "#8B5CF6" : "#2A2A3D"}`,
                backgroundColor: filterTab === key ? "#8B5CF6" : "transparent",
                color: filterTab === key ? "#fff" : "#94A3B8",
                transition: "all 0.15s ease", whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              {label}
            </button>
          ))}
        </div>


      </div>

      {/* Grid */}
      <div style={{ padding: "0 28px 28px" }}>
        <style>{`
          .subs-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
          }
          @media (min-width: 640px) {
            .subs-grid { grid-template-columns: 1fr 1fr; }
          }
        `}</style>
        <div className="subs-grid">
          {filtered.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} />
          ))}
        </div>
      </div>
    </div>
  );
}