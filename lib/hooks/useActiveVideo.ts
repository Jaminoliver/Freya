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
import { setAllowedLoaders } from "@/lib/video/hlsGovernor";
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

    // Find every video wrapper currently in the DOM.
    const root = feedElRef.current ?? document;
    const nodes = root.querySelectorAll<HTMLElement>('[data-postid][data-video="1"]');
    if (!nodes.length) {
      if (lastActiveRef.current !== null) {
        const prev = playersRef.current.get(lastActiveRef.current);
        if (prev) { try { prev.pauseActive(); } catch {} }
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

    console.log("[COORD] computeActive run | nodes in DOM:", nodes.length, "| best:", bestId, "| current:", lastActiveRef.current);
    if (bestId !== lastActiveRef.current) {
      console.log("[COORD] computeActive picked:", bestId, "| nodes in DOM:", nodes.length, "| current:", lastActiveRef.current);
    }
    // Active changed — drive playback IMPERATIVELY before React re-renders.
    if (bestId !== lastActiveRef.current) {
      const prevId = lastActiveRef.current;
      lastActiveRef.current = bestId;

      console.log("[COORD] active change:", prevId, "→", bestId,
        "| registered players:", Array.from(playersRef.current.keys()),
        "| has next handle:", bestId ? playersRef.current.has(bestId) : false);

      // Pause the outgoing video (keeps currentTime for resume-from-frame).
      if (prevId) {
        const prev = playersRef.current.get(prevId);
        if (prev) { try { prev.pauseActive(); } catch (e) { console.log("[COORD] pause err", e); } }
      }
      // Play the incoming video instantly.
      if (bestId) {
        const next = playersRef.current.get(bestId);
        if (next) { console.log("[COORD] calling playActive on", bestId); try { next.playActive(); } catch (e) { console.log("[COORD] play err", e); } }
        else      { console.log("[COORD] NO HANDLE for active", bestId); }
      }

      // Update React state for non-critical consumers (button hiding, etc).
      setActiveId(bestId);
    }

    // Recompute prewarm window: active-1 .. active+2 (ahead-weighted).
    // Shrinks on slow networks to protect the active stream's bandwidth.
    if (bestId) {
      const order = orderedRef.current;
      const idx = order.indexOf(bestId);
      if (idx !== -1) {
        const { ect } = getNetwork();
        const ahead = ect === "slow-2g" || ect === "2g" ? 1 : 2;
        const behind = 1;
        const next = new Set<string>();
        const allowedVideoIds: string[] = [];
        for (let i = idx - behind; i <= idx + ahead; i++) {
          const pid = order[i];
          if (pid) {
            next.add(pid);
            const vid = videoMapRef.current.get(pid);
            if (vid) allowedVideoIds.push(vid);
          }
        }
        windowRef.current = next;
        forceWindowRender((n) => n + 1);

        // Tell the load governor exactly which video ids may download segments.
        // Everything else is held (manifest only) so bandwidth concentrates on
        // the active video + the next couple — instant on good networks, safe
        // on slow ones.
        setAllowedLoaders(allowedVideoIds);

        // Warm manifests for the window (cheap; helps cold instances attach fast).
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
    console.log("[COORD] mount effect firing, orderedVideoPostIds:", orderedVideoPostIds);
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
  useEffect(() => {
    console.log("[COORD] orderedVideoPostIds.length changed:", orderedVideoPostIds.length);
    schedule();
  }, [orderedVideoPostIds.length, schedule]);

  const isActive   = useCallback((postId: string) => postId === activeId, [activeId]);
  const isInWindow = useCallback((postId: string) => windowRef.current.has(postId), [activeId]);

  return { activeId, isActive, isInWindow, registerFeed, registerPlayer };
}