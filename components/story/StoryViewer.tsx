"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Heart, ChevronLeft, ChevronRight } from "lucide-react";
import type { CreatorStoryGroup, StoryItem } from "@/components/story/StoryBar";
import { addLocalViewed } from "@/components/story/StoryBar";
import { useAppStore } from "@/lib/store/appStore";
import StoryVideoPlayer from "@/components/story/StoryVideoPlayer";
import StoryTopBar, { type StoryTopBarRef } from "@/components/story/StoryTopBar";
import StoryReplyOverlay from "@/components/story/StoryReplyOverlay";
import dynamic from "next/dynamic";
const CheckoutModal = dynamic(() => import("@/components/checkout/CheckoutModal"), { ssr: false });

interface ViewerItem {
  userId:      string;
  displayName: string;
  avatarUrl:   string | null;
  liked:       boolean;
  viewedAt:    string;
}

const SPINNER_DELAY_MS  = 600;
const PRELOAD_AHEAD     = 3;
const HOLD_THRESHOLD_MS = 200;
const TAP_MAX_MS        = 300;
const SWIPE_MIN_PX      = 60;
const DRAG_CLOSE_PX     = 60;

export function prewarmHls(urls: string[]) {
  if (typeof window === "undefined") return;
  import("hls.js").then(({ default: Hls }) => {
    if (!Hls.isSupported()) return;
    for (const url of urls) {
      const video = document.createElement("video");
      video.muted = true;
      video.preload = "auto";
      video.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
      document.body.appendChild(video);
      const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_: any, data: any) => { hls.currentLevel = data.levels.length - 1; });
      hls.on(Hls.Events.ERROR, () => {});
      setTimeout(() => { hls.destroy(); video.remove(); }, 30000);
    }
  }).catch(() => {});
}

function firstUnviewedIndex(group: CreatorStoryGroup): number {
  const idx = group.items.findIndex((s) => !s.viewed && !s.isProcessing);
  return idx === -1 ? 0 : idx;
}

interface Props {
  groups:              CreatorStoryGroup[];
  startGroupIndex:     number;
  startStoryId?:       number;
  onClose:             (updatedGroups: CreatorStoryGroup[]) => void;
  onGroupFullyViewed?: (creatorId: string) => void;
}

function CaptionBlock({ caption, showReplyPill, onExpandChange }: { caption: string; showReplyPill: boolean; onExpandChange?: (v: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 80;
  const needsTrunc = caption.length > LIMIT;

  const toggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const next = !expanded;
    setExpanded(next);
    onExpandChange?.(next);
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        bottom: showReplyPill ? 62 : 10,
        left: 0, right: 0,
        padding: "12px 16px 8px",
        zIndex: 10,
        background: "none",
      }}
    >
      <p style={{
        margin: 0, fontSize: 15, fontWeight: 400, color: "#fff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
        lineHeight: 1.45, textAlign: "center",
        textShadow: "0 1px 8px rgba(0,0,0,0.9), 0 2px 16px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.7)",
      }}>
        {needsTrunc && !expanded ? caption.slice(0, LIMIT).trimEnd() + "... " : caption}
        {needsTrunc && !expanded && (
          <span
            onClick={toggle}
            onTouchEnd={toggle}
            style={{
              color: "rgba(255,255,255,0.75)",
              cursor: "pointer",
              padding: "4px 8px",
              margin: "-4px -4px",
              display: "inline-block",
              fontWeight: 600,
            }}
          >more</span>
        )}
      </p>
    </div>
  );
}

export default function StoryViewer({ groups, startGroupIndex, startStoryId, onClose, onGroupFullyViewed }: Props) {
  const { viewer } = useAppStore();

  const resolveStartStory = (group: CreatorStoryGroup) => {
    if (startStoryId) {
      const idx = group.items.findIndex((s) => s.id === startStoryId);
      if (idx !== -1) return idx;
    }
    return firstUnviewedIndex(group);
  };

  const [localGroups, setLocalGroups] = useState(groups);
  const [groupIdx,    setGroupIdx]    = useState(startGroupIndex);
  const [storyIdx,    setStoryIdx]    = useState(() => resolveStartStory(groups[startGroupIndex]));
  const [refreshKey,  setRefreshKey]  = useState(0);
  const [paused,      setPaused]      = useState(false);
  const [muted,       setMuted]       = useState(true);
  const [showSpinner, setShowSpinner] = useState(false);
  const [imgLoaded,   setImgLoaded]   = useState(false);
  const [imgError,    setImgError]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [deleteErr,   setDeleteErr]   = useState<string | null>(null);
  const [liked,       setLiked]       = useState(false);
  const [replyOpen,   setReplyOpen]   = useState(false);
  const [sentToast,      setSentToast]      = useState(false);
  const [viewersOpen,    setViewersOpen]    = useState(false);
  const [viewers,        setViewers]        = useState<ViewerItem[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewersError,   setViewersError]   = useState<string | null>(null);
  const [likeCount,      setLikeCount]      = useState(0);
  const [ctaCheckoutOpen, setCtaCheckoutOpen] = useState(false);
  const [ctaCheckoutType, setCtaCheckoutType] = useState<"subscription" | "tips">("subscription");
  // ctaCheckoutType is set by handleCtaTap ("subscription") or handleTipTap ("tips")

  const topBarRef       = useRef<StoryTopBarRef>(null);
  const hiddenInputRef  = useRef<HTMLInputElement>(null);
  const fullyViewedRef  = useRef<Set<string>>(new Set());
  const groupIdxRef     = useRef(startGroupIndex);
  const storyIdxRef     = useRef(resolveStartStory(groups[startGroupIndex]));
  const pausedRef       = useRef(false);
  const replyOpenRef    = useRef(false);
  const imgLoadedRef    = useRef(false);
  const mountedRef      = useRef(true);
  const navigatingRef   = useRef(false);
  const storyKeyRef     = useRef("");
  const viewTrackedRef  = useRef(false);
  const localGroupsRef  = useRef(localGroups);
  const isVideoRef      = useRef(false);
  const touchRef        = useRef({ x: 0, y: 0, time: 0, moved: false, holding: false, draggingDown: false });
  const dragRef         = useRef({ active: false, startY: 0 });
  const containerRef    = useRef<HTMLDivElement>(null);
  const spinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goNextRef       = useRef<() => void>(() => {});
  const goPrevRef       = useRef<() => void>(() => {});
  const viewersPanelRef = useRef<HTMLDivElement>(null);
  const viewersOpenRef  = useRef(false);
  const viewersDragRef  = useRef({ active: false, startY: 0 });

  useEffect(() => { localGroupsRef.current = localGroups; }, [localGroups]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { imgLoadedRef.current = imgLoaded; }, [imgLoaded]);
  useEffect(() => { setLocalGroups(groups); }, [groups]);
  useEffect(() => { replyOpenRef.current  = replyOpen;  }, [replyOpen]);
  useEffect(() => { viewersOpenRef.current = viewersOpen; }, [viewersOpen]);

  const updateGroupIdx = useCallback((v: number) => { groupIdxRef.current = v; setGroupIdx(v); }, []);
  const updateStoryIdx = useCallback((v: number) => { storyIdxRef.current = v; setStoryIdx(v); }, []);

  const group    = localGroups[groupIdx];
  const story    = group?.items[storyIdx] as StoryItem | undefined;
  const isOwner  = viewer?.id === group?.creatorId;
  const isVideo  = story?.mediaType === "video";
  useEffect(() => { isVideoRef.current = isVideo; }, [isVideo]);
  const hasPrev  = storyIdx > 0 || groupIdx > 0;
  const hasNext  = storyIdx < (group?.items.length ?? 1) - 1 || groupIdx < localGroups.length - 1;
  const storyKey = `${groupIdx}-${storyIdx}`;

  // ── Navigation ───────────────────────────────────────────────────────────
  const checkGroupComplete = useCallback((gi: number) => {
    const g = localGroupsRef.current[gi];
    if (!g) return;
    if (g.items.every((s) => s.viewed || s.isProcessing) && !fullyViewedRef.current.has(g.creatorId)) {
      fullyViewedRef.current.add(g.creatorId);
      onGroupFullyViewed?.(g.creatorId);
    }
  }, [onGroupFullyViewed]);

  const closeWithGroups = useCallback(() => { onClose(localGroupsRef.current); }, [onClose]);

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
        updateGroupIdx(gi + 1);
        updateStoryIdx(firstUnviewedIndex(gs[gi + 1]));
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

  const handleBarComplete = useCallback(() => {
    if (menuOpen || deleting) return;
    goNextRef.current();
  }, [menuOpen, deleting]);

  // ── View tracking ────────────────────────────────────────────────────────
  const trackView = useCallback((id: number) => {
    if (viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    addLocalViewed(id);
    setLocalGroups((prev) =>
      prev.map((g) => ({ ...g, items: g.items.map((s) => s.id === id ? { ...s, viewed: true } : s) }))
    );
    fetch(`/api/stories/${id}/view`, { method: "POST" }).catch(() => {});
  }, []);

  // ── Story transition ─────────────────────────────────────────────────────
  useEffect(() => {
    const key = `${groupIdx}-${storyIdx}-${refreshKey}`;
    storyKeyRef.current = key;
    navigatingRef.current = viewTrackedRef.current = false;
    imgLoadedRef.current = false;
    setImgLoaded(false); setImgError(false); setMenuOpen(false);
    setDeleteErr(null); setLiked(false); setShowSpinner(false);
    setSentToast(false); setReplyOpen(false); setViewersOpen(false);
    setViewers([]); setLikeCount(0); setViewersError(null);
    setCtaCheckoutOpen(false);
    if (spinnerTimerRef.current) { clearTimeout(spinnerTimerRef.current); spinnerTimerRef.current = null; }

    topBarRef.current?.resetBars(storyIdx);
    const s = localGroups[groupIdx]?.items[storyIdx];
    if (!s) return;
    if (!isOwner) trackView(s.id);

    if (s.mediaType !== "video") {
      return;
    }
    spinnerTimerRef.current = setTimeout(() => {
      if (storyKeyRef.current === key && mountedRef.current) setShowSpinner(true);
    }, SPINNER_DELAY_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx, refreshKey]);

  const prevGroupIdxRef = useRef(startGroupIndex);
  useEffect(() => {
    if (groupIdx !== prevGroupIdxRef.current) {
      checkGroupComplete(prevGroupIdxRef.current);
      prevGroupIdxRef.current = groupIdx;
    }
  }, [groupIdx, checkGroupComplete]);

  // ── Photo handlers ───────────────────────────────────────────────────────
  const onPhotoLoad = useCallback(() => {
    if (imgLoadedRef.current) return;
    imgLoadedRef.current = true;
    setImgLoaded(true);
    topBarRef.current?.startImageBar(storyIdxRef.current, pausedRef.current);
  }, []);
  const onPhotoError = useCallback(() => {
    setImgError(true);
    topBarRef.current?.startImageBar(storyIdxRef.current, pausedRef.current);
  }, []);

  // ── Video handlers ───────────────────────────────────────────────────────
  const handleVideoPlaying = useCallback((si: number) => {
    if (si !== storyIdxRef.current) return;
    if (spinnerTimerRef.current) { clearTimeout(spinnerTimerRef.current); spinnerTimerRef.current = null; }
    setShowSpinner(false);
  }, []);
  const handleVideoTimeUpdate = useCallback((pct: number, si: number) => {
    if (si === storyIdxRef.current) topBarRef.current?.setVideoBarPct(pct, si);
  }, []);
  const handleVideoEnded = useCallback((si: number) => {
    if (si !== storyIdxRef.current) return;
    topBarRef.current?.setVideoBarPct(1, si);
    goNextRef.current();
  }, []);
  const handleVideoBuffering = useCallback((buffering: boolean) => {
    if (!isVideoRef.current) return;
    if (buffering) {
      if (!spinnerTimerRef.current) spinnerTimerRef.current = setTimeout(() => { if (mountedRef.current) setShowSpinner(true); }, SPINNER_DELAY_MS);
    } else {
      if (spinnerTimerRef.current) { clearTimeout(spinnerTimerRef.current); spinnerTimerRef.current = null; }
      setShowSpinner(false);
    }
  }, []);

  // ── Pause/resume bar ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isVideo) {
      if (paused || menuOpen) topBarRef.current?.pauseBar(storyIdxRef.current);
      else topBarRef.current?.resumeBar(storyIdxRef.current);
    }
  }, [paused, isVideo, menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      topBarRef.current?.pauseBar(storyIdxRef.current);
      setPaused(true);
    } else if (!deleting) {
      setPaused(false);
    }
  }, [menuOpen, deleting]);

  // ── Preload ──────────────────────────────────────────────────────────────
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

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (replyOpenRef.current) { if (e.key === "Escape") { setReplyOpen(false); setPaused(false); } return; }
      if (e.key === "ArrowRight") goNextRef.current();
      else if (e.key === "ArrowLeft") goPrevRef.current();
      else if (e.key === "Escape") closeWithGroups();
      else if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [closeWithGroups]);

  // ── Mount/cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      checkGroupComplete(groupIdxRef.current);
      [spinnerTimerRef, holdTimerRef].forEach((r) => { if (r.current) clearTimeout(r.current); });
    };
  }, [checkGroupComplete]);

  // Lock body scroll
  useEffect(() => {
    const html = document.documentElement, body = document.body;
    const origH = html.style.overflow, origB = body.style.overflow;
    html.style.overflow = "hidden"; body.style.overflow = "hidden";
    return () => { html.style.overflow = origH; body.style.overflow = origB; };
  }, []);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    const gs = localGroupsRef.current, gi = groupIdxRef.current, si = storyIdxRef.current;
    const s = gs[gi]?.items[si];
    if (!s || deleting) return;
    setDeleting(true); setMenuOpen(false);

    const newGroups = gs
      .map((g, i) => i !== gi ? g : { ...g, items: g.items.filter((item) => item.id !== s.id) })
      .filter((g) => g.items.length > 0);
    localGroupsRef.current = newGroups;
    setLocalGroups(newGroups);

    if (newGroups.length === 0) {
      onClose(newGroups);
      fetch(`/api/stories/${s.id}`, { method: "DELETE" }).catch(() => {});
      setDeleting(false);
      return;
    }
    if (gi >= newGroups.length) {
      const ngi = newGroups.length - 1, nsi = newGroups[ngi].items.length - 1;
      updateGroupIdx(ngi); updateStoryIdx(nsi);
      if (ngi === gi && nsi === si) setRefreshKey((k) => k + 1);
    } else {
      const nsi = Math.min(si, newGroups[gi].items.length - 1);
      updateGroupIdx(gi); updateStoryIdx(nsi);
      if (nsi === si) setRefreshKey((k) => k + 1);
    }
    try {
      const r = await fetch(`/api/stories/${s.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
    } catch (e: any) {
      localGroupsRef.current = gs; setLocalGroups(gs);
      updateGroupIdx(gi); updateStoryIdx(si);
      setDeleteErr(e.message ?? "Error deleting");
    } finally { setDeleting(false); }
  }, [deleting, onClose, updateGroupIdx, updateStoryIdx]);

  // ── Reply ─────────────────────────────────────────────────────────────────
  const handleOpenReply = useCallback(() => {
    hiddenInputRef.current?.focus();
    setReplyOpen(true);
    setPaused(true);
  }, []);

  const handleReplyClose = useCallback(() => {
    setReplyOpen(false);
    setPaused(false);
    setSentToast(true);
    setTimeout(() => setSentToast(false), 2500);
  }, []);

  const handleReplyCancel = useCallback(() => {
    setReplyOpen(false);
    setPaused(false);
  }, []);

  // ── Like ──────────────────────────────────────────────────────────────────
  const handleLike = useCallback(() => {
    setLiked((l) => {
      const next = !l;
      if (story?.id) fetch(`/api/stories/${story.id}/like`, { method: next ? "POST" : "DELETE" }).catch(() => {});
      return next;
    });
  }, [story?.id]);

  // ── Viewers panel ─────────────────────────────────────────────────────────
  const handleOpenViewers = useCallback(async () => {
    setPaused(true);
    setViewersOpen(true);
    if (viewers.length > 0) return;
    setViewersLoading(true);
    setViewersError(null);
    try {
      const res  = await fetch(`/api/stories/${story?.id}/viewers`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load viewers");
      setViewers(data.viewers);
      setLikeCount(data.likeCount);
    } catch (e: any) {
      setViewersError(e.message ?? "Error loading viewers");
    } finally {
      setViewersLoading(false);
    }
  }, [story?.id, viewers.length]);

  const handleCloseViewers = useCallback(() => {
    setViewersOpen(false);
    setPaused(false);
  }, []);

  // ── CTA ───────────────────────────────────────────────────────────────────
  const handleCtaTap = useCallback(() => {
    setPaused(true);
    setCtaCheckoutType("subscription");
    setCtaCheckoutOpen(true);
  }, []);

  const handleTipTap = useCallback(() => {
    setPaused(true);
    setCtaCheckoutType("tips");
    setCtaCheckoutOpen(true);
  }, []);

  const handleCtaCheckoutClose = useCallback(() => {
    setCtaCheckoutOpen(false);
    setPaused(false);
  }, []);

  // ── Touch / drag / tap ────────────────────────────────────────────────────
  const applyDrag = useCallback((dy: number) => {
    const el = containerRef.current; if (!el) return;
    const c = Math.max(0, dy);
    el.style.transform = `translateY(${c}px) scale(${1 - c / 600})`;
    el.style.opacity = String(Math.max(0.2, 1 - c / 180));
    el.style.transition = "none";
  }, []);

  const resetDrag = useCallback((animate: boolean) => {
    const el = containerRef.current; if (!el) return;
    el.style.transition = animate ? "transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.25s ease" : "none";
    el.style.transform = "translateY(0) scale(1)";
    el.style.opacity = "1";
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (replyOpenRef.current || viewersOpenRef.current) return;
    if (menuOpen) { setMenuOpen(false); return; }
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, time: Date.now(), moved: false, holding: false, draggingDown: false };
    dragRef.current = { active: false, startY: t.clientY };
    holdTimerRef.current = setTimeout(() => { touchRef.current.holding = true; setPaused(true); }, HOLD_THRESHOLD_MS);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (replyOpenRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchRef.current.x, dy = t.clientY - touchRef.current.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (!touchRef.current.moved && (adx > 10 || ady > 10)) {
      touchRef.current.moved = true;
      if (holdTimerRef.current && !touchRef.current.holding) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
      if (dy > 0 && ady > adx) { touchRef.current.draggingDown = true; dragRef.current.active = true; setPaused(true); }
    }
    if (dragRef.current.active) { e.preventDefault(); applyDrag(t.clientY - dragRef.current.startY); }
  }, [applyDrag]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (replyOpenRef.current || viewersOpenRef.current) return;
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (dragRef.current.active) {
      dragRef.current.active = false;
      const dy = e.changedTouches[0].clientY - touchRef.current.y;
      if (dy > DRAG_CLOSE_PX) closeWithGroups(); else { resetDrag(true); setPaused(false); }
      return;
    }
    if (touchRef.current.holding) { touchRef.current.holding = false; setPaused(false); return; }
    const endX = e.changedTouches[0].clientX, dx = endX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.time;
    if (touchRef.current.moved) {
      if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) dx > 0 ? goPrevRef.current() : goNextRef.current();
      return;
    }
    if (dt < TAP_MAX_MS) endX < window.innerWidth * 0.35 ? goPrevRef.current() : goNextRef.current();
  }, [closeWithGroups, resetDrag]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (replyOpenRef.current || viewersOpenRef.current) return;
    if ((e.target as HTMLElement).closest("button, input")) return;
    if (menuOpen) { setMenuOpen(false); return; }
    holdTimerRef.current = setTimeout(() => { touchRef.current.holding = true; setPaused(true); }, HOLD_THRESHOLD_MS);
  }, []);

  const onMouseUp = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (touchRef.current.holding) { touchRef.current.holding = false; if (!replyOpenRef.current) setPaused(false); }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!group || !story || typeof document === "undefined") return null;

  const thumbSrc = story.thumbnailUrl || (story.mediaType === "photo" ? story.mediaUrl : null);
  const showReplyPill = !isOwner && !replyOpen;

  return createPortal(
    <>
      <style>{`
        @keyframes sv-spin { to { transform:rotate(360deg); } }
        @keyframes sv-like { 0%,100% { transform:scale(1); } 50% { transform:scale(1.4); } }
        @keyframes sv-toast     { 0% { opacity:0; transform:translateY(8px); } 100% { opacity:1; transform:translateY(0); } }
        @keyframes sv-sheet-in  { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes sv-shimmer   { 0%,100% { opacity:0.35; } 50% { opacity:0.7; } }
        @keyframes sv-row-in    { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sv-cta-in    { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sv-sweep     { 0%{left:-80%} 100%{left:130%} }
        .sv-like-anim { animation: sv-like 0.3s ease; }
        .sv-wrap { user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; touch-action:none; overscroll-behavior:none; }
        .sv-arrow { display:none; }
        @media (min-width:768px) {
          .sv-arrow { display:flex; position:fixed; top:50%; transform:translateY(-50%); z-index:10001; width:48px; height:48px; border-radius:50%; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.2); backdrop-filter:blur(8px); align-items:center; justify-content:center; cursor:pointer; color:#fff; transition:background 0.15s; }
          .sv-arrow:hover { background:rgba(255,255,255,0.22); }
          .sv-arrow:disabled { opacity:0.2; pointer-events:none; }
          .sv-arrow-l { left:calc(50% - 240px - 64px); }
          .sv-arrow-r { right:calc(50% - 240px - 64px); }
        }
      `}</style>

      {/* Hidden input — preserves iOS keyboard gesture chain */}
      <input ref={hiddenInputRef} aria-hidden="true" tabIndex={-1} readOnly
        style={{ position: "fixed", opacity: 0, width: 0, height: 0, pointerEvents: "none", zIndex: -1 }}
      />

      <button className="sv-arrow sv-arrow-l" onClick={() => goPrevRef.current()} disabled={!hasPrev}><ChevronLeft size={22} /></button>
      <button className="sv-arrow sv-arrow-r" onClick={() => goNextRef.current()} disabled={!hasNext}><ChevronRight size={22} /></button>

      <div className="sv-wrap" onContextMenu={(e) => e.preventDefault()}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", overscrollBehavior: "none" }}>

        <div ref={containerRef} style={{ position: "relative", width: "100%", maxWidth: 480, height: "100dvh", overflow: "hidden", background: "#000", willChange: "transform, opacity" }}>

          {/* Background */}
          {!isVideo && thumbSrc && <img src={thumbSrc} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none", filter: "blur(20px)", transform: "scale(1.08)" }} />}
          {!isVideo && !thumbSrc && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }} />}

          {/* Photo */}
          {!isVideo && (
            <img key={`photo-${storyKey}`} src={story.mediaUrl} alt="story"
              onLoad={onPhotoLoad} onError={onPhotoError} onContextMenu={(e) => e.preventDefault()}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
            />
          )}
          {!isVideo && imgError && !imgLoaded && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", pointerEvents: "none" }}>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "Inter,sans-serif" }}>Failed to load image</p>
            </div>
          )}

          {/* Videos */}
          {group.items.map((item, i) => item.mediaType === "video" ? (
            <StoryVideoPlayer key={item.id} mediaUrl={item.mediaUrl}
              thumbnailUrl={item.thumbnailUrl} muted={muted} paused={paused} active={i === storyIdx} storyIndex={i}
              onPlaying={handleVideoPlaying} onTimeUpdate={handleVideoTimeUpdate} onEnded={handleVideoEnded} onBuffering={handleVideoBuffering}
            />
          ) : null)}

          {/* Spinner */}
          {showSpinner && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, pointerEvents: "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.15)", borderTop: "3px solid #fff", animation: "sv-spin 0.8s linear infinite" }} />
            </div>
          )}

          {/* Top bar */}
          <StoryTopBar ref={topBarRef}
            group={group} story={story} storyIdx={storyIdx}
            isOwner={isOwner} isVideo={!!isVideo} muted={muted}
            deleting={deleting} menuOpen={menuOpen}
            onMuteToggle={() => setMuted((m) => !m)}
            onMenuToggle={() => setMenuOpen((o) => !o)}
            onDelete={handleDelete} onClose={closeWithGroups}
            onBarComplete={handleBarComplete}
            onTip={!isOwner ? handleTipTap : undefined}
          />

          {/* Caption */}
          {story.caption && (
            <CaptionBlock
              key={story.id}
              caption={story.caption}
              showReplyPill={showReplyPill}
              onExpandChange={(expanded) => setPaused(expanded)}
            />
          )}

          {/* Reply sent toast — floats above the reply pill */}
          {sentToast && (
            <div style={{ position: "absolute", bottom: 90, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 11, pointerEvents: "none", animation: "sv-toast 0.2s ease" }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.85)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>Reply sent ✓</span>
            </div>
          )}

          {/* Reply pill + heart (non-owner only) */}
          {showReplyPill && (
            <div
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 16px calc(env(safe-area-inset-bottom) + 14px)", background: "none", zIndex: 10, display: "flex", alignItems: "center", gap: 10 }}
            >
              <button onClick={handleOpenReply} style={{
                flex: 1, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 24, padding: "12px 18px", cursor: "pointer", textAlign: "left",
              }}>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, fontFamily: "Inter,sans-serif" }}>
                  Reply to {group.displayName}…
                </span>
              </button>
              <button onClick={handleLike} style={{
                background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%",
                width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", backdropFilter: "blur(8px)", flexShrink: 0,
              }}>
                <Heart size={22} fill={liked ? "#EC4899" : "none"} color={liked ? "#EC4899" : "#fff"} className={liked ? "sv-like-anim" : ""} />
              </button>
            </div>
          )}

          {/* Text story canvas */}
          {story.textContent && (
            <div style={{ position: "absolute", inset: 0, background: story.textBackground ?? "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 28px 140px", pointerEvents: "none" }}>
              <p style={{
                margin: 0, textAlign: "center", color: "#fff", fontFamily: "Inter,sans-serif",
                fontSize: story.textContent.length <= 30 ? 48 : story.textContent.length <= 80 ? 32 : story.textContent.length <= 150 ? 22 : 16,
                fontWeight: story.textContent.length <= 30 ? 700 : story.textContent.length <= 80 ? 600 : 400,
                lineHeight: 1.3, textShadow: "0 2px 16px rgba(0,0,0,0.4)", wordBreak: "break-word",
              }}>
                {story.textContent}
              </p>
            </div>
          )}

          {/* Subscribe CTA card — non-owner only, positioned by ctaPositionY */}
          {!isOwner && !replyOpen && !viewersOpen && story.ctaType === "subscribe" && (
            <div
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: `calc(${(story.ctaPositionY ?? 0.75) * 100}% - 72px)`,
                left: 0, right: 0,
                zIndex: 10,
                display: "flex", justifyContent: "center",
                padding: "0 16px",
                animation: "sv-cta-in 0.3s ease 0.6s forwards", opacity: 0,
              }}
            >
              <div style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 20, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.08)", width: "100%", maxWidth: 280 }}>
                {story.ctaMessage && (
                  <p style={{ margin: "0 0 7px", fontSize: 13, color: "rgba(255,255,255,0.9)", fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Text','Inter',sans-serif", fontWeight: 500, textAlign: "center", lineHeight: 1.4, letterSpacing: "0.01em" }}>
                    {story.ctaMessage}
                  </p>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "0 2px" }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "Inter,sans-serif", fontWeight: 500 }}>
                    {group.subscriptionPrice === 0 ? "Free" : `From ₦${(group.subscriptionPrice).toLocaleString()}/mo`}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "Inter,sans-serif" }}>Cancel anytime</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(90deg,#8B5CF6,#EC4899)", borderRadius: 50, padding: "8px 20px", position: "relative", overflow: "hidden", justifyContent: "center", cursor: "pointer" }} onClick={handleCtaTap}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Text','Inter',sans-serif", position: "relative", zIndex: 1, letterSpacing: "0.01em" }}>Subscribe</span>
                  <div style={{ position: "absolute", top: 0, left: "-80%", width: "50%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", transform: "skewX(-20deg)", animation: "sv-sweep 2.5s ease-in-out infinite" }} />
                </div>
              </div>
            </div>
          )}

          {/* Viewers pill — owner only */}
          {isOwner && !viewersOpen && (
            <div
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 16px calc(env(safe-area-inset-bottom) + 14px)", zIndex: 10 }}
            >
              <button
                onClick={handleOpenViewers}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 24, padding: "10px 16px", cursor: "pointer",
                  backdropFilter: "blur(8px)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
                <span style={{ color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "Inter,sans-serif" }}>
                  {story.viewCount ?? 0}
                </span>
              </button>
            </div>
          )}

          {/* Viewers bottom sheet — owner only */}
          {isOwner && viewersOpen && (
            <div
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              style={{ position: "absolute", inset: 0, zIndex: 20 }}
            >
              {/* Backdrop */}
              <div
                onClick={handleCloseViewers}
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
              />

              {/* Panel */}
              <div
                ref={viewersPanelRef}
                onTouchStart={(e) => {
                  viewersDragRef.current = { active: true, startY: e.touches[0].clientY };
                }}
                onTouchMove={(e) => {
                  if (!viewersDragRef.current.active) return;
                  const dy = e.touches[0].clientY - viewersDragRef.current.startY;
                  if (dy > 0 && viewersPanelRef.current) {
                    viewersPanelRef.current.style.transform = `translateY(${dy}px)`;
                    viewersPanelRef.current.style.transition = "none";
                  }
                }}
                onTouchEnd={(e) => {
                  if (!viewersDragRef.current.active) return;
                  viewersDragRef.current.active = false;
                  const dy = e.changedTouches[0].clientY - viewersDragRef.current.startY;
                  if (dy > 80) {
                    handleCloseViewers();
                  } else if (viewersPanelRef.current) {
                    viewersPanelRef.current.style.transition = "transform 0.25s cubic-bezier(0.32,0.72,0,1)";
                    viewersPanelRef.current.style.transform  = "translateY(0)";
                  }
                }}
                style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  background: "#0D0D18", borderRadius: "20px 20px 0 0",
                  maxHeight: "65vh", display: "flex", flexDirection: "column",
                  animation: "sv-sheet-in 0.32s cubic-bezier(0.32,0.72,0,1) forwards",
                  willChange: "transform",
                }}
              >
                {/* Drag handle */}
                <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
                  <div style={{ width: 40, height: 4, borderRadius: 4, background: "#2A2A3D" }} />
                </div>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 20px 12px", borderBottom: "1px solid #2A2A3D" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                    <span style={{ color: "#fff", fontSize: 15, fontWeight: 600, fontFamily: "Inter,sans-serif" }}>
                      {story.viewCount ?? 0}
                    </span>
                  </div>
                  {likeCount > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Heart size={15} fill="#EC4899" color="#EC4899" />
                      <span style={{ color: "#EC4899", fontSize: 14, fontWeight: 600, fontFamily: "Inter,sans-serif" }}>{likeCount}</span>
                    </div>
                  )}
                </div>

                {/* List */}
                <div style={{ overflowY: "auto", flex: 1, padding: "6px 0 calc(env(safe-area-inset-bottom) + 8px)" }}>

                  {/* Skeleton */}
                  {viewersLoading && [0, 1, 2].map((i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1A1A2E", animation: `sv-shimmer 1.4s ease ${i * 0.15}s infinite` }} />
                      <div style={{ flex: 1, height: 13, borderRadius: 7, background: "#1A1A2E", animation: `sv-shimmer 1.4s ease ${i * 0.15 + 0.08}s infinite` }} />
                    </div>
                  ))}

                  {/* Error */}
                  {viewersError && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "#F87171", fontFamily: "Inter,sans-serif" }}>{viewersError}</span>
                      <button
                        onClick={handleOpenViewers}
                        style={{ fontSize: 13, color: "#8B5CF6", fontFamily: "Inter,sans-serif", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                      >Retry</button>
                    </div>
                  )}

                  {/* Empty */}
                  {!viewersLoading && !viewersError && viewers.length === 0 && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", gap: 10 }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4A4A6A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                      <span style={{ fontSize: 14, color: "#6B6B8A", fontFamily: "Inter,sans-serif" }}>No views yet</span>
                    </div>
                  )}

                  {/* Viewer rows */}
                  {!viewersLoading && !viewersError && viewers.map((v, i) => (
                    <div
                      key={v.userId}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
                        animation: "sv-row-in 0.22s ease forwards",
                        animationDelay: `${i * 45}ms`,
                        opacity: 0,
                      }}
                    >
                      {v.avatarUrl ? (
                        <img src={v.avatarUrl} alt={v.displayName} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#2A2A3D", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#8A8AA0", fontFamily: "Inter,sans-serif" }}>
                            {v.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#fff", fontFamily: "Inter,sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {v.displayName}
                      </span>
                      {v.liked && <Heart size={16} fill="#EC4899" color="#EC4899" />}
                    </div>
                  ))}

                </div>
              </div>
            </div>
          )}

          {/* Delete error */}
          {deleteErr && (
            <div style={{ position: "absolute", bottom: 20, left: 16, right: 16, zIndex: 10, pointerEvents: "none" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#F87171", textAlign: "center", fontFamily: "Inter,sans-serif", background: "rgba(0,0,0,0.6)", borderRadius: 8, padding: "8px 12px" }}>{deleteErr}</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA checkout modal */}
      {ctaCheckoutOpen && group && (
        <CheckoutModal
          isOpen={ctaCheckoutOpen}
          onClose={handleCtaCheckoutClose}
          type={ctaCheckoutType}
          creator={{
            id:               group.creatorId,
            username:         group.username,
            display_name:     group.displayName,
            avatar_url:       group.avatarUrl,
            role:             "creator",
            subscriptionPrice: group.subscriptionPrice ?? 0,
            bundlePricing: {
              threeMonths: group.threeMonthPrice,
              sixMonths:   group.sixMonthPrice,
            },
          } as any}
          monthlyPrice={group.subscriptionPrice ?? 0}
          threeMonthPrice={group.threeMonthPrice}
          sixMonthPrice={group.sixMonthPrice}
          autoCloseOnSuccess={ctaCheckoutType === "tips"}
          onSuccess={ctaCheckoutType === "tips" ? () => {} : handleCtaCheckoutClose}
          onSubscriptionSuccess={handleCtaCheckoutClose}
          onViewContent={() => { setCtaCheckoutOpen(false); setPaused(false); }}
          onGoToSubscriptions={() => { setCtaCheckoutOpen(false); setPaused(false); }}
        />
      )}

      {/* Reply overlay */}
      <StoryReplyOverlay
        open={replyOpen}
        creatorId={group.creatorId}
        creatorName={group.displayName}
        storyId={story.id}
        thumbnailUrl={story.thumbnailUrl}
        storyMediaType={story.mediaType}
        storyMediaUrl={story.mediaUrl}
        onClose={handleReplyClose}
        onCancel={handleReplyCancel}
      />
    </>,
    document.body,
  );
}