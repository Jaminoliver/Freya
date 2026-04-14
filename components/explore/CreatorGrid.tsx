"use client";

import { useEffect, useRef } from "react";
// VideoTile and IdentityCard are added in batch 2
import { VideoTile, type VideoTileData } from "@/components/explore/VideoTile";
import { IdentityCard, type IdentityCardData } from "@/components/explore/IdentityCard";

export type GridItem = VideoTileData | IdentityCardData;

interface CreatorGridProps {
  items: GridItem[];
  onLoadMore: () => void;
  loadingMore: boolean;
  hasMore: boolean;
}

export function CreatorGrid({
  items,
  onLoadMore,
  loadingMore,
  hasMore,
}: CreatorGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll — trigger when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  if (!items.length) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 0",
          color: "#6B6B8A",
          fontSize: "14px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        No creators found.
      </div>
    );
  }

  return (
    <>
      {/* 2-column masonry grid — alignItems: start gives the natural height difference */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          alignItems: "start",
        }}
      >
        {items.map((item) =>
          item.type === "video" ? (
            <VideoTile key={`video-${item.post_id}`} data={item} />
          ) : (
            <IdentityCard key={`identity-${item.creator_id}`} data={item} />
          )
        )}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: "1px", marginTop: "8px" }} />

      {/* Loading more skeletons */}
      {loadingMore && (
        <>
          <style>{`
            @keyframes gridPulse {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.35; }
            }
          `}</style>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginTop: "8px",
              alignItems: "start",
            }}
          >
            {[320, 200, 200, 320].map((h, i) => (
              <div
                key={i}
                style={{
                  height: `${h}px`,
                  borderRadius: "12px",
                  backgroundColor: "#1A1A2E",
                  animation: `gridPulse 1.5s ease-in-out ${i * 0.1}s infinite`,
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* End of feed message */}
      {!hasMore && items.length > 0 && (
        <p
          style={{
            textAlign: "center",
            color: "#4A4A6A",
            fontSize: "12px",
            fontFamily: "'Inter', sans-serif",
            padding: "24px 0 40px",
          }}
        >
          You've seen everything · Check back later
        </p>
      )}
    </>
  );
}