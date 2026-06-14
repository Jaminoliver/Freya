"use client";

/**
 * useActiveVideo — single feed-level coordinator for autoplay.
 *
 * One scroll/resize listener for the whole feed. Computes which mounted video
 * post is most-centered in the viewport and designates exactly one `activeId`.
 * Also computes a prewarm window (N ahead / 1 behind) and warms the HLS
 * manifest + first low-quality segment for those, so the next video starts
 * instantly without stealing bandwidth from the one that's playing.
 *
 * Replaces the duplicate per-feed preWarm orchestrators that lived in
 * dashboard/page.tsx and ContentFeed.tsx.
 *
 * Usage:
 *   const { activeId, isActive, isInWindow, registerFeed } = useActiveVideo(orderedVideoIds);
 *   <div data-postid={id} data-video="1">…</div>
 *   <PostCard autoPlay={isActive(id)} prewarmLight={isInWindow(id)} />
 *
 * The hook reads DOM position via [data-postid] wrappers, so the feed must
 * render each post inside a wrapper carrying data-postid={id}. Video posts
 * additionally carry data-video="1" so non-video posts are ignored.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoPlayerHandle } from "@/components/video/VideoPlayer";

const BUNNY_PULL_ZONE = "vz-8bc100f4-3c0.b-cdn.net";

// Module-level so warming survives feed remounts and is shared across feeds.
const warmedManifests = new Set<string>();
const warmedSegments  = new Set<string>();

function getNetwork(): { ect: string; downlink: number } {
  const conn = (navigator as any).connection;
  return { ect: conn?.effectiveType ?? "4g", downlink: conn?.downlink ?? 10 };
}

// Light prewarm: fetch manifest + first segment at a low, capped resolution so
// background videos don't compete with the active stream. Goes into the browser
// HTTP cache; hls.js picks it up for free when the player attaches.
function lightWarm(bunnyVideoId: string) {
  if (warmedManifests.has(bunnyVideoId)) return;
  warmedManifests.add(bunnyVideoId);

  const { ect } = getNetwork();

  // Manifest is always cheap — warm it regardless of connection.
  fetch(`https://${BUNNY_PULL_ZONE}/${bunnyVideoId}/playlist.m3u8`, {
    method: "GET", cache: "force-cache",
  }).catch(() => {});

  // Segment prefetch capped low. Skip the segment on the very slowest networks
  // so the active video keeps all available bandwidth.
  if (ect === "slow-2g" || ect === "2g") return;
  if (warmedSegments.has(bunnyVideoId)) return;
  warmedSegments.add(bunnyVideoId);

  const cappedRes = ect === "3g" ? "360p" : "480p";
  fetch(`https://${BUNNY_PULL_ZONE}/${bunnyVideoId}/${cappedRes}/video0.ts`, {
    method: "GET", cache: "force-cache",
  }).catch(() => {});
}

// Find the index (within the ordered video post ids) of the video nearest the
// viewport center line. Used to anchor the prewarm window when a non-video item
// (landscape image / feed suggestion) currently owns the center.
function nearestVideoIndexToCenter(
  items: HTMLElement[],
  order: string[],
  centerY: number,
): number {
  let nearestId: string | null = null;
  let nearestDist = Infinity;
  for (const node of items) {
    if (node.getAttribute("data-video") !== "1") continue;
    const pid = node.getAttribute("data-postid");
    if (!pid) continue;
    const rect = node.getBoundingClientRect();
    const elCenter = rect.top + rect.height / 2;
    const dist = Math.abs(elCenter - centerY);
    if (dist < nearestDist) { nearestDist = dist; nearestId = pid; }
  }
  return nearestId ? order.indexOf(nearestId) : -1;
}

export interface ActiveVideoApi {
  /** The post id of the currently active (should-be-playing) video, or null. */
  activeId: string | null;
  /** True if the given post id is the active video. */
  isActive: (postId: string) => boolean;
  /** True if the given post id is within the prewarm window. */
  isInWindow: (postId: string) => boolean;
  /** Call from the feed container ref so the coordinator can scope its DOM queries. */
  registerFeed: (el: HTMLElement | null) => void;
  /** Register a player's imperative handle so the coordinator can play/pause it directly. */
  registerPlayer: (postId: string, handle: VideoPlayerHandle | null) => void;
}

/**
 * @param orderedVideoPostIds  Post ids that contain a playable video, in feed order.
 *                             Used to compute the ahead/behind prewarm window.
 * @param videoIdByPostId      Map of post id → bunnyVideoId, for warming.
 */
export function useActiveVideo(
  orderedVideoPostIds: string[],
  videoIdByPostId: Map<string, string>,
): ActiveVideoApi {
  const [activeId, setActiveId] = useState<string | null>(null);
  const windowRef = useRef<Set<string>>(new Set());
  const [, forceWindowRender] = useState(0);

  const feedElRef       = useRef<HTMLElement | null>(null);
  const rafRef          = useRef<number | null>(null);
  const lastActiveRef   = useRef<string | null>(null);
  const orderedRef      = useRef<string[]>(orderedVideoPostIds);
  const videoMapRef     = useRef<Map<string, string>>(videoIdByPostId);
  // Registry of mounted player handles, keyed by post id. Lets the coordinator
  // call play/pause directly (imperatively) without going through React props.
  const playersRef      = useRef<Map<string, VideoPlayerHandle>>(new Map());
  const lastScrollYRef  = useRef<number>(0);

  useEffect(() => { orderedRef.current  = orderedVideoPostIds; }, [orderedVideoPostIds]);
  useEffect(() => { videoMapRef.current = videoIdByPostId;     }, [videoIdByPostId]);

  const registerFeed = useCallback((el: HTMLElement | null) => {
    feedElRef.current = el;
  }, []);

  const registerPlayer = useCallback((postId: string, handle: VideoPlayerHandle | null) => {
    if (handle) {
      playersRef.current.set(postId, handle);
      // If this player is registering and it's already the active video (the
      // coordinator picked it before the player mounted/registered), play it
      // now. Without this, the first centered video never plays because the
      // active decision happened before registration.
      if (postId === lastActiveRef.current) {
        try { handle.playActive(); } catch {}
      }
    } else {
      playersRef.current.delete(postId);
    }
  }, []);

  const computeActive = useCallback(() => {
    rafRef.current = null;

    const root = feedElRef.current ?? document;
    // Query ALL feed items (videos, image/landscape posts, and interstitials
    // like feed suggestions) in DOM order — not just videos. We need to know
    // when a NON-video owns the screen center so we can pause all videos there,
    // instead of falsely picking a nearby video (the old "closest center" bug).
    const items = Array.from(
      root.querySelectorAll<HTMLElement>('[data-postid], [data-feeditem]')
    );
    if (!items.length) return;

    // The active item is the one whose box crosses the viewport center line.
    // This is deterministic and direction-independent: the same scroll position
    // always yields the same active item regardless of scroll direction. (The
    // old closest-center heuristic flipped its answer around tall landscape
    // items and suggestions depending on approach direction.)
    const centerY = window.innerHeight / 2;
    let centerItem: HTMLElement | null = null;
    for (const node of items) {
      const rect = node.getBoundingClientRect();
      if (rect.top <= centerY && rect.bottom > centerY) { centerItem = node; break; }
    }

    // Resolve to a video post id only if the centered item is actually a video.
    // A landscape image post (data-postid, no data-video) or a feed suggestion
    // (data-feeditem) owning the center → no active video → pause all.
    let bestId: string | null = null;
    if (centerItem && centerItem.getAttribute("data-video") === "1") {
      bestId = centerItem.getAttribute("data-postid");
    }

    // Active changed — drive playback IMPERATIVELY before React re-renders.
    if (bestId !== lastActiveRef.current) {
      const prevId = lastActiveRef.current;
      lastActiveRef.current = bestId;

      // Pause the outgoing video (keeps currentTime for resume-from-frame).
      if (prevId) {
        const prev = playersRef.current.get(prevId);
        if (prev) { try { prev.pauseActive(); } catch {} }
      }
      // Play the incoming video instantly (if a video owns the center).
      if (bestId) {
        const next = playersRef.current.get(bestId);
        if (next) { try { next.playActive(); } catch {} }
      }

      setActiveId(bestId);
    }

    // Track scroll direction for directional preloading.
    const scrollY = window.scrollY;
    const dir: "down" | "up" = scrollY >= lastScrollYRef.current ? "down" : "up";
    lastScrollYRef.current = scrollY;

    // Prewarm window: ahead in the scroll direction (Mux/Slop-Social pattern),
    // 1 behind for quick back-scroll. Centered on the active video if there is
    // one, else on the video nearest the center line.
    const order = orderedRef.current;
    let anchorIdx = bestId ? order.indexOf(bestId) : -1;
    if (anchorIdx === -1) {
      // No active video (a non-video owns center) — anchor the window on the
      // nearest video to the center so the next/prev videos still prewarm.
      anchorIdx = nearestVideoIndexToCenter(items, order, centerY);
    }
    if (anchorIdx !== -1) {
      const { ect } = getNetwork();
      const aheadN  = ect === "slow-2g" || ect === "2g" ? 1 : 2;
      const downAhead = dir === "down";
      const next = new Set<string>();
      const lo = downAhead ? anchorIdx - 1 : anchorIdx - aheadN;
      const hi = downAhead ? anchorIdx + aheadN : anchorIdx + 1;
      for (let i = lo; i <= hi; i++) {
        const pid = order[i];
        if (pid) next.add(pid);
      }
      windowRef.current = next;
      forceWindowRender((n) => n + 1);

      const map = videoMapRef.current;
      next.forEach((pid) => {
        if (pid === bestId) return;
        const vid = map.get(pid);
        if (vid) lightWarm(vid);
      });
    }
  }, []);

  const schedule = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(computeActive);
  }, [computeActive]);

  useEffect(() => {
    schedule(); // initial pass on mount

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    // Recompute when a video starts playing — keeps active in sync if the player
    // claims playback through its own path.
    const onPlaying = () => schedule();
    window.addEventListener("freya:video-playing", onPlaying);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("freya:video-playing", onPlaying);
    };
  }, [schedule]);

  // Recompute when the set of video posts changes (e.g. infinite scroll appends).
  useEffect(() => { schedule(); }, [orderedVideoPostIds.length, schedule]);

  const isActive   = useCallback((postId: string) => postId === activeId, [activeId]);
  const isInWindow = useCallback((postId: string) => windowRef.current.has(postId), [activeId]);

  return { activeId, isActive, isInWindow, registerFeed, registerPlayer };
}