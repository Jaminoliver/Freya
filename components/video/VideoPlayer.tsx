"use client";

import * as React from "react";
import { decode } from "blurhash";
import Hls from "hls.js";

// ── Mute persistence ──────────────────────────────────────────────────────────
const MUTE_KEY = "vp_muted";
function getSavedMute(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "true"; } catch { return false; }
}
function saveMute(v: boolean) {
  try { localStorage.setItem(MUTE_KEY, String(v)); } catch { }
}

const BUNNY_PULL_ZONE = "vz-8bc100f4-3c0.b-cdn.net";

const watchedVideoIds = new Set<string>();
export const warmedVideoIds    = new Set<string>();
export const preloadedSegments = new Set<string>();
const loadedPosterUrls = new Set<string>();

// Synchronous browser-cache check — avoids the blurhash/poster flash on
// return visits when the image is already in the HTTP cache.
function isPosterCached(src: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const img = new window.Image();
    img.src = src;
    return img.complete && img.naturalWidth > 0;
  } catch { return false; }
}

if (typeof window !== "undefined") {
  window.addEventListener("freya:clear-caches", () => loadedPosterUrls.clear());
}

let anyFullscreenOpen = false;
let currentlyPlayingVideo: HTMLVideoElement | null = null;

export function setGlobalFullscreenOpen(open: boolean) { anyFullscreenOpen = open; }

export function getBunnyThumbnail(videoId: string) {
  return `https://${BUNNY_PULL_ZONE}/${videoId}/thumbnail.jpg`;
}
export function getBunnyHLS(videoId: string) {
  return `https://${BUNNY_PULL_ZONE}/${videoId}/playlist.m3u8`;
}
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
  return (
    <canvas ref={canvasRef} width={W} height={H} style={{ ...style, imageRendering: "auto" }} />
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Unified Seek Hook ─────────────────────────────────────────────────────────
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
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const video = videoRef.current;
    wasPlayingRef.current = !!(video && !video.paused);
    isSeekingRef.current = true;
    setIsSeeking(true);
    const t = getFraction(e.clientX) * (video?.duration || 0);
    if (video) video.currentTime = t;
  }, [videoRef, getFraction]);

  const onPointerMove = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSeekingRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    const t = getFraction(e.clientX) * (video?.duration || 0);
    if (video) video.currentTime = t;
  }, [videoRef, getFraction]);

  const onPointerUp = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isSeekingRef.current = false;
    setIsSeeking(false);
    // Don't play/pause — caller decides
  }, [videoRef]);

  return { trackRef, isSeeking, isSeekingRef, wasPlayingRef, onPointerDown, onPointerMove, onPointerUp };
}

// ── Fullscreen Overlay (rendered inside portal div) ───────────────────────────
interface FullscreenOverlayProps {
  videoRef:    React.RefObject<HTMLVideoElement | null>;
  onClose:     () => void;
  isMuted:     boolean;
  onToggleMute: () => void;
  onPlay?:     () => void;
  displayName?: string;
  username?:   string;
  avatarUrl?:  string | null;
  caption?:        string | null;
  onProfileClick?: () => void;
  wasStarted?:       boolean;
  wasBuffering?:     boolean;
  isPausedByUser?:   React.MutableRefObject<boolean>;
}

function FullscreenOverlay({
  videoRef,
  onClose,
  isMuted,
  onToggleMute,
  onPlay,
  displayName,
  username,
  avatarUrl,
  caption,
  onProfileClick,
  wasStarted   = false,
  wasBuffering = false,
}: FullscreenOverlayProps) {
  const [currentTime, setCurrentTime] = React.useState(() => videoRef.current?.currentTime ?? 0);
  const [duration,    setDuration]    = React.useState(() => videoRef.current?.duration    ?? 0);
  const [isPaused,    setIsPaused]    = React.useState(() => {
    const v = videoRef.current;
    if (!v) return false;
    return v.paused;
  });
  const [isBuffering, setIsBuffering] = React.useState(() => {
    const v = videoRef.current;
    const result = !!v && !v.paused && v.readyState < 3;
    return result;
  });
  const [captionExp,  setCaptionExp]  = React.useState(false);
  const [avatarErr,   setAvatarErr]   = React.useState(false);

  const durationRef = React.useRef(duration);
  React.useEffect(() => { durationRef.current = duration; }, [duration]);

  const seekBarRef    = React.useRef<HTMLDivElement>(null);
  const isSeekingRef  = React.useRef(false);
  const wasPlayingRef = React.useRef(false);
  const [isSeeking,   setIsSeeking] = React.useState(false);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime    = () => { setCurrentTime(video.currentTime); };
    const onMeta    = () => { setDuration(video.duration); durationRef.current = video.duration; };
    const onPlay    = () => { setIsPaused(false); setIsBuffering(false); };
    const onPause   = () => {
      const v = videoRef.current;
      if (v && v.currentTime === 0) return;
      setIsPaused(true);
    };
    const onPlaying = () => { setIsBuffering(false); setIsPaused(false); };
    const onWaiting = () => {
      setIsBuffering(true);
      if (video.seeking) return;
      if ((video as any).__isPausedByUser) return;
      const hls = (video as any).__hls;
      if (hls) { try { hls.stopLoad(); hls.startLoad(-1); } catch {} }
      if (!(video as any).__isPausedByUser) video.play().catch(() => {});
    };
    video.addEventListener("timeupdate",     onTime);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("play",           onPlay);
    video.addEventListener("pause",          onPause);
    video.addEventListener("playing",        onPlaying);
    video.addEventListener("waiting",        onWaiting);
    if (video.duration) { setDuration(video.duration); durationRef.current = video.duration; }
    return () => {
      video.removeEventListener("timeupdate",     onTime);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("play",           onPlay);
      video.removeEventListener("pause",          onPause);
      video.removeEventListener("playing",        onPlaying);
      video.removeEventListener("waiting",        onWaiting);
    };
  }, [videoRef]);

  const seekRectRef = React.useRef<DOMRect | null>(null);

  const handleSeekPointerDown = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const video = videoRef.current;
    wasPlayingRef.current = !video?.paused;
    if (wasPlayingRef.current) video?.pause();
    isSeekingRef.current = true;
    setIsSeeking(true);
    seekRectRef.current = seekBarRef.current!.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - seekRectRef.current.left) / seekRectRef.current.width)) * durationRef.current;
    setCurrentTime(t);
    if (video) video.currentTime = t;
  }, [videoRef]);

  const handleSeekPointerMove = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.stopPropagation();
    const rect = seekRectRef.current;
    if (!rect) return;
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * durationRef.current;
    setCurrentTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  }, [videoRef]);

  const handleSeekPointerUp = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isSeekingRef.current = false;
    setIsSeeking(false);
    if (wasPlayingRef.current) videoRef.current?.play().catch(() => {});
  }, [videoRef]);

  const handleVideoTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) { return; }
    if (video.paused || video.readyState < 3) {
      const hls = (video as any).__hls;
      const isReady = hls ? hls.media && video.readyState >= 1 : (video.src && !video.src.includes("/dashboard"));
      if (!isReady) {
        setIsPaused(false);
        onPlay?.();
      } else {
        setIsPaused(false);
        video.muted = getSavedMute();
        const hls = (video as any).__hls;
        if (hls) { try { hls.startLoad(-1); } catch {} }
        video.play().catch(() => { setIsPaused(true); });
      }
    } else {
      const hls = (video as any).__hls;
      if (hls) { try { hls.stopLoad(); } catch {} }
      video.pause();
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const name     = displayName || username || "";
  const initials = (name[0] ?? "?").toUpperCase();

  return (
    <>
      <style>{`
        @keyframes vfm-play-pop {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.6); }
          40%  { opacity: 1; transform: translate(-50%,-50%) scale(1.1); }
          100% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes vfm-dot { 0%,80%,100%{opacity:0.3;transform:scale(0.85)} 40%{opacity:1;transform:scale(1)} }
      `}</style>

      {/* Tap zone — play/pause */}
      <div
        onClick={handleVideoTap}
        style={{ position: "absolute", inset: 0, zIndex: 6, cursor: "pointer", pointerEvents: "auto" }}
      />

      {/* Buffering dots in fullscreen */}
      {isBuffering && (
        <div style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#8B5CF6", animation: "vfm-dot 1.2s infinite ease-in-out", animationDelay: "0s" }} />
          <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#9B4FE8", animation: "vfm-dot 1.2s infinite ease-in-out", animationDelay: "0.15s" }} />
          <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#B44DD4", animation: "vfm-dot 1.2s infinite ease-in-out", animationDelay: "0.3s" }} />
          <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#EC4899", animation: "vfm-dot 1.2s infinite ease-in-out", animationDelay: "0.45s" }} />
        </div>
      )}

      {/* Play icon when paused */}
      {isPaused && !isSeeking && !isBuffering && (
        <div
          onClick={handleVideoTap}
          style={{ position: "absolute", top: "50%", left: "50%", zIndex: 10, pointerEvents: "auto", cursor: "pointer", animation: "vfm-play-pop 0.25s ease-out forwards", transform: "translate(-50%,-50%)", filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.6))" }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="rgba(255,255,255,0.92)" style={{ marginLeft: 5 }}>
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        </div>
      )}

      {/* Bottom gradient */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "280px", background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)", pointerEvents: "none", zIndex: 2 }} />

      {/* Bottom stack */}
      <div
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 8, display: "flex", flexDirection: "column", justifyContent: "flex-end", pointerEvents: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Big timer while seeking */}
        {isSeeking && (
          <div style={{ paddingLeft: 14, paddingBottom: 10 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: "#fff", fontFamily: "'Inter',sans-serif", letterSpacing: "-0.5px", lineHeight: 1 }}>
              {formatTime(currentTime)}
            </span>
            <span style={{ fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.5)", fontFamily: "'Inter',sans-serif", marginLeft: 6 }}>
              / {formatTime(duration)}
            </span>
          </div>
        )}

        {/* Seekbar */}
        <div
          ref={seekBarRef}
          data-seekbar="1"
          onPointerDown={handleSeekPointerDown}
          onPointerMove={handleSeekPointerMove}
          onPointerUp={handleSeekPointerUp}
          onPointerCancel={handleSeekPointerUp}
          style={{ position: "relative", width: "100%", height: "36px", display: "flex", alignItems: "flex-end", touchAction: "none", cursor: "pointer", userSelect: "none", WebkitUserSelect: "none", paddingBottom: "2px", boxSizing: "border-box" }}
        >
          <div style={{ position: "relative", width: "100%", height: isSeeking ? "5px" : "3px", borderRadius: "3px", background: "rgba(255,255,255,0.25)", transition: "height 0.15s ease" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${progress}%`, background: "rgba(255,255,255,0.95)", borderRadius: "2px" }} />
            {isSeeking && (
              <div style={{ position: "absolute", top: "50%", left: `${progress}%`, transform: "translate(-50%,-50%)", width: 13, height: 13, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.4)", pointerEvents: "none" }} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Custom Controls Overlay ───────────────────────────────────────────────────
interface ControlsProps {
  videoRef:          React.RefObject<HTMLVideoElement | null>;
  containerRef:      React.RefObject<HTMLDivElement | null>;
  isMuted:           boolean;
  onToggleMute:      () => void;
  onFirstPlay?:      () => void;
  isMobile?:         boolean;
  isPortrait?:       boolean;
  bottomOffset?:     number;
  isPlaying?:        boolean;
  isStarted?:        boolean;
  onOpenFullscreen?: () => void;
  tapToExpand?:      boolean;
  displayName?:      string;
  username?:         string;
  avatarUrl?:        string | null;
  caption?:          string | null;
  isBuffering?:      boolean;
  isLoading?:        boolean;
  onPosterPlay?:     () => void;
  durationSeconds?:  number | null;
  isPausedByUser?:   React.MutableRefObject<boolean>;
}

function VideoControls({
  videoRef,
  isMuted,
  onToggleMute,
  onFirstPlay,
  isMobile,
  isPlaying: isPlayingProp = false,
  isStarted = false,
  onOpenFullscreen,
  tapToExpand = true,
  isBuffering = false,
  isLoading = false,
  onPosterPlay,
  durationSeconds = null,
  isPausedByUser,
}: ControlsProps) {
  const [playing,     setPlaying]     = React.useState(() => !!(videoRef.current && !videoRef.current.paused));
  const [centerFlash, setCenterFlash] = React.useState<"play" | "pause" | null>(null);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration,    setDuration]    = React.useState(() => durationSeconds ?? videoRef.current?.duration ?? 0);
  const [timerFaded,  setTimerFaded]  = React.useState(false);
  const [buffered,    setBuffered]    = React.useState(0);
  const [visible,     setVisible]     = React.useState(true);
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
    if (video.paused || video.readyState < 3) {
      if (!video.paused) { if (isPausedByUser) isPausedByUser.current = true; video.pause(); flashCenter("pause"); }
      else {
        if (isPausedByUser) isPausedByUser.current = false;
        (video as any).__isPausedByUser = false;
        const hls = (video as any).__hls;
        if (hls) { try { hls.startLoad(-1); } catch {} }
        onPosterPlay ? onPosterPlay() : video.play().catch(() => {});
        flashCenter("play");
      }
    } else {
      if (isPausedByUser) isPausedByUser.current = true;
      video.pause();
      flashCenter("pause");
    }
    showControls();
  }, [videoRef, showControls, flashCenter, onPosterPlay]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufPct   = duration > 0 ? (buffered   / duration) * 100 : 0;

  return (
    <>
      <style>{`
        @keyframes vp-pop { 0% { transform: translate(-50%,-50%) scale(0.6); opacity: 1; } 100% { transform: translate(-50%,-50%) scale(1.4); opacity: 0; } }
        .vp-controls-bar  { transition: opacity 0.25s ease; }
        .vp-seek-thumb    { position: absolute; top: 50%; right: -6px; transform: translateY(-50%); width: 14px; height: 14px; border-radius: 50%; background: #8B5CF6; box-shadow: 0 0 0 3px rgba(139,92,246,0.35); pointer-events: none; }
        .vp-center-flash  { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%) scale(0.6); pointer-events: none; animation: vp-pop 0.55s ease forwards; }
      `}</style>

      {/* Tap zone */}
      <div
        style={{ position: "absolute", inset: 0, zIndex: 12, WebkitTapHighlightColor: "transparent", userSelect: "none", WebkitUserSelect: "none", touchAction: "manipulation" }}
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
          if (held < 200 && dist < 10) {
            // Mobile tap: in the feed (tapToExpand) it expands to fullscreen;
            // on the single post page it toggles play/pause and the dedicated
            // fullscreen button is the only way to expand.
            if (tapToExpand && onOpenFullscreen) onOpenFullscreen();
            else handlePlayPause(e);
          }
        }}
        onTouchCancel={() => {}}
        onMouseMove={() => showControls()}
      />

      {/* Center flash */}
      {centerFlash && (
        <div className="vp-center-flash" style={{ zIndex: 20 }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      )}

      {/* Play indicator when paused — in fullscreen and on the post view
          (tapToExpand false), never in the feed. */}
      {(isFullscreen || !tapToExpand) && !playing && isStarted && !isBuffering && !isLoading && (
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
          <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
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
  tapToExpand?:       boolean;
  prewarmLight?:      boolean;
  hideMuteButton?:    boolean;
  durationSeconds?:   number | null;
  onProfileClick?:    () => void;
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
  playActive:     () => void;
  pauseActive:    () => void;
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
  tapToExpand       = true,
  prewarmLight      = false,
  hideMuteButton    = false,
  durationSeconds   = null,
  onProfileClick,
}: VideoPlayerProps, ref) {
  const videoRef      = React.useRef<HTMLVideoElement | null>(null);
  const containerRef  = React.useRef<HTMLDivElement | null>(null);
  const hlsRef        = React.useRef<any>(null);
  const hasInitialized   = React.useRef(false);
  const bufferTimer      = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingTimer     = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPausedByScroll   = React.useRef(false);
  const isPausedByUser     = React.useRef(false);
  const canplayListenerRef = React.useRef<(() => void) | null>(null);

  // ── FLIP fullscreen state ──────────────────────────────────────────────────
  const portalRef           = React.useRef<HTMLDivElement | null>(null);
  const fsOverlayRootRef    = React.useRef<any>(null);
  const originalParent      = React.useRef<Element | null>(null);
  const originalNextSibling = React.useRef<ChildNode | null>(null);
  const origRadiusRef       = React.useRef<string>("");
  const originalSizeRef     = React.useRef<{ width: string; height: string }>({ width: "", height: "" });
  const [isFakeFullscreen,  setIsFakeFullscreen] = React.useState(false);
  const [fsOpening,         setFsOpening]         = React.useState(false);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (getSavedMute()) video.setAttribute("muted", "");
    video.defaultMuted = true;
  }, []);

  const [showPoster,    setShowPoster]    = React.useState(true);
  const [posterLoaded,  setPosterLoaded]  = React.useState(() => {
    const src = thumbnailUrl ?? (bunnyVideoId ? getBunnyThumbnail(bunnyVideoId) : "");
    if (!src) return false;
    if (loadedPosterUrls.has(src)) return true;
    if (isPosterCached(src)) { loadedPosterUrls.add(src); return true; }
    return false;
  });
  const [isBuffering, setIsBuffering] = React.useState(false);

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
  const stallTimer      = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBufferingRef  = React.useRef(false);
  const isPlayingRef    = React.useRef(false);
  const isLoadingRef    = React.useRef(false);

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
  const [posterSrc, setPosterSrc] = React.useState(thumbnailUrl ?? (bunnyVideoId ? getBunnyThumbnail(bunnyVideoId) : ""));

  React.useEffect(() => {
    if (posterLoaded) return;
    if (posterSrc && loadedPosterUrls.has(posterSrc)) { setPosterLoaded(true); return; }
    const t = setTimeout(() => setPosterLoaded(true), 2500);
    return () => clearTimeout(t);
  }, [posterLoaded, posterSrc]);

  const handlePosterLoad = React.useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (posterSrc) loadedPosterUrls.add(posterSrc);
    setPosterLoaded(true);
    if (fillParent || externalRatio) return;
    const img = e.currentTarget;
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return;
    setInternalRatio(`${w}/${h}`);
  }, [fillParent, externalRatio, posterSrc]);

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
        const effectiveBw    = savedBw > 0 ? Math.max(savedBw, downlink * 1_000_000) : downlink * 1_000_000;
        // Saved estimate → pick a start level for instant first-frame (fastest).
        // No estimate → hls.js auto (-1) probes the first segment.
        const startLevel     = savedBw > 0
          ? (effectiveBw >= 8_000_000 ? 4 : effectiveBw >= 4_000_000 ? 3 : effectiveBw >= 2_000_000 ? 2 : effectiveBw >= 1_200_000 ? 1 : 0)
          : -1;
        const hls = new Hls({
          startLevel,
          capLevelToPlayerSize: true,
          lowLatencyMode: false,
          // Load on attach (hls.js default). Concurrency is bounded by the
          // prewarm window: only the active video + a couple ahead are ever
          // initialized, so only those load. Small buffer keeps each modest.
          maxBufferLength: 10, maxMaxBufferLength: 30, backBufferLength: 15, maxStarvationDelay: 2,
        });
        hlsRef.current = hls;
        hls.on(Hls.Events.FRAG_LOADED, () => { localStorage.setItem("hls_bw", String(hls.bandwidthEstimate)); });
        let mediaErrorRecoveries = 0;
        let lastRecoveryAt = 0;
        hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
          if (!data?.fatal) return;
          if (data.type === "mediaError") {
            const now = Date.now();
            // Allow recovery repeatedly, but rate-limit to avoid a tight loop.
            // iOS tears down the media decoder when backgrounded; on return this
            // fires and we must recover rather than permanently error out.
            if (now - lastRecoveryAt > 3000) mediaErrorRecoveries = 0;
            if (mediaErrorRecoveries < 3) {
              mediaErrorRecoveries++;
              lastRecoveryAt = now;
              try { hls.recoverMediaError(); } catch {}
              return;
            }
          }
          try { hls.destroy(); } catch {}
          hlsRef.current = null; hasInitialized.current = false;
          setHasError(true); setIsBuffering(false);
        });
        hls.loadSource(hlsSrc);
        hls.attachMedia(video);
        (video as any).__hls = hls;
        video.addEventListener("loadedmetadata", () => {
          const dur = video.duration;
          if (!isFinite(dur) || dur <= 0) return;
          hls.config.maxBufferLength    = Math.min(Math.ceil(dur * 0.5), 15);
          hls.config.maxMaxBufferLength = Math.min(Math.ceil(dur), 30);
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
  }, [bunnyVideoId]);

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
      if (!inView) {
        // Resume-from-frame model: pause in place, keep currentTime + source.
        // We never null video.src or destroy HLS on scroll-away, so scrolling
        // back resumes exactly where it left off without a re-fetch.
        if (isPlayingRef.current) {
          videoRef.current?.pause();
        }
        // If it was still loading/buffering when scrolled away, cancel the
        // pending stall/loading timers and stop HLS downloading (frees
        // bandwidth for the active video) — but keep the instance + position.
        if (isBufferingRef.current || isLoadingRef.current) {
          if (bufferTimer.current)  { clearTimeout(bufferTimer.current);  bufferTimer.current  = null; }
          if (stallTimer.current)   { clearTimeout(stallTimer.current);   stallTimer.current   = null; }
          if (loadingTimer.current) { clearTimeout(loadingTimer.current); loadingTimer.current = null; }
          try { hlsRef.current?.stopLoad(); } catch {}
          setIsBuffering(false);
          setIsLoading(false);
          setShowSlowDots(false);
        }
      }
    }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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
    setIsBuffering(false);
    const video = videoRef.current;
    if (!hasInitialized.current) await initVideo();
    if (hlsRef.current && !hlsRef.current.media) {
      hlsRef.current.attachMedia(video!);
    }
    // Active video must download regardless of governor state.
    if (hlsRef.current) { try { hlsRef.current.startLoad(); } catch {} }
    const savedMute = getSavedMute();
    if (video) video.muted = savedMute;
    setIsMuted(savedMute);
    if (video) { video.setAttribute("playsinline", ""); video.setAttribute("webkit-playsinline", ""); }
    if (!video) return;

    let played = false;
    const markPlaying = () => {
      if (!video.paused) {
        isPlayingRef.current = true;
        setIsPlaying(true);
        setShowPoster(false);
        if (loadingTimer.current) { clearTimeout(loadingTimer.current); loadingTimer.current = null; }
        isLoadingRef.current = false; setIsLoading(false);
      }
    };
    const attemptPlay = () => {
      if (played) return;
      if (isPausedByUser.current || (video as any).__isPausedByUser) return;
      played = true;
      setShowPoster(false);
      video.play().then(markPlaying).catch(() => {
        // The browser can block UNMUTED autoplay when play() comes from scroll
        // rather than a direct tap. In that case play the element muted so the
        // video never stalls — but DO NOT change the user's mute choice or the
        // global mute flag. Audio returns on their next gesture automatically.
        if (!video.muted) {
          video.muted = true;            // element only — not setIsMuted, not saveMute
          video.play().then(() => {
            markPlaying();
            // Try to restore the user's intended (unmuted) audio right away;
            // if still blocked it stays muted silently until a gesture.
            if (!getSavedMute()) { video.muted = false; }
          }).catch(() => { played = false; });
        } else {
          played = false;
        }
      });
    };

    // Try immediately (works when data is already buffered/prewarmed).
    if (video.readyState >= 3) {
      attemptPlay();
    } else {
      // Not ready yet — play as soon as ANY of these fire. Multiple events for
      // robustness across browsers and HLS timing.
      const onReady = () => { attemptPlay(); };
      video.addEventListener("loadeddata", onReady, { once: true });
      video.addEventListener("canplay",    onReady, { once: true });
      video.addEventListener("playing",    onReady, { once: true });
      canplayListenerRef.current = onReady;
      // Show loading state only if it's actually taking a moment.
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
      loadingTimer.current = setTimeout(() => { if (!played) { isLoadingRef.current = true; setIsLoading(true); } }, 300);
      // Safety retry: if no event fired in 1.2s, force another startLoad + play.
      setTimeout(() => {
        if (played) return;
        try { hlsRef.current?.startLoad(); } catch {}
        if (video.readyState >= 2) attemptPlay();
      }, 1200);
    }
  }, [initVideo, bunnyVideoId]);

  // iOS Safari tears down media/decoder resources when the page is backgrounded
  // (phone sleep, app switch). On return, video buffers are invalid (black /
  // stuck) and posters may have been evicted. Recover when we come back to the
  // foreground: reload the poster, recover the HLS instance, and resume the
  // video if it was the one playing.
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const video = videoRef.current;
      // Reload poster if its decoded image was evicted while backgrounded.
      if (posterSrc && video && (video.readyState === 0 || !video.videoWidth)) {
        setPosterLoaded(false);
      }
      // Recover the HLS media pipeline (decoder may have been torn down).
      if (hlsRef.current) {
        try { hlsRef.current.recoverMediaError(); } catch {}
        try { hlsRef.current.startLoad(); } catch {}
      }
      // If this instance was the active/playing one, resume it.
      if (isPlayingRef.current || autoPlay) {
        if (video && !isPausedByUser.current && !(video as any).__isPausedByUser) {
          handlePosterPlay().catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [autoPlay, posterSrc, handlePosterPlay]);
  React.useEffect(() => {
    if (!bunnyVideoId) return;
    if (!autoPlay && isPlayingRef.current) {
      videoRef.current?.pause();
    }
  }, [autoPlay, bunnyVideoId]);

  // Light prewarm: in-window but not active. Attach HLS (manifest + low-level
  // first segment) so playback starts instantly on arrival, without playing
  // and without competing for bandwidth with the active stream.
  React.useEffect(() => {
    if (!prewarmLight || autoPlay || !bunnyVideoId) return;
    if (hasInitialized.current) return;
    const t = setTimeout(() => { if (!hasInitialized.current) { initVideo(); } }, 150);
    return () => clearTimeout(t);
  }, [prewarmLight, autoPlay, bunnyVideoId, initVideo]);

  const handleToggleMute = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const next = !getSavedMute();
    video.muted = next;
    setIsMuted(next);
    saveMute(next);
  }, []);

  // ── FLIP fullscreen open ───────────────────────────────────────────────────
  const exitFakeFullscreen = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Show video immediately so no black flash during FLIP
    const video = videoRef.current;
    if (video && hasStarted) {
      video.style.opacity = "1";
      video.style.transition = "none";
      video.style.objectFit = "";
    }
    if (hasStarted) setShowPoster(false);

    const first   = container.getBoundingClientRect();
    const parent  = originalParent.current;
    const sibling = originalNextSibling.current;

    container.style.willChange      = "transform";
    container.style.transformOrigin = "top left";
    Object.assign(container.style, {
      width:      originalSizeRef.current.width,
      height:     originalSizeRef.current.height,
      transition: "none",
    });
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

    // Fade out portal buttons before container animates back
    portalRef.current?.querySelectorAll("button").forEach((btn) => {
      (btn as HTMLElement).style.transition = "opacity 150ms ease";
      (btn as HTMLElement).style.opacity    = "0";
    });

    if (portalRef.current) {
      portalRef.current.style.transition      = "background-color 280ms cubic-bezier(0.4,0,0.2,1)";
      portalRef.current.style.backgroundColor = "rgba(0,0,0,0)";
      portalRef.current.style.backdropFilter  = "none";
    }
    if (fsOverlayRootRef.current) {
      const overlayEl = portalRef.current?.querySelector("[style*='z-index: 10000']") as HTMLElement | null;
      if (overlayEl) { overlayEl.style.transition = "opacity 200ms ease"; overlayEl.style.opacity = "0"; }
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
      fsOverlayRootRef.current?.unmount();
      fsOverlayRootRef.current = null;
      portalRef.current?.remove();
      portalRef.current = null;
      document.body.style.overflow = "";
      container.classList.remove("vp-portal-active");
      container.removeEventListener("transitionend", onDone);
      setIsFakeFullscreen(false);
      setFsOpening(false);
      setGlobalFullscreenOpen(false);
      // Re-sync video state after returning inline
      const video = videoRef.current;
      if (video && !video.paused) setIsPlaying(true);
      if (video && !video.paused) setShowPoster(false);
    };
    container.addEventListener("transitionend", onDone);
  }, [containerRef]);

  const handleOpenFullscreen = React.useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    setFsOpening(true);
    originalParent.current      = container.parentElement;
    originalNextSibling.current = container.nextSibling;
    const first      = container.getBoundingClientRect();
    const origRadius = getComputedStyle(container).borderRadius;
    origRadiusRef.current   = origRadius;
    originalSizeRef.current = { width: container.style.width, height: container.style.height };

    container.style.willChange      = "transform";
    container.style.transformOrigin = "top left";

    // Create portal backdrop
    const portal = document.createElement("div");
    Object.assign(portal.style, {
      position: "fixed", inset: "0", zIndex: "9999",
      backgroundColor: "rgba(0,0,0,0)",
      transition: "background-color 340ms cubic-bezier(0.4,0,0.2,1)",
      touchAction: "none",
    });
    document.body.appendChild(portal);
    portalRef.current = portal;

    // Move container into portal
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    let containerSlot: HTMLDivElement;
    if (isDesktop) {
      containerSlot = document.createElement("div");
      Object.assign(containerSlot.style, {
        position: "absolute", inset: "0",
        display: "flex", alignItems: "center", justifyContent: "center",
      });
      const inner = document.createElement("div");
      Object.assign(inner.style, {
        position: "relative",
        width: "100%", maxWidth: "420px",
        height: "100%", maxHeight: "90vh",
        borderRadius: "16px", overflow: "hidden",
      });
      containerSlot.appendChild(inner);
      portal.appendChild(containerSlot);
      Object.assign(container.style, { width: "100%", height: "100%", transition: "none" });
      container.classList.add("vp-portal-active");
      inner.appendChild(container);
    } else {
      containerSlot = document.createElement("div");
      portal.appendChild(containerSlot);
      Object.assign(container.style, { width: "100%", height: "100%", transition: "none" });
      container.classList.add("vp-portal-active");
      portal.appendChild(container);
    }

    // Override objectFit to match modal logic (cover only for tall portrait ≤0.6)
    const videoEl = videoRef.current;
    if (videoEl) {
      const vw = videoEl.videoWidth || knownWidth || 0;
      const vh = videoEl.videoHeight || knownHeight || 0;
      let tallPortrait = false;
      if (vw && vh) {
        tallPortrait = vw / vh <= 0.6;
      } else if (externalRatio) {
        const parsed = externalRatio.includes("/")
          ? Number(externalRatio.split("/")[0]) / Number(externalRatio.split("/")[1])
          : parseFloat(externalRatio);
        tallPortrait = parsed <= 0.6;
      }
      videoEl.style.objectFit = tallPortrait ? "cover" : "contain";
    }

    // Exit fullscreen button — bottom right, matches mute button style
    const xBtn = document.createElement("button");
    xBtn.style.cssText = "position:absolute;bottom:12px;right:12px;z-index:10001;background:rgba(0,0,0,0.45);border:none;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(6px);-webkit-tap-highlight-color:transparent;";
    xBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>`;
    xBtn.addEventListener("click",    (ev) => { ev.stopPropagation(); exitFakeFullscreen(); });
    xBtn.addEventListener("touchend", (ev) => { ev.preventDefault(); ev.stopPropagation(); exitFakeFullscreen(); });
    portal.appendChild(xBtn);

    // Mute button — sibling of container
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

    const closeBtn = document.createElement("button");
    closeBtn.style.cssText = "position:absolute;top:12px;left:12px;z-index:10001;background:rgba(0,0,0,0.45);border:none;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(6px);-webkit-tap-highlight-color:transparent;";
    closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    closeBtn.addEventListener("click",    (ev) => { ev.stopPropagation(); exitFakeFullscreen(); });
    closeBtn.addEventListener("touchend", (ev) => { ev.preventDefault(); ev.stopPropagation(); exitFakeFullscreen(); });
    portal.appendChild(closeBtn);

    // React overlay div for FullscreenOverlay component
    const overlayDiv = document.createElement("div");
    overlayDiv.style.cssText = "position:absolute;inset:0;z-index:10000;pointer-events:auto;";
    // We need pointer-events on children only
    portal.appendChild(overlayDiv);

    // Render FullscreenOverlay into overlayDiv
    const ReactDOMClient = (await import("react-dom/client")).default;
    const React2 = (await import("react")).default;
    fsOverlayRootRef.current = ReactDOMClient.createRoot(overlayDiv);

    const videoRefSnapshot = videoRef; // capture ref for closure

    function FullscreenOverlayWrapper() {
      const [mutedState, setMutedState] = React2.useState(getSavedMute());
      return React2.createElement(FullscreenOverlay, {
        videoRef:     videoRefSnapshot,
        onClose:      exitFakeFullscreen,
        isMuted:      mutedState,
        onPlay:       handlePosterPlay,
        onToggleMute: () => {
          const next = !getSavedMute();
          const video = videoRefSnapshot.current;
          if (video) video.muted = next;
          setIsMuted(next);
          saveMute(next);
          setMutedState(next);
          muteBtn.innerHTML = getMuteIcon(next);
        },
        displayName,
        username,
        avatarUrl,
        caption,
        wasStarted:   hasStarted || isLoading || isPlaying,
        wasBuffering: isBuffering,
        onProfileClick: onProfileClick ? () => {
  const container = containerRef.current;
  // Cover screen with blurred avatar — feels intentional, faster than black
  const cover = document.createElement("div");
  const bg = avatarUrl
    ? `url("${avatarUrl}") center/cover no-repeat`
    : "#000";
  cover.style.cssText = `position:fixed;inset:0;z-index:99999;background:${bg};`;
  cover.style.filter = "blur(40px) brightness(0.35)";
  cover.style.transform = "scale(1.15)"; // prevent blur edge bleed
  document.body.appendChild(cover);
  if (container) { container.style.visibility = "hidden"; }
  if (portalRef.current) { portalRef.current.remove(); portalRef.current = null; }
  fsOverlayRootRef.current = null;
  document.body.style.overflow = "";
  isPlayingRef.current = false;
  isBufferingRef.current = false;
  isLoadingRef.current = false;
  setIsFakeFullscreen(false);
  setGlobalFullscreenOpen(false);
  onProfileClick();
  // Remove cover after profile page has had time to paint
  setTimeout(() => cover.remove(), 400);
} : undefined,
      });
    }

    fsOverlayRootRef.current.render(React2.createElement(FullscreenOverlayWrapper));

    // FLIP: position container where it started, then animate to fill
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

    [xBtn, muteBtn, closeBtn].forEach((btn) => { btn.style.opacity = "0"; btn.style.transition = "none"; });

    const onDone = (ev: TransitionEvent) => {
      if (ev.propertyName !== "transform") return;
      container.style.willChange = "";
      container.removeEventListener("transitionend", onDone);
      [xBtn, muteBtn, closeBtn].forEach((btn) => { btn.style.transition = "opacity 200ms ease"; btn.style.opacity = "1"; });
    };
    container.addEventListener("transitionend", onDone);

    // Swipe-down to dismiss
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
    // Moving the <video> into the portal can pause it in some browsers. Ensure
    // it keeps playing (unless the user explicitly paused it).
    requestAnimationFrame(() => {
      const v = videoRef.current;
      if (v && !isPausedByUser.current && !(v as any).__isPausedByUser) {
        v.play().catch(() => {});
      }
    });
  }, [containerRef, exitFakeFullscreen, videoRef, displayName, username, avatarUrl, caption, onProfileClick]);

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
    // Imperative play — called directly by the feed coordinator the instant
    // this video becomes centered. Bypasses React state/effects entirely so
    // there is no render→commit→effect delay before play() fires.
    playActive: () => {
      handlePosterPlay().catch(() => {});
    },
    pauseActive: () => {
      if (isPlayingRef.current) videoRef.current?.pause();
    },
    resume: (time?: number) => {
      const video = videoRef.current;
      if (!video) return;
      isPausedByScroll.current = false;
      setShowPoster(false);
      const doPlay = async () => {
        if (!hasInitialized.current) await initVideo();
        if (hlsRef.current && !hlsRef.current.media) hlsRef.current.attachMedia(video);
        if (time !== undefined) video.currentTime = time;
        video.muted = getSavedMute();
        if (!isPausedByUser.current && !(video as any).__isPausedByUser) video.play().catch(() => {});
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
        .vp-portal-active [data-creator-watermark] { font-size: 17px !important; padding: 2px 8px 20px 64px !important; }
      `}</style>

      <div ref={containerRef} data-videoplayer style={{ ...containerStyle, position: "relative" }}>

        {!hideInternalBlur && posterSrc && (
          <img src={posterSrc} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(20px) brightness(0.45)", transform: "scale(1.1)", zIndex: 0, pointerEvents: "none", opacity: showPoster ? 0 : 1, transition: showPoster ? "none" : "opacity 0.2s ease" }} />
        )}

        {blurHash && !posterLoaded && (
          <BlurHashCanvas hash={blurHash} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />
        )}

        {(showPoster || isLoading) && !isPlaying && (
          <div
            onClick={showPoster && !isLoading ? handlePosterPlay : undefined}
            style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", cursor: showPoster ? "pointer" : "default", opacity: showPoster ? 1 : 0, transition: showPoster ? "opacity 0.25s ease" : "none", pointerEvents: showPoster ? "auto" : "none" }}
          >
            <img src={posterSrc} alt="" fetchPriority="high" onLoad={handlePosterLoad} onError={() => { if (thumbnailUrl && bunnyVideoId) setPosterSrc(getBunnyThumbnail(bunnyVideoId)); }} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: objectFit, opacity: posterLoaded ? 1 : 0, transition: posterLoaded ? "none" : "opacity 0.25s ease" }} />
            {!tapToExpand && showPoster && !isLoading && (
              <svg width="44" height="44" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" style={{ position: "relative", zIndex: 2 }}><polygon points="5,3 19,12 5,21"/></svg>
            )}
          </div>
        )}

        <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
          <video
            ref={videoRef} playsInline preload="metadata" loop muted={isMuted}
            onLoadedMetadata={handleLoadedMetadata}
            onPause={() => {
              isPlayingRef.current = false;
              setIsPlaying(false); setIsBuffering(false); setIsLoading(false);
              if (bufferTimer.current) { clearTimeout(bufferTimer.current); bufferTimer.current = null; }
              if (stallTimer.current)  { clearTimeout(stallTimer.current);  stallTimer.current  = null; }
              (videoRef.current as any).__isPausedByUser = isPausedByUser.current;
              if (isPausedByUser.current) {
                const hls = hlsRef.current;
                if (hls) { try { hls.stopLoad(); } catch {} }
              }
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
              if (isPausedByUser.current) return;
              if (video && video.duration && (video.currentTime >= video.duration - 0.5 || video.currentTime <= 0.3)) return;
              if (bufferTimer.current) clearTimeout(bufferTimer.current);
              if (stallTimer.current)  clearTimeout(stallTimer.current);
              waitStartRef.current = Date.now();
              isBufferingRef.current = true;
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
              isPausedByUser.current = false;
              (videoRef.current as any).__isPausedByUser = false;
              isPlayingRef.current = true;
              isLoadingRef.current = false;
              setIsBuffering(false); setHasStarted(true); setIsPlaying(true);
              setShowSlowDots(false); setIsLoading(false); setShowPoster(false); setIsAutoplaying(false);
              if (bunnyVideoId) window.dispatchEvent(new CustomEvent("freya:video-playing", { detail: { bunnyVideoId } }));
            }}
            onError={() => {
              if (videoRef.current && videoRef.current.src === "") return;
              if (!hasStarted) return;
              setHasError(true); setIsBuffering(false);
            }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: objectFit, display: "block", zIndex: 2, opacity: (showPoster && !isPlaying) ? 0 : 1, transition: (showPoster && !isPlaying) ? "opacity 0.25s ease" : "none" }}
          />
        </div>

        {(isLoading || (!hasError && isBuffering && hasStarted)) && (
          <div style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#8B5CF6", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0s" }} />
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#9B4FE8", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.15s" }} />
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#B44DD4", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.3s" }} />
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#EC4899", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.45s" }} />
          </div>
        )}

        {!hideMuteButton && !isFakeFullscreen && (
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

        {!hasError && !isFakeFullscreen && (
          <div style={{ display: fsOpening ? "none" : "contents" }}>
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
            tapToExpand={tapToExpand}
            displayName={displayName}
            username={username}
            avatarUrl={avatarUrl}
            caption={caption}
            isBuffering={isBuffering}
            isLoading={isLoading}
            onPosterPlay={handlePosterPlay}
            durationSeconds={durationSeconds}
            isPausedByUser={isPausedByUser}
          />
          </div>
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

export default VideoPlayerInner;