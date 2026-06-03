"use client";

import * as React from "react";
import { decode } from "blurhash";

// ── Mute persistence ──────────────────────────────────────────────────────────
const MUTE_KEY = "vp_muted";
function getSavedMute(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "true"; } catch { return false; }
}
function saveMute(v: boolean) {
  try { localStorage.setItem(MUTE_KEY, String(v)); } catch { }
}

const BUNNY_PULL_ZONE = "vz-8bc100f4-3c0.b-cdn.net";

// Module-level cache — survives re-mounts, cleared only on page reload
const watchedVideoIds = new Set<string>();
const warmedVideoIds  = new Set<string>();

// Shared across every VideoPlayer instance on the page.
// When any fullscreen is open, all intersection observers skip auto-play.
let anyFullscreenOpen = false;
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
  fullscreenTopLeft?: boolean;
  onOpenFullscreen?: () => void;
}

function VideoControls({
  videoRef,
  containerRef,
  isMuted,
  onToggleMute,
  onFirstPlay,
  isMobile,
  isPortrait,
  bottomOffset = 0,
  isPlaying: isPlayingProp = false,
  fullscreenTopLeft = false,
  onOpenFullscreen,
}: ControlsProps) {
  const [playing,     setPlaying]     = React.useState(() => !!(videoRef.current && !videoRef.current.paused));
  const [centerFlash, setCenterFlash] = React.useState<"play" | "pause" | null>(null);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration,    setDuration]    = React.useState(() => videoRef.current?.duration || 0);
  const [buffered,    setBuffered]    = React.useState(0);
  const [visible,     setVisible]     = React.useState(true);
  const [seeking,     setSeeking]     = React.useState(false);
  const [isHolding,   setIsHolding]   = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const hideTimer   = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = React.useRef<HTMLDivElement>(null);

  // ── Auto-hide controls ────────────────────────────────────────────────
  const showControls = React.useCallback(() => {
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused && !seekingRef.current) setVisible(false);
    }, 1500);
  }, [videoRef]);

  React.useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  React.useEffect(() => {
    if (isPlayingProp) showControls();
  }, [isPlayingProp, showControls]);

  // ── Sync with video element ───────────────────────────────────────────
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay    = () => { setPlaying(true); onFirstPlay?.(); showControls(); };
    const onPause   = () => { setPlaying(false); setVisible(true); if (hideTimer.current) clearTimeout(hideTimer.current); };
    const onTime    = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onMeta              = () => setDuration(video.duration);
    const onEnded             = () => { setPlaying(false); setVisible(true); };
    const onFullscreenChange  = () => setIsFullscreen(!!document.fullscreenElement);

    video.addEventListener("play",              onPlay);
    video.addEventListener("pause",             onPause);
    video.addEventListener("timeupdate",        onTime);
    video.addEventListener("loadedmetadata",    onMeta);
    video.addEventListener("ended",             onEnded);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      video.removeEventListener("play",           onPlay);
      video.removeEventListener("pause",          onPause);
      video.removeEventListener("timeupdate",     onTime);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("ended",          onEnded);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [videoRef, showControls]);

  // ── Play / Pause ──────────────────────────────────────────────────────
  const flashCenter = React.useCallback((type: "play" | "pause") => {
    setCenterFlash(type);
    setTimeout(() => setCenterFlash(null), 600);
  }, []);

  const handlePlayPause = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play().catch(() => {}); flashCenter("play"); }
    else              { video.pause(); flashCenter("pause"); }
    showControls();
  }, [videoRef, showControls, flashCenter]);

  // ── Seek ──────────────────────────────────────────────────────────────
  const seekTo = React.useCallback((clientX: number) => {
    const bar   = progressRef.current;
    const video = videoRef.current;
    if (!bar || !video || !duration) return;
    const rect     = bar.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    video.currentTime = fraction * duration;
    setCurrentTime(fraction * duration);
  }, [videoRef, duration]);

  const seekingRef = React.useRef(false);

  const handleSeekMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    seekingRef.current = true;
    setSeeking(true);
    seekTo(e.clientX);
    showControls();

    const onMove = (ev: MouseEvent) => {
      if (!seekingRef.current) return;
      seekTo(ev.clientX);
      showControls();
    };
    const onUp = () => {
      seekingRef.current = false;
      setSeeking(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [seekTo, showControls]);

  const handleSeekMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!seeking) return;
    seekTo(e.clientX);
  }, [seeking, seekTo]);

  const handleSeekMouseUp = React.useCallback(() => {
    setSeeking(false);
  }, []);

  const handleSeekTouchStart = React.useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    seekingRef.current = true;
    setSeeking(true);
    seekTo(e.touches[0].clientX);
    showControls();
  }, [seekTo, showControls]);

  const handleSeekTouchEnd = React.useCallback(() => {
    seekingRef.current = false;
    setSeeking(false);
  }, []);

  React.useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return;
    const onMove = (e: TouchEvent) => {
      if (!seeking) return;
      e.preventDefault();
      seekTo(e.touches[0].clientX);
    };
    bar.addEventListener("touchmove", onMove, { passive: false });
    return () => bar.removeEventListener("touchmove", onMove);
  }, [seeking, seekTo]);

  // ── Tap zone mouse move handler ───────────────────────────────────────
  const handleTapZoneMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (seeking) {
      handleSeekMouseMove(e);
    } else {
      showControls();
    }
  }, [seeking, handleSeekMouseMove, showControls]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufPct   = duration > 0 ? (buffered   / duration) * 100 : 0;

  const btnStyle: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    padding: "8px", borderRadius: "6px", flexShrink: 0,
    WebkitTapHighlightColor: "transparent",
  };

  return (
    <>
      <style>{`
        @keyframes vp-fadein  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes vp-fadeout { from { opacity: 1; } to { opacity: 0; } }
        @keyframes vp-pop     { 0% { transform: translate(-50%,-50%) scale(0.6); opacity: 1; } 100% { transform: translate(-50%,-50%) scale(1.4); opacity: 0; } }
        .vp-controls-bar { transition: opacity 0.25s ease; }
        .vp-seek-thumb {
          position: absolute; top: 50%; right: -6px;
          transform: translateY(-50%);
          width: 14px; height: 14px; border-radius: 50%;
          background: #8B5CF6;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.35);
          pointer-events: none;
          opacity: 0; transition: opacity 0.15s ease;
        }
        .vp-seeking .vp-seek-thumb { opacity: 1; }
        .vp-center-flash {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%,-50%) scale(0.6);
          pointer-events: none; zIndex: 20;
          animation: vp-pop 0.55s ease forwards;
        }
        .vp-mute-btn {
          position: absolute; top: 12px; right: 12px;
          zIndex: 15; background: rgba(0,0,0,0.45);
          border: none; border-radius: 50%; width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; backdrop-filter: blur(6px);
          -webkit-tap-highlight-color: transparent;
          transition: background 0.2s;
        }
        .vp-mute-btn:hover { background: rgba(0,0,0,0.65); }
      `}</style>

      {/* Tap zone — tap to open fullscreen on mobile, play/pause on desktop */}
      <div
        style={{ position: "absolute", inset: 0, zIndex: 4, WebkitTapHighlightColor: "transparent", userSelect: "none", WebkitUserSelect: "none" }}
        onClick={(e) => {
          if ((e as any).pointerType === "touch") return;
          handlePlayPause(e);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          const touch = e.touches[0];
          (e.currentTarget as HTMLDivElement).dataset.touchStart  = String(Date.now());
          (e.currentTarget as HTMLDivElement).dataset.touchStartX = String(touch.clientX);
          (e.currentTarget as HTMLDivElement).dataset.touchStartY = String(touch.clientY);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          const target = e.currentTarget as HTMLDivElement;
          const held = Date.now() - Number(target.dataset.touchStart ?? 0);
          const dist = Math.sqrt(
            (e.changedTouches[0].clientX - Number(target.dataset.touchStartX ?? 0)) ** 2 +
            (e.changedTouches[0].clientY - Number(target.dataset.touchStartY ?? 0)) ** 2
          );
          if (held < 200 && dist < 10) {
            e.preventDefault();
            const video = videoRef.current;
            if (!video) return;
            if (video.paused) video.play().catch(() => {});
            else video.pause();
          }
        }}
        onTouchCancel={() => {}}
        onMouseMove={handleTapZoneMouseMove}
        onMouseUp={handleSeekMouseUp}
      />

      {/* Top-right mute button — always visible */}
      <button
        className="vp-mute-btn"
        style={{ position: "absolute", top: 12, right: 12, zIndex: 15, background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(6px)", WebkitTapHighlightColor: "transparent" }}
        onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onToggleMute(); }}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        )}
      </button>

      {/* Play indicator */}
      {!playing && !isHolding && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 8, pointerEvents: "none" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      )}

      {/* Seekbar — desktop only */}
      <div
        className="vp-controls-bar"
        style={{
          position:      "absolute",
          bottom:        bottomOffset + 8 + (isPortrait ? 35 : 0), left: 0, right: 0,
          zIndex:        10,
          opacity:       visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
          transition:    "opacity 0.25s ease",
          background:    "none",
          padding:       "24px 12px 0px",
          display:       "flex",
          flexDirection: "column",
          gap:           "6px",
        }}
      >
        <div
          ref={isMobile ? undefined : progressRef}
          className={`vp-progress-bar${seeking ? " vp-seeking" : ""}`}
          onMouseDown={isMobile ? undefined : handleSeekMouseDown}
          onMouseUp={isMobile ? undefined : handleSeekMouseUp}
          onTouchStart={isMobile ? undefined : handleSeekTouchStart}
          onTouchEnd={isMobile ? undefined : handleSeekTouchEnd}
          style={{ position: "relative", width: "100%", height: "20px", display: isMobile ? "none" : "flex", alignItems: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent", touchAction: "none", zIndex: 11, paddingRight: "8px", boxSizing: "border-box" }}
        >
          <div style={{ position: "relative", width: "100%", height: "4px", borderRadius: "2px", backgroundColor: "rgba(255,255,255,0.25)", overflow: "visible" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${bufPct}%`, backgroundColor: "rgba(255,255,255,0.35)", borderRadius: "2px" }} />
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${progress}%`, background: "linear-gradient(to right, #8B5CF6, #EC4899)", borderRadius: "2px" }}>
              <div className="vp-seek-thumb" />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", fontFamily: "'Inter', sans-serif", fontWeight: 500, letterSpacing: "0.02em", minWidth: "80px", opacity: seeking ? 1 : 0, transition: "opacity 0.3s ease", textShadow: "0 1px 6px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.8)" }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <div style={{ flex: 1 }} />
        </div>
      </div>

      {/* Fullscreen button */}
      {(
        <button
          style={{ position: "absolute", bottom: bottomOffset + 8 + (isPortrait ? 35 : 0), right: 8, zIndex: 15, pointerEvents: "auto", background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(6px)", WebkitTapHighlightColor: "transparent" }}
          onClick={(e) => { e.stopPropagation(); onOpenFullscreen?.(); }}
          aria-label="Fullscreen"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
            <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
            <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
            <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
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
  autoplayOnVisible?: boolean;
  autoPlay?:          boolean;
  fullscreenTopLeft?: boolean;
  knownWidth?:        number | null;
  knownHeight?:       number | null;
  creatorHandle?:     string;
  isFullscreenActive?: boolean;
  // Fullscreen modal props
  onOpenFullscreen?:  (currentTime: number, hls?: any) => void;
}

export interface VideoPlayerHandle {
  pause: () => void;
  getHls: () => any;
  getCurrentTime: () => number;
  _videoEl: HTMLVideoElement | null;
  resume: (time?: number) => void;
}

const VideoPlayerInner = React.forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer({
  bunnyVideoId,
  thumbnailUrl,
  processingStatus,
  rawVideoUrl,
  fillParent = false,
  aspectRatio: externalRatio = null,
  hideInternalBlur = false,
  blurHash,
  objectFit = "contain",
  autoplayOnVisible = false,
  autoPlay          = false,
  fullscreenTopLeft = false,
  knownWidth        = null,
  knownHeight       = null,
  creatorHandle,
  isFullscreenActive  = false,
  onOpenFullscreen,
}: VideoPlayerProps, ref) {
  const videoRef       = React.useRef<HTMLVideoElement | null>(null);
  const containerRef   = React.useRef<HTMLDivElement | null>(null);
  const hlsRef         = React.useRef<any>(null);
  const hasInitialized    = React.useRef(false);
  const bufferTimer       = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingTimer      = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPausedByScroll  = React.useRef(false); // prevents scrolled-past videos from auto-resuming

  const [showPoster,   setShowPoster]   = React.useState(true);
  const [posterLoaded, setPosterLoaded] = React.useState(false);
  const [posterError,  setPosterError]  = React.useState(false);
  const [isBuffering,  setIsBuffering]  = React.useState(false);
  const [hasError,     setHasError]     = React.useState(false);
  const [hasStarted,   setHasStarted]   = React.useState(false);
  const [showSlowDots, setShowSlowDots] = React.useState(false);
  const [isLoading,    setIsLoading]    = React.useState(false);
  const [internalRatio, setInternalRatio] = React.useState<string | null>(null);
  const [isMuted,      setIsMuted]      = React.useState(() => getSavedMute());
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== "undefined"
      ? !window.matchMedia("(hover: hover) and (pointer: fine)").matches
      : false
  );
  const [isPlaying,    setIsPlaying]    = React.useState(false);
  const [isAutoplaying, setIsAutoplaying] = React.useState(false);

  const slowTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const el = fillParent ? (container.parentElement ?? container) : container;
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
    return () => {
      ro.disconnect();
      container.removeEventListener("loadedmetadata", onMeta, true);
    };
  }, [isMobile, videoRef, knownWidth, knownHeight]);

  const aspectRatio = fillParent ? null : (externalRatio ?? internalRatio);
  const isPortrait  = (() => {
    if (fillParent && knownWidth && knownHeight) return knownHeight > knownWidth;
    if (!aspectRatio) return false;
    if (aspectRatio.includes("/")) {
      const parts = aspectRatio.split("/");
      return Number(parts[0]) < Number(parts[1]);
    }
    return parseFloat(aspectRatio) < 1;
  })();

  const isTallPortrait = (() => {
    if (fillParent && knownWidth && knownHeight) return knownWidth / knownHeight <= 0.6;
    if (!aspectRatio) return false;
    if (aspectRatio.includes("/")) {
      const parts = aspectRatio.split("/");
      return Number(parts[0]) / Number(parts[1]) <= 0.6;
    }
    return parseFloat(aspectRatio) <= 0.6;
  })();

  const useRawFallback = processingStatus !== "completed" && !!rawVideoUrl;
  const posterSrc      = (!posterError && thumbnailUrl) ? thumbnailUrl : bunnyVideoId ? getBunnyThumbnail(bunnyVideoId) : "";

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
      setIsBuffering(false);
      setShowSlowDots(false);
      return;
    }
    if (video) {
      video.pause();
      if (force || !(bunnyVideoId && watchedVideoIds.has(bunnyVideoId))) {
        video.src = ""; // silence audio — do NOT call video.load() here, it fires onError
      }
    }
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }
    if (slowTimer.current) { clearTimeout(slowTimer.current); slowTimer.current = null; }
    hasInitialized.current = false;
    setIsBuffering(false);
    setHasStarted(false);
    setShowSlowDots(false);
  }, [bunnyVideoId]);

  const initVideo = React.useCallback(async () => {
    const video = videoRef.current;
    if (!video || !bunnyVideoId || hasInitialized.current) return;
    hasInitialized.current = true;
    setHasError(false);
    console.log(`[VP:${bunnyVideoId?.slice(0,8)}] initVideo start — videoSize=${video.offsetWidth}x${video.offsetHeight}`);

    // Pre-fetch manifest into browser cache before HLS.js requests it
    try { fetch(getBunnyHLS(bunnyVideoId), { method: "GET", cache: "force-cache" }).catch(() => {}); } catch {}

    if (useRawFallback) {
      video.src = rawVideoUrl!;
      video.load();
      return;
    }

    const hlsSrc = getBunnyHLS(bunnyVideoId);

    try {
      const Hls = (await import("hls.js")).default;
      if (Hls.isSupported()) {
        const savedBw = Number(localStorage.getItem("hls_bw")) || 8_000_000;
        const hls = new Hls({
          startLevel:             -1,
          testBandwidth:          false,
          capLevelToPlayerSize:   false,
          lowLatencyMode:         false,
          abrEwmaDefaultEstimate: savedBw,
          abrEwmaFastVoD:         3,
          abrEwmaSlowVoD:         9,
        });
        hlsRef.current = hls;
        hls.on(Hls.Events.FRAG_LOADED, () => {
          localStorage.setItem("hls_bw", String(hls.bandwidthEstimate));
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (_evt: any, data: any) => {
          const level = hls.levels[data.level];
          console.log(`%c[VideoPlayer] 🎬 QUALITY → ${level.height}p (${Math.round(level.bitrate / 1000)}kbps)`, "color: #10B981; font-weight: bold");
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => {});
        
        let mediaErrorRecovered = false;
        hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
          if (!data?.fatal) return;
          if (data.type === "mediaError" && !mediaErrorRecovered) {
            mediaErrorRecovered = true;
            hls.recoverMediaError();
            return;
          }
          try { hls.destroy(); } catch {}
          hlsRef.current = null;
          hasInitialized.current = false;
          setHasError(true);
          setIsBuffering(false);
        });
        hls.loadSource(hlsSrc);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = getBunnyHLS(bunnyVideoId);
        video.load();
      }
    } catch {
      video.src = hlsSrc;
    }
  }, [bunnyVideoId, useRawFallback, rawVideoUrl]);

  const handleRetry = React.useCallback(async () => {
    setHasError(false);
    hasInitialized.current = false;
    await initVideo();
    try { await videoRef.current?.play(); } catch {}
  }, [initVideo]);

  React.useEffect(() => {
    return () => {
      if (bufferTimer.current) clearTimeout(bufferTimer.current);
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (!bunnyVideoId) return;
    if (watchedVideoIds.has(bunnyVideoId)) return;

    const conn = (navigator as any).connection;
    const ect: string = conn?.effectiveType ?? "4g";
    if (ect === "slow-2g" || ect === "2g") return;

    // Pre-fetch manifest into browser HTTP cache immediately on mount
    fetch(getBunnyHLS(bunnyVideoId), { method: "GET", cache: "force-cache" }).catch(() => {});

    if (hasInitialized.current) return;
    warmedVideoIds.add(bunnyVideoId);
    initVideo();
  }, [bunnyVideoId, initVideo]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(([entry]) => {
      const video = videoRef.current;
      if (!video) return;
      console.log(`[VP:${bunnyVideoId?.slice(0,8)}] intersection ratio=${entry.intersectionRatio.toFixed(2)} hasInit=${hasInitialized.current} pausedByScroll=${isPausedByScroll.current}`);

      if (entry.intersectionRatio >= 0.5) {
        if (autoplayOnVisible && !hasError && !isMobile) {
          (async () => {
            console.log(`[VP:${bunnyVideoId?.slice(0,8)}] ▶ entering viewport — resumeBuffering=${!!(hlsRef.current)} needsInit=${!hasInitialized.current}`);
            if (hasInitialized.current && hlsRef.current) {
              try { hlsRef.current.resumeBuffering?.(); } catch {}
            }
            if (!hasInitialized.current) await initVideo();
            const muted = getSavedMute();
            video.muted = muted;
            setIsMuted(muted);
            // Don't auto-resume a video the user has already scrolled past —
            // only play if this is a fresh entry (never watched) or user explicitly tapped.
            // Don't compete with an open fullscreen player
            if (anyFullscreenOpen) return;
            if (!hasStarted) {
              setIsAutoplaying(true);
              if (slowTimer.current) clearTimeout(slowTimer.current);
              const hls = hlsRef.current;
              const alreadyBuffered = hls && hls.bufferInfo && hls.bufferInfo(0, 0.1).len > 0;
              if (!alreadyBuffered) {
                slowTimer.current = setTimeout(() => setShowSlowDots(true), 1500);
              }
            }
            try { await video.play(); } catch {}
          })();
        }
      } else if (entry.intersectionRatio < 0.2) {
        teardown();
        setShowPoster(true);
      }
    }, { threshold: [0, 0.2, 0.5, 0.75] });

    observer.observe(container);
    return () => observer.disconnect();
  }, [teardown, autoplayOnVisible, isMobile, showPoster, hasError, initVideo]);

  const handleLoadedMetadata = React.useCallback(() => {
    if (fillParent || externalRatio) return;
    const video = videoRef.current;
    if (!video) return;
    const { videoWidth: w, videoHeight: h } = video;
    if (!w || !h) return;
    setInternalRatio(`${w}/${h}`);
  }, [fillParent, externalRatio]);

  const handlePosterPlay = React.useCallback(async () => {
    isPausedByScroll.current = false; // user explicitly re-engaged
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    loadingTimer.current = setTimeout(() => setIsLoading(true), 300);
    const video = videoRef.current;
    if (!hasInitialized.current) await initVideo();
    const savedMute = getSavedMute();
    if (video) video.muted = savedMute;
    setIsMuted(savedMute);
    try { await video?.play(); } catch { }
  }, [initVideo]);

  const handleToggleMute = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const next = !isMuted;
    video.muted = next;
    setIsMuted(next);
    saveMute(next);
  }, [isMuted]);

  React.useImperativeHandle(ref, () => ({
    pause: () => videoRef.current?.pause(),
    getHls: () => hlsRef.current,
    getCurrentTime: () => videoRef.current?.currentTime ?? 0,
    // Exposed so PostCard/PostRow can re-attach the borrowed HLS instance
    // back to this video element after fullscreen closes.
    _videoEl: videoRef.current,
    resume: (time?: number) => {
      const video = videoRef.current;
      if (!video) return;
      isPausedByScroll.current = false;
      setShowPoster(false);
      if (hlsRef.current) {
        hlsRef.current.attachMedia(video);
      }
      if (time !== undefined) video.currentTime = time;
      video.muted = getSavedMute();
      video.play().catch(() => {});
    },
  }));

  const handleOpenFullscreen = React.useCallback(() => {
    const video = videoRef.current;
    const currentTime = video?.currentTime ?? 0;
    isPausedByScroll.current = true;
    onOpenFullscreen?.(currentTime, hlsRef.current);
  }, [onOpenFullscreen]);

  React.useEffect(() => {
    if (!autoPlay) return;
    handlePosterPlay();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!autoplayOnVisible) return;
    const onVisibilityChange = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.visibilityState === "hidden") {
        video.pause();
      } else {
        if (hasInitialized.current && !isPausedByScroll.current) {
          video.play().catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [autoplayOnVisible]);

  const containerStyle: React.CSSProperties = fillParent ? {
    width:          "100%",
    height:         "100%",
    position:       "absolute",
    inset:          0,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
  } : {
    width:          "100%",
    position:       "relative",
    overflow:       "visible",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    aspectRatio:    aspectRatio ?? "16/9",
    maxHeight:      "80svh",
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
        @keyframes vp-dot { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); } 40% { opacity: 1; transform: scale(1); } }
      `}</style>

      
      <div
        ref={containerRef}
        data-videoplayer
        style={{ ...containerStyle, position: "relative" }}
      >
        {!hideInternalBlur && posterSrc && (
          <img
            src={posterSrc}
            alt=""
            aria-hidden
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(20px) brightness(0.45)", transform: "scale(1.1)", zIndex: 0, pointerEvents: "none", opacity: showPoster ? 0 : 1, transition: "opacity 0.2s ease" }}
          />
        )}

        {blurHash && !posterLoaded && (
          <BlurHashCanvas hash={blurHash} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />
        )}

        {/* Poster + play button */}
        {(showPoster || isLoading) && (
          <div
            onClick={showPoster ? handlePosterPlay : undefined}
            style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", cursor: showPoster ? "pointer" : "default", opacity: showPoster ? 1 : 0, transition: "opacity 0.25s ease", pointerEvents: showPoster ? "auto" : "none" }}
          >
            <img
              src={posterSrc}
              alt=""
              fetchPriority="high"
              onLoad={handlePosterLoad}
              onError={() => setPosterError(true)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: objectFit, opacity: posterLoaded ? 1 : 0, transition: "opacity 0.25s ease" }}
            />
            {!isLoading && !isAutoplaying && (
              <svg width="44" height="44" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" style={{ position: "relative", zIndex: 2 }}>
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            )}
          </div>
        )}

        <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
          <video
            ref={videoRef}
            playsInline
            preload="metadata"
            loop
            muted={isMuted}
            onLoadedMetadata={handleLoadedMetadata}
            onPause={() => { setIsPlaying(false); }}
            onEnded={() => { setIsPlaying(false); }}
            onSeeking={() => {
              if (bufferTimer.current) { clearTimeout(bufferTimer.current); bufferTimer.current = null; }
              setIsBuffering(false);
            }}
            onWaiting={() => {
              if (bufferTimer.current) clearTimeout(bufferTimer.current);
              bufferTimer.current = setTimeout(() => setIsBuffering(true), 800);
            }}
            onPlaying={() => {
              if (bufferTimer.current) { clearTimeout(bufferTimer.current); bufferTimer.current = null; }
              if (slowTimer.current)   { clearTimeout(slowTimer.current);   slowTimer.current   = null; }
              if (loadingTimer.current) { clearTimeout(loadingTimer.current); loadingTimer.current = null; }
              if (bunnyVideoId) watchedVideoIds.add(bunnyVideoId);
              console.log(`[VP:${bunnyVideoId?.slice(0,8)}] ✅ onPlaying — videoSize=${videoRef.current?.offsetWidth}x${videoRef.current?.offsetHeight}`);
              setIsBuffering(false);
              setHasStarted(true);
              setIsPlaying(true);
              setShowSlowDots(false);
              setIsLoading(false);
              setShowPoster(false);
              setIsAutoplaying(false);
            }}
            onError={() => {
              if (videoRef.current && videoRef.current.src === "") return;
              if (!hasStarted) return;
              setHasError(true);
              setIsBuffering(false);
            }}
            style={{
              position:   "absolute",
              inset:      0,
              width:      "100%",
              height:     "100%",
              objectFit:  objectFit,
              display:    "block",
              zIndex:     2,
              opacity:    showPoster ? 0 : 1,
              transition: "opacity 0.25s ease",
            }}
          />
        </div>

        {/* Buffering dots */}
        {(isLoading || (!hasError && isBuffering)) && (
          <div style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#8B5CF6", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0s" }} />
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#B44DD4", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.2s" }} />
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#EC4899", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.4s" }} />
          </div>
        )}

        

        {/* Mute button visible on poster */}
        {showPoster && (
          <button
            style={{ position: "absolute", top: 12, right: 12, zIndex: 6, background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(6px)", WebkitTapHighlightColor: "transparent" }}
            onClick={(e) => { e.stopPropagation(); const next = !isMuted; setIsMuted(next); saveMute(next); }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); const next = !isMuted; setIsMuted(next); saveMute(next); }}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            )}
          </button>
        )}

        {/* Creator handle overlay */}
        {creatorHandle && (
          <div style={{
            position: "absolute", top: 0, left: 0,
            zIndex: 12, pointerEvents: "none",
            fontSize: "14px", fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.02em",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)",
            width: "100%",
            padding: "2px 8px 20px",
          }}>
            {creatorHandle}@Fréya.com
          </div>
        )}

        {/* Custom controls */}
        {!showPoster && !hasError && (
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
            fullscreenTopLeft={fullscreenTopLeft}
            onOpenFullscreen={handleOpenFullscreen}
          />
        )}

        {/* Error overlay */}
        {hasError && (
          <div style={{ position: "absolute", inset: 0, zIndex: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", backgroundColor: "rgba(10,10,15,0.85)", backdropFilter: "blur(8px)" }}>
            <span style={{ fontSize: "13px", color: "#C4C4D4", fontFamily: "'Inter', sans-serif" }}>
              Couldn&apos;t load video
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleRetry(); }}
              style={{ padding: "8px 20px", borderRadius: "20px", border: "1px solid #2A2A3D", backgroundColor: "#1A1A2E", color: "#FFFFFF", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </>
  );
});

export default VideoPlayerInner;