"use client";

import { useState, useEffect } from "react";
import { SubscriptionList } from "@/components/subscription/SubscriptionCard";
import { SubscriptionsSkeleton } from "@/components/loadscreen/SubscriptionsSkeleton";
import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { useAppStore, isStale } from "@/lib/store/appStore";

type ContentTab = "following" | "posts";

const CACHE_KEY = "__subscriptions__";

function preloadImages(urls: string[]): void {
  for (const url of urls) {
    if (!url) continue;
    const img = new Image();
    img.src = url;
  }
}

export default function SubscriptionsPage() {
  const [contentTab, setContentTab] = useState<ContentTab>("following");

  const { contentFeeds, setContentFeed } = useAppStore();
  const cached = contentFeeds[CACHE_KEY];
  const fresh  = cached && !isStale(cached.fetchedAt);

  const [subscriptions, setSubscriptions] = useState<any[]>(
    fresh ? cached.posts : []
  );
  const [loading,  setLoading]  = useState(!fresh);
  const [revealed, setRevealed] = useState(fresh ?? false);

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

        // Preload images AFTER render — fire and forget, doesn't block UI
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

        {/* Content Tabs */}
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
      </div>

      {/* Icons row */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", padding: "14px 28px" }}>
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

      {/* Content */}
      <div style={{ padding: "0 28px 28px" }}>
        {contentTab === "following" && (
          loading
            ? <SubscriptionsSkeleton count={6} />
            : (
              <div style={{ opacity: revealed ? 1 : 0, transition: "opacity 0.35s ease" }}>
                <SubscriptionList
                  subscriptions={subscriptions}
                  onRefresh={() => fetchSubscriptions(true)}
                />
              </div>
            )
        )}
        {contentTab === "posts" && (
          <div style={{ backgroundColor: "#1C1C2E", border: "1.5px dashed #2A2A3D", borderRadius: "10px", padding: "32px 16px", textAlign: "center" }}>
            <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0 }}>Posts feed coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}