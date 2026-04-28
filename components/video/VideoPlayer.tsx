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
  videoRef:     React.RefObject<HTMLVideoElement | null>;
  isMuted:      boolean;
  onToggleMute: () => void;
}

function VideoControls({ videoRef, isMuted, onToggleMute }: ControlsProps) {
  const [playing,      setPlaying]      = React.useState(false);
  const [centerFlash,  setCenterFlash]  = React.useState<"play"|"pause"|null>(null);
  const [currentTime,  setCurrentTime]  = React.useState(0);
  const [duration,     setDuration]     = React.useState(0);
  const [buffered,     setBuffered]     = React.useState(0);
  const [visible,      setVisible]      = React.useState(true);
  const [seeking,      setSeeking]      = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const hideTimer   = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = React.useRef<HTMLDivElement>(null);

  // ── Auto-hide controls ────────────────────────────────────────────────
  const showControls = React.useCallback(() => {
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused) setVisible(false);
    }, 3000);
  }, [videoRef]);

  React.useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  // ── Sync with video element ───────────────────────────────────────────
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay     = () => { setPlaying(true);  showControls(); };
    const onPause    = () => { setPlaying(false); setVisible(true); if (hideTimer.current) clearTimeout(hideTimer.current); };
    const onTime     = () => {
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

  const handleSeekMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSeeking(true);
    seekTo(e.clientX);
    showControls();
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
    setSeeking(true);
    seekTo(e.touches[0].clientX);
    showControls();
  }, [seekTo, showControls]);

  const handleSeekTouchEnd = React.useCallback(() => {
    setSeeking(false);
  }, []);

  // Attach native (non-passive) touchmove so preventDefault works on iOS.
  // React's synthetic touchmove is passive by default and silently ignores preventDefault.
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

  // ── Fullscreen ────────────────────────────────────────────────────────
  const handleFullscreen = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    // iOS Safari: standard fullscreen API doesn't work on arbitrary elements.
    // Use the video's own webkitEnterFullscreen instead.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS && typeof (video as any).webkitEnterFullscreen === "function") {
      try { (video as any).webkitEnterFullscreen(); } catch {}
      showControls();
      return;
    }

    const container = (video.closest("[data-videoplayer]") as HTMLElement) ?? video.parentElement;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    showControls();
  }, [videoRef, showControls]);

  // ── Tap zone mouse move handler (no duplicate) ────────────────────────
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
        }
        .vp-progress-bar:active .vp-seek-thumb,
        .vp-progress-bar:hover .vp-seek-thumb { width: 16px; height: 16px; }
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

      {/* Tap zone — IG-style press-and-hold to pause + tap to toggle */}
      <div
        style={{ position: "absolute", inset: 0, zIndex: 4, WebkitTapHighlightColor: "transparent", userSelect: "none", WebkitUserSelect: "none" }}
        onClick={(e) => {
          // Desktop click — just toggle. Touch devices handle this in touchstart/touchend.
          if ((e as any).pointerType === "touch") return;
          handlePlayPause(e);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          const v = videoRef.current;
          if (!v) return;
          const wasPlaying = !v.paused;
          (e.currentTarget as HTMLDivElement).dataset.touchStart  = String(Date.now());
          (e.currentTarget as HTMLDivElement).dataset.wasPlaying  = String(wasPlaying);
          if (wasPlaying) v.pause();   // press-and-hold pause
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const v       = videoRef.current;
          const target  = e.currentTarget as HTMLDivElement;
          const start   = Number(target.dataset.touchStart ?? 0);
          const held    = Date.now() - start;
          const wasPlaying = target.dataset.wasPlaying === "true";
          if (!v) return;

          if (held < 200) {
            // Quick tap — toggle from the original state
            if (wasPlaying) {
              flashCenter("pause");        // we already paused on touchstart
            } else {
              v.play().catch(() => {});
              flashCenter("play");
            }
          } else {
            // Long press release — resume if it was playing before
            if (wasPlaying) v.play().catch(() => {});
          }
          showControls();
        }}
        onTouchCancel={(e) => {
          // Finger left the screen unexpectedly — restore prior state
          const v       = videoRef.current;
          const target  = e.currentTarget as HTMLDivElement;
          const wasPlaying = target.dataset.wasPlaying === "true";
          if (v && wasPlaying) v.play().catch(() => {});
        }}
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

      {/* Center play/pause flash (Instagram-style) */}
      {centerFlash && (
        <div className="vp-center-flash" style={{ position: "absolute", top: "50%", left: "50%", zIndex: 20, pointerEvents: "none" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            {centerFlash === "pause" ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg>
            )}
          </div>
        </div>
      )}

      {/* Bottom controls overlay */}
      <div
        className="vp-controls-bar"
        style={{
          position:      "absolute",
          bottom:        0, left: 0, right: 0,
          zIndex:        10,
          opacity:       visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
          background:    "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)",
          padding:       "24px 12px 10px",
          display:       "flex",
          flexDirection: "column",
          gap:           "6px",
        }}
      >
        {/* Seek bar */}
        <div
          ref={progressRef}
          className="vp-progress-bar"
          onMouseDown={handleSeekMouseDown}
          onMouseUp={handleSeekMouseUp}
          onTouchStart={handleSeekTouchStart}
          onTouchEnd={handleSeekTouchEnd}
          style={{ position: "relative", width: "100%", height: "20px", display: "flex", alignItems: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent", touchAction: "none" }}
        >
          <div style={{ position: "relative", width: "100%", height: "4px", borderRadius: "2px", backgroundColor: "rgba(255,255,255,0.25)", overflow: "visible" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${bufPct}%`, backgroundColor: "rgba(255,255,255,0.35)", borderRadius: "2px" }} />
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${progress}%`, background: "linear-gradient(to right, #8B5CF6, #EC4899)", borderRadius: "2px" }}>
              <div className="vp-seek-thumb" />
            </div>
          </div>
        </div>

        {/* Bottom row: play + time + fullscreen */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button style={btnStyle} onClick={handlePlayPause} onTouchEnd={handlePlayPause} aria-label={playing ? "Pause" : "Play"}>
            {playing ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg>
            )}
          </button>

          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", fontFamily: "'Inter', sans-serif", fontWeight: 500, letterSpacing: "0.02em", minWidth: "80px" }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div style={{ flex: 1 }} />

          <button style={btnStyle} onClick={handleFullscreen} onTouchEnd={handleFullscreen} aria-label="Fullscreen">
            {isFullscreen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
              </svg>
            )}
          </button>
        </div>
      </div>
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
}

export default function VideoPlayer({
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
}: VideoPlayerProps) {
  const videoRef       = React.useRef<HTMLVideoElement | null>(null);
  const containerRef   = React.useRef<HTMLDivElement | null>(null);
  const hlsRef         = React.useRef<any>(null);
  const hasInitialized = React.useRef(false);
  const bufferTimer    = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showPoster,   setShowPoster]   = React.useState(true);
  const [posterLoaded, setPosterLoaded] = React.useState(false);
  const [posterError,  setPosterError]  = React.useState(false);
  const [isBuffering,  setIsBuffering]  = React.useState(false);
  const [hasError,     setHasError]     = React.useState(false);
  const [hasStarted,   setHasStarted]   = React.useState(false);
  const [showSlowDots, setShowSlowDots] = React.useState(false);
  const [internalRatio, setInternalRatio] = React.useState<string | null>(null);
  const [isMuted,      setIsMuted]      = React.useState(() => getSavedMute());
  const [isMobile,     setIsMobile]     = React.useState(false);

  const slowTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(!window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const aspectRatio = fillParent ? null : (externalRatio ?? internalRatio);
  const isPortrait  = (() => {
    if (!aspectRatio) return false;
    if (aspectRatio.includes("/")) {
      const parts = aspectRatio.split("/");
      return Number(parts[0]) < Number(parts[1]);
    }
    return parseFloat(aspectRatio) < 1;
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

  const teardown = React.useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      try {
        video.removeAttribute("src");
        video.load();
      } catch {}
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
  }, []);

  const initVideo = React.useCallback(async () => {
    const video = videoRef.current;
    if (!video || !bunnyVideoId || hasInitialized.current) return;
    hasInitialized.current = true;
    setHasError(false);
    console.log(`%c[VideoPlayer] 📡 HLS INIT`, "color: #06B6D4; font-weight: bold", { videoId: bunnyVideoId });

    if (useRawFallback) {
      video.src = rawVideoUrl!;
      video.load();
      return;
    }

    const hlsSrc = getBunnyHLS(bunnyVideoId);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsSrc;
      video.load();
      return;
    }

    try {
      const Hls = (await import("hls.js")).default;
      if (Hls.isSupported()) {
        const hls = new Hls({
          startLevel:             -1,
          capLevelToPlayerSize:   false,
          lowLatencyMode:         false,
          abrEwmaDefaultEstimate: 8_000_000,
          abrEwmaFastVoD:         3,
          abrEwmaSlowVoD:         9,
        });
        hlsRef.current = hls;
        hls.on(Hls.Events.MANIFEST_PARSED, (_evt: any, data: any) => {
          hls.currentLevel = data.levels.length - 1;
        });
        hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
          if (!data?.fatal) return;
          console.error(`%c[VideoPlayer] ❌ HLS FATAL ERROR`, "color: #EF4444; font-weight: bold", { videoId: bunnyVideoId, type: data.type, details: data.details });
          try { hls.destroy(); } catch {}
          hlsRef.current = null;
          hasInitialized.current = false;
          setHasError(true);
          setIsBuffering(false);
        });
        hls.loadSource(hlsSrc);
        hls.attachMedia(video);
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
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, []);

  // Pre-warm HLS as soon as the player mounts when autoplay is enabled.
  // This way, by the time the video scrolls into view, it's already buffered.
  React.useEffect(() => {
    if (!autoplayOnVisible || !isMobile || !bunnyVideoId) return;
    if (hasInitialized.current) return;
    console.log(`%c[VideoPlayer] 🔥 PREWARM HLS`, "color: #F59E0B; font-weight: bold", { videoId: bunnyVideoId });
    initVideo();
  }, [autoplayOnVisible, isMobile, bunnyVideoId, initVideo]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(([entry]) => {
      const video = videoRef.current;
      if (!video) return;

      if (entry.intersectionRatio >= 0.5) {
        // In view — autoplay if enabled and on mobile, and we haven't been started yet
        if (autoplayOnVisible && isMobile && !hasStarted && !hasError) {
          console.log(`%c[VideoPlayer] ▶  AUTOPLAY (visible ${Math.round(entry.intersectionRatio * 100)}%)`, "color: #8B5CF6; font-weight: bold", { videoId: bunnyVideoId });
          (async () => {
            // Keep poster visible — onPlaying will hide it once first frame paints
            if (!hasInitialized.current) await initVideo();
            const muted = getSavedMute();
            video.muted = muted;
            setIsMuted(muted);
            // Show subtle progress dots if startup takes >800ms
            if (slowTimer.current) clearTimeout(slowTimer.current);
            slowTimer.current = setTimeout(() => setShowSlowDots(true), 800);
            try { await video.play(); } catch {}
          })();
        }
      } else if (entry.intersectionRatio < 0.2) {
        // Out of view — pause + tear down to free memory
        if (hasInitialized.current) {
          console.log(`%c[VideoPlayer] ⏹  TEARDOWN (out of view)`, "color: #EF4444; font-weight: bold", { videoId: bunnyVideoId });
        }
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
    setShowPoster(false);
    setIsBuffering(true);
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
    overflow:       "hidden",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    aspectRatio:    aspectRatio ?? "16/9",
    maxHeight:      "80svh",
  };

  const videoStyle: React.CSSProperties = {
    position:  "relative",
    zIndex:    2,
    display:   "block",
    width:     "100%",
    height:    "100%",
    objectFit: objectFit,
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
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(20px) brightness(0.45)", transform: "scale(1.1)", zIndex: 0, pointerEvents: "none" }}
          />
        )}

        {blurHash && !posterLoaded && (
          <BlurHashCanvas hash={blurHash} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />
        )}

        {/* Poster + play button */}
        {showPoster && (
          <div
            onClick={handlePosterPlay}
            style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <img
              src={posterSrc}
              alt=""
              fetchPriority="high"
              onLoad={handlePosterLoad}
              onError={() => setPosterError(true)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: objectFit, opacity: posterLoaded ? 1 : 0, transition: "opacity 0.25s ease" }}
            />
            <div style={{ position: "relative", zIndex: 2, width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.55)", border: "2px solid rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
              <div style={{ width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: "18px solid rgba(255,255,255,0.95)", marginLeft: "4px" }} />
            </div>
          </div>
        )}

        {/* Video element — no native controls */}
        <video
          ref={videoRef}
          playsInline
          preload="none"
          loop
          muted={isMuted}
          poster={posterSrc}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => {
            // Don't clear isBuffering here — onPlay fires before frames paint.
            // Only onPlaying truly means "video is now showing frames."
          }}
          onWaiting={() => {
            if (bufferTimer.current) clearTimeout(bufferTimer.current);
            bufferTimer.current = setTimeout(() => setIsBuffering(true), 300);
          }}
          onPlaying={() => {
            if (bufferTimer.current) { clearTimeout(bufferTimer.current); bufferTimer.current = null; }
            if (slowTimer.current)   { clearTimeout(slowTimer.current);   slowTimer.current   = null; }
            setIsBuffering(false);
            setHasStarted(true);
            setShowSlowDots(false);
            setShowPoster(false);  // hide poster only when video actually paints
          }}
          onCanPlay={() => {
            // Don't clear isBuffering here either — wait for actual playback.
          }}
          onError={() => { setHasError(true); setIsBuffering(false); }}
          style={{ ...videoStyle, visibility: showPoster ? "hidden" : "visible", animation: !showPoster ? "fadeIn 0.2s ease" : undefined }}
        />

        {/* Loading — pulsing gradient ring (SVG, reliable everywhere).
            Shows during entire load window: poster dismissed → first frame paints,
            plus any mid-playback stall. */}
        {!showPoster && !hasError && (isBuffering || !hasStarted) && (
          <div style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <style>{`
              @keyframes vp-ring-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes vp-ring-pulse  {
                0%, 100% { transform: scale(1);    opacity: 0.9; }
                50%      { transform: scale(1.06); opacity: 1; }
              }
            `}</style>
            <div style={{
              width:     "56px",
              height:    "56px",
              animation: "vp-ring-pulse 1.4s ease-in-out infinite",
              filter:    "drop-shadow(0 0 12px rgba(139,92,246,0.5)) drop-shadow(0 0 20px rgba(236,72,153,0.3))",
            }}>
              <svg
                width="56" height="56" viewBox="0 0 56 56"
                style={{ animation: "vp-ring-rotate 1s linear infinite", display: "block" }}
              >
                <defs>
                  <linearGradient id="vp-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
                {/* Background track */}
                <circle cx="28" cy="28" r="22" fill="none"
                        stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
                {/* Gradient arc — covers ~40% of circumference */}
                <circle cx="28" cy="28" r="22" fill="none"
                        stroke="url(#vp-ring-grad)" strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeDasharray="55 138" />
              </svg>
            </div>
          </div>
        )}

        {/* Slow-loading dots — IG style, shown over poster when startup takes >800ms */}
        {showSlowDots && showPoster && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: "16px", zIndex: 11, display: "flex", justifyContent: "center", gap: "6px", pointerEvents: "none" }}>
            <style>{`
              @keyframes vp-dot { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); } 40% { opacity: 1; transform: scale(1); } }
            `}</style>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,255,255,0.95)", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0s",   boxShadow: "0 0 4px rgba(0,0,0,0.5)" }} />
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,255,255,0.95)", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.2s", boxShadow: "0 0 4px rgba(0,0,0,0.5)" }} />
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,255,255,0.95)", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.4s", boxShadow: "0 0 4px rgba(0,0,0,0.5)" }} />
          </div>
        )}

        {/* Custom controls — only shown after poster is dismissed */}
        {!showPoster && !hasError && (
          <VideoControls
            videoRef={videoRef}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />
        )}

        {/* Error overlay with retry */}
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
}