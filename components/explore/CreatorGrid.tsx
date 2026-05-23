"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VideoTile, type VideoTileData } from "@/components/explore/VideoTile";
import { IdentityCard, type IdentityCardData } from "@/components/explore/IdentityCard";
import { VideoFullscreenModal } from "@/components/explore/VideoFullscreenModal";

export type GridItem = VideoTileData | IdentityCardData;

interface CreatorGridProps {
  items: GridItem[];
  onLoadMore: () => void;
  loadingMore: boolean;
  hasMore: boolean;
  followMap?: Record<string, boolean>;
}

// tiles play immediately when sufficiently visible (ratio >= 0.6)

interface FullscreenState {
  data: VideoTileData;
  initialTime: number;
  existingHls?: any;
}

export function CreatorGrid({ items, onLoadMore, loadingMore, hasMore, followMap }: CreatorGridProps) {
  const [fullscreen, setFullscreen] = useState<FullscreenState | null>(null);
  const [isMuted, setIsMuted] = useState(true);
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
  // no dwell timer needed — immediate play
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

  const clearDwellTimer = () => {};

  const startDwell = useCallback((id: number) => {
    if (activeIdRef.current === id) return; // already playing this tile
    clearDwellTimer();
    setActiveId(id);
    activeIdRef.current = id;
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = Number((entry.target as HTMLElement).dataset.videoId);
          if (isNaN(id)) return;
          const ratio = entry.intersectionRatio;
          ratioMap.current.set(id, ratio);

          if (ratio >= 0.6) {
            // tile sufficiently visible — start dwell timer
            startDwell(id);
          } else if (ratio < 0.1 && activeIdRef.current === id) {
            // tile fully left viewport — stop playing
            setActiveId(null);
            activeIdRef.current = null;
          }
        });
      },
      { threshold: [0, 0.1, 0.3, 0.6, 0.8, 1.0] }
    );

    observerRef.current = observer;
    pendingEls.current.forEach((el, id) => {
      el.dataset.videoId = String(id);
      observer.observe(el);
    });
    pendingEls.current.clear();

    return () => {
      clearDwellTimer();
      observer.disconnect();
      observerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDwell]);

  // Dwell system handles all autoplay — no fallback timer needed

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

  // onTouchStart in VideoTile triggers prewarm via the intersection observer prewarm effect
  // follow prefetch happens via followMap from ExplorePage

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
    // keep loading until tap or tile leaves viewport
  }, []);

  const handleOpenFullscreen = useCallback((data: VideoTileData, initialTime: number) => {
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
          setFullscreen({ data, initialTime, existingHls });
        }).catch(() => setFullscreen({ data, initialTime, existingHls }));
      });
    } else {
      setFullscreen({ data, initialTime, existingHls });
    }
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreen(null);
  }, []);

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

      {fullscreen && (
        <VideoFullscreenModal
          data={fullscreen.data}
          initialTime={fullscreen.initialTime}
          existingHls={fullscreen.existingHls}
          isMuted={isMuted}
          onMuteChange={setIsMuted}
          onClose={handleCloseFullscreen}
          initialIsFollowing={followCache.current.get(fullscreen.data.creator_id) ?? false}
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