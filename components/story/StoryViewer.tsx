"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, MoreVertical, Trash2, Volume2, VolumeX, Heart, Send, ChevronLeft, ChevronRight } from "lucide-react";
import type { CreatorStoryGroup, StoryItem } from "@/components/story/StoryBar";
import { useAppStore } from "@/lib/store/appStore";
import StoryVideoPlayer from "@/components/story/StoryVideoPlayer";

const IMAGE_DURATION_MS = 5000;
const SPINNER_DELAY_MS  = 600;
const PRELOAD_AHEAD     = 3;
const HOLD_THRESHOLD_MS = 200;
const TAP_MAX_MS        = 300;
const SWIPE_MIN_PX      = 60;

export function prewarmHls(urls: string[]) {
  if (typeof window === "undefined") return;
  console.log(`[prewarm] Starting preload for ${urls.length} video(s)`);
  import("hls.js").then(({ default: Hls }) => {
    if (!Hls.isSupported()) {
      console.log("[prewarm] HLS not supported — skipping");
      return;
    }
    for (const url of urls) {
      const video = document.createElement("video");
      video.muted   = true;
      video.preload = "auto";
      video.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
      document.body.appendChild(video);
      const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_: any, data: any) => {
        hls.currentLevel = data.levels.length - 1;
        console.log(`[prewarm] ✓ Manifest loaded: ${url.split("/").slice(-2, -1)[0]}`);
      });
      hls.on(Hls.Events.ERROR, (_: any, data: any) => {
        if (data.fatal) console.warn(`[prewarm] ✗ Error loading: ${url}`, data);
      });
      setTimeout(() => { hls.destroy(); video.remove(); }, 30000);
    }
  }).catch(() => {});
}

function Avatar({ src, name, size = 36 }: { src: string | null; name: string; size?: number }) {
  const colors = ["#8B5CF6","#EC4899","#F59E0B","#10B981","#3B82F6","#EF4444"];
  const bg = colors[(name.charCodeAt(0) ?? 0) % colors.length];
  if (src) return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block", border: "2px solid rgba(255,255,255,0.3)" }} />;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={size/2} fill={bg} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="#fff" fontSize={size*0.4} fontFamily="Inter,sans-serif" fontWeight="700">{(name[0]??"?").toUpperCase()}</text>
    </svg>
  );
}

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`;
}

function firstUnviewedIndex(group: CreatorStoryGroup): number {
  const idx = group.items.findIndex((s) => !s.viewed && !s.isProcessing);
  return idx === -1 ? 0 : idx;
}

interface Props {
  groups:              CreatorStoryGroup[];
  startGroupIndex:     number;
  onClose:             (updatedGroups: CreatorStoryGroup[]) => void;
  onStoriesUpdated?:   () => void;
  onGroupFullyViewed?: (creatorId: string) => void;
}

export default function StoryViewer({ groups, startGroupIndex, onClose, onStoriesUpdated, onGroupFullyViewed }: Props) {
  const { viewer } = useAppStore();

  const [localGroups,  setLocalGroups]  = useState(groups);
  const [groupIdx,     setGroupIdx]     = useState(startGroupIndex);
  const [storyIdx,     setStoryIdx]     = useState(() => firstUnviewedIndex(groups[startGroupIndex]));
  const [paused,       setPaused]       = useState(false);
  const [muted,        setMuted]        = useState(true);
  const [showSpinner,  setShowSpinner]  = useState(false);
  const [imgLoaded,    setImgLoaded]    = useState(false);
  const [imgError,     setImgError]     = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteErr,    setDeleteErr]    = useState<string | null>(null);
  const [liked,        setLiked]        = useState(false);
  const [reply,        setReply]        = useState("");
  const [replyFocused, setReplyFocused] = useState(false);

  const fullyViewedRef = useRef<Set<string>>(new Set());
  const groupIdxRef    = useRef(startGroupIndex);
  const storyIdxRef    = useRef(firstUnviewedIndex(groups[startGroupIndex]));
  const pausedRef      = useRef(false);
  const imgLoadedRef   = useRef(false);
  const mountedRef     = useRef(true);
  const navigatingRef  = useRef(false);
  const storyKeyRef    = useRef("");
  const viewTrackedRef = useRef(false);
  const localGroupsRef = useRef(localGroups);
  const touchRef       = useRef({ x: 0, y: 0, time: 0, moved: false, holding: false, draggingDown: false });
  const dragRef        = useRef({ active: false, startY: 0 });
  const containerRef   = useRef<HTMLDivElement>(null);
  const barsRef        = useRef<HTMLDivElement>(null);
  const spinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goNextRef      = useRef<() => void>(() => {});
  const goPrevRef      = useRef<() => void>(() => {});

  useEffect(() => { localGroupsRef.current = localGroups; }, [localGroups]);
  useEffect(() => { pausedRef.current = paused; },          [paused]);
  useEffect(() => { imgLoadedRef.current = imgLoaded; },    [imgLoaded]);
  useEffect(() => { setLocalGroups(groups); },              [groups]);

  const updateGroupIdx = useCallback((v: number) => { groupIdxRef.current = v; setGroupIdx(v); }, []);
  const updateStoryIdx = useCallback((v: number) => { storyIdxRef.current = v; setStoryIdx(v); }, []);

  const group    = localGroups[groupIdx];
  const story    = group?.items[storyIdx] as StoryItem | undefined;
  const isOwner  = viewer?.id === group?.creatorId;
  const isVideo  = story?.mediaType === "video";
  const hasPrev  = storyIdx > 0 || groupIdx > 0;
  const hasNext  = storyIdx < (group?.items.length ?? 1) - 1 || groupIdx < localGroups.length - 1;
  const storyKey = `${groupIdx}-${storyIdx}`;

  const getFill = useCallback((idx: number) =>
    barsRef.current?.querySelector<HTMLDivElement>(`[data-fill="${idx}"]`), []);

  const resetBars = useCallback((currentIdx: number) => {
    barsRef.current?.querySelectorAll<HTMLDivElement>("[data-fill]").forEach((fill) => {
      const i = Number(fill.dataset.fill);
      fill.style.transition = fill.style.animation = "none";
      fill.style.transform = i < currentIdx ? "scaleX(1)" : "scaleX(0)";
    });
  }, []);

  const startImageBar = useCallback(() => {
    const fill = getFill(storyIdxRef.current);
    if (!fill) return;
    fill.style.transition = fill.style.animation = "none";
    fill.style.transform = "scaleX(0)";
    void fill.offsetHeight;
    fill.style.animation = `sv-progress ${IMAGE_DURATION_MS}ms linear forwards`;
    fill.style.animationPlayState = pausedRef.current ? "paused" : "running";
  }, [getFill]);

  const pauseBar  = useCallback(() => { const f = getFill(storyIdxRef.current); if (f) f.style.animationPlayState = "paused"; },   [getFill]);
  const resumeBar = useCallback(() => { const f = getFill(storyIdxRef.current); if (f) f.style.animationPlayState = "running"; }, [getFill]);

  const setVideoBarPct = useCallback((pct: number, idx: number) => {
    const fill = getFill(idx);
    if (!fill) return;
    fill.style.animation = fill.style.transition = "none";
    fill.style.transform = `scaleX(${pct})`;
  }, [getFill]);

  const checkGroupComplete = useCallback((gi: number) => {
    const gs = localGroupsRef.current;
    const g  = gs[gi];
    if (!g) return;
    const allViewed = g.items.every((s) => s.viewed || s.isProcessing);
    if (allViewed && !fullyViewedRef.current.has(g.creatorId)) {
      fullyViewedRef.current.add(g.creatorId);
      onGroupFullyViewed?.(g.creatorId);
    }
  }, [onGroupFullyViewed]);

  const closeWithGroups = useCallback(() => {
    onClose(localGroupsRef.current);
  }, [onClose]);

  const goNext = useCallback(() => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    const gs = localGroupsRef.current, gi = groupIdxRef.current, si = storyIdxRef.current;
    const g = gs[gi];
    if (!g) { navigatingRef.current = false; return; }

    if (si < g.items.length - 1) {
      updateStoryIdx(si + 1);
    } else {
      checkGroupComplete(gi);
      if (gi < gs.length - 1) {
        const nextGroup = gs[gi + 1];
        updateGroupIdx(gi + 1);
        updateStoryIdx(firstUnviewedIndex(nextGroup));
      } else {
        navigatingRef.current = false;
        closeWithGroups();
      }
    }
  }, [closeWithGroups, updateGroupIdx, updateStoryIdx, checkGroupComplete]);

  const goPrev = useCallback(() => {
    const gs = localGroupsRef.current, gi = groupIdxRef.current, si = storyIdxRef.current;
    if      (si > 0) updateStoryIdx(si - 1);
    else if (gi > 0) { updateGroupIdx(gi - 1); updateStoryIdx(gs[gi - 1].items.length - 1); }
  }, [updateGroupIdx, updateStoryIdx]);

  useEffect(() => { goNextRef.current = goNext; }, [goNext]);
  useEffect(() => { goPrevRef.current = goPrev; }, [goPrev]);

  // Image bar auto-advance
  useEffect(() => {
    const container = barsRef.current;
    if (!container) return;
    const handler = (e: AnimationEvent) => { if (e.animationName === "sv-progress") goNextRef.current(); };
    container.addEventListener("animationend", handler);
    return () => container.removeEventListener("animationend", handler);
  }, []);

  const trackView = useCallback((id: number) => {
    if (viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    setLocalGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((s) => s.id === id ? { ...s, viewed: true } : s),
      }))
    );
    fetch(`/api/stories/${id}/view`, { method: "POST" }).catch(() => {});
  }, []);

  // Story change
  useEffect(() => {
    const key = `${groupIdx}-${storyIdx}`;
    storyKeyRef.current = key;
    navigatingRef.current = viewTrackedRef.current = false;
    imgLoadedRef.current = false;
    setImgLoaded(false); setImgError(false); setMenuOpen(false);
    setDeleteErr(null); setLiked(false); setShowSpinner(false);
    if (spinnerTimerRef.current) { clearTimeout(spinnerTimerRef.current); spinnerTimerRef.current = null; }
    resetBars(storyIdx);
    const s = localGroups[groupIdx]?.items[storyIdx];
    if (!s) return;

    trackView(s.id);

    if (s.mediaType !== "video") {
      startImageBar();
      return;
    }
    spinnerTimerRef.current = setTimeout(() => {
      if (storyKeyRef.current === key && mountedRef.current) setShowSpinner(true);
    }, SPINNER_DELAY_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx]);

  const prevGroupIdxRef = useRef(startGroupIndex);
  useEffect(() => {
    if (groupIdx !== prevGroupIdxRef.current) {
      checkGroupComplete(prevGroupIdxRef.current);
      prevGroupIdxRef.current = groupIdx;
    }
  }, [groupIdx, checkGroupComplete]);

  const onPhotoLoad = useCallback(() => {
    if (imgLoadedRef.current) return;
    imgLoadedRef.current = true;
    setImgLoaded(true);
  }, []);

  const onPhotoError = useCallback(() => {
    setImgError(true);
    startImageBar();
  }, [startImageBar]);

  const handleVideoPlaying = useCallback((si: number) => {
    if (si !== storyIdxRef.current) return;
    if (spinnerTimerRef.current) { clearTimeout(spinnerTimerRef.current); spinnerTimerRef.current = null; }
    setShowSpinner(false);
  }, []);

  const handleVideoTimeUpdate = useCallback((pct: number, si: number) => {
    if (si !== storyIdxRef.current) return;
    setVideoBarPct(pct, si);
  }, [setVideoBarPct]);

  const handleVideoEnded = useCallback((si: number) => {
    if (si !== storyIdxRef.current) return;
    setVideoBarPct(1, si);
    goNextRef.current();
  }, [setVideoBarPct]);

  const handleVideoBuffering = useCallback((buffering: boolean) => {
    if (buffering) {
      if (!spinnerTimerRef.current)
        spinnerTimerRef.current = setTimeout(() => { if (mountedRef.current) setShowSpinner(true); }, SPINNER_DELAY_MS);
    } else {
      if (spinnerTimerRef.current) { clearTimeout(spinnerTimerRef.current); spinnerTimerRef.current = null; }
      setShowSpinner(false);
    }
  }, []);

  useEffect(() => {
    if (!isVideo) { if (paused) pauseBar(); else resumeBar(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  useEffect(() => { setPaused(replyFocused); }, [replyFocused]);

  // Preload upcoming stories
  useEffect(() => {
    let count = 0;
    for (let gi = groupIdx; gi < localGroups.length && count < PRELOAD_AHEAD; gi++) {
      const startSi = gi === groupIdx ? storyIdx + 1 : 0;
      for (let si = startSi; si < localGroups[gi].items.length && count < PRELOAD_AHEAD; si++) {
        const s = localGroups[gi].items[si];
        if (s.mediaType === "photo" && s.mediaUrl) { const img = new window.Image(); img.src = s.mediaUrl; }
        if (s.thumbnailUrl) { const img = new window.Image(); img.src = s.thumbnailUrl; }
        count++;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if      (e.key === "ArrowRight") goNextRef.current();
      else if (e.key === "ArrowLeft")  goPrevRef.current();
      else if (e.key === "Escape")     closeWithGroups();
      else if (e.key === " ")          { e.preventDefault(); setPaused((p) => !p); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [closeWithGroups]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      checkGroupComplete(groupIdxRef.current);
      [spinnerTimerRef, holdTimerRef].forEach((r) => { if (r.current) clearTimeout(r.current); });
    };
  }, [checkGroupComplete]);

  const handleDelete = useCallback(async () => {
    const gs = localGroupsRef.current, gi = groupIdxRef.current, si = storyIdxRef.current;
    const s = gs[gi]?.items[si];
    if (!s || deleting) return;
    setDeleting(true); setMenuOpen(false);
    const newGroups = gs
      .map((g, i) => i !== gi ? g : { ...g, items: g.items.filter((item) => item.id !== s.id) })
      .filter((g) => g.items.length > 0);
    setLocalGroups(newGroups);
    if      (newGroups.length === 0)  closeWithGroups();
    else if (gi >= newGroups.length)  { updateGroupIdx(newGroups.length - 1); updateStoryIdx(newGroups[newGroups.length - 1].items.length - 1); }
    else                               { updateGroupIdx(gi); updateStoryIdx(Math.min(si, newGroups[gi].items.length - 1)); }
    try {
      const r = await fetch(`/api/stories/${s.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
      onStoriesUpdated?.();
    } catch (e: any) {
      setLocalGroups(groups); updateGroupIdx(gi); updateStoryIdx(si);
      setDeleteErr(e.message ?? "Error deleting");
    } finally { setDeleting(false); }
  }, [deleting, groups, closeWithGroups, onStoriesUpdated, updateGroupIdx, updateStoryIdx]);

  const sp = {
    onTouchStart: (e: any) => e.stopPropagation(),
    onTouchEnd:   (e: any) => e.stopPropagation(),
    onMouseDown:  (e: any) => e.stopPropagation(),
    onMouseUp:    (e: any) => e.stopPropagation(),
  };

  const applyDrag = useCallback((dy: number) => {
    const el = containerRef.current;
    if (!el) return;
    const clamped = Math.max(0, dy);
    const scale   = 1 - clamped / 600;
    const opacity = Math.max(0.2, 1 - clamped / 180);
    el.style.transform  = `translateY(${clamped}px) scale(${scale})`;
    el.style.opacity    = String(opacity);
    el.style.transition = "none";
  }, []);

  const resetDrag = useCallback((animate: boolean) => {
    const el = containerRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.25s ease" : "none";
    el.style.transform  = "translateY(0) scale(1)";
    el.style.opacity    = "1";
  }, []);

  const DRAG_CLOSE_PX = 60;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, time: Date.now(), moved: false, holding: false, draggingDown: false };
    dragRef.current  = { active: false, startY: t.clientY };
    holdTimerRef.current = setTimeout(() => { touchRef.current.holding = true; setPaused(true); }, HOLD_THRESHOLD_MS);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const t  = e.touches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);

    if (!touchRef.current.moved && (adx > 10 || ady > 10)) {
      touchRef.current.moved = true;
      if (holdTimerRef.current && !touchRef.current.holding) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
      if (dy > 0 && ady > adx) {
        touchRef.current.draggingDown = true;
        dragRef.current.active = true;
        setPaused(true);
      }
    }

    if (dragRef.current.active) {
      e.preventDefault();
      applyDrag(t.clientY - dragRef.current.startY);
    }
  }, [applyDrag]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }

    if (dragRef.current.active) {
      dragRef.current.active = false;
      const dy = e.changedTouches[0].clientY - touchRef.current.y;
      if (dy > DRAG_CLOSE_PX) { closeWithGroups(); }
      else                     { resetDrag(true); setPaused(false); }
      return;
    }

    if (touchRef.current.holding) { setPaused(false); return; }

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx   = endX - touchRef.current.x;
    const dy   = endY - touchRef.current.y;
    const dt   = Date.now() - touchRef.current.time;

    if (touchRef.current.moved) {
      if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) {
        dx > 0 ? goPrevRef.current() : goNextRef.current();
      }
      return;
    }
    if (dt < TAP_MAX_MS) endX < window.innerWidth * 0.35 ? goPrevRef.current() : goNextRef.current();
  }, [closeWithGroups, resetDrag]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input")) return;
    holdTimerRef.current = setTimeout(() => { touchRef.current.holding = true; setPaused(true); }, HOLD_THRESHOLD_MS);
  }, []);

  const onMouseUp = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (touchRef.current.holding) { touchRef.current.holding = false; setPaused(false); }
  }, []);

  const handleLike = useCallback(() => {
    setLiked((l) => {
      const next = !l;
      if (next && story?.id) fetch(`/api/stories/${story.id}/like`, { method: "POST" }).catch(() => {});
      return next;
    });
  }, [story?.id]);

  const handleSendReply = useCallback(() => {
    const text = reply.trim();
    if (!text || !story?.id || !group?.creatorId) return;
    fetch(`/api/stories/${story.id}/reply`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, creatorId: group.creatorId }),
    }).catch(() => {});
    setReply("");
  }, [reply, story?.id, group?.creatorId]);

  if (!group || !story || typeof document === "undefined") return null;

  const thumbSrc = story.thumbnailUrl || (story.mediaType === "photo" ? story.mediaUrl : null);
  const iconBtn  = (extra?: object) => ({ background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", flexShrink: 0, ...extra });

  return createPortal(
    <>
      <style>{`
        @keyframes sv-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes sv-spin     { to { transform: rotate(360deg); } }
        @keyframes sv-like     { 0%,100% { transform: scale(1); } 50% { transform: scale(1.4); } }
        .sv-like-anim { animation: sv-like 0.3s ease; }
        .sv-wrap { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: none; overscroll-behavior: none; }
        .sv-input::placeholder { color: rgba(255,255,255,0.45); }
        .sv-input:focus { outline: none; }
        .sv-arrow { display: none; }
        @media (min-width: 768px) {
          .sv-arrow { display: flex; position: fixed; top: 50%; transform: translateY(-50%); z-index: 10001; width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(8px); align-items: center; justify-content: center; cursor: pointer; color: #fff; transition: background 0.15s; }
          .sv-arrow:hover { background: rgba(255,255,255,0.22); }
          .sv-arrow:disabled { opacity: 0.2; pointer-events: none; }
          .sv-arrow-l { left: calc(50% - 240px - 64px); }
          .sv-arrow-r { right: calc(50% - 240px - 64px); }
        }
      `}</style>

      <button className="sv-arrow sv-arrow-l" onClick={() => goPrevRef.current()} disabled={!hasPrev}><ChevronLeft size={22} /></button>
      <button className="sv-arrow sv-arrow-r" onClick={() => goNextRef.current()} disabled={!hasNext}><ChevronRight size={22} /></button>

      <div className="sv-wrap" onContextMenu={(e) => e.preventDefault()}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", overscrollBehavior: "none" }}>

        <div ref={containerRef} style={{ position: "relative", width: "100%", maxWidth: 480, height: "100dvh", overflow: "hidden", background: "#000", willChange: "transform, opacity" }}>

          {!isVideo && thumbSrc && <img src={thumbSrc} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none", filter: "blur(20px)", transform: "scale(1.08)" }} />}
          {!isVideo && !thumbSrc && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }} />}

          {!isVideo && (
            <img key={`photo-${storyKey}`} src={story.mediaUrl} alt="story"
              onLoad={onPhotoLoad} onError={onPhotoError} onContextMenu={(e) => e.preventDefault()}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
            />
          )}
          {!isVideo && imgError && !imgLoaded && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", pointerEvents: "none" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "Inter,sans-serif" }}>Failed to load image</p>
            </div>
          )}

          {group.items.map((item, i) => item.mediaType === "video" ? (
            <StoryVideoPlayer key={item.id} mediaUrl={item.mediaUrl}
              thumbnailUrl={item.thumbnailUrl} muted={muted} paused={paused} active={i === storyIdx} storyIndex={i}
              onPlaying={handleVideoPlaying} onTimeUpdate={handleVideoTimeUpdate} onEnded={handleVideoEnded} onBuffering={handleVideoBuffering}
            />
          ) : null)}

          {showSpinner && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, pointerEvents: "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.15)", borderTop: "3px solid #fff", animation: "sv-spin 0.8s linear infinite" }} />
            </div>
          )}

          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "calc(env(safe-area-inset-top) + 12px) 12px 0", background: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)", pointerEvents: "auto" }}>
              <div ref={barsRef} style={{ display: "flex", gap: 3, marginBottom: 10 }}>
                {group.items.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
                    <div data-fill={String(i)} style={{ height: "100%", background: "#fff", borderRadius: 2, transformOrigin: "left", willChange: "transform", transform: i < storyIdx ? "scaleX(1)" : "scaleX(0)" }} />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12 }}>
                <Avatar src={group.avatarUrl} name={group.displayName} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "Inter,sans-serif", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.displayName}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "Inter,sans-serif" }}>{timeAgo(story.createdAt)}</p>
                </div>
                {isVideo && (
                  <button {...sp} onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }} style={iconBtn()}>
                    {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                )}
                {isOwner && (
                  <div style={{ position: "relative" }}>
                    <button {...sp} onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }} style={iconBtn()}>
                      <MoreVertical size={15} />
                    </button>
                    {menuOpen && (
                      <div onTouchStart={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                        style={{ position: "absolute", top: 38, right: 0, background: "#13131F", border: "1px solid #2A2A3D", borderRadius: 10, minWidth: 150, boxShadow: "0 8px 24px rgba(0,0,0,0.6)", zIndex: 10, overflow: "hidden" }}>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(); }} disabled={deleting}
                          style={{ width: "100%", padding: "11px 16px", background: "none", border: "none", cursor: deleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 10, color: "#F87171", fontSize: 13, fontFamily: "Inter,sans-serif", fontWeight: 600 }}>
                          <Trash2 size={14} />{deleting ? "Deleting…" : "Delete Story"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button {...sp} onClick={(e) => { e.stopPropagation(); closeWithGroups(); }} style={iconBtn()}>
                  <X size={15} />
                </button>
              </div>
            </div>

            <div {...sp} onTouchMove={(e) => e.stopPropagation()}
              style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "48px 16px calc(env(safe-area-inset-bottom) + 20px)", background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)", pointerEvents: "auto" }}>
              {story.caption && (
                <p style={{ margin: "0 0 14px", fontSize: 14, color: "#fff", fontFamily: "Inter,sans-serif", lineHeight: 1.5, textAlign: "center", textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>{story.caption}</p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", background: "rgba(255,255,255,0.12)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.2)", padding: "10px 16px", backdropFilter: "blur(8px)" }}>
                  <input className="sv-input" value={reply} onChange={(e) => setReply(e.target.value)}
                    onFocus={() => setReplyFocused(true)} onBlur={() => setReplyFocused(false)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendReply(); }}
                    placeholder={`Reply to ${group.displayName}…`}
                    style={{ flex: 1, background: "none", border: "none", color: "#fff", fontSize: 16, fontFamily: "Inter,sans-serif" }}
                  />
                  {reply.trim() && (
                    <button onClick={handleSendReply} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0, marginLeft: 6 }}>
                      <Send size={16} color="#8B5CF6" />
                    </button>
                  )}
                </div>
                <button onClick={handleLike} style={iconBtn({ width: 44, height: 44, backdropFilter: "blur(8px)" })}>
                  <Heart size={22} fill={liked ? "#EC4899" : "none"} color={liked ? "#EC4899" : "#fff"} className={liked ? "sv-like-anim" : ""} />
                </button>
              </div>
              {deleteErr && <p style={{ marginTop: 8, fontSize: 12, color: "#F87171", textAlign: "center", fontFamily: "Inter,sans-serif" }}>{deleteErr}</p>}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}