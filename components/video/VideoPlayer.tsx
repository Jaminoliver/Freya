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

  const handleSeekTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (!seeking) return;
    e.preventDefault();
    seekTo(e.touches[0].clientX);
  }, [seeking, seekTo]);

  const handleSeekTouchEnd = React.useCallback(() => {
    setSeeking(false);
  }, []);

  // ── Fullscreen ────────────────────────────────────────────────────────
  const handleFullscreen = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const container = (videoRef.current?.closest("[data-videoplayer]") as HTMLElement) ?? videoRef.current?.parentElement;
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

      {/* Tap zone */}
      <div
        style={{ position: "absolute", inset: 0, zIndex: 4 }}
        onClick={handlePlayPause}
        onMouseMove={handleTapZoneMouseMove}
        onMouseUp={handleSeekMouseUp}
      />

      {/* Top-right mute button — always visible */}
      <button
        className="vp-mute-btn"
        style={{ position: "absolute", top: 12, right: 12, zIndex: 15, background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(6px)", WebkitTapHighlightColor: "transparent" }}
        onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
        onTouchEnd={(e) => { e.stopPropagation(); onToggleMute(); }}
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
          onTouchStart={handleSeekTouchStart}
          onTouchMove={handleSeekTouchMove}
          onTouchEnd={handleSeekTouchEnd}
          style={{ position: "relative", width: "100%", height: "20px", display: "flex", alignItems: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
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
  bunnyVideoId:      string | null;
  thumbnailUrl?:     string | null;
  processingStatus?: string | null;
  rawVideoUrl?:      string | null;
  fillParent?:       boolean;
  aspectRatio?:      string | null;
  hideInternalBlur?: boolean;
  blurHash?:         string | null;
  objectFit?:        "contain" | "cover";
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
}: VideoPlayerProps) {
  const videoRef       = React.useRef<HTMLVideoElement | null>(null);
  const containerRef   = React.useRef<HTMLDivElement | null>(null);
  const hlsRef         = React.useRef<any>(null);
  const hasInitialized = React.useRef(false);

  const [showPoster,   setShowPoster]   = React.useState(true);
  const [posterLoaded, setPosterLoaded] = React.useState(false);
  const [posterError,  setPosterError]  = React.useState(false);
  const [isBuffering,  setIsBuffering]  = React.useState(false);
  const [internalRatio, setInternalRatio] = React.useState<string | null>(null);
  const [isMuted,      setIsMuted]      = React.useState(() => getSavedMute());

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
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    hasInitialized.current = false;
    setShowPoster(true);
    setIsBuffering(false);
  }, []);

  const initVideo = React.useCallback(async () => {
    const video = videoRef.current;
    if (!video || !bunnyVideoId || hasInitialized.current) return;
    hasInitialized.current = true;

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
        hls.loadSource(hlsSrc);
        hls.attachMedia(video);
      }
    } catch {
      video.src = hlsSrc;
    }
  }, [bunnyVideoId, useRawFallback, rawVideoUrl]);

  React.useEffect(() => {
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) teardown();
    }, { threshold: 0.2 });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [teardown]);

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
          muted={isMuted}
          poster={posterSrc}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsBuffering(false)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onCanPlay={() => setIsBuffering(false)}
          style={{ ...videoStyle, visibility: showPoster ? "hidden" : "visible", animation: !showPoster ? "fadeIn 0.2s ease" : undefined }}
        />

        {/* Buffering spinner */}
        {isBuffering && !showPoster && (
          <div style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", border: "3px solid rgba(255,255,255,0.2)", borderTop: "3px solid rgba(255,255,255,0.9)", animation: "spin 0.8s linear infinite" }} />
          </div>
        )}

        {/* Custom controls — only shown after poster is dismissed */}
        {!showPoster && (
          <VideoControls
            videoRef={videoRef}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />
        )}
      </div>
    </>
  );
}