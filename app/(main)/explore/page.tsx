"use client";

import { useState, useEffect, useCallback } from "react";
import { CreatorGrid, type GridItem } from "@/components/explore/CreatorGrid";
import { FeaturedStrip } from "@/components/explore/FeaturedStrip";
import type { StripCreator } from "@/components/explore/CreatorCard";
import { ExploreSkeleton } from "@/components/loadscreen/ExploreSkeleton";


type SortOption = "most_liked" | "newest" | "most_subscribed";

const SORT_LABELS: Record<SortOption, string> = {
  most_liked:       "Most Liked",
  newest:           "Newest",
  most_subscribed:  "Most Subscribed",
};

const SORT_TO_FILTER: Record<SortOption, string> = {
  most_liked:      "toprated",
  newest:          "new",
  most_subscribed: "most_subscribed",
};

export default function ExplorePage() {
  const [stripCreators, setStripCreators] = useState<StripCreator[]>([]);
  const [gridItems, setGridItems]         = useState<GridItem[]>([]);
  const [cursor, setCursor]               = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [hasMore, setHasMore]             = useState(true);
  const [sort, setSort]                   = useState<SortOption>("most_liked");
  const [dropdownOpen, setDropdownOpen]   = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setGridItems([]);
      setCursor(null);
      setHasMore(true);
      setDropdownOpen(false);

      try {
        const filter = SORT_TO_FILTER[sort];
        const res    = await fetch(`/api/discover?filter=${filter}`);
        const data   = await res.json();
        if (cancelled) return;

        setStripCreators(data.strip  ?? []);
        setGridItems(data.grid       ?? []);
        setCursor(data.nextCursor    ?? null);
        setHasMore(!!data.nextCursor);
      } catch (err) {
        console.error("[ExplorePage] fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [sort]);

  // ── Load more ──────────────────────────────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);

    try {
      const filter = SORT_TO_FILTER[sort];
      const res    = await fetch(`/api/discover?filter=${filter}&cursor=${cursor}`);
      const data   = await res.json();

      setGridItems((prev) => [...prev, ...(data.grid ?? [])]);
      setCursor(data.nextCursor ?? null);
      setHasMore(!!data.nextCursor);
    } catch (err) {
      console.error("[ExplorePage] loadMore error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, cursor, sort]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        maxWidth: "100%",
        fontFamily: "'Inter', sans-serif",
        backgroundColor: "#0A0A0F",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @keyframes skelPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
        .sort-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          background: #1A1A2E;
          border: 1px solid #2A2A3D;
          border-radius: 8px;
          overflow: hidden;
          z-index: 50;
          min-width: 150px;
        }
        .sort-option {
          padding: 10px 14px;
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          color: rgba(255,255,255,0.75);
          cursor: pointer;
          transition: background 0.1s ease;
        }
        .sort-option:hover {
          background: #2A2A3D;
          color: #fff;
        }
        .sort-option.active {
          color: #8B5CF6;
          font-weight: 600;
        }
      `}</style>

      <div style={{ padding: "16px 12px 80px" }}>

        {/* Featured strip */}
        {!loading && stripCreators.length > 0 && (
          <FeaturedStrip creators={stripCreators} />
        )}

        {/* Discover header + Sort by */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
          position: "relative",
        }}>
          <span style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#FFFFFF",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.3px",
          }}>
            Discover
          </span>

          {/* Sort by */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                background: "#1A1A2E",
                border: "1px solid #2A2A3D",
                borderRadius: "8px",
                padding: "6px 10px",
                cursor: "pointer",
                color: "rgba(255,255,255,0.75)",
                fontSize: "12px",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
              }}
            >
              {SORT_LABELS[sort]}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {dropdownOpen && (
              <div className="sort-dropdown">
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <div
                    key={key}
                    className={`sort-option${sort === key ? " active" : ""}`}
                    onClick={() => setSort(key)}
                  >
                    {SORT_LABELS[key]}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
  <ExploreSkeleton gridCount={8} />
) : (
          <CreatorGrid
            items={gridItems}
            onLoadMore={handleLoadMore}
            loadingMore={loadingMore}
            hasMore={hasMore}
          />
        )}
      </div>
    </div>
  );
}