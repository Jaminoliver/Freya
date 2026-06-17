"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/appStore";
import { useRouter } from "next/navigation";
import type { VideoTileData } from "@/components/explore/VideoTile";
import { postSyncStore } from "@/lib/store/postSyncStore";
import { checkIsFollowing, followCreator, unfollowCreator } from "@/lib/utils/follow";
import CommentSection from "@/components/profile/CommentSection";
import type { ApiComment } from "@/components/profile/CommentSection";

const STREAM_CDN =
  process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net";

interface Props {
  data: VideoTileData;
  onClose: () => void;
  initialTime?: number;
  existingHls?: any;
  isMuted: boolean;
  onMuteChange: (muted: boolean) => void;
  initialIsFollowing?: boolean;
  onFollowChange?: (creatorId: string, isFollowing: boolean) => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  enterFrom?: "none" | "bottom" | "top";
  /** Slot mode: rendered inside the pager track (positioned, no fixed overlay,
   *  no own gesture). Playback only runs when `active`. */
  slotMode?: boolean;
  active?: boolean;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function CaptionExpander({ caption }: { caption: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <p
      onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
      style={{
        margin: 0,
        fontSize: 14,
        lineHeight: "1.4",
        color: "rgba(255,255,255,0.9)",
        fontFamily: "'Inter', sans-serif",
        wordBreak: "break-word",
        cursor: "pointer",
        ...(expanded ? {} : {
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }),
      }}
    >
      {caption}
    </p>
  );
}

export function VideoFullscreenModal({
  data,
  onClose,
  initialTime = 0,
  existingHls,
  isMuted,
  onMuteChange,
  initialIsFollowing = false,
  onFollowChange,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  enterFrom = "none",
  slotMode = false,
  active = true,
}: Props) {
  const router = useRouter();
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  useEffect(() => {
    if (data.username) router.prefetch(`/${data.username}`);
  }, [data.username, router]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const loadedSrcRef = useRef<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Live post stats from postSyncStore
  const postId = String(data.post_id);
  const cached = postSyncStore.get(postId);
  const [likeCount,    setLikeCount]    = useState(cached?.like_count    ?? data.like_count    ?? 0);
  const [liked,        setLiked]        = useState(cached?.liked         ?? data.liked ?? false);
  const [commentCount, setCommentCount] = useState(cached?.comment_count ?? data.comment_count ?? 0);

  // Follow state
  const [isFollowing,   setIsFollowing]   = useState(initialIsFollowing);
  const [followLoading, setFollowLoading] = useState(false);
  const [followAnim,    setFollowAnim]    = useState<"idle" | "tick" | "fading">("idle");

  // Comment state
  const [commentsOpen,    setCommentsOpen]    = useState(false);
  const [comments,        setComments]        = useState<ApiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [viewer,          setViewer]          = useState<{ username: string; display_name: string; avatar_url?: string } | null>(null);
  const [viewerUserId,    setViewerUserId]    = useState<string | undefined>(undefined);

  // C1 — react to data changing on a stable (recycled) slot. When the pager
  // moves this element to a new post, resync the per-post state instead of
  // relying on mount-time initialisation (which would otherwise show stale
  // like/comment/follow + a re-buffer). Paired with stable slot keys, this lets
  // the already-loaded neighbour video become current with no remount/flash.
  useEffect(() => {
    const c = postSyncStore.get(postId);
    setLikeCount(c?.like_count ?? data.like_count ?? 0);
    setLiked(c?.liked ?? data.liked ?? false);
    setCommentCount(c?.comment_count ?? data.comment_count ?? 0);
    setIsFollowing(initialIsFollowing);
    setFollowAnim("idle");
    setAvatarError(false);
    setComments([]);
    setCommentsOpen(false);
    setIsVideoReady(false);   // show thumbnail (a real frame) during the source swap → no black flash
    setIsPaused(false);       // don't flash the paused/play indicator on the incoming video
    setUserPaused(false);     // user-pause intent is per-video; reset on recycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.post_id]);

  useEffect(() => {
    setIsMobile(!window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then((authRes: Awaited<ReturnType<typeof supabase.auth.getUser>>) => {
        if (!authRes.data.user) return;
        setViewerUserId(authRes.data.user.id);
        supabase.from("profiles").select("username, display_name, avatar_url").eq("id", authRes.data.user.id).single().then((profileRes: { data: { username: string; display_name: string | null; avatar_url: string | null } | null }) => {
          if (profileRes.data) setViewer({ username: profileRes.data.username, display_name: profileRes.data.display_name ?? profileRes.data.username, avatar_url: profileRes.data.avatar_url ?? undefined });
        });
      });
    });
  }, []);

  // Subscribe to postSyncStore for live like/comment updates
  useEffect(() => {
    const unsub = postSyncStore.subscribe((event) => {
      if (event.postId !== postId) return;
      setLikeCount(event.like_count);
      setLiked(event.liked);
      if (event.comment_count !== undefined) setCommentCount(event.comment_count);
    });
    return unsub;
  }, [postId]);

  useEffect(() => {
    if (!commentsOpen) return;
    setCommentsLoading(true);
    fetch(`/api/posts/${data.post_id}/comments`)
      .then((r) => r.json())
      .then((d) => { if (d.comments) setComments(d.comments); })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [commentsOpen, data.post_id]);

  // Follow state is pre-fetched via initialIsFollowing prop

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!viewerUserId) { openAuthModal(); return; }
    if (followLoading || !data.creator_id) return;

    // Unfollow has no badge UI (button is hidden once following) — keep for completeness.
    if (isFollowing) {
      setFollowLoading(true);
      try {
        await unfollowCreator(data.creator_id);
        setIsFollowing(false);
        onFollowChange?.(data.creator_id, false);
      } catch (err) {
        console.error("Follow error:", err);
      } finally {
        setFollowLoading(false);
      }
      return;
    }

    // Follow: instant green tick → hold → fade away. Don't wait on the network.
    setFollowAnim("tick");
    onFollowChange?.(data.creator_id, true);   // optimistic
    setTimeout(() => setFollowAnim("fading"), 650);
    setTimeout(() => { setIsFollowing(true); setFollowAnim("idle"); }, 1050);

    try {
      await followCreator(data.creator_id);
    } catch (err) {
      console.error("Follow error:", err);
      // Revert on failure.
      setIsFollowing(false);
      setFollowAnim("idle");
      onFollowChange?.(data.creator_id, false);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!viewerUserId) { openAuthModal(); return; }
    const newLiked = !liked;
    const newCount = newLiked ? likeCount + 1 : Math.max(likeCount - 1, 0);
    setLiked(newLiked);
    setLikeCount(newCount);
    postSyncStore.emit({ postId, liked: newLiked, like_count: newCount });
    try {
      const res = await fetch(`/api/posts/${data.post_id}/like`, { method: "POST" });
      const json = await res.json();
      setLiked(json.liked);
      setLikeCount(json.like_count);
      postSyncStore.emit({ postId, liked: json.liked, like_count: json.like_count });
    } catch {
      setLiked(!newLiked);
      setLikeCount(likeCount);
      postSyncStore.emit({ postId, liked: !newLiked, like_count: likeCount });
    }
  };

  const handleAddComment = async (postId: string, text: string, gif_url?: string, parent_comment_id?: string | number, reply_to_username?: string | null, reply_to_id?: string | number | null) => {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, gif_url, parent_comment_id, reply_to_username, reply_to_id }),
    });
    const json = await res.json();
    if (res.ok && json.comment) {
      if (!parent_comment_id) {
        const newCount = commentCount + 1;
        setCommentCount(newCount);
        postSyncStore.emit({ postId, liked, like_count: likeCount, comment_count: newCount });
      }
      if (!parent_comment_id) setComments((prev) => [json.comment, ...prev]);
    }
  };

  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [showSlowDots, setShowSlowDots] = useState(false);
  const slowDotsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeStartYRef = useRef(0);
  const innerRef = useRef<HTMLDivElement>(null);

  const videoSrc = data.bunny_video_id
    ? `https://${STREAM_CDN}/${data.bunny_video_id}/playlist.m3u8`
    : null;

  const videoRatio = (() => {
    if (data.aspect_ratio != null && data.aspect_ratio > 0) return data.aspect_ratio;
    if (data.width && data.height) return data.width / data.height;
    return null;
  })();
  const isPortrait = videoRatio != null ? videoRatio < 0.6 : false;

  const name = data.display_name || data.username;
  const initials = (name[0] ?? "?").toUpperCase();
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Mount animation
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => {
      cancelAnimationFrame(t);
      if (slowDotsTimerRef.current) clearTimeout(slowDotsTimerRef.current);
    };
  }, []);

  // Lock body scroll + force address bar visible
  useEffect(() => {
    if (slotMode) return; // pager owns the single scroll lock; per-slot locking corrupts it
    const savedScroll = window.scrollY;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, behavior: "instant" });
    return () => {
      document.body.style.overflow = prev;
      window.scrollTo({ top: savedScroll, behavior: "instant" });
    };
  }, [slotMode]);

  // Auto-play on mount using HLS.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    // Guard: if this exact src is already attached and loaded on this element
    // (recycled slot landed back on the same video), do NOT tear down and
    // reload — that was collapsing readyState to 0 and causing the back-scroll
    // buffer + AbortError. Just resume.
    if (loadedSrcRef.current === videoSrc && hlsRef.current) {
      console.log("[PAGER-DBG] video-effect SKIP reload (same src already loaded)", { post: data.post_id });
      if (active) { video.muted = isMuted; video.play().catch(() => {}); }
      return;
    }
    loadedSrcRef.current = videoSrc;
    console.log("[PAGER-DBG] video-effect RUN (mount or videoSrc change)", { post: data.post_id, active, hasExistingHls: !!existingHls });
    // Genuinely new src for this element — tear down any previous instance first.
    if (hlsRef.current) { try { hlsRef.current.destroy(); } catch {}; hlsRef.current = null; }
    video.muted = isMuted;

    const tryPlay = () => {
      if (!active) { try { video.pause(); } catch {} return; }
      video.currentTime = initialTime;
      video.play().catch(() => {});
    };

    (async () => {
      const Hls = (await import("hls.js")).default;
      if (Hls.isSupported()) {
        // Reuse the HLS instance the grid already prewarmed for this tile: its
        // manifest is parsed and first segments are buffered, so playback starts
        // almost instantly. Re-attach it to THIS video element instead of doing
        // a cold loadSource (manifest → child → segment chain) on tap.
        if (existingHls) {
          const hls = existingHls;
          hlsRef.current = hls;
          try { hls.detachMedia(); } catch {}
          hls.attachMedia(video);
          if (hls.media && hls.levels && hls.levels.length) {
            // Already parsed — play now.
            tryPlay();
          } else {
            hls.on(Hls.Events.MANIFEST_PARSED, () => { tryPlay(); });
          }
          // Ensure it's actively loading (prewarm may have used a capped level).
          try { hls.startLoad(); } catch {}
        } else {
          const hls = new Hls({ startLevel: -1, capLevelToPlayerSize: false });
          hlsRef.current = hls;
          hls.loadSource(videoSrc);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => { tryPlay(); });
        }
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = videoSrc;
        video.addEventListener("loadeddata", tryPlay, { once: true });
      }
    })();

    return () => {
      // Only pause on cleanup. Do NOT destroy/blank here — if the slot recycles
      // back to the same src, the skip-guard reuses this instance. Genuine src
      // changes destroy the old instance in the load path below; full teardown
      // happens on unmount (separate effect).
      const v = videoRef.current;
      if (v) { try { v.pause(); } catch {} }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoSrc]);

  // Full teardown on unmount only.
  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (v) { try { v.pause(); } catch {}; v.src = ""; }
      if (hlsRef.current) { try { hlsRef.current.destroy(); } catch {} }
      hlsRef.current = null;
      loadedSrcRef.current = null;
    };
  }, []);

  // Sync mute to video
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;  }, [isMuted]);

  // Play only when this slot is the active (centered) one. Neighbours stay
  // mounted and paused on their first frame so there's never a black gap.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      const rs = video.readyState;
      console.log("[PAGER-DBG] activate", { post: data.post_id, readyState: rs, isVideoReady, isPaused, currentTime: video.currentTime.toFixed(2), paused: video.paused });
      setIsPaused(false);
      setUserPaused(false);
      if (video.readyState >= 2) setIsVideoReady(true);
      video.muted = isMuted;
      video.play().then(() => {
        console.log("[PAGER-DBG] play() resolved", { post: data.post_id, readyState: video.readyState });
      }).catch((err) => { console.log("[PAGER-DBG] play() rejected", { post: data.post_id, err: String(err) }); video.muted = true; video.play().catch(() => {}); });
    } else {
      try { video.pause(); } catch {}
    }
  }, [active, isMuted]);

  // Keep isPaused in sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay  = () => setIsPaused(false);
    const onPause = () => setIsPaused(true);
    video.addEventListener("play",  onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play",  onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  const handleVideoTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { setUserPaused(false); video.play().catch(() => {}); }
    else { setUserPaused(true); video.pause(); }
  };

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || isSeeking) return;
    setCurrentTime(video.currentTime);
  }, [isSeeking]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  }, []);

  const seekBarRef = useRef<HTMLDivElement>(null);
  const wasPlayingRef = useRef(false);

  const getSeekFraction = (clientX: number): number => {
    const bar = seekBarRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleSeekPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    wasPlayingRef.current = !videoRef.current?.paused;
    videoRef.current?.pause();
    setIsSeeking(true);
    const newTime = getSeekFraction(e.clientX) * duration;
    setCurrentTime(newTime);
    if (videoRef.current) videoRef.current.currentTime = newTime;
  };

  const handleSeekPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.stopPropagation();
    const newTime = getSeekFraction(e.clientX) * duration;
    setCurrentTime(newTime);
    if (videoRef.current) videoRef.current.currentTime = newTime;
  };

  const handleSeekPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsSeeking(false);
    if (wasPlayingRef.current) videoRef.current?.play().catch(() => {});
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMuteChange(!isMuted);
  };

  const handleClose = () => {
    if (videoRef.current) videoRef.current.pause();
    onClose();
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/${data.username}`);
  };

  return (
    <>
      <style>{`
        @keyframes vfm-scale-in {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes vfm-slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes vfm-slide-down {
          from { transform: translateY(-100%); }
          to   { transform: translateY(0); }
        }
        @keyframes vfm-bar-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes vfm-play-pop {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          40%  { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          70%  { transform: translate(-50%, -50%) scale(0.95); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes vfm-dot { 0%,80%,100%{opacity:0.3;transform:scale(0.85)} 40%{opacity:1;transform:scale(1)} }
        @keyframes vfm-follow-pop { 0%{transform:scale(0.3);opacity:0} 55%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }

        .vfm-panel {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          height: 100dvh;
          left: var(--sidebar-w, 0px);
          right: var(--right-panel-w, 0px);
        }
        .vfm-inner {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        @media (min-width: 1024px) {
          .vfm-panel {
            left: 280px;
            right: 380px;
          }
          .vfm-backdrop {
            left: 280px;
            right: 380px;
            background: transparent !important;
          }
          .vfm-inner {
            max-width: 100% !important;
            max-height: 100% !important;
            border-radius: 0 !important;
          }
        }
        .vfm-action-btn {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .vfm-action-btn span {
          font-size: 13px;
          color: rgba(255,255,255,0.75);
          font-family: 'Inter', sans-serif;
          font-weight: 600;
        }
        @media (min-width: 768px) {
          .vfm-panel {
            background: rgba(0,0,0,0.75);
            backdrop-filter: blur(8px);
          }
          .vfm-inner {
            max-width: 420px;
            max-height: 90vh;
            border-radius: 16px;
            box-shadow: 0 32px 80px rgba(0,0,0,0.8);
          }
        }
        @media (min-width: 1024px) {
          .vfm-panel {
            background: transparent;
            backdrop-filter: none;
          }
        }
      `}</style>

      {/* Backdrop */}
      {!slotMode && (
        <div
          className="vfm-backdrop"
          style={{ position: "fixed", inset: 0, zIndex: 9998, backgroundColor: "#000" }}
          onClick={handleClose}
          onTouchMove={(e) => e.preventDefault()}
        />
      )}

      <div
        className="vfm-panel"
        style={
          slotMode
            ? { position: "absolute", inset: 0, opacity: 1 }
            : {
                animation: mounted
                  ? (enterFrom === "bottom"
                      ? "vfm-slide-up 0.28s cubic-bezier(0.22,1,0.36,1) forwards"
                      : enterFrom === "top"
                      ? "vfm-slide-down 0.28s cubic-bezier(0.22,1,0.36,1) forwards"
                      : "vfm-scale-in 0.2s ease-out forwards")
                  : "none",
                opacity: mounted ? undefined : 0,
                touchAction: "none",
              }
        }
      >
        {/* Close button — top left */}
        <button
          onClick={(e) => { e.stopPropagation(); handleClose(); }}
          style={{
            position: "absolute", top: 12, left: 12, zIndex: 10001,
            background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%",
            width: 44, height: 44, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer",
            backdropFilter: "blur(6px)", WebkitTapHighlightColor: "transparent",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.65)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.45)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Mute — top right */}
        <button
          onClick={toggleMute}
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 10001,
            background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%",
            width: 44, height: 44, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer",
            backdropFilter: "blur(6px)", WebkitTapHighlightColor: "transparent",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.65)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.45)")}
        >
          {isMuted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>

        <div
          className="vfm-inner"
          ref={innerRef}
          onTouchStart={(e) => {
            if (slotMode) return;
            swipeStartYRef.current = e.touches[0].clientY;
            if (innerRef.current) innerRef.current.style.transition = "none";
          }}
          onTouchMove={(e) => {
            if (slotMode) return;
            const delta = e.touches[0].clientY - swipeStartYRef.current;
            if (isSeeking) return;
            if (innerRef.current) {
              if (delta > 0) {
                // Downward: drag (close or previous).
                const prog = Math.min(delta / 350, 1);
                innerRef.current.style.transform = `translateY(${delta * 0.55}px) scale(${1 - prog * 0.06})`;
                innerRef.current.style.borderRadius = `${prog * 20}px`;
              } else if (hasNext) {
                // Upward: small lift hint toward the next video.
                innerRef.current.style.transform = `translateY(${delta * 0.25}px)`;
              }
            }
          }}
          onTouchEnd={(e) => {
            if (slotMode) return;
            const delta = e.changedTouches[0].clientY - swipeStartYRef.current;
            const reset = () => {
              if (innerRef.current) {
                innerRef.current.style.transition = "transform 380ms cubic-bezier(0.34,1.56,0.64,1), border-radius 280ms ease";
                innerRef.current.style.transform = "none";
                innerRef.current.style.borderRadius = "";
              }
            };
            if (delta <= -80 && hasNext && onNext) {
              // Swipe up → next video.
              onNext();
            } else if (delta > 120) {
              // Big swipe down → if there's a previous video go to it, else close.
              if (hasPrev && onPrev && delta < 260) { onPrev(); reset(); }
              else handleClose();
            } else {
              reset();
            }
          }}
        >

          {/* Thumbnail — visible until first frame plays */}
          {!isVideoReady && data.thumbnail_url && (
            <img
              src={data.thumbnail_url}
              alt=""
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: isMobile && isPortrait ? "cover" : "contain",
                zIndex: 9999,
                pointerEvents: "none",
              }}
            />
          )}

          {/* Slow dots */}
          {!isVideoReady && showSlowDots && active && (
            <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)", zIndex: 10002, display: "flex", justifyContent: "center", gap: "6px", pointerEvents: "none" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#8B5CF6", animation: "vfm-dot 1.2s infinite ease-in-out", animationDelay: "0s" }} />
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#B44DD4", animation: "vfm-dot 1.2s infinite ease-in-out", animationDelay: "0.2s" }} />
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#EC4899", animation: "vfm-dot 1.2s infinite ease-in-out", animationDelay: "0.4s" }} />
            </div>
          )}

          {/* Video */}
          {videoSrc && (
            <video
              ref={videoRef}
              muted={isMuted}
              playsInline
              loop
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onWaiting={() => {
                // Only show the loading dots if the ACTIVE video genuinely
                // stalls — and only after a short grace period, so a
                // prewarmed/ready video that starts instantly never shows them.
                if (!active) return;
                if (slowDotsTimerRef.current) clearTimeout(slowDotsTimerRef.current);
                slowDotsTimerRef.current = setTimeout(() => setShowSlowDots(true), 500);
              }}
              onCanPlay={() => {
                if (slowDotsTimerRef.current) { clearTimeout(slowDotsTimerRef.current); slowDotsTimerRef.current = null; }
                setShowSlowDots(false);
              }}
              onPlaying={() => {
                if (slowDotsTimerRef.current) { clearTimeout(slowDotsTimerRef.current); slowDotsTimerRef.current = null; }
                setShowSlowDots(false);
                setIsVideoReady(true);
              }}
              onClick={handleVideoTap}
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: isMobile && isPortrait ? "cover" : "contain",
                backgroundColor: "#000",
                display: "block",
                cursor: "pointer",
              }}
            />
          )}

          {/* Play icon when paused */}
          {userPaused && !isSeeking && active && (
            <div
              onClick={handleVideoTap}
              style={{
                position: "absolute", top: "50%", left: "50%",
                zIndex: 10000, pointerEvents: "auto", cursor: "pointer",
                animation: "vfm-play-pop 0.25s ease-out forwards",
                transform: "translate(-50%, -50%)",
                filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.6))",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.92)" stroke="none" style={{ marginLeft: 5 }}>
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          )}

          {/* ── Right-side action column ── */}
          <div
            style={{
              position: "absolute",
              right: 4,
              bottom: isMobile ? 220 : 120,
              zIndex: 10001,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              animation: mounted ? "vfm-bar-up 0.25s ease-out 0.05s both" : "none",
            }}
          >
          
            {/* Desktop-only paging arrows (hidden on mobile) */}
            {!isMobile && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <button
                  aria-label="Previous video"
                  onClick={(e) => { e.stopPropagation(); if (hasPrev && onPrev) onPrev(); }}
                  disabled={!hasPrev}
                  style={{
                    width: 40, height: 40, borderRadius: "50%", border: "none",
                    background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: hasPrev ? "pointer" : "default", opacity: hasPrev ? 1 : 0.3,
                    transition: "background 0.2s, opacity 0.2s",
                  }}
                  onMouseEnter={(e) => { if (hasPrev) e.currentTarget.style.background = "rgba(0,0,0,0.7)"; }}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.45)")}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                </button>
                <button
                  aria-label="Next video"
                  onClick={(e) => { e.stopPropagation(); if (hasNext && onNext) onNext(); }}
                  disabled={!hasNext}
                  style={{
                    width: 40, height: 40, borderRadius: "50%", border: "none",
                    background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: hasNext ? "pointer" : "default", opacity: hasNext ? 1 : 0.3,
                    transition: "background 0.2s, opacity 0.2s",
                  }}
                  onMouseEnter={(e) => { if (hasNext) e.currentTarget.style.background = "rgba(0,0,0,0.7)"; }}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.45)")}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
              </div>
            )}

            {/* Subscribers */}
            <button className="vfm-action-btn" onClick={handleProfileClick}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#F5C842" stroke="none">
                <path d="M2 18h20" stroke="#F5C842" strokeWidth="1.7" strokeLinecap="round" /><path d="M4 18L2 8l4.5 4L12 4l5.5 8L22 8l-2 10H4z" />
              </svg>
              <span style={{ color: "#F5C842" }}>{formatCount(data.subscriber_count)}</span>
            </button>

            {/* Likes */}
            <button className="vfm-action-btn" onClick={handleLike}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill={liked ? "#EC4899" : "rgba(255,255,255,0.9)"} stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{formatCount(likeCount)}</span>
            </button>

            {/* Comments */}
            <button className="vfm-action-btn" onClick={(e) => { e.stopPropagation(); if (!viewerUserId) { openAuthModal(); return; } setCommentsOpen(true); }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" stroke="none">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              <span>{formatCount(commentCount)}</span>
            </button>
          </div>
          {/* ── Bottom stack: avatar + caption + timer + seekbar ── */}
          <div
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10001, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Avatar + name + caption — hidden while seeking */}
            {!isSeeking && (
              <div style={{ paddingLeft: 14, paddingRight: 76, paddingBottom: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: data.caption ? 8 : 0 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <button
                      onClick={handleProfileClick}
                      style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(255,255,255,0.3)", padding: 0, cursor: "pointer", display: "block", WebkitTapHighlightColor: "transparent", background: "none" }}
                    >
                      {avatarError || !data.avatar_url ? (
                        <div style={{ width: "100%", height: "100%", background: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
                          {initials}
                        </div>
                      ) : (
                        <img src={data.avatar_url} alt={name} onError={() => setAvatarError(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      )}
                    </button>
                    {!isFollowing && (
                      <button
                        onClick={handleFollowToggle}
                        disabled={followLoading || followAnim !== "idle"}
                        style={{
                          position: "absolute", bottom: 0, right: 0, width: 18, height: 18,
                          borderRadius: "50%",
                          background: followAnim === "idle" ? "#8B5CF6" : "#22C55E",
                          border: "2px solid #0a0a0f", display: "flex", alignItems: "center",
                          justifyContent: "center", cursor: "pointer", padding: 0,
                          WebkitTapHighlightColor: "transparent",
                          opacity: followAnim === "fading" ? 0 : 1,
                          transform: followAnim === "fading" ? "scale(0.6)" : "scale(1)",
                          transition: "opacity 0.35s ease, transform 0.35s ease, background 0.2s ease",
                        }}
                      >
                        {followAnim === "idle" ? (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "vfm-follow-pop 0.3s ease-out" }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                  <div onClick={handleProfileClick} style={{ cursor: "pointer", minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{data.username}</p>
                  </div>
                </div>
                {data.caption && <CaptionExpander caption={data.caption} />}
              </div>
            )}

            {/* Big timer while seeking */}
            {isSeeking && (
              <div style={{ paddingLeft: 14, paddingBottom: 0 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: "#fff", fontFamily: "'Inter',sans-serif", letterSpacing: "-0.5px", lineHeight: 1 }}>
                  {formatTime(currentTime)}
                </span>
                <span style={{ fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.5)", fontFamily: "'Inter',sans-serif", marginLeft: "6px" }}>
                  / {formatTime(duration)}
                </span>
              </div>
            )}

            {/* Seekbar */}
            <div
              ref={seekBarRef}
              onPointerDown={handleSeekPointerDown}
              onPointerMove={handleSeekPointerMove}
              onPointerUp={handleSeekPointerUp}
              onPointerCancel={handleSeekPointerUp}
              style={{ position: "relative", width: "100%", height: "36px", display: "flex", alignItems: "flex-end", touchAction: "none", cursor: "pointer", paddingBottom: "2px", boxSizing: "border-box", pointerEvents: "auto" }}
            >
              <div style={{ position: "absolute", left: 0, right: 0, height: isSeeking ? "5px" : "3px", borderRadius: "2px", background: "rgba(255,255,255,0.25)", transition: "height 0.15s ease" }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${progress}%`, background: "rgba(255,255,255,0.95)", borderRadius: "2px" }} />
                {isSeeking && (
                  <div style={{ position: "absolute", top: "50%", left: `${progress}%`, transform: "translate(-50%, -50%)", width: "13px", height: "13px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.4)", pointerEvents: "none" }} />
                )}
              </div>
            </div>
          </div>

          {/* Bottom gradient for readability */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "220px",
            background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
            pointerEvents: "none", zIndex: 9999,
          }} />

        </div>
      </div>

      <CommentSection
        postId={String(data.post_id)}
        comments={comments}
        viewer={viewer}
        viewerUserId={viewerUserId}
        onAddComment={handleAddComment}
        onDeleteComment={() => {
          const newCount = Math.max(commentCount - 1, 0);
          setCommentCount(newCount);
          postSyncStore.emit({ postId, liked, like_count: likeCount, comment_count: newCount });
        }}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        isLoading={commentsLoading}
        totalCommentCount={commentCount}
      />
    </>
  );
}