"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { SubscriptionsHeader } from "@/components/subscription/SubscriptionsHeader";
import { MoreHorizontal, Rows3, LayoutGrid } from "lucide-react";
import dynamic from "next/dynamic";
import { SubscriptionList } from "@/components/subscription/SubscriptionList";
import { SubscriptionFilterTabs } from "@/components/subscription/SubscriptionFilterTabs";
import { SubscriptionSearchBar } from "@/components/subscription/SubscriptionSearchBar";
import { FavouritesRail } from "@/components/subscription/FavouritesRail";
import { SubscriptionsSkeleton } from "@/components/loadscreen/SubscriptionsSkeleton";
import type { CardView, Subscription } from "@/lib/types/subscription";
import type { User } from "@/lib/types/profile";

const CheckoutModal = dynamic(() => import("@/components/checkout/CheckoutModal"), { ssr: false });

type FilterKey = "all" | "active" | "expired" | "attention" | "starred";

function preloadImages(urls: string[]): void {
  for (const url of urls) {
    if (!url) continue;
    const img = new Image();
    img.src = url;
  }
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [revealed,      setRevealed]      = useState(false);
  const [filter,        setFilter]        = useState<FilterKey>("all");
  const [query,         setQuery]         = useState("");
  const [view,          setView]          = useState<CardView>("detailed");

  const [tipOpen,    setTipOpen]    = useState(false);
  const [tipCreator, setTipCreator] = useState<User | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/subscriptions/mine");
      const data = await res.json();
      if (data.subscriptions) {
        setSubscriptions(data.subscriptions);
        const urls: string[] = [];
        for (const s of data.subscriptions.slice(0, 6)) {
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
  }, []);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  const handleTip = useCallback((creatorId: string) => {
    const sub = subscriptions.find((s) => s.creatorId === creatorId);
    if (!sub) return;
    setTipCreator({
      id:           sub.creatorId,
      username:     sub.username,
      display_name: sub.creatorName,
      avatar_url:   sub.avatar_url,
      banner_url:   sub.banner_url,
      is_verified:  sub.isVerified,
    } as unknown as User);
    setTipOpen(true);
  }, [subscriptions]);

  const counts = useMemo(() => ({
    all:       subscriptions.length,
    active:    subscriptions.filter((s) => s.status === "active").length,
    expired:   subscriptions.filter((s) => s.status === "expired").length,
    attention: subscriptions.filter((s) => s.status === "attention").length,
    starred:   subscriptions.filter((s) => s.isFavourite).length,
  }), [subscriptions]);

  const filteredByStatus = useMemo(() => {
    if (filter === "all")     return subscriptions;
    if (filter === "starred") return subscriptions.filter((s) => s.isFavourite);
    return subscriptions.filter((s) => s.status === filter);
  }, [subscriptions, filter]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return filteredByStatus;
    return filteredByStatus.filter((s) =>
      s.creatorName.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q)
    );
  }, [filteredByStatus, query]);

  const favourites = useMemo(
    () => subscriptions.filter((s) => s.isFavourite),
    [subscriptions]
  );

  const handleSearch = useCallback((q: string) => setQuery(q), []);

  return (
    <>
      <style>{`
        .subs-desktop-header { display: flex; }
        @media (max-width: 767px) {
          .subs-desktop-header { display: none !important; }
          .subs-outer { padding-top: 56px; }
        }
      `}</style>

      {tipCreator && (
        <CheckoutModal
          isOpen={tipOpen}
          onClose={() => setTipOpen(false)}
          type="tips"
          creator={tipCreator}
          monthlyPrice={0}
        />
      )}

      {/* Mobile fixed header */}
      <SubscriptionsHeader />

      <div
        className="subs-outer"
        style={{
          width: "100%", height: "100vh",
          backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif",
          display: "flex", flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {/* Desktop header */}
        <div
          className="subs-desktop-header"
          style={{
            alignItems: "center", justifyContent: "space-between",
            padding: "0 18px", height: "56px", flexShrink: 0,
            backgroundColor: "#13131F", borderBottom: "1px solid #1F1F2A",
          }}
        >
          <span style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px", fontFamily: "'Inter', sans-serif" }}>
            Subscriptions
          </span>
          <button aria-label="More" style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", padding: "8px", borderRadius: "8px" }}>
            <MoreHorizontal size={22} strokeWidth={1.8} />
          </button>
        </div>

        {/* Filter pills */}
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid #1E1E2E",
          backgroundColor: "#0D0D1A", flexShrink: 0,
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <p style={{
            fontSize: "11px", fontWeight: 600, color: "#4A4A6A",
            letterSpacing: "0.06em", textTransform: "uppercase",
            fontFamily: "'Inter', sans-serif", margin: "0 0 10px",
          }}>
            MANAGE YOUR CREATORS
          </p>
          <SubscriptionFilterTabs
            active={filter}
            counts={counts}
            onChange={(v) => setFilter(v as FilterKey)}
          />
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" as any, minHeight: 0 }}>

          {/* Search bar */}
          <div style={{ marginTop: "14px" }}>
            <SubscriptionSearchBar onSearch={handleSearch} />
          </div>

          {/* Favourites rail */}
          {filter === "all" && favourites.length > 0 && !query && (
            <div style={{ marginTop: "18px" }}>
              <FavouritesRail favourites={favourites} />
            </div>
          )}

          {/* View toggle */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 18px 12px",
          }}>
            <span style={{ fontSize: "16px", color: "#A3A3C2", fontWeight: 600 }}>
              {filtered.length} {filtered.length === 1 ? "creator" : "creators"}
            </span>
            <div style={{
              display: "flex", gap: "2px",
              backgroundColor: "#1A1A2A", border: "1px solid #2A2A3D",
              borderRadius: "10px", padding: "3px",
            }}>
              <button
                onClick={() => setView("detailed")}
                aria-label="1 per row"
                style={{
                  width: "30px", height: "26px", borderRadius: "7px",
                  border: "none", cursor: "pointer",
                  backgroundColor: view === "detailed" ? "#8B5CF6" : "transparent",
                  color:           view === "detailed" ? "#fff"    : "#6B6B8A",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                <Rows3 size={13} strokeWidth={2} />
              </button>
              <button
                onClick={() => setView("compact")}
                aria-label="2 per row"
                style={{
                  width: "30px", height: "26px", borderRadius: "7px",
                  border: "none", cursor: "pointer",
                  backgroundColor: view === "compact" ? "#8B5CF6" : "transparent",
                  color:           view === "compact" ? "#fff"    : "#6B6B8A",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                <LayoutGrid size={13} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Grid / list */}
          <div style={{ padding: "0 18px 28px" }}>
            {loading ? (
              <SubscriptionsSkeleton count={6} />
            ) : (
              <div style={{ opacity: revealed ? 1 : 0, transition: "opacity 0.35s ease" }}>
                <SubscriptionList
                  subscriptions={filtered}
                  view={view}
                  onRefresh={fetchSubscriptions}
                  onTip={handleTip}
                />
              </div>
            )}
          </div>

        </div>{/* end scrollable */}
      </div>
    </>
  );
}