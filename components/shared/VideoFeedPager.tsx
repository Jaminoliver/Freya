"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { VideoTileData } from "@/components/explore/VideoTile";
import { VideoFullscreenModal } from "@/components/shared/VideoFullscreenModal";

/**
 * Finger-tracked, 3-slot vertical video pager (TikTok/Reels style).
 *
 * Renders prev / current / next as full VideoFullscreenModal instances in
 * `slotMode`, stacked in a track that translates 1:1 with the finger. During a
 * drag you always see real frames of two videos at once — no black gap. Release
 * past a distance/velocity threshold commits to the neighbour; otherwise springs
 * back. Only the centered slot is `active` (plays); neighbours sit paused on
 * their first frame. Each slot owns its own video + overlay + seekbar.
 */

interface Props {
  items: VideoTileData[];
  startIndex: number;
  initialTime?: number;
  existingHls?: any;
  isMuted: boolean;
  onMuteChange: (muted: boolean) => void;
  onClose: () => void;
  onLoadMore?: () => void;
  followCacheGet?: (creatorId: string) => boolean;
  onFollowChange?: (creatorId: string, isFollowing: boolean) => void;
}

export default function VideoFeedPager({
  items,
  startIndex,
  initialTime = 0,
  existingHls,
  isMuted,
  onMuteChange,
  onClose,
  onLoadMore,
  followCacheGet,
  onFollowChange,
}: Props) {
  const [index, setIndex] = useState(startIndex);
  const [animating, setAnimating] = useState(false);

  const dragRef = useRef(0);
  const startYRef = useRef(0);
  const startTRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(typeof window !== "undefined" ? window.innerHeight : 800);
  const openerHlsRef = useRef<any>(existingHls);

  const applyTransform = useCallback((offset: number, animate: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    const H = heightRef.current;
    track.style.transition = animate
      ? "transform 0.32s cubic-bezier(0.22,1,0.36,1)"
      : "none";
    // Each item element lives at top = itemIndex * H. Translate the track so the
    // CURRENT index sits at viewport 0; `offset` is the live finger drag.
    track.style.transform = `translate3d(0, ${-index * H + offset}px, 0)`;
  }, [index]);

  useEffect(() => {
    heightRef.current = window.innerHeight;
    applyTransform(0, false);
    const onResize = () => { heightRef.current = window.innerHeight; applyTransform(dragRef.current, false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [applyTransform]);

  // Re-center the track for the new index BEFORE the browser paints, so there's
  // no frame where the track is still offset (which showed as a flash of the
  // old/neighbour video or thumbnail). useLayoutEffect runs pre-paint.
  useLayoutEffect(() => {
    applyTransform(0, false);
    dragRef.current = 0;
  }, [index, applyTransform]);

  const commit = useCallback((dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) {
      applyTransform(0, true);
      dragRef.current = 0;
      return;
    }
    const H = heightRef.current;
    setAnimating(true);
    applyTransform(dir === 1 ? -H : H, true);
    openerHlsRef.current = undefined;
    window.setTimeout(() => {
      setIndex(target);
      setAnimating(false);
      if (dir === 1 && target >= items.length - 3) onLoadMore?.();
    }, 320);
  }, [index, items.length, applyTransform, onLoadMore]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (animating) return;
    startYRef.current = e.touches[0].clientY;
    startTRef.current = performance.now();
    dragRef.current = 0;
  }, [animating]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (animating) return;
    const dy = e.touches[0].clientY - startYRef.current;
    let offset = dy;
    if ((dy < 0 && index >= items.length - 1) || (dy > 0 && index <= 0)) {
      offset = dy * 0.35;
    }
    dragRef.current = offset;
    applyTransform(offset, false);
  }, [animating, index, items.length, applyTransform]);

  const onTouchEnd = useCallback(() => {
    if (animating) return;
    const H = heightRef.current;
    const dy = dragRef.current;
    const dt = Math.max(1, performance.now() - startTRef.current);
    const velocity = dy / dt;
    const DIST = H * 0.18;
    const VEL = 0.45;

    if (dy <= -DIST || velocity <= -VEL) {
      commit(1);
    } else if (dy >= DIST || velocity >= VEL) {
      if (index <= 0) onClose();
      else commit(-1);
    } else {
      applyTransform(0, true);
      dragRef.current = 0;
    }
  }, [animating, index, applyTransform, commit, onClose]);

  // Stable slots: three persistent elements keyed by index%3, NOT by post_id.
  // As `index` changes, each slot's data changes but the React element (and its
  // already-loaded <video>) persists — the neighbour that was preloaded becomes
  // Render a small window of items around the current index. Each element is
  // keyed by post_id and positioned at its ABSOLUTE index (top = i * H). The
  // track translates to center the current index. Because each item's element
  // lives at its own fixed position and is keyed by identity, navigating never
  // changes an element's data or remounts it — the neighbour you scroll to is
  // already mounted+loaded at its position, so playback is instant and there's
  // no teardown/reload/flash. (window ±1 keeps only 3 live videos.)
  const WINDOW = 1;
  const lo = Math.max(0, index - WINDOW);
  const hi = Math.min(items.length - 1, index + WINDOW);
  const windowItems: Array<{ item: VideoTileData; i: number }> = [];
  for (let i = lo; i <= hi; i++) {
    if (items[i]) windowItems.push({ item: items[i], i });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "#000",
        overflow: "hidden",
        touchAction: "none",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        ref={trackRef}
        style={{ position: "absolute", left: 0, right: 0, top: 0, willChange: "transform" }}
      >
        {windowItems.map(({ item, i }) => {
          const rel = i - index; // 0 = current
          return (
            <div
              key={item.post_id}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: i * heightRef.current,
                height: heightRef.current,
                background: "#000",
              }}
            >
              <VideoFullscreenModal
                slotMode
                active={rel === 0 && !animating}
                data={item}
                initialTime={rel === 0 ? initialTime : 0}
                existingHls={rel === 0 ? openerHlsRef.current : undefined}
                isMuted={isMuted}
                onMuteChange={onMuteChange}
                onClose={onClose}
                initialIsFollowing={followCacheGet?.(item.creator_id) ?? false}
                onFollowChange={onFollowChange}
                hasNext={index < items.length - 1}
                hasPrev={index > 0}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}