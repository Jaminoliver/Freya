"use client";

import * as React from "react";
import { decode } from "blurhash";
import Hls from "hls.js";
import { useAppStore } from "@/lib/store/appStore";
import { useRouter } from "next/navigation";
import { postSyncStore } from "@/lib/store/postSyncStore";
import { followCreator, unfollowCreator } from "@/lib/utils/follow";
import CommentSection from "@/components/profile/CommentSection";
import type { ApiComment } from "@/components/profile/CommentSection";

export interface PostFullscreenData {
  post_id:          string | number;
  bunny_video_id:   string | null;
  thumbnail_url?:   string | null;
  display_name:     string;
  username:         string;
  avatar_url?:      string | null;
  creator_id?:      string;
  caption?:         string | null;
  like_count:       number;
  liked:            boolean;
  comment_count:    number;
  subscriber_count: number;
  aspect_ratio?:    number | null;
  width?:           number | null;
  height?:          number | null;
}

// ── Mute persistence ──────────────────────────────────────────────────────────
const MUTE_KEY = "vp_muted";
function getSavedMute(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "true"; } catch { return false; }
}
function saveMute(v: boolean) {
  try { localStorage.setItem(MUTE_KEY, String(v)); } catch { }
}

const BUNNY_PULL_ZONE = "vz-8bc100f4-3c0.b-cdn.net";
const STREAM_CDN      = process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME ?? BUNNY_PULL_ZONE;

const watchedVideoIds = new Set<string>();
export const warmedVideoIds    = new Set<string>();
export const preloadedSegments = new Set<string>();

let anyFullscreenOpen = false;
let currentlyPlayingVideo: HTMLVideoElement | null = null;

export function setGlobalFullscreenOpen(open: boolean) { anyFullscreenOpen = open; }

export function getBunnyThumbnail(videoId: string) { return `https://${BUNNY_PULL_ZONE}/${videoId}/thumbnail.jpg`; }
export function getBunnyHLS(videoId: string)        { return `https://${BUNNY_PULL_ZONE}/${videoId}/playlist.m3u8`; }
export function getBunnyMP4(videoId: string, resolution: "1080" | "720" | "480" = "1080") {
  return `https://${BUNNY_PULL_ZONE}/${videoId}/play_${resolution}p.mp4`;
}

const W = 128, H = 128;

function BlurHashCanvas({ hash, style }: { hash: string; style?: React.CSSProperties }) {
  const canvasRef = React.useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || !hash) return;
    try {
      const pixels    = decode(hash, W, H);
      const ctx       = canvas.getContext("2d");
      if (!ctx) return;
      const imageData = ctx.createImageData(W, H);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch { }
  }, [hash]);
  return <canvas ref={canvasRef} width={W} height={H} style={{ ...style, imageRendering: "auto" }} />;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

// ── Seek Hook ─────────────────────────────────────────────────────────────────
function useSeekBar(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const trackRef      = React.useRef<HTMLDivElement>(null);
  const isSeekingRef  = React.useRef(false);
  const wasPlayingRef = React.useRef(false);
  const [isSeeking, setIsSeeking] = React.useState(false);

  const getFraction = React.useCallback((clientX: number) => {
    const bar = trackRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const onPointerDown = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation(); e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const video = videoRef.current;
    wasPlayingRef.current = !!(video && !video.paused);
    if (wasPlayingRef.current) video?.pause();
    isSeekingRef.current = true;
    setIsSeeking(true);
    const t = getFraction(e.clientX) * (video?.duration || 0);
    if (video) video.currentTime = t;
  }, [videoRef, getFraction]);

  const onPointerMove = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSeekingRef.current) return;
    e.stopPropagation(); e.preventDefault();
    const video = videoRef.current;
    const t = getFraction(e.clientX) * (video?.duration || 0);
    if (video) video.currentTime = t;
  }, [videoRef, getFraction]);

  const onPointerUp = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isSeekingRef.current = false;
    setIsSeeking(false);
    if (wasPlayingRef.current) videoRef.current?.play().catch(() => {});
  }, [videoRef]);

  return { trackRef, isSeeking, onPointerDown, onPointerMove, onPointerUp };
}

// ── Caption Expander ──────────────────────────────────────────────────────────
function CaptionExpander({ caption }: { caption: string }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <p
      onClick={() => setExpanded((e) => !e)}
      style={{
        margin: 0, fontSize: 14, lineHeight: "1.4",
        color: "rgba(255,255,255,0.9)", fontFamily: "'Inter', sans-serif",
        wordBreak: "break-word", cursor: "pointer",
        ...(expanded ? {} : { overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }),
      }}
    >
      {caption}
    </p>
  );
}

// ── Fullscreen Modal ──────────────────────────────────────────────────────────
interface ModalProps {
  data:               PostFullscreenData;
  onClose:            () => void;
  initialTime?:       number;
  existingHls?:       any;
  isMuted:            boolean;
  onMuteChange:       (muted: boolean) => void;
  initialIsFollowing?: boolean;
  onFollowChange?:    (creatorId: string, isFollowing: boolean) => void;
}

function VideoFullscreenModal({
  data,
  onClose,
  initialTime = 0,
  existingHls,
  isMuted,
  onMuteChange,
  initialIsFollowing = false,
  onFollowChange,
}: ModalProps) {
  const router        = useRouter();
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  console.log("[VideoModal] mounted at", performance.now().toFixed(1));

  useEffect(() => { if (data.username) router.prefetch(`/${data.username}`); }, [data.username, router]);

  const videoRef   = React.useRef<HTMLVideoElement>(null);
  const hlsRef     = React.useRef<any>(null);
  const innerRef   = React.useRef<HTMLDivElement>(null);
  const swipeStartYRef = React.useRef(0);

  const [avatarError, setAvatarError] = React.useState(false);
  const [mounted,     setMounted]     = React.useState(false);
  const [isPaused,    setIsPaused]    = React.useState(false);
  const [isMobile,    setIsMobile]    = React.useState(false);

  const postId = String(data.post_id);
  const cached = postSyncStore.get(postId);
  const [likeCount,    setLikeCount]    = React.useState(cached?.like_count    ?? data.like_count    ?? 0);
  const [liked,        setLiked]        = React.useState(cached?.liked         ?? data.liked ?? false);
  const [commentCount, setCommentCount] = React.useState(cached?.comment_count ?? data.comment_count ?? 0);

  const [isFollowing,   setIsFollowing]   = React.useState(initialIsFollowing);
  const [followLoading, setFollowLoading] = React.useState(false);

  const [commentsOpen,    setCommentsOpen]    = React.useState(false);
  const [comments,        setComments]        = React.useState<ApiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = React.useState(false);
  const [viewer,          setViewer]          = React.useState<{ username: string; display_name: string; avatar_url?: string } | null>(null);
  const [viewerUserId,    setViewerUserId]    = React.useState<string | undefined>(undefined);

  const [currentTime,  setCurrentTime]  = React.useState(initialTime);
  const [duration,     setDuration]     = React.useState(0);
  const [isSeeking,    setIsSeeking]    = React.useState(false);
  const [isVideoReady, setIsVideoReady] = React.useState(false);
  const [showSlowDots, setShowSlowDots] = React.useState(false);

  const slowDotsTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekBarRef       = React.useRef<HTMLDivElement>(null);
  const wasPlayingRef    = React.useRef(false);

  React.useEffect(() => {
    setIsMobile(!window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  React.useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then((authRes: any) => {
        if (!authRes.data.user) return;
        setViewerUserId(authRes.data.user.id);
        supabase.from("profiles").select("username, display_name, avatar_url").eq("id", authRes.data.user.id).single().then((profileRes: any) => {
          if (profileRes.data) setViewer({ username: profileRes.data.username, display_name: profileRes.data.display_name ?? profileRes.data.username, avatar_url: profileRes.data.avatar_url ?? undefined });
        });
      });
    });
  }, []);

  React.useEffect(() => {
    const unsub = postSyncStore.subscribe((event) => {
      if (event.postId !== postId) return;
      setLikeCount(event.like_count);
      setLiked(event.liked);
      if (event.comment_count !== undefined) setCommentCount(event.comment_count);
    });
    return unsub;
  }, [postId]);

  React.useEffect(() => {
    if (!commentsOpen) return;
    setCommentsLoading(true);
    fetch(`/api/posts/${data.post_id}/comments`)
      .then((r) => r.json())
      .then((d) => { if (d.comments) setComments(d.comments); })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [commentsOpen, data.post_id]);

  const videoSrc = data.bunny_video_id
    ? `https://${STREAM_CDN}/${data.bunny_video_id}/playlist.m3u8`
    : null;

  const videoRatio = (() => {
    if (data.aspect_ratio != null && data.aspect_ratio > 0) return data.aspect_ratio;
    if (data.width && data.height) return data.width / data.height;
    return null;
  })();
  const isPortrait = videoRatio != null ? videoRatio < 0.6 : false;

  const name     = data.display_name || data.username;
  const initials = (name[0] ?? "?").toUpperCase();
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Mount animation + slow dots
  React.useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    slowDotsTimerRef.current = setTimeout(() => setShowSlowDots(true), 800);
    return () => {
      cancelAnimationFrame(t);
      if (slowDotsTimerRef.current) clearTimeout(slowDotsTimerRef.current);
    };
  }, []);

  // Lock body scroll
  React.useEffect(() => {
    const savedScroll = window.scrollY;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, behavior: "instant" });
    return () => {
      document.body.style.overflow = prev;
      window.scrollTo({ top: savedScroll, behavior: "instant" });
    };
  }, []);

  // HLS setup — attach existing or init new
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    video.muted = isMuted;

    const tryPlay = () => {
      video.currentTime = initialTime;
      video.play().catch(() => {});
    };

    (async () => {
      if (existingHls) {
        hlsRef.current = existingHls;
        existingHls.attachMedia(video);
        existingHls.on(Hls.Events.MANIFEST_PARSED, () => { tryPlay(); });
        if (existingHls.media) tryPlay();
      } else {
        const HlsMod = (await import("hls.js")).default;
        if (HlsMod.isSupported()) {
          const hls = new HlsMod({ startLevel: -1, capLevelToPlayerSize: false });
          hlsRef.current = hls;
          hls.loadSource(videoSrc);
          hls.attachMedia(video);
          hls.on(HlsMod.Events.MANIFEST_PARSED, () => { tryPlay(); });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = videoSrc;
          video.addEventListener("loadeddata", tryPlay, { once: true });
        }
      }
    })();

    return () => {
      const v = videoRef.current;
      if (v) { v.pause(); if (!existingHls) v.src = ""; }
      if (!existingHls && hlsRef.current) {
        hlsRef.current.destroy();
      }
      hlsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoSrc]);

  // Sync mute
  React.useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  // Sync play/pause state
  React.useEffect(() => {
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
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const handleTimeUpdate = React.useCallback(() => {
    const video = videoRef.current;
    if (!video || isSeeking) return;
    setCurrentTime(video.currentTime);
  }, [isSeeking]);

  const handleLoadedMetadata = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  }, []);

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

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!viewerUserId) { openAuthModal(); return; }
    if (followLoading || !data.creator_id) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowCreator(data.creator_id);
        setIsFollowing(false);
        onFollowChange?.(data.creator_id, false);
      } else {
        await followCreator(data.creator_id);
        setIsFollowing(true);
        onFollowChange?.(data.creator_id, true);
      }
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setFollowLoading(false);
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
      const res  = await fetch(`/api/posts/${data.post_id}/like`, { method: "POST" });
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
    const res  = await fetch(`/api/posts/${postId}/comments`, {
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
        setComments((prev) => [json.comment, ...prev]);
      }
    }
  };

  return (
    <>
      <style>{`
        @keyframes vfm-scale-in {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
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

        .vfm-panel {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          height: 100vh; height: 100dvh;
          left: var(--sidebar-w, 0px); right: var(--right-panel-w, 0px);
        }
        .vfm-inner {
          position: relative; width: 100%; height: 100%; overflow: hidden;
        }
        @media (min-width: 1024px) {
          .vfm-panel { left: 280px; right: 380px; }
          .vfm-backdrop { left: 280px; right: 380px; background: transparent !important; }
          .vfm-inner { max-width: 100% !important; max-height: 100% !important; border-radius: 0 !important; }
        }
        .vfm-action-btn {
          background: none; border: none; cursor: pointer;
          display: flex; flex-direction: column; align-items: center;
          gap: 3px; padding: 0; -webkit-tap-highlight-color: transparent;
        }
        .vfm-action-btn span {
          font-size: 13px; color: rgba(255,255,255,0.75);
          font-family: 'Inter', sans-serif; font-weight: 600;
        }
        @media (min-width: 768px) {
          .vfm-panel { background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); }
          .vfm-inner { max-width: 420px; max-height: 90vh; border-radius: 16px; box-shadow: 0 32px 80px rgba(0,0,0,0.8); }
        }
        @media (min-width: 1024px) {
          .vfm-panel { background: transparent; backdrop-filter: none; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="vfm-backdrop"
        style={{ position: "fixed", inset: 0, zIndex: 9998, backgroundColor: "#000" }}
        onClick={handleClose}
        onTouchMove={(e) => e.preventDefault()}
      />

      <div
        className="vfm-panel"
        style={{ animation: mounted ? "vfm-scale-in 0.2s ease-out forwards" : "none", opacity: mounted ? undefined : 0, touchAction: "none" }}
      >
        {/* Close — top left */}
        <button
          onClick={(e) => { e.stopPropagation(); handleClose(); }}
          style={{ position: "absolute", top: 12, left: 12, zIndex: 10001, background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(6px)", WebkitTapHighlightColor: "transparent", transition: "background 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.65)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.45)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Mute — top right */}
        <button
          onClick={toggleMute}
          style={{ position: "absolute", top: 12, right: 12, zIndex: 10001, background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(6px)", WebkitTapHighlightColor: "transparent", transition: "background 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.65)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.45)")}
        >
          {isMuted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          )}
        </button>

        <div
          className="vfm-inner"
          ref={innerRef}
          onTouchStart={(e) => {
            swipeStartYRef.current = e.touches[0].clientY;
            if (innerRef.current) innerRef.current.style.transition = "none";
          }}
          onTouchMove={(e) => {
            const delta = e.touches[0].clientY - swipeStartYRef.current;
            if (delta <= 0 || isSeeking) return;
            const prog = Math.min(delta / 350, 1);
            if (innerRef.current) {
              innerRef.current.style.transform    = `translateY(${delta * 0.55}px) scale(${1 - prog * 0.06})`;
              innerRef.current.style.borderRadius = `${prog * 20}px`;
            }
          }}
          onTouchEnd={(e) => {
            const delta = e.changedTouches[0].clientY - swipeStartYRef.current;
            if (delta > 120) {
              handleClose();
            } else {
              if (innerRef.current) {
                innerRef.current.style.transition   = "transform 380ms cubic-bezier(0.34,1.56,0.64,1), border-radius 280ms ease";
                innerRef.current.style.transform    = "none";
                innerRef.current.style.borderRadius = "";
              }
            }
          }}
        >
          {/* Thumbnail until first frame */}
          {!isVideoReady && data.thumbnail_url && (
            <img
              src={data.thumbnail_url} alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: isMobile && isPortrait ? "cover" : "contain", zIndex: 9999, pointerEvents: "none" }}
            />
          )}

          {/* Slow dots */}
          {!isVideoReady && showSlowDots && (
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
              playsInline loop preload="auto"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlaying={() => {
                console.log("[VideoModal] video playing at", performance.now().toFixed(1));
                if (slowDotsTimerRef.current) { clearTimeout(slowDotsTimerRef.current); slowDotsTimerRef.current = null; }
                setShowSlowDots(false);
                setIsVideoReady(true);
              }}
              onClick={handleVideoTap}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: isMobile && isPortrait ? "cover" : "contain", backgroundColor: "#000", display: "block", cursor: "pointer" }}
            />
          )}

          {/* Play icon when paused */}
          {isPaused && !isSeeking && (
            <div
              onClick={handleVideoTap}
              style={{ position: "absolute", top: "50%", left: "50%", zIndex: 10000, pointerEvents: "auto", cursor: "pointer", animation: "vfm-play-pop 0.25s ease-out forwards", transform: "translate(-50%, -50%)", filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.6))" }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.92)" stroke="none" style={{ marginLeft: 5 }}>
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            </div>
          )}

          {/* Right-side action column */}
          <div
            style={{ position: "absolute", right: 4, bottom: isMobile ? 220 : 120, zIndex: 10001, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, animation: mounted ? "vfm-bar-up 0.25s ease-out 0.05s both" : "none" }}
          >
            {/* Subscribers */}
            <button className="vfm-action-btn" onClick={handleProfileClick}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#F5C842" stroke="none">
                <path d="M2 18h20" stroke="#F5C842" strokeWidth="1.7" strokeLinecap="round"/>
                <path d="M4 18L2 8l4.5 4L12 4l5.5 8L22 8l-2 10H4z"/>
              </svg>
              <span style={{ color: "#F5C842" }}>{formatCount(data.subscriber_count)}</span>
            </button>

            {/* Likes */}
            <button className="vfm-action-btn" onClick={handleLike}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill={liked ? "#EC4899" : "rgba(255,255,255,0.9)"} stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span>{formatCount(likeCount)}</span>
            </button>

            {/* Comments */}
            <button className="vfm-action-btn" onClick={(e) => { e.stopPropagation(); if (!viewerUserId) { openAuthModal(); return; } setCommentsOpen(true); }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" stroke="none">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              <span>{formatCount(commentCount)}</span>
            </button>
          </div>

          {/* Bottom left: creator info */}
          <div
            style={{ position: "absolute", bottom: isMobile ? 12 : 10, left: 12, right: 76, zIndex: 10000, animation: mounted ? "vfm-bar-up 0.25s ease-out 0.05s both" : "none" }}
          >
            {isSeeking ? (
              <div style={{ paddingBottom: "8px" }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: "#fff", fontFamily: "'Inter',sans-serif", letterSpacing: "-0.5px", lineHeight: 1 }}>
                  {formatTime(currentTime)}
                </span>
                <span style={{ fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.5)", fontFamily: "'Inter',sans-serif", marginLeft: "6px" }}>
                  / {formatTime(duration)}
                </span>
              </div>
            ) : (
              <>
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
                        disabled={followLoading}
                        style={{ position: "absolute", bottom: 0, right: 0, width: 18, height: 18, borderRadius: "50%", background: "#8B5CF6", border: "2px solid #0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, WebkitTapHighlightColor: "transparent", transition: "background 0.2s", opacity: followLoading ? 0.6 : 1 }}
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  <div onClick={handleProfileClick} style={{ cursor: "pointer", minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {name}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      @{data.username}
                    </p>
                  </div>
                </div>
                {data.caption && <CaptionExpander caption={data.caption} />}
              </>
            )}
          </div>

          {/* Seekbar */}
          <div
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10001, background: "transparent", padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={seekBarRef}
              onPointerDown={handleSeekPointerDown}
              onPointerMove={handleSeekPointerMove}
              onPointerUp={handleSeekPointerUp}
              onPointerCancel={handleSeekPointerUp}
              style={{ position: "relative", width: "100%", height: "36px", display: "flex", alignItems: "flex-end", touchAction: "none", cursor: "pointer", paddingBottom: "2px", boxSizing: "border-box" }}
            >
              <div style={{ position: "absolute", left: 0, right: 0, height: isSeeking ? "5px" : "3px", borderRadius: "2px", background: "rgba(255,255,255,0.25)", transition: "height 0.15s ease" }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${progress}%`, background: "rgba(255,255,255,0.95)", borderRadius: "2px" }} />
                {isSeeking && (
                  <div style={{ position: "absolute", top: "50%", left: `${progress}%`, transform: "translate(-50%, -50%)", width: "13px", height: "13px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.4)", pointerEvents: "none" }} />
                )}
              </div>
            </div>
          </div>

          {/* Bottom gradient */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "220px", background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)", pointerEvents: "none", zIndex: 9999 }} />
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

// ── Custom Controls Overlay ───────────────────────────────────────────────────
interface ControlsProps {
  videoRef:         React.RefObject<HTMLVideoElement | null>;
  containerRef:     React.RefObject<HTMLDivElement | null>;
  isMuted:          boolean;
  onToggleMute:     () => void;
  onFirstPlay?:     () => void;
  isMobile?:        boolean;
  isPortrait?:      boolean;
  bottomOffset?:    number;
  isPlaying?:       boolean;
  isStarted?:       boolean;
  onOpenFullscreen?: () => void;
  displayName?:     string;
  username?:        string;
  avatarUrl?:       string | null;
  caption?:         string | null;
  isBuffering?:     boolean;
  isLoading?:       boolean;
  onPosterPlay?:    () => void;
  durationSeconds?: number | null;
}

function VideoControls({
  videoRef,
  isMuted,
  onToggleMute,
  onFirstPlay,
  isMobile,
  bottomOffset = 0,
  isPlaying: isPlayingProp = false,
  isStarted = false,
  onOpenFullscreen,
  isBuffering = false,
  isLoading = false,
  onPosterPlay,
  durationSeconds = null,
}: ControlsProps) {
  const [playing,     setPlaying]    = React.useState(() => !!(videoRef.current && !videoRef.current.paused));
  const [centerFlash, setCenterFlash] = React.useState<"play" | "pause" | null>(null);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration,    setDuration]   = React.useState(() => durationSeconds ?? videoRef.current?.duration ?? 0);
  const [timerFaded,  setTimerFaded] = React.useState(false);
  const [buffered,    setBuffered]   = React.useState(0);
  const [visible,     setVisible]    = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const { trackRef, isSeeking, onPointerDown: seekPointerDown, onPointerMove: seekPointerMove, onPointerUp: seekPointerUp } = useSeekBar(videoRef);

  const showControls = React.useCallback(() => {
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused && !isSeeking) setVisible(false);
    }, 1500);
  }, [videoRef, isSeeking]);

  React.useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);
  React.useEffect(() => { if (isPlayingProp) showControls(); }, [isPlayingProp, showControls]);
  React.useEffect(() => {
    if (!isPlayingProp) return;
    const t = setTimeout(() => setTimerFaded(true), 5000);
    return () => clearTimeout(t);
  }, [isPlayingProp]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay   = () => { setPlaying(true); onFirstPlay?.(); showControls(); };
    const onPause  = () => { setPlaying(false); setVisible(true); if (hideTimer.current) clearTimeout(hideTimer.current); };
    const onTime   = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1));
    };
    const onMeta  = () => setDuration(video.duration);
    const onEnded = () => { setPlaying(false); setVisible(true); };
    const onFs    = () => setIsFullscreen(!!document.fullscreenElement);
    video.addEventListener("play",              onPlay);
    video.addEventListener("pause",             onPause);
    video.addEventListener("timeupdate",        onTime);
    video.addEventListener("loadedmetadata",    onMeta);
    video.addEventListener("ended",             onEnded);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      video.removeEventListener("play",           onPlay);
      video.removeEventListener("pause",          onPause);
      video.removeEventListener("timeupdate",     onTime);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("ended",          onEnded);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [videoRef, showControls]);

  const flashCenter = React.useCallback((type: "play" | "pause") => {
    if (type === "pause") return;
    setCenterFlash(type);
    setTimeout(() => setCenterFlash(null), 600);
  }, []);

  const handlePlayPause = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { onPosterPlay ? onPosterPlay() : video.play().catch(() => {}); flashCenter("play"); }
    else              { video.pause(); flashCenter("pause"); }
    showControls();
  }, [videoRef, showControls, flashCenter, onPosterPlay]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufPct   = duration > 0 ? (buffered   / duration) * 100 : 0;

  return (
    <>
      <style>{`
        @keyframes vp-fadein  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes vp-fadeout { from { opacity: 1; } to { opacity: 0; } }
        @keyframes vp-pop     { 0% { transform: translate(-50%,-50%) scale(0.6); opacity: 1; } 100% { transform: translate(-50%,-50%) scale(1.4); opacity: 0; } }
        .vp-controls-bar { transition: opacity 0.25s ease; }
        .vp-seek-thumb { position: absolute; top: 50%; right: -6px; transform: translateY(-50%); width: 14px; height: 14px; border-radius: 50%; background: #8B5CF6; box-shadow: 0 0 0 3px rgba(139,92,246,0.35); pointer-events: none; }
        .vp-center-flash { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%) scale(0.6); pointer-events: none; animation: vp-pop 0.55s ease forwards; }
      `}</style>

      {/* Tap zone */}
      <div
        style={{ position: "absolute", inset: 0, zIndex: 10, WebkitTapHighlightColor: "transparent", userSelect: "none", WebkitUserSelect: "none", touchAction: "manipulation" }}
        onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; if (isMobile) return; handlePlayPause(e); }}
        onTouchStart={(e) => {
          e.stopPropagation();
          const touch = e.touches[0];
          (e.currentTarget as HTMLDivElement).dataset.touchStart  = String(Date.now());
          (e.currentTarget as HTMLDivElement).dataset.touchStartX = String(touch.clientX);
          (e.currentTarget as HTMLDivElement).dataset.touchStartY = String(touch.clientY);
        }}
        onTouchEnd={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          e.stopPropagation(); e.preventDefault();
          const target = e.currentTarget as HTMLDivElement;
          const held = Date.now() - Number(target.dataset.touchStart ?? 0);
          const dist = Math.sqrt(
            (e.changedTouches[0].clientX - Number(target.dataset.touchStartX ?? 0)) ** 2 +
            (e.changedTouches[0].clientY - Number(target.dataset.touchStartY ?? 0)) ** 2
          );
          if (held < 200 && dist < 10) handlePlayPause(e);
        }}
        onTouchCancel={() => {}}
        onMouseMove={() => showControls()}
      />

      {/* Center flash */}
      {centerFlash && (
        <div className="vp-center-flash" style={{ zIndex: 20 }}>
          {centerFlash === "play"
            ? <svg width="44" height="44" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)"><polygon points="5,3 19,12 5,21"/></svg>
            : <svg width="44" height="44" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          }
        </div>
      )}

      {/* Play indicator when paused */}
      {!playing && isStarted && !isBuffering && !isLoading && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 6, pointerEvents: "none" }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      )}

      {/* Seekbar + time — desktop only */}
      {!isMobile && isStarted && !isFullscreen && (
        <div
          className="vp-controls-bar"
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20, opacity: visible ? 1 : 0, pointerEvents: "auto", background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)", padding: "32px 48px 10px 12px", display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", fontFamily: "'Inter', sans-serif", fontWeight: 500, background: "rgba(0,0,0,0.55)", borderRadius: "6px", padding: "2px 8px", backdropFilter: "blur(6px)" }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div
            ref={trackRef} data-seekbar="1"
            onPointerDown={seekPointerDown} onPointerMove={seekPointerMove} onPointerUp={seekPointerUp} onPointerCancel={seekPointerUp}
            style={{ position: "relative", width: "100%", height: "24px", display: "flex", alignItems: "center", cursor: "pointer", touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
          >
            <div style={{ position: "relative", width: "100%", height: isSeeking ? "6px" : "4px", borderRadius: "3px", backgroundColor: "rgba(255,255,255,0.25)", overflow: "visible", transition: "height 0.15s ease" }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${bufPct}%`, backgroundColor: "rgba(255,255,255,0.35)", borderRadius: "3px" }} />
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${progress}%`, background: "linear-gradient(to right, #8B5CF6, #EC4899)", borderRadius: "3px" }}>
                {isSeeking && <div className="vp-seek-thumb" />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time — mobile bottom left */}
      {!isFullscreen && duration > 0 && (
        <div style={{ position: "absolute", bottom: 12, left: 12, zIndex: 22, opacity: timerFaded ? 0 : 1, transition: "opacity 0.5s ease", pointerEvents: "none" }}>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", fontFamily: "'Inter', sans-serif", fontWeight: 500, background: "rgba(0,0,0,0.35)", borderRadius: "6px", padding: "2px 8px" }}>
            {isPlayingProp && currentTime > 0 ? formatTime(Math.max(0, duration - currentTime)) : formatTime(duration)}
          </span>
        </div>
      )}

      {/* Fullscreen button */}
      {!isFullscreen && (
        <button
          style={{ position: "absolute", bottom: 12, right: 12, zIndex: 22, pointerEvents: "auto", background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(6px)", WebkitTapHighlightColor: "transparent" }}
          onClick={(e) => { e.stopPropagation(); onOpenFullscreen?.(); }}
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onOpenFullscreen?.(); }}
          aria-label="Fullscreen"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
            <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
          </svg>
        </button>
      )}
    </>
  );
}

// ── Main VideoPlayer ──────────────────────────────────────────────────────────
interface VideoPlayerProps {
  bunnyVideoId:       string | null;
  thumbnailUrl?:      string | null;
  processingStatus?:  string | null;
  rawVideoUrl?:       string | null;
  fillParent?:        boolean;
  aspectRatio?:       string | null;
  hideInternalBlur?:  boolean;
  blurHash?:          string | null;
  objectFit?:         "contain" | "cover";
  fullscreenTopLeft?: boolean;
  eager?:             boolean;
  knownWidth?:        number | null;
  knownHeight?:       number | null;
  creatorHandle?:     string;
  displayName?:       string;
  username?:          string;
  avatarUrl?:         string | null;
  caption?:           string | null;
  autoPlay?:          boolean;
  hideMuteButton?:    boolean;
  durationSeconds?:   number | null;
  // For fullscreen modal
  postData?:          PostFullscreenData;
  initialIsFollowing?: boolean;
  onFollowChange?:    (creatorId: string, isFollowing: boolean) => void;
}

export interface VideoPlayerHandle {
  pause:          () => void;
  getHls:         () => any;
  getCurrentTime: () => number;
  _videoEl:       HTMLVideoElement | null;
  resume:         (time?: number) => void;
  toggleMute:     () => void;
  isMuted:        () => boolean;
  prewarm:        () => void;
}

const VideoPlayerInner = React.forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer({
  bunnyVideoId,
  thumbnailUrl,
  processingStatus,
  rawVideoUrl,
  fillParent        = false,
  aspectRatio: externalRatio = null,
  hideInternalBlur  = false,
  blurHash,
  objectFit         = "contain",
  fullscreenTopLeft = false,
  eager             = false,
  knownWidth        = null,
  knownHeight       = null,
  creatorHandle,
  displayName,
  username,
  avatarUrl,
  caption,
  autoPlay          = false,
  hideMuteButton    = false,
  durationSeconds   = null,
  postData,
  initialIsFollowing = false,
  onFollowChange,
}: VideoPlayerProps, ref) {
  const videoRef      = React.useRef<HTMLVideoElement | null>(null);
  const containerRef  = React.useRef<HTMLDivElement | null>(null);
  const hlsRef        = React.useRef<any>(null);
  const hasInitialized   = React.useRef(false);
  const bufferTimer      = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingTimer     = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPausedByScroll = React.useRef(false);

  const portalRef           = React.useRef<HTMLDivElement | null>(null);
  const overlayRootRef      = React.useRef<any>(null);
  const originalParent      = React.useRef<Element | null>(null);
  const originalNextSibling = React.useRef<ChildNode | null>(null);
  const origRadiusRef       = React.useRef<string>("");
  const originalSizeRef     = React.useRef<{ width: string; height: string }>({ width: "", height: "" });
  const [isFakeFullscreen,  setIsFakeFullscreen] = React.useState(false);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (getSavedMute()) video.setAttribute("muted", "");
    video.defaultMuted = true;
  }, []);

  const [showPoster,    setShowPoster]    = React.useState(true);
  const [posterLoaded,  setPosterLoaded]  = React.useState(false);
  const [isBuffering,   setIsBuffering]   = React.useState(false);
  const [hasError,      setHasError]      = React.useState(false);
  const [hasStarted,    setHasStarted]    = React.useState(false);
  const [showSlowDots,  setShowSlowDots]  = React.useState(false);
  const [isLoading,     setIsLoading]     = React.useState(false);
  const [internalRatio, setInternalRatio] = React.useState<string | null>(null);
  const [isMuted,       setIsMuted]       = React.useState(() => getSavedMute());
  const [isMobile,      setIsMobile]      = React.useState(() =>
    typeof window !== "undefined"
      ? !window.matchMedia("(hover: hover) and (pointer: fine)").matches
      : false
  );
  const [isPlaying,     setIsPlaying]     = React.useState(false);
  const [isAutoplaying, setIsAutoplaying] = React.useState(false);

  const slowTimer    = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitStartRef = React.useRef<number>(0);
  const stallTimer   = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPlayRef  = React.useRef(autoPlay);
  React.useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);

  React.useEffect(() => {
    const check = () => setIsMobile(!window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [bottomOffset, setBottomOffset] = React.useState(0);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const video = videoRef.current;
      if (!video) return;
      const vw = knownWidth  || video.videoWidth;
      const vh = knownHeight || video.videoHeight;
      if (!vw || !vh) return;
      const el         = fillParent ? (container.parentElement ?? container) : container;
      const containerW = el.offsetWidth;
      const containerH = el.offsetHeight;
      const videoRatio = vw / vh;
      const elemRatio  = containerW / containerH;
      const renderedH  = elemRatio > videoRatio ? containerH : containerW / videoRatio;
      const bars       = Math.max(0, (containerH - renderedH) / 2);
      setBottomOffset(bars > 4 ? Math.round(bars) : 0);
    };
    const ro = new ResizeObserver(update);
    ro.observe(container);
    const onMeta = () => update();
    container.addEventListener("loadedmetadata", onMeta, true);
    update();
    return () => { ro.disconnect(); container.removeEventListener("loadedmetadata", onMeta, true); };
  }, [isMobile, videoRef, knownWidth, knownHeight]);

  const aspectRatio = fillParent ? null : (externalRatio ?? internalRatio);
  const isPortrait  = (() => {
    if (fillParent && knownWidth && knownHeight) return knownHeight > knownWidth;
    if (!aspectRatio) return false;
    if (aspectRatio.includes("/")) { const p = aspectRatio.split("/"); return Number(p[0]) < Number(p[1]); }
    return parseFloat(aspectRatio) < 1;
  })();

  const isTallPortrait = (() => {
    if (fillParent && knownWidth && knownHeight) return knownWidth / knownHeight <= 0.6;
    if (!aspectRatio) return false;
    if (aspectRatio.includes("/")) { const p = aspectRatio.split("/"); return Number(p[0]) / Number(p[1]) <= 0.6; }
    return parseFloat(aspectRatio) <= 0.6;
  })();

  const useRawFallback = processingStatus !== "completed" && !!rawVideoUrl;
  const posterSrc      = thumbnailUrl ?? (bunnyVideoId ? getBunnyThumbnail(bunnyVideoId) : "");

  React.useEffect(() => {
    if (posterLoaded) return;
    const t = setTimeout(() => setPosterLoaded(true), 2500);
    return () => clearTimeout(t);
  }, [posterLoaded]);

  const handlePosterLoad = React.useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setPosterLoaded(true);
    if (fillParent || externalRatio) return;
    const img = e.currentTarget;
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return;
    setInternalRatio(`${w}/${h}`);
  }, [fillParent, externalRatio]);

  const teardown = React.useCallback((force = false) => {
    if (!force && !hasInitialized.current) return;
    const video = videoRef.current;
    if (!force && bunnyVideoId && watchedVideoIds.has(bunnyVideoId)) {
      if (video) video.pause();
      try { hlsRef.current?.pauseBuffering(); } catch {}
      if (slowTimer.current) { clearTimeout(slowTimer.current); slowTimer.current = null; }
      setIsBuffering(false); setShowSlowDots(false);
      return;
    }
    if (video) {
      video.pause();
      if (force || !(bunnyVideoId && watchedVideoIds.has(bunnyVideoId))) video.src = "";
    }
    if (hlsRef.current) { try { hlsRef.current.destroy(); } catch {} hlsRef.current = null; }
    if (slowTimer.current) { clearTimeout(slowTimer.current); slowTimer.current = null; }
    hasInitialized.current = false;
    setIsBuffering(false); setHasStarted(false); setShowSlowDots(false);
  }, [bunnyVideoId]);

  const initVideo = React.useCallback(async () => {
    const video = videoRef.current;
    if (!video || !bunnyVideoId || hasInitialized.current) return;
    hasInitialized.current = true;
    setHasError(false);
    if (video.disableRemotePlayback !== undefined) video.disableRemotePlayback = true;
    try { fetch(getBunnyHLS(bunnyVideoId), { method: "GET", cache: "force-cache" }).catch(() => {}); } catch {}
    if (useRawFallback) { video.src = rawVideoUrl!; video.load(); return; }
    const hlsSrc = getBunnyHLS(bunnyVideoId);
    try {
      if (Hls.isSupported()) {
        const savedBw        = Number(localStorage.getItem("hls_bw")) || 0;
        const conn           = (navigator as any).connection;
        const downlink: number      = conn?.downlink ?? 10;
        const effectiveType: string = conn?.effectiveType ?? "4g";
        const isSlow         = downlink < 5 || effectiveType === "3g" || effectiveType === "2g" || effectiveType === "slow-2g";
        const defaultEstimate = savedBw > 0 ? Math.min(savedBw, downlink * 1_000_000 * 0.8) : downlink * 1_000_000 * 0.8;
        const effectiveBw    = savedBw > 0 ? Math.max(savedBw, downlink * 1_000_000) : downlink * 1_000_000;
        const startLevel     = effectiveBw >= 8_000_000 ? 4 : effectiveBw >= 4_000_000 ? 3 : effectiveBw >= 2_000_000 ? 2 : effectiveBw >= 1_200_000 ? 1 : 0;
        const hls = new Hls({
          startLevel, testBandwidth: !isSlow, capLevelToPlayerSize: true, lowLatencyMode: false,
          abrEwmaDefaultEstimate: defaultEstimate, abrEwmaFastVoD: 2, abrEwmaSlowVoD: 6,
          abrBandWidthFactor: 0.85, abrBandWidthUpFactor: 0.6,
          maxBufferLength: 15, maxMaxBufferLength: 60, backBufferLength: 30, maxStarvationDelay: 2,
        });
        hlsRef.current = hls;
        hls.on(Hls.Events.FRAG_LOADED, () => { localStorage.setItem("hls_bw", String(hls.bandwidthEstimate)); });
        hls.on(Hls.Events.LEVEL_SWITCHED, (_evt: any, data: any) => {
          const level = hls.levels[data.level];
          console.log(`%c[VideoPlayer] 🎬 QUALITY → ${level.height}p (${Math.round(level.bitrate / 1000)}kbps)`, "color: #10B981; font-weight: bold");
        });
        let mediaErrorRecovered = false;
        hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
          if (!data?.fatal) return;
          if (data.type === "mediaError" && !mediaErrorRecovered) { mediaErrorRecovered = true; hls.recoverMediaError(); return; }
          try { hls.destroy(); } catch {}
          hlsRef.current = null; hasInitialized.current = false;
          setHasError(true); setIsBuffering(false);
        });
        hls.loadSource(hlsSrc);
        hls.attachMedia(video);
        video.addEventListener("loadedmetadata", () => {
          const dur = video.duration;
          if (!isFinite(dur) || dur <= 0) return;
          hls.config.maxBufferLength    = Math.min(Math.ceil(dur * 0.5), 60);
          hls.config.maxMaxBufferLength = Math.min(Math.ceil(dur), 120);
        }, { once: true });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = getBunnyHLS(bunnyVideoId);
        video.load();
      }
    } catch { video.src = hlsSrc; }
  }, [bunnyVideoId, useRawFallback, rawVideoUrl]);

  const handleRetry = React.useCallback(async () => {
    setHasError(false);
    hasInitialized.current = false;
    await initVideo();
    try { await videoRef.current?.play(); } catch {}
  }, [initVideo]);

  React.useEffect(() => {
    return () => {
      if (bufferTimer.current)  clearTimeout(bufferTimer.current);
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
      if (stallTimer.current)   clearTimeout(stallTimer.current);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, []);

  React.useEffect(() => {
    if (!bunnyVideoId) return;
    if (watchedVideoIds.has(bunnyVideoId)) return;
    const conn = (navigator as any).connection;
    const ect: string = conn?.effectiveType ?? "4g";
    if (ect === "slow-2g" || ect === "2g") return;
    fetch(getBunnyHLS(bunnyVideoId), { method: "GET", cache: "force-cache" }).catch(() => {});
  }, [bunnyVideoId]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(([entry]) => {
      const rect    = entry.boundingClientRect;
      const centerY = rect.top + rect.height / 2;
      const inView  = centerY > 0 && centerY < window.innerHeight;
      if (!inView) { if (!isBuffering) teardown(); setShowPoster(true); }
    }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });
    observer.observe(container);
    return () => observer.disconnect();
  }, [teardown, isBuffering]);

  const handleLoadedMetadata = React.useCallback(() => {
    if (fillParent || externalRatio) return;
    const video = videoRef.current;
    if (!video) return;
    const { videoWidth: w, videoHeight: h } = video;
    if (!w || !h) return;
    setInternalRatio(`${w}/${h}`);
  }, [fillParent, externalRatio]);

  const handlePosterPlay = React.useCallback(async () => {
    isPausedByScroll.current = false;
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    loadingTimer.current = setTimeout(() => setIsLoading(true), 300);
    const video = videoRef.current;
    if (!hasInitialized.current) await initVideo();
    const savedMute = getSavedMute();
    if (video) video.muted = savedMute;
    setIsMuted(savedMute);
    if (video) { video.setAttribute("playsinline", ""); video.setAttribute("webkit-playsinline", ""); }
    try { await video?.play(); } catch { }
  }, [initVideo]);

  React.useEffect(() => {
    if (!autoPlayRef.current || !bunnyVideoId) return;
    const t = setTimeout(() => { handlePosterPlay().catch(() => {}); }, 100);
    return () => clearTimeout(t);
  }, [bunnyVideoId, handlePosterPlay]);

  const handleToggleMute = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const next = !getSavedMute();
    video.muted = next;
    setIsMuted(next);
    saveMute(next);
  }, []);

  const exitFakeFullscreen = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const first   = container.getBoundingClientRect();
    const parent  = originalParent.current;
    const sibling = originalNextSibling.current;
    container.style.willChange      = "transform";
    container.style.transformOrigin = "top left";
    Object.assign(container.style, { width: originalSizeRef.current.width, height: originalSizeRef.current.height, transition: "none" });
    if (parent) {
      if (sibling) parent.insertBefore(container, sibling);
      else parent.appendChild(container);
    }
    const last   = container.getBoundingClientRect();
    const dx     = first.left - last.left;
    const dy     = first.top  - last.top;
    const scaleX = first.width  / last.width;
    const scaleY = first.height / last.height;
    container.style.transform    = `translate(${dx}px,${dy}px) scale(${scaleX},${scaleY})`;
    container.style.borderRadius = "0px";
    if (portalRef.current) {
      portalRef.current.style.transition      = "background-color 280ms cubic-bezier(0.4,0,0.2,1)";
      portalRef.current.style.backgroundColor = "rgba(0,0,0,0)";
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.style.transition   = "transform 280ms cubic-bezier(0.4,0,0.2,1), border-radius 280ms cubic-bezier(0.4,0,0.2,1)";
        container.style.transform    = "none";
        container.style.borderRadius = origRadiusRef.current || "";
      });
    });
    const onDone = (ev: TransitionEvent) => {
      if (ev.propertyName !== "transform") return;
      container.style.willChange      = "";
      container.style.transformOrigin = "";
      container.style.transition      = "";
      overlayRootRef.current?.unmount();
      overlayRootRef.current = null;
      portalRef.current?.remove();
      portalRef.current = null;
      document.body.style.overflow = "";
      container.classList.remove("vp-portal-active");
      container.removeEventListener("transitionend", onDone);
      setIsFakeFullscreen(false);
      setGlobalFullscreenOpen(false);
    };
    container.addEventListener("transitionend", onDone);
  }, [containerRef]);

  const handleOpenFullscreen = React.useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    originalParent.current      = container.parentElement;
    originalNextSibling.current = container.nextSibling;
    const first      = container.getBoundingClientRect();
    const origRadius = getComputedStyle(container).borderRadius;
    origRadiusRef.current   = origRadius;
    originalSizeRef.current = { width: container.style.width, height: container.style.height };

    container.style.willChange      = "transform";
    container.style.transformOrigin = "top left";

    const portal = document.createElement("div");
    Object.assign(portal.style, {
      position: "fixed", inset: "0", zIndex: "9999",
      backgroundColor: "rgba(0,0,0,0)",
      transition: "background-color 340ms cubic-bezier(0.4,0,0.2,1)",
      touchAction: "none",
    });
    document.body.appendChild(portal);
    portalRef.current = portal;

    Object.assign(container.style, { width: "100%", height: "100%", transition: "none" });
    container.classList.add("vp-portal-active");
    portal.appendChild(container);

    const xBtn = document.createElement("button");
    xBtn.style.cssText = "position:absolute;top:12px;left:12px;z-index:10001;background:rgba(0,0,0,0.45);border:none;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(6px);-webkit-tap-highlight-color:transparent;";
    xBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    xBtn.addEventListener("click",    (ev) => { ev.stopPropagation(); exitFakeFullscreen(); });
    xBtn.addEventListener("touchend", (ev) => { ev.preventDefault(); ev.stopPropagation(); exitFakeFullscreen(); });
    portal.appendChild(xBtn);

    const muteBtn = document.createElement("button");
    const getMuteIcon = (muted: boolean) => muted
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
    muteBtn.style.cssText = "position:absolute;top:12px;right:12px;z-index:10001;background:rgba(0,0,0,0.45);border:none;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(6px);-webkit-tap-highlight-color:transparent;";
    muteBtn.innerHTML = getMuteIcon(getSavedMute());
    const toggleMutePortal = (ev: Event) => {
      ev.preventDefault(); ev.stopPropagation();
      const next = !getSavedMute();
      const video = videoRef.current;
      if (video) video.muted = next;
      setIsMuted(next);
      saveMute(next);
      muteBtn.innerHTML = getMuteIcon(next);
    };
    muteBtn.addEventListener("click",    toggleMutePortal);
    muteBtn.addEventListener("touchend", toggleMutePortal);
    portal.appendChild(muteBtn);

    const last   = container.getBoundingClientRect();
    const dx     = first.left - last.left;
    const dy     = first.top  - last.top;
    const scaleX = first.width  / last.width;
    const scaleY = first.height / last.height;
    container.style.transform    = `translate(${dx}px,${dy}px) scale(${scaleX},${scaleY})`;
    container.style.borderRadius = origRadius;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.style.transition   = "transform 340ms cubic-bezier(0.4,0,0.2,1), border-radius 340ms cubic-bezier(0.4,0,0.2,1)";
        container.style.transform    = "none";
        container.style.borderRadius = "0px";
        portal.style.backgroundColor = "rgba(0,0,0,1)";
      });
    });

    const onDone = (ev: TransitionEvent) => {
      if (ev.propertyName !== "transform") return;
      container.style.willChange = "";
      container.removeEventListener("transitionend", onDone);
    };
    container.addEventListener("transitionend", onDone);
    portal.addEventListener("wheel", (ev) => ev.preventDefault(), { passive: false });

    let swipeStartY = 0;
    portal.addEventListener("touchstart", (ev) => {
      if ((ev.target as HTMLElement).closest("[data-seekbar]")) return;
      swipeStartY = ev.touches[0].clientY;
      container.style.transition = "none";
    }, { passive: true });
    portal.addEventListener("touchmove", (ev) => {
      if ((ev.target as HTMLElement).closest("[data-seekbar]")) return;
      const delta = ev.touches[0].clientY - swipeStartY;
      if (delta <= 0) return;
      ev.preventDefault();
      const prog = Math.min(delta / 320, 1);
      container.style.transform    = `translateY(${delta * 0.55}px) scale(${1 - prog * 0.07})`;
      container.style.borderRadius = `${prog * 20}px`;
      portal.style.backgroundColor = `rgba(0,0,0,${Math.max(0, 1 - prog * 0.65)})`;
    }, { passive: false });
    portal.addEventListener("touchend", (ev) => {
      if ((ev.target as HTMLElement).closest("[data-seekbar]")) return;
      const delta = ev.changedTouches[0].clientY - swipeStartY;
      if (delta > 120) {
        exitFakeFullscreen();
      } else {
        container.style.transition   = "transform 380ms cubic-bezier(0.34,1.56,0.64,1), border-radius 280ms ease";
        container.style.transform    = "none";
        container.style.borderRadius = "0px";
        portal.style.transition      = "background-color 280ms ease";
        portal.style.backgroundColor = "rgba(0,0,0,1)";
      }
    }, { passive: true });

    document.body.style.overflow = "hidden";
    setIsFakeFullscreen(true);
    setGlobalFullscreenOpen(true);
  }, [containerRef, exitFakeFullscreen, videoRef]);

  React.useImperativeHandle(ref, () => ({
    pause:          () => videoRef.current?.pause(),
    getHls:         () => hlsRef.current,
    getCurrentTime: () => videoRef.current?.currentTime ?? 0,
    _videoEl:       videoRef.current,
    toggleMute:     () => handleToggleMute(),
    isMuted:        () => getSavedMute(),
    prewarm: () => {
      if (hasInitialized.current) return;
      const conn = (navigator as any).connection;
      const ect: string = conn?.effectiveType ?? "4g";
      if (ect === "slow-2g" || ect === "2g") return;
      initVideo();
    },
    resume: (time?: number) => {
      const video = videoRef.current;
      if (!video) return;
      isPausedByScroll.current = false;
      setShowPoster(false);
      const doPlay = async () => {
        if (!hasInitialized.current) await initVideo();
        if (hlsRef.current) hlsRef.current.attachMedia(video);
        if (time !== undefined) video.currentTime = time;
        video.muted = getSavedMute();
        video.play().catch(() => {});
      };
      doPlay();
    },
  }));

  const containerStyle: React.CSSProperties = fillParent ? {
    width: "100%", height: "100%", position: "absolute", inset: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  } : {
    width: "100%", position: "relative", overflow: "visible",
    display: "flex", alignItems: "center", justifyContent: "center",
    aspectRatio: aspectRatio ?? "16/9", maxHeight: "80svh",
  };

  if (!bunnyVideoId) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: "100%", aspectRatio: aspectRatio ?? "16/9", backgroundColor: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "3px solid #2A2A3D", borderTop: "3px solid #8B5CF6", animation: "spin 0.9s linear infinite" }} />
          <span style={{ fontSize: "13px", color: "#8A8AA0", fontFamily: "'Inter', sans-serif" }}>Video processing — check back shortly</span>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes vp-dot { 0%, 60%, 100% { opacity: 0.25; transform: scale(0.75); } 30% { opacity: 1; transform: scale(1.15); } }
      `}</style>

      <div ref={containerRef} data-videoplayer style={{ ...containerStyle, position: "relative" }}>

        {!hideInternalBlur && posterSrc && (
          <img src={posterSrc} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(20px) brightness(0.45)", transform: "scale(1.1)", zIndex: 0, pointerEvents: "none", opacity: showPoster ? 0 : 1, transition: showPoster ? "none" : "opacity 0.2s ease" }} />
        )}

        {blurHash && !posterLoaded && (
          <BlurHashCanvas hash={blurHash} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />
        )}

        {(showPoster || isLoading) && (
          <div
            onClick={showPoster ? handlePosterPlay : undefined}
            style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", cursor: showPoster ? "pointer" : "default", opacity: showPoster ? 1 : 0, transition: showPoster ? "opacity 0.25s ease" : "none", pointerEvents: showPoster ? "auto" : "none" }}
          >
            <img src={posterSrc} alt="" fetchPriority="high" onLoad={handlePosterLoad} onError={() => {}} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: objectFit, opacity: posterLoaded ? 1 : 0, transition: "opacity 0.25s ease" }} />
            {!isLoading && !isAutoplaying && !autoPlay && !isBuffering && (
              <svg width="44" height="44" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" style={{ position: "relative", zIndex: 2 }}><polygon points="5,3 19,12 5,21"/></svg>
            )}
          </div>
        )}

        <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
          <video
            ref={videoRef} playsInline preload="metadata" loop muted={isMuted}
            onLoadedMetadata={handleLoadedMetadata}
            onPause={() => {
              setIsPlaying(false); setIsBuffering(false); setIsLoading(false);
              if (bufferTimer.current) { clearTimeout(bufferTimer.current); bufferTimer.current = null; }
              if (stallTimer.current)  { clearTimeout(stallTimer.current);  stallTimer.current  = null; }
            }}
            onEnded={() => { setIsPlaying(false); }}
            onSeeking={() => {
              if (bufferTimer.current) { clearTimeout(bufferTimer.current); bufferTimer.current = null; }
              if (stallTimer.current)  { clearTimeout(stallTimer.current);  stallTimer.current  = null; }
              setIsBuffering(false);
            }}
            onWaiting={() => {
              const video = videoRef.current;
              if (video && video.seeking) return;
              if (video && video.duration && (video.currentTime >= video.duration - 0.5 || video.currentTime <= 0.3)) return;
              if (bufferTimer.current) clearTimeout(bufferTimer.current);
              if (stallTimer.current)  clearTimeout(stallTimer.current);
              waitStartRef.current = Date.now();
              setIsBuffering(true);
              const conn2   = (navigator as any).connection;
              const isSlow2 = (conn2?.downlink ?? 10) < 5 || ["3g","2g","slow-2g"].includes(conn2?.effectiveType ?? "");
              bufferTimer.current = setTimeout(() => {
                const video = videoRef.current;
                if (!video) return;
                stallTimer.current = setTimeout(() => {
                  if (watchedVideoIds.has(bunnyVideoId!)) return;
                  if (video.readyState < 3) {
                    const hls2 = hlsRef.current;
                    if (hls2 && hls2.media) { try { hls2.stopLoad(); hls2.startLoad(-1); } catch {} }
                    video.play().catch(() => {});
                  }
                }, isSlow2 ? 8000 : 3000);
              }, isSlow2 ? 2000 : 800);
            }}
            onPlaying={() => {
              if (bufferTimer.current)  { clearTimeout(bufferTimer.current);  bufferTimer.current  = null; }
              if (slowTimer.current)    { clearTimeout(slowTimer.current);    slowTimer.current    = null; }
              if (stallTimer.current)   { clearTimeout(stallTimer.current);   stallTimer.current   = null; }
              if (loadingTimer.current) { clearTimeout(loadingTimer.current); loadingTimer.current = null; }
              if (currentlyPlayingVideo && currentlyPlayingVideo !== videoRef.current) currentlyPlayingVideo.pause();
              currentlyPlayingVideo = videoRef.current;
              if (bunnyVideoId) watchedVideoIds.add(bunnyVideoId);
              setIsBuffering(false); setHasStarted(true); setIsPlaying(true);
              setShowSlowDots(false); setIsLoading(false); setShowPoster(false); setIsAutoplaying(false);
              if (bunnyVideoId) window.dispatchEvent(new CustomEvent("freya:video-playing", { detail: { bunnyVideoId } }));
            }}
            onError={() => {
              if (videoRef.current && videoRef.current.src === "") return;
              if (!hasStarted) return;
              setHasError(true); setIsBuffering(false);
            }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: objectFit, display: "block", zIndex: 2, opacity: showPoster ? 0 : 1, transition: showPoster ? "opacity 0.25s ease" : "none" }}
          />
        </div>

        {(isLoading || (!hasError && isBuffering)) && (
          <div style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#8B5CF6", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0s" }} />
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#9B4FE8", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.15s" }} />
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#B44DD4", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.3s" }} />
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#EC4899", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.45s" }} />
          </div>
        )}

        {!hideMuteButton && (
          <button
            style={{ position: "absolute", top: 12, right: 12, zIndex: 13, background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(6px)", WebkitTapHighlightColor: "transparent" }}
            onClick={(e) => { e.stopPropagation(); handleToggleMute(); }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleMute(); }}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            )}
          </button>
        )}

        {creatorHandle && (
          <div data-creator-watermark style={{ position: "absolute", top: 0, left: 0, zIndex: 12, pointerEvents: "none", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.9)", fontFamily: "'Inter', sans-serif", letterSpacing: "0.02em", background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)", width: "100%", padding: "2px 8px 20px 8px" }}>
            {creatorHandle}@Fréya.com
          </div>
        )}

        {!hasError && (
          <VideoControls
            videoRef={videoRef}
            containerRef={containerRef}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onFirstPlay={() => setHasStarted(true)}
            isMobile={isMobile}
            isPortrait={(isTallPortrait || objectFit === "cover")}
            bottomOffset={bottomOffset}
            isPlaying={isPlaying}
            isStarted={hasStarted}
            onOpenFullscreen={handleOpenFullscreen}
            displayName={displayName}
            username={username}
            avatarUrl={avatarUrl}
            caption={caption}
            isBuffering={isBuffering}
            isLoading={isLoading}
            onPosterPlay={handlePosterPlay}
            durationSeconds={durationSeconds}
          />
        )}

        {hasError && (
          <div style={{ position: "absolute", inset: 0, zIndex: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", backgroundColor: "rgba(10,10,15,0.85)", backdropFilter: "blur(8px)" }}>
            <span style={{ fontSize: "13px", color: "#C4C4D4", fontFamily: "'Inter', sans-serif" }}>Couldn&apos;t load video</span>
            <button onClick={(e) => { e.stopPropagation(); handleRetry(); }} style={{ padding: "8px 20px", borderRadius: "20px", border: "1px solid #2A2A3D", backgroundColor: "#1A1A2E", color: "#FFFFFF", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              Retry
            </button>
          </div>
        )}
      </div>

   
    </>
  );
});

// ── re-export useEffect alias used inside VideoFullscreenModal ────────────────
const { useEffect } = React;

export default VideoPlayerInner