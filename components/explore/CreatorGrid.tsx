"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VideoTile, type VideoTileData } from "@/components/explore/VideoTile";
import { IdentityCard, type IdentityCardData } from "@/components/explore/IdentityCard";
import { VideoFullscreenModal } from "@/components/shared/VideoFullscreenModal";

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
  // 0 = scroll-triggered (initial), 1 = advanced to adjacent, 2 = done (nothing plays)
  const autoAdvancePhaseRef = useRef<number>(0);
  const isScrollingRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // After every intersection update, scan ALL ratios and play only the
  // single tile that is most visible. When two tiles share the same ratio
  // (e.g. both tiles in the same row), tie-break by whichever tile's center
  // is closest to the vertical center of the viewport.
  const selectDominantTile = useCallback(() => {
    // ── Scroll guard ─────────────────────────────────────────────────────────
    // During active scroll: only clear the current tile if it left the viewport.
    // Never start a new tile mid-scroll — wait until scroll stops.
    if (isScrollingRef.current) {
      if (activeIdRef.current !== null) {
        const currentRatio = ratioMap.current.get(activeIdRef.current) ?? 0;
        if (currentRatio < 0.1) {
          console.log("[Grid] scroll active — current tile left viewport, clearing", { id: activeIdRef.current });
          setActiveId(null);
          activeIdRef.current = null;
        }
        // else: tile still visible, let it keep playing
      }
      return;
    }

    const visible = [...ratioMap.current.entries()].filter(([, r]) => r > 0.3);

    if (!visible.length) {
      if (activeIdRef.current !== null) {
        console.log("[Grid] selectDominant → no visible tiles, clearing activeId");
        setActiveId(null);
        activeIdRef.current = null;
      }
      return;
    }

    const maxRatio = Math.max(...visible.map(([, r]) => r));
    const candidates = visible.filter(([, r]) => maxRatio - r < 0.05);

    let bestId: number = candidates[0][0];

    if (candidates.length > 1) {
      // Tie-break: tile whose center Y is closest to viewport center
      const viewportCenter = window.innerHeight / 2;
      let minDist = Infinity;

      candidates.forEach(([id]) => {
        const el = document.querySelector<HTMLElement>(`[data-video-id="${id}"]`);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const tileCenter = rect.top + rect.height / 2;
        const dist = Math.abs(tileCenter - viewportCenter);
        if (dist < minDist) {
          minDist = dist;
          bestId = id;
        }
      });

      console.log("[Grid] selectDominant → TIE", {
        candidates: candidates.map(([id, r]) => ({ id, r: r.toFixed(2) })),
        winner: bestId,
        viewportCenter: window.innerHeight / 2,
      });
    }

    if (bestId !== activeIdRef.current) {
      console.log("[Grid] selectDominant → activeId", {
        from: activeIdRef.current,
        to: bestId,
        maxRatio: maxRatio.toFixed(2),
        visibleCount: visible.length,
        phase: autoAdvancePhaseRef.current,
        t: performance.now().toFixed(1),
      });
      setActiveId(bestId);
      activeIdRef.current = bestId;
      autoAdvancePhaseRef.current = 0; // user scrolled — reset sequence
    }
  }, []);

  // ── Scroll detection ─────────────────────────────────────────────────────
  // Block new tile activation during scroll. 150ms after scroll stops,
  // run selectDominantTile once to pick the tile the user settled on.
  useEffect(() => {
    const onScroll = () => {
      isScrollingRef.current = true;
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        console.log("[Grid] scroll stopped — selecting dominant tile");
        selectDominantTile();
      }, 150);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [selectDominantTile]);

  // ── Auto-advance to adjacent tile after 5s preview ──────────────────────
  // Phase 0 (scroll-triggered): tile 1 ends → play adjacent tile, enter phase 1
  // Phase 1 (adjacent playing): tile 2 ends → clear activeId, enter phase 2 (done)
  // Phase 2: nothing plays until user scrolls again (selectDominantTile resets to 0)
  const handlePreviewEnd = useCallback((postId: number) => {
    console.log("[Grid] handlePreviewEnd", {
      postId,
      activeId: activeIdRef.current,
      phase: autoAdvancePhaseRef.current,
      t: performance.now().toFixed(1),
    });

    // Race condition guard: ignore if this tile is no longer the active one
    // (user scrolled away while tile was playing)
    if (postId !== activeIdRef.current) {
      console.log("[Grid] handlePreviewEnd IGNORED — postId no longer active (scroll race)");
      return;
    }

    if (autoAdvancePhaseRef.current === 0) {
      const currentIdx = indexMap.current.get(postId);
      if (currentIdx === undefined) {
        setActiveId(null);
        activeIdRef.current = null;
        autoAdvancePhaseRef.current = 2;
        return;
      }
      const adjacentIdx = currentIdx % 2 === 0 ? currentIdx + 1 : currentIdx - 1;
      let adjacentPostId: number | null = null;
      indexMap.current.forEach((idx, pid) => {
        if (idx === adjacentIdx) adjacentPostId = pid;
      });
      console.log("[Grid] handlePreviewEnd → advancing to adjacent", { currentIdx, adjacentIdx, adjacentPostId });
      if (adjacentPostId !== null) {
        setActiveId(adjacentPostId);
        activeIdRef.current = adjacentPostId;
        autoAdvancePhaseRef.current = 1;
      } else {
        setActiveId(null);
        activeIdRef.current = null;
        autoAdvancePhaseRef.current = 2;
      }
    } else if (autoAdvancePhaseRef.current === 1) {
      console.log("[Grid] handlePreviewEnd → both tiles done, clearing");
      setActiveId(null);
      activeIdRef.current = null;
      autoAdvancePhaseRef.current = 2;
    }
  }, []);

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
              onPreviewEnd={handlePreviewEnd}
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
        <VideoFullscreenModal
          key={videoItems[fullscreen.index].post_id}
          data={videoItems[fullscreen.index]}
          initialTime={fullscreen.initialTime}
          existingHls={fullscreen.existingHls}
          isMuted={isMuted}
          onMuteChange={(m) => { setIsMuted(m); try { localStorage.setItem("vp_muted", String(m)); } catch {} }}
          onClose={handleCloseFullscreen}
          initialIsFollowing={followCache.current.get(videoItems[fullscreen.index].creator_id) ?? false}
          onFollowChange={(creatorId, val) => followCache.current.set(creatorId, val)}
          onNext={() => goToVideo(fullscreen.index + 1)}
          onPrev={() => goToVideo(fullscreen.index - 1)}
          hasNext={fullscreen.index < videoItems.length - 1}
          hasPrev={fullscreen.index > 0}
          enterFrom={fullscreen.enterFrom ?? "none"}
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