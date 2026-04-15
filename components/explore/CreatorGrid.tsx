"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VideoTile, type VideoTileData } from "@/components/explore/VideoTile";
import { IdentityCard, type IdentityCardData } from "@/components/explore/IdentityCard";

export type GridItem = VideoTileData | IdentityCardData;

interface CreatorGridProps {
  items: GridItem[];
  onLoadMore: () => void;
  loadingMore: boolean;
  hasMore: boolean;
}

const PLAY_DURATION = 5000;

export function CreatorGrid({ items, onLoadMore, loadingMore, hasMore }: CreatorGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ratioMap = useRef<Map<number, number>>(new Map());
  const indexMap = useRef<Map<number, number>>(new Map());
  const pendingEls = useRef<Map<number, HTMLDivElement>>(new Map());

  const [autoPlayId, setAutoPlayId] = useState<number | null>(null);
  const [userHoverId, setUserHoverId] = useState<number | null>(null);
  const userHoverRef = useRef<number | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPairRef = useRef<string>("");

  useEffect(() => {
    indexMap.current.clear();
    let videoIdx = 0;
    items.forEach((item) => {
      if (item.type === "video") {
        indexMap.current.set(item.post_id, videoIdx);
        videoIdx++;
      }
    });
  }, [items]);

  const isLeftColumn = (postId: number) => (indexMap.current.get(postId) ?? 0) % 2 === 0;

  const clearAutoTimer = () => {
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
  };

  const getBestPair = (): { left: number | null; right: number | null } => {
    let bestLeft: number | null = null, bestLeftRatio = 0.1;
    let bestRight: number | null = null, bestRightRatio = 0.1;

    ratioMap.current.forEach((ratio, id) => {
      if (isLeftColumn(id)) {
        if (ratio > bestLeftRatio) { bestLeftRatio = ratio; bestLeft = id; }
      } else {
        if (ratio > bestRightRatio) { bestRightRatio = ratio; bestRight = id; }
      }
    });

    return { left: bestLeft, right: bestRight };
  };

  const runAutoPlay = useCallback((left: number | null, right: number | null) => {
    clearAutoTimer();
    setAutoPlayId(null);
    if (!left && !right) return;

    const first = left ?? right;
    const second = left && right ? right : null;

    setAutoPlayId(first);
    autoTimerRef.current = setTimeout(() => {
      setAutoPlayId(null);
      if (second) {
        autoTimerRef.current = setTimeout(() => {
          setAutoPlayId(second);
          autoTimerRef.current = setTimeout(() => setAutoPlayId(null), PLAY_DURATION);
        }, 100);
      }
    }, PLAY_DURATION);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = Number((entry.target as HTMLElement).dataset.videoId);
          if (!isNaN(id)) ratioMap.current.set(id, entry.intersectionRatio);
        });

        if (userHoverRef.current !== null) return;
        const { left, right } = getBestPair();
        const pairKey = `${left}-${right}`;
        if (pairKey !== lastPairRef.current) {
          lastPairRef.current = pairKey;
          runAutoPlay(left, right);
        }
      },
      { threshold: Array.from({ length: 11 }, (_, i) => i / 10) }
    );

    observerRef.current = observer;
    pendingEls.current.forEach((el, id) => {
      el.dataset.videoId = String(id);
      observer.observe(el);
    });
    pendingEls.current.clear();

    const initTimer = setTimeout(() => {
      const { left, right } = getBestPair();
      const pairKey = `${left}-${right}`;
      if ((left || right) && pairKey !== lastPairRef.current) {
        lastPairRef.current = pairKey;
        runAutoPlay(left, right);
      }
    }, 500);

    return () => {
      clearTimeout(initTimer);
      clearAutoTimer();
      observer.disconnect();
      observerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runAutoPlay]);

  // Re-trigger autoplay when items load (fixes hard refresh)
  useEffect(() => {
    if (!items.length) return;
    const timer = setTimeout(() => {
      if (userHoverRef.current !== null) return;
      if (autoPlayId !== null) return;
      const { left, right } = getBestPair();
      if (left || right) {
        lastPairRef.current = `${left}-${right}`;
        runAutoPlay(left, right);
      }
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const handleTileRef = useCallback((id: number, el: HTMLDivElement | null) => {
    if (!el) { ratioMap.current.delete(id); return; }
    el.dataset.videoId = String(id);
    if (observerRef.current) {
      observerRef.current.observe(el);
      ratioMap.current.set(id, 0);
    } else {
      pendingEls.current.set(id, el);
    }
  }, []);

  const handleUserInteract = useCallback((id: number) => {
    clearAutoTimer();
    setAutoPlayId(null);
    lastPairRef.current = "";

    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    userHoverRef.current = id;
    setUserHoverId(id);
    hoverTimerRef.current = setTimeout(() => {
      userHoverRef.current = null;
      setUserHoverId(null);
    }, PLAY_DURATION);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) onLoadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  if (!items.length) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#6B6B8A", fontSize: "14px", fontFamily: "'Inter', sans-serif" }}>
        No creators found.
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", alignItems: "start" }}>
        {items.map((item) =>
          item.type === "video" ? (
            <VideoTile
              key={`video-${item.post_id}`}
              data={item}
              isActive={autoPlayId === item.post_id || userHoverId === item.post_id}
              onTileRef={handleTileRef}
              onUserInteract={handleUserInteract}
            />
          ) : (
            <IdentityCard key={`identity-${item.creator_id}`} data={item} />
          )
        )}
      </div>

      <div ref={sentinelRef} style={{ height: "1px", marginTop: "8px" }} />

      {loadingMore && (
        <>
          <style>{`@keyframes gridPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px", alignItems: "start" }}>
            {[320, 200, 200, 320].map((h, i) => (
              <div key={i} style={{ height: `${h}px`, borderRadius: "12px", backgroundColor: "#1A1A2E", animation: `gridPulse 1.5s ease-in-out ${i * 0.1}s infinite` }} />
            ))}
          </div>
        </>
      )}

      {!hasMore && items.length > 0 && (
        <p style={{ textAlign: "center", color: "#4A4A6A", fontSize: "12px", fontFamily: "'Inter', sans-serif", padding: "24px 0 40px" }}>
          You've seen everything · Check back later
        </p>
      )}
    </>
  );
}