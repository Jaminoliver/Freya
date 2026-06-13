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

export interface ActiveVideoApi {
  /** The post id of the currently active (should-be-playing) video, or null. */
  activeId: string | null;
  /** True if the given post id is the active video. */
  isActive: (postId: string) => boolean;
  /** True if the given post id is within the prewarm window. */
  isInWindow: (postId: string) => boolean;
  /** Call from the feed container ref so the coordinator can scope its DOM queries. */
  registerFeed: (el: HTMLElement | null) => void;
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

  useEffect(() => { orderedRef.current  = orderedVideoPostIds; }, [orderedVideoPostIds]);
  useEffect(() => { videoMapRef.current = videoIdByPostId;     }, [videoIdByPostId]);

  const registerFeed = useCallback((el: HTMLElement | null) => {
    feedElRef.current = el;
  }, []);

  const computeActive = useCallback(() => {
    rafRef.current = null;

    // Find every video wrapper currently in the DOM.
    const root = feedElRef.current ?? document;
    const nodes = root.querySelectorAll<HTMLElement>('[data-postid][data-video="1"]');
    if (!nodes.length) {
      if (lastActiveRef.current !== null) {
        lastActiveRef.current = null;
        setActiveId(null);
      }
      return;
    }

    const viewportCenter = window.innerHeight / 2;
    let bestId: string | null = null;
    let bestDistance = Infinity;

    nodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      // Skip elements fully off-screen.
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
      const elementCenter = rect.top + rect.height / 2;
      const distance = Math.abs(elementCenter - viewportCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestId = node.getAttribute("data-postid");
      }
    });

    // Update active id only when it actually changes (avoids churn).
    if (bestId !== lastActiveRef.current) {
      lastActiveRef.current = bestId;
      setActiveId(bestId);
    }

    // Recompute prewarm window: active-1 .. active+N (direction-agnostic;
    // ahead-weighted). N shrinks on slow networks to protect the active stream.
    if (bestId) {
      const order = orderedRef.current;
      const idx = order.indexOf(bestId);
      if (idx !== -1) {
        const { ect } = getNetwork();
        const ahead = ect === "slow-2g" || ect === "2g" ? 1 : ect === "3g" ? 2 : 4;
        const behind = 1;
        const next = new Set<string>();
        for (let i = idx - behind; i <= idx + ahead; i++) {
          const pid = order[i];
          if (pid) next.add(pid);
        }
        windowRef.current = next;
        forceWindowRender((n) => n + 1);

        // Warm the window (excluding the active one, which the player loads itself).
        const map = videoMapRef.current;
        next.forEach((pid) => {
          if (pid === bestId) return;
          const vid = map.get(pid);
          if (vid) lightWarm(vid);
        });
      }
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

  return { activeId, isActive, isInWindow, registerFeed };
}