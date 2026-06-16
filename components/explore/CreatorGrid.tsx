"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VideoTile, type VideoTileData } from "@/components/explore/VideoTile";
import { IdentityCard, type IdentityCardData } from "@/components/explore/IdentityCard";
import VideoFeedPager from "@/components/shared/VideoFeedPager";

export type GridItem = VideoTileData | IdentityCardData;

interface CreatorGridProps {
  items: GridItem[];
  onLoadMore: () => void;
  loadingMore: boolean;
  hasMore: boolean;
  followMap?: Record<string, boolean>;
}

interface FullscreenState {
  index: number;        // index into the video-only list
  initialTime: number;
  existingHls?: any;
  enterFrom?: "none" | "bottom" | "top";
}

export function CreatorGrid({ items, onLoadMore, loadingMore, hasMore, followMap }: CreatorGridProps) {
  const [fullscreen, setFullscreen] = useState<FullscreenState | null>(null);
  // Video-only list for the swipeable fullscreen feed (skips identity cards).
  const videoItems = (items.filter((i) => i.type === "video") as VideoTileData[]);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    // Share the app-wide mute preference (same key the feed uses) so explore
    // doesn't reset to muted every visit. Default muted only if never set.
    if (typeof window === "undefined") return true;
    try {
      const v = localStorage.getItem("vp_muted");
      return v === null ? true : v === "true";
    } catch { return true; }
  });
  const followCache = useRef<Map<string, boolean>>(new Map());
  useEffect(() => {
    if (!followMap) return;
    Object.entries(followMap).forEach(([id, val]) => followCache.current.set(id, val));
  }, [followMap]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ratioMap = useRef<Map<number, number>>(new Map());
  const indexMap = useRef<Map<number, number>>(new Map());
  const pendingEls = useRef<Map<number, HTMLDivElement>>(new Map());

  const [activeId, setActiveId] = useState<number | null>(null);
  const activeIdRef = useRef<number | null>(null);
  const prewarmMap = useRef<Map<number, { hls: any; video: HTMLVideoElement }>>(new Map());

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
  // Active tile = the video tile whose center is closest to the viewport
  // center, updated live (including during scroll). Snapchat-style: exactly one
  // tile plays, it's always the most-centered one, and scrolling up re-activates
  // a tile you passed. No scroll-stop gating, no phase machine.
  const selectDominantTile = useCallback(() => {
    const viewportCenter = window.innerHeight / 2;
    let bestId: number | null = null;
    let minDist = Infinity;
    let anyVisible = false;

    ratioMap.current.forEach((ratio, id) => {
      if (ratio <= 0.1) return;
      anyVisible = true;
      const el = document.querySelector<HTMLElement>(`[data-video-id="${id}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const tileCenter = rect.top + rect.height / 2;
      const dist = Math.abs(tileCenter - viewportCenter);
      if (dist < minDist) { minDist = dist; bestId = id; }
    });

    if (!anyVisible) {
      if (activeIdRef.current !== null) {
        setActiveId(null);
        activeIdRef.current = null;
      }
      return;
    }

    if (bestId !== null && bestId !== activeIdRef.current) {
      console.log("[TILE-DBG] activeId change", { from: activeIdRef.current, to: bestId, minDist: Math.round(minDist), visibleCount: [...ratioMap.current.values()].filter((r) => r > 0.1).length });
      setActiveId(bestId);
      activeIdRef.current = bestId;
    }
  }, []);

  // ── Scroll detection ─────────────────────────────────────────────────────
  // Update the active tile live during scroll (rAF-throttled) so the centered
  // tile always plays and scrolling up re-activates passed tiles immediately.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        selectDominantTile();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [selectDominantTile]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // 1. Update ratioMap with latest values
        entries.forEach((entry) => {
          const id = Number((entry.target as HTMLElement).dataset.videoId);
          if (isNaN(id)) return;
          ratioMap.current.set(id, entry.intersectionRatio);
        });

        console.log("[Grid] observer fired", {
          entryCount: entries.length,
          ratios: entries.map((e) => ({
            id: (e.target as HTMLElement).dataset.videoId,
            r: e.intersectionRatio.toFixed(2),
          })),
          t: performance.now().toFixed(1),
        });

        // 2. Pick the single dominant tile across ALL tracked tiles
        selectDominantTile();
      },
      {
        // Shrink trigger zone to centre 40% of viewport — tiles above/below
        // the eye-line won't win even if they're partially visible.
        rootMargin: "-15% 0px -15% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
      }
    );

    observerRef.current = observer;
    pendingEls.current.forEach((el, id) => {
      el.dataset.videoId = String(id);
      observer.observe(el);
    });
    pendingEls.current.clear();

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [selectDominantTile]);

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

  const destroyPrewarm = useCallback((id: number) => {
    const entry = prewarmMap.current.get(id);
    if (!entry) return;
    try { entry.hls.destroy(); } catch {}
    try { entry.video.remove(); } catch {}
    prewarmMap.current.delete(id);
  }, []);

  const prewarmHls = useCallback(async (id: number, bunnyVideoId: string | null) => {
    if (!bunnyVideoId || prewarmMap.current.has(id)) return;
    const Hls = (await import("hls.js")).default;
    if (!Hls.isSupported()) return;
    // Cap concurrent prewarmed instances. Without this, scrolling a long grid
    // accumulates dozens of hidden HLS instances that starve each other's
    // bandwidth (the same problem we fixed in the feed). Keep the most recent
    // few — the tile you tap is almost always among them — and evict the oldest.
    const MAX_PREWARM = 6;
    while (prewarmMap.current.size >= MAX_PREWARM) {
      const oldestId = prewarmMap.current.keys().next().value;
      if (oldestId === undefined) break;
      destroyPrewarm(oldestId);
    }
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(video);
    const hls = new Hls({ autoStartLoad: true, maxBufferLength: 8, startLevel: 0 });
    const cdn = process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net";
    hls.loadSource(`https://${cdn}/${bunnyVideoId}/playlist.m3u8`);
    hls.attachMedia(video);
    prewarmMap.current.set(id, { hls, video });
  }, [destroyPrewarm]);

  const handleOpenFullscreen = useCallback((data: VideoTileData, initialTime: number) => {
    const idx = videoItems.findIndex((v) => v.post_id === data.post_id);
    const prewarm = prewarmMap.current.get(data.post_id);
    const existingHls = prewarm?.hls ?? undefined;
    if (prewarm) {
      try { prewarm.video.pause(); } catch {}
      prewarmMap.current.delete(data.post_id);
    }
    if (data.creator_id && !followCache.current.has(data.creator_id)) {
      import("@/lib/utils/follow").then(({ checkIsFollowing }) => {
        checkIsFollowing(data.creator_id).then((val) => {
          followCache.current.set(data.creator_id, !!val);
          setFullscreen({ index: idx, initialTime, existingHls });
        }).catch(() => setFullscreen({ index: idx, initialTime, existingHls }));
      });
    } else {
      setFullscreen({ index: idx, initialTime, existingHls });
    }
  }, [videoItems]);

  const goToVideo = useCallback((nextIndex: number) => {
    setFullscreen((fs) => {
      if (!fs) return fs;
      if (nextIndex < 0 || nextIndex >= videoItems.length) return fs;
      // Prefetch-ahead: load more when within 3 of the end.
      if (nextIndex >= videoItems.length - 3 && hasMore && !loadingMore) onLoadMore();
      // Reuse a prewarmed instance for the destination video if we have one.
      const dest = videoItems[nextIndex];
      const warm = dest ? prewarmMap.current.get(dest.post_id) : undefined;
      if (warm) prewarmMap.current.delete(dest.post_id);
      const enterFrom = nextIndex > fs.index ? "bottom" : "top";
      return { index: nextIndex, initialTime: 0, existingHls: warm?.hls, enterFrom };
    });
  }, [videoItems, hasMore, loadingMore, onLoadMore]);

  // Next-video prewarm: whenever the open index changes, warm index+1 so the
  // upcoming swipe/arrow plays instantly.
  useEffect(() => {
    if (!fullscreen) return;
    const next = videoItems[fullscreen.index + 1];
    if (next?.bunny_video_id && !prewarmMap.current.has(next.post_id)) {
      prewarmHls(next.post_id, next.bunny_video_id);
    }
  }, [fullscreen, videoItems, prewarmHls]);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreen(null);
  }, []);

  // Prewarm HLS for tiles entering viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = Number((entry.target as HTMLElement).dataset.videoId);
          if (isNaN(id)) return;
          const item = items.find((i): i is VideoTileData => i.type === "video" && i.post_id === id);
          if (item) prewarmHls(id, item.bunny_video_id);
        });
      },
      { threshold: 0.3 }
    );

    document.querySelectorAll<HTMLElement>("[data-video-id]").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [items, prewarmHls]);

  useEffect(() => {
    return () => { prewarmMap.current.forEach((_, id) => destroyPrewarm(id)); };
  }, [destroyPrewarm]);

  // Infinite scroll sentinel
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
              isActive={activeId === item.post_id}
              isModalOpen={!!fullscreen}
              onTileRef={handleTileRef}
              onOpenFullscreen={handleOpenFullscreen}
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

      {fullscreen && videoItems[fullscreen.index] && (
        <VideoFeedPager
          items={videoItems}
          startIndex={fullscreen.index}
          initialTime={fullscreen.initialTime}
          existingHls={fullscreen.existingHls}
          isMuted={isMuted}
          onMuteChange={(m) => { setIsMuted(m); try { localStorage.setItem("vp_muted", String(m)); } catch {} }}
          onClose={handleCloseFullscreen}
          onLoadMore={() => { if (hasMore && !loadingMore) onLoadMore(); }}
          followCacheGet={(creatorId) => followCache.current.get(creatorId) ?? false}
          onFollowChange={(creatorId, val) => followCache.current.set(creatorId, val)}
        />
      )}

      {!hasMore && items.length > 0 && (
        <p style={{ textAlign: "center", color: "#4A4A6A", fontSize: "12px", fontFamily: "'Inter', sans-serif", padding: "24px 0 40px" }}>
          You've seen everything · Check back later
        </p>
      )}
    </>
  );
}