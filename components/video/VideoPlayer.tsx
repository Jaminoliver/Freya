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

// Module-level cache — survives re-mounts, cleared only on page reload
const watchedVideoIds = new Set<string>();
export const warmedVideoIds    = new Set<string>();
export const preloadedSegments = new Set<string>();

// Shared across every VideoPlayer instance on the page.
// When any fullscreen is open, all intersection observers skip auto-play.
let anyFullscreenOpen = false;
export function setGlobalFullscreenOpen(open: boolean) { anyFullscreenOpen = open; }

let activeHlsCount = 0;

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
  isStarted?:       boolean;
  fullscreenTopLeft?:      boolean;
  onOpenFullscreen?:       () => void;
  displayName?:            string;
  username?:               string;
  avatarUrl?:              string | null;
  caption?:                string | null;
  isBuffering?:            boolean;
  isLoading?:              boolean;
  onPosterPlay?:           () => void;
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
  isStarted = false,
  fullscreenTopLeft = false,
  onOpenFullscreen,
  displayName,
  username,
  avatarUrl,
  caption,
  isBuffering = false,
  isLoading = false,
  onPosterPlay,
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

  const hideTimer             = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef           = React.useRef<HTMLDivElement>(null);
  const portalRef             = React.useRef<HTMLDivElement | null>(null);
  const overlayRootRef        = React.useRef<any>(null);
  const originalParent        = React.useRef<Element | null>(null);
  const originalNextSibling   = React.useRef<ChildNode | null>(null);
  const origRadiusRef         = React.useRef<string>("");
  const originalSizeRef       = React.useRef<{ width: string; height: string }>({ width: "", height: "" });
  const seekingRef            = React.useRef(false);
  const [isFakeFullscreen, setIsFakeFullscreen] = React.useState(false);

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
    if (video.paused) { onPosterPlay ? onPosterPlay() : video.play().catch(() => {}); flashCenter("play"); }
    else              { video.pause(); flashCenter("pause"); }
    showControls();
  }, [videoRef, showControls, flashCenter, onPosterPlay]);

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
      videoRef.current?.play().catch(() => {});
    };
    container.addEventListener("transitionend", onDone);
  }, [containerRef]);

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

      {/* Tap zone — tap to pause/play on both mobile and desktop */}
      <div
        style={{ position: "absolute", inset: 0, zIndex: 12, WebkitTapHighlightColor: "transparent", userSelect: "none", WebkitUserSelect: "none", touchAction: "manipulation" }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          if (isMobile) return; // touch handled by onTouchEnd
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
          if ((e.target as HTMLElement).closest("button")) return;
          e.stopPropagation();
          e.preventDefault();
          const target = e.currentTarget as HTMLDivElement;
          const held = Date.now() - Number(target.dataset.touchStart ?? 0);
          const dist = Math.sqrt(
            (e.changedTouches[0].clientX - Number(target.dataset.touchStartX ?? 0)) ** 2 +
            (e.changedTouches[0].clientY - Number(target.dataset.touchStartY ?? 0)) ** 2
          );
          if (held < 200 && dist < 10) {
            handlePlayPause(e);
          }
        }}
        onTouchCancel={() => {}}
        onMouseMove={handleTapZoneMouseMove}
        onMouseUp={handleSeekMouseUp}
      />

     

      {/* Play indicator — shows when paused, hidden in fake fullscreen (FullscreenOverlay has its own) */}
      {(() => { console.log(`[PlayBtn] playing=${playing} isStarted=${isStarted} isFakeFullscreen=${isFakeFullscreen} isBuffering=${isBuffering} isLoading=${isLoading}`); return null; })()}
{!playing && isStarted && !isFakeFullscreen && !isBuffering && !isLoading && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 6, pointerEvents: "none" }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
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
      {!isFullscreen && !isFakeFullscreen && (
        <button
          style={{ position: "absolute", bottom: 12, right: 12, zIndex: 15, pointerEvents: "auto", background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(6px)", WebkitTapHighlightColor: "transparent" }}
          onClick={async (e) => {
            e.stopPropagation();
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
            });
            document.body.appendChild(portal);
            portalRef.current = portal;

            Object.assign(container.style, { width: "100%", height: "100%", transition: "none" });
            container.classList.add("vp-portal-active");
            portal.appendChild(container);

            // X button — on portal, outside container
            const xBtn = document.createElement("button");
            xBtn.style.cssText = "position:absolute;top:12px;left:12px;z-index:10001;background:rgba(0,0,0,0.45);border:none;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(6px);-webkit-tap-highlight-color:transparent;";
            xBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
            xBtn.addEventListener("click", (ev) => { ev.stopPropagation(); exitFakeFullscreen(); });
            xBtn.addEventListener("touchend", (ev) => { ev.preventDefault(); ev.stopPropagation(); exitFakeFullscreen(); });
            portal.appendChild(xBtn);

            // Mute button — on portal, outside container
            const muteBtn = document.createElement("button");
            const getMuteIcon = (muted: boolean) => muted
              ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
              : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
            muteBtn.style.cssText = "position:absolute;top:12px;right:12px;z-index:10001;background:rgba(0,0,0,0.45);border:none;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(6px);-webkit-tap-highlight-color:transparent;";
            muteBtn.innerHTML = getMuteIcon(getSavedMute());
            muteBtn.addEventListener("click", (ev) => {
              ev.stopPropagation();
              const next = !getSavedMute();
              const video = videoRef.current;
              if (video) video.muted = next;
              saveMute(next);
              muteBtn.innerHTML = getMuteIcon(next);
            });
            muteBtn.addEventListener("touchend", (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              const next = !getSavedMute();
              const video = videoRef.current;
              if (video) video.muted = next;
              saveMute(next);
              muteBtn.innerHTML = getMuteIcon(next);
            });
            portal.appendChild(muteBtn);

            // Inject overlay
            const overlayDiv = document.createElement("div");
            overlayDiv.style.cssText = "position:absolute;inset:0;z-index:11;pointer-events:none;";
            portal.appendChild(overlayDiv);
            const ReactDOMClient = (await import("react-dom/client")).default;
            const React2 = (await import("react")).default;
            const initials = (displayName?.[0] ?? username?.[0] ?? "?").toUpperCase();
            overlayRootRef.current = ReactDOMClient.createRoot(overlayDiv);
            const video = videoRef.current;
            function FullscreenOverlay() {
              const [currentTime, setCurrentTime] = React2.useState(video?.currentTime ?? 0);
              const [duration,    setDuration]    = React2.useState(video?.duration ?? 0);
              const [isSeeking,   setIsSeeking]   = React2.useState(false);
              const [captionExpanded, setCaptionExpanded] = React2.useState(false);
              const [isPaused,    setIsPaused]    = React2.useState(!!(video?.paused));
              const seekBarRef    = React2.useRef<HTMLDivElement>(null);
              const wasPlayingRef = React2.useRef(false);
              const isSeekingRef  = React2.useRef(false);
              const durationRef   = React2.useRef(duration);

              React2.useEffect(() => { durationRef.current = duration; }, [duration]);

              React2.useEffect(() => {
                if (!video) return;
                const onTime  = () => { if (!isSeekingRef.current) setCurrentTime(video.currentTime); };
                const onMeta  = () => setDuration(video.duration);
                const onPause = () => setIsPaused(true);
                const onPlay  = () => setIsPaused(false);
                video.addEventListener("timeupdate",     onTime);
                video.addEventListener("loadedmetadata", onMeta);
                video.addEventListener("pause",          onPause);
                video.addEventListener("play",           onPlay);
                video.addEventListener("playing",        onPlay);
                if (video.duration) setDuration(video.duration);
                return () => {
                  video.removeEventListener("timeupdate",     onTime);
                  video.removeEventListener("loadedmetadata", onMeta);
                  video.removeEventListener("pause",          onPause);
                  video.removeEventListener("play",           onPlay);
                  video.removeEventListener("playing",        onPlay);
                };
              }, []);

              const getSeekFraction = React2.useCallback((clientX: number) => {
                const bar = seekBarRef.current;
                if (!bar) return 0;
                const rect = bar.getBoundingClientRect();
                return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
              }, []);

              const handleSeekPointerDown = React2.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                wasPlayingRef.current = !video?.paused;
                isSeekingRef.current = true;
                setIsSeeking(true);
                const t = getSeekFraction(e.clientX) * durationRef.current;
                setCurrentTime(t);
                if (video) video.currentTime = t;
              }, [getSeekFraction]);

              const handleSeekPointerMove = React2.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
                if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                e.stopPropagation();
                const t = getSeekFraction(e.clientX) * durationRef.current;
                setCurrentTime(t);
                if (video) video.currentTime = t;
              }, [getSeekFraction]);

              const handleSeekPointerUp = React2.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
                e.stopPropagation();
                isSeekingRef.current = false;
                setIsSeeking(false);
                if (wasPlayingRef.current) video?.play().catch(() => {});
              }, []);

              React2.useEffect(() => {
                const bar = seekBarRef.current;
                if (!bar) return;
                const onTouchStart = (e: TouchEvent) => {
                  wasPlayingRef.current = !video?.paused;
                  isSeekingRef.current = true;
                  setIsSeeking(true);
                  const t = getSeekFraction(e.touches[0].clientX) * durationRef.current;
                  setCurrentTime(t);
                  if (video) video.currentTime = t;
                };
                const onTouchMove = (e: TouchEvent) => {
                  if (!isSeekingRef.current) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const t = getSeekFraction(e.touches[0].clientX) * durationRef.current;
                  setCurrentTime(t);
                  if (video) video.currentTime = t;
                };
                const onTouchEnd = () => {
                  isSeekingRef.current = false;
                  setIsSeeking(false);
                  if (wasPlayingRef.current) video?.play().catch(() => {});
                };
                bar.addEventListener("touchstart", onTouchStart, { passive: true });
                bar.addEventListener("touchmove",  onTouchMove,  { passive: false });
                bar.addEventListener("touchend",   onTouchEnd,   { passive: true });
                return () => {
                  bar.removeEventListener("touchstart", onTouchStart);
                  bar.removeEventListener("touchmove",  onTouchMove);
                  bar.removeEventListener("touchend",   onTouchEnd);
                };
              }, [getSeekFraction]);

              const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

              const formatT = (s: number) => {
                if (!isFinite(s) || s < 0) return "0:00";
                const m = Math.floor(s / 60);
                const sec = Math.floor(s % 60);
                return `${m}:${sec.toString().padStart(2, "0")}`;
              };

              return React2.createElement(React2.Fragment, null,
                // bottom gradient
                React2.createElement("div", { style: { position: "absolute", bottom: 0, left: 0, right: 0, height: "280px", background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)", pointerEvents: "none", zIndex: 1 } }),

                // play/pause button — only visible when paused
                isPaused && React2.createElement("div", {
                  onClick: (e: any) => { e.stopPropagation(); if (video) { video.play().catch(() => {}); } },
                  style: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 17, cursor: "pointer", pointerEvents: "auto" },
                },
                  React2.createElement("svg", { width: 64, height: 64, viewBox: "0 0 24 24", fill: "#fff" },
                    React2.createElement("polygon", { points: "5,3 19,12 5,21" })
                  )
                ),

                // unified bottom stack
                React2.createElement("div", {
                  style: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 16, display: "flex", flexDirection: "column", padding: "0 12px", pointerEvents: "auto" },
                  onClick: (e: any) => e.stopPropagation(),
                },
                  // avatar row
                  React2.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" } },
                    React2.createElement("div", { style: { width: "44px", height: "44px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "2px solid rgba(255,255,255,0.3)" } },
                      avatarUrl
                        ? React2.createElement("img", { src: avatarUrl, alt: "", style: { width: "100%", height: "100%", objectFit: "cover", display: "block" } })
                        : React2.createElement("div", { style: { width: "100%", height: "100%", background: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "16px", fontWeight: 700 } }, initials)
                    ),
                    React2.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "2px" } },
                      React2.createElement("span", { style: { fontSize: "15px", fontWeight: 700, color: "#fff", fontFamily: "'Inter',sans-serif" } }, displayName ?? username ?? ""),
                      React2.createElement("span", { style: { fontSize: "13px", color: "rgba(255,255,255,0.55)", fontFamily: "'Inter',sans-serif" } }, username ? `@${username}` : "")
                    )
                  ),

                  // caption
                  caption && React2.createElement("p", {
                    onClick: (e: any) => { e.stopPropagation(); setCaptionExpanded((x: boolean) => !x); },
                    style: {
                      margin: "0 0 8px 0", fontSize: 14, lineHeight: "1.4",
                      color: "rgba(255,255,255,0.9)", fontFamily: "'Inter',sans-serif",
                      wordBreak: "break-word", cursor: "pointer",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: captionExpanded ? 999 : 2,
                    } as any
                  }, caption),

                  // timer
                  isSeeking && React2.createElement("div", {
                    style: { fontSize: 12, color: "rgba(255,255,255,0.9)", fontFamily: "'Inter',sans-serif", fontWeight: 600, marginBottom: 2, paddingLeft: 2 }
                  }, `${formatT(currentTime)} / ${formatT(duration)}`),

                  // seek bar
                  React2.createElement("div", {
                    ref: seekBarRef,
                    "data-seekbar": "1",
                    onPointerDown: handleSeekPointerDown,
                    onPointerMove: handleSeekPointerMove,
                    onPointerUp:   handleSeekPointerUp,
                    onPointerCancel: handleSeekPointerUp,
                    style: { position: "relative", width: "100%", height: "44px", display: "flex", alignItems: "center", touchAction: "none", cursor: "pointer", boxSizing: "border-box", marginBottom: "4px" },
                  },
                    React2.createElement("div", { style: { position: "relative", width: "100%", height: isSeeking ? "4px" : "2px", borderRadius: "2px", background: "rgba(255,255,255,0.25)", transition: "height 0.15s ease" } },
                      React2.createElement("div", { style: { position: "absolute", left: 0, top: 0, height: "100%", width: `${progress}%`, background: "#fff", borderRadius: "2px" } }),
                      isSeeking && React2.createElement("div", { style: { position: "absolute", top: "50%", left: `${progress}%`, transform: "translate(-50%,-50%)", width: "13px", height: "13px", borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.4)", pointerEvents: "none" } })
                    )
                  )
                )
              );
            }
            overlayRootRef.current.render(React2.createElement(FullscreenOverlay));

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
            let swipeStartTarget: EventTarget | null = null;
            portal.addEventListener("touchstart", (ev) => {
              swipeStartY = ev.touches[0].clientY;
              swipeStartTarget = ev.target;
              container.style.transition = "none";
            }, { passive: true });
            portal.addEventListener("touchmove", (ev) => {
              const bar = portal.querySelector("[data-seekbar]");
              if (bar && bar.contains(ev.target as Node)) return;
              const delta = ev.touches[0].clientY - swipeStartY;
              if (delta <= 0 || seekingRef.current) return;
              ev.preventDefault();
              const prog = Math.min(delta / 320, 1);
              container.style.transform    = `translateY(${delta * 0.55}px) scale(${1 - prog * 0.07})`;
              container.style.borderRadius = `${prog * 20}px`;
              portal.style.backgroundColor = `rgba(0,0,0,${Math.max(0, 1 - prog * 0.65)})`;
            }, { passive: false });
            portal.addEventListener("touchend", (ev) => {
              const delta = ev.changedTouches[0].clientY - swipeStartY;
              if (delta > 120 && !seekingRef.current) {
                exitFakeFullscreen();
              } else {
                container.style.transition   = "transform 380ms cubic-bezier(0.34,1.56,0.64,1), border-radius 280ms ease";
                container.style.transform    = "none";
                container.style.borderRadius = "0px";
                portal.style.transition      = "background-color 280ms ease";
                portal.style.backgroundColor = "rgba(0,0,0,1)";
              }
            }, { passive: true });

            portal.addEventListener("click", (ev) => {
              const tgt = ev.target as HTMLElement;
              if (tgt.closest("button, [data-seekbar]")) return;
            });

            (portal as any)._savedScroll = window.scrollY;
            document.body.style.overflow = "hidden";
            setIsFakeFullscreen(true);
          }}
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
  fullscreenTopLeft?: boolean;
  eager?:             boolean;
  knownWidth?:        number | null;
  knownHeight?:       number | null;
  creatorHandle?:    string;
  displayName?:      string;
  username?:         string;
  avatarUrl?:        string | null;
  caption?:          string | null;
  autoPlay?:         boolean;
  hideMuteButton?:   boolean;
}

export interface VideoPlayerHandle {
  pause: () => void;
  getHls: () => any;
  getCurrentTime: () => number;
  _videoEl: HTMLVideoElement | null;
  resume: (time?: number) => void;
  toggleMute: () => void;
  isMuted: () => boolean;
  prewarm: () => void;
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
  fullscreenTopLeft = false,
  eager             = false,
  knownWidth        = null,
  knownHeight       = null,
  creatorHandle,
  displayName,
  username,
  avatarUrl,
  caption,
  autoPlay        = false,
  hideMuteButton  = false,
}: VideoPlayerProps, ref) {
  const videoRef       = React.useRef<HTMLVideoElement | null>(null);
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (getSavedMute()) video.setAttribute("muted", "");
    video.defaultMuted = true;
  }, []);
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
  const waitStartRef = React.useRef<number>(0);
  const stallTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoPlayRef = React.useRef(autoPlay);
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
    console.log(`%c[VP:${bunnyVideoId?.slice(0,8)}] 🔥 teardown called — force=${force} stack=${new Error().stack?.split('\n')[2]?.trim()}`, "color: #FB923C; font-weight: bold");
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
      activeHlsCount = Math.max(0, activeHlsCount - 1);
    }
    if (slowTimer.current) { clearTimeout(slowTimer.current); slowTimer.current = null; }
    hasInitialized.current = false;
    setIsBuffering(false);
    setHasStarted(false);
    setShowSlowDots(false);
  }, [bunnyVideoId]);

  const initVideo = React.useCallback(async () => {
    const video = videoRef.current;
    if (!video || !bunnyVideoId || hasInitialized.current) { console.log(`%c[VP:${bunnyVideoId?.slice(0,8)}] ⛔ initVideo blocked — video=${!!video} bunnyVideoId=${!!bunnyVideoId} hasInitialized=${hasInitialized.current}`, "color: #F87171; font-weight: bold"); return; }
    hasInitialized.current = true;
    activeHlsCount++;
    if (activeHlsCount > 2) { activeHlsCount--; hasInitialized.current = false; console.log(`%c[VP:${bunnyVideoId?.slice(0,8)}] ⛔ prewarm skipped — HLS cap reached`, "color: #F59E0B"); return; }
    setHasError(false);
    if (video.disableRemotePlayback !== undefined) video.disableRemotePlayback = true;
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
      if (Hls.isSupported()) {
        const savedBw = Number(localStorage.getItem("hls_bw")) || 0;
        const conn = (navigator as any).connection;
        const downlink: number = conn?.downlink ?? 10;
        const effectiveType: string = conn?.effectiveType ?? "4g";
        const isSlow = downlink < 5 || effectiveType === "3g" || effectiveType === "2g" || effectiveType === "slow-2g";
        const defaultEstimate = savedBw > 0
          ? Math.min(savedBw, downlink * 1_000_000 * 0.8)
          : downlink * 1_000_000 * 0.8;
        console.log(`%c[VP:${bunnyVideoId?.slice(0,8)}] 🌐 network — effectiveType=${effectiveType} downlink=${downlink}Mbps isSlow=${isSlow}`, "color: #60A5FA; font-weight: bold");
        console.log(`%c[VP:${bunnyVideoId?.slice(0,8)}] 📊 ABR init — savedBw=${savedBw > 0 ? Math.round(savedBw/1000)+"kbps" : "none"} defaultEstimate=${Math.round(defaultEstimate/1000)}kbps testBandwidth=${!isSlow}`, "color: #60A5FA; font-weight: bold");
        const hls = new Hls({
          startLevel:             -1,
          testBandwidth:          !isSlow,
          capLevelToPlayerSize:   true,
          lowLatencyMode:         false,
          abrEwmaDefaultEstimate: defaultEstimate,
          abrEwmaFastVoD:         2,
          abrEwmaSlowVoD:         6,
          abrBandWidthFactor:     0.85,
          abrBandWidthUpFactor:   0.6,
          maxBufferLength:        10,
          maxMaxBufferLength:     30,
          backBufferLength:       30,
          maxStarvationDelay:     2,
        });
        hlsRef.current = hls;
        hls.on(Hls.Events.FRAG_LOADED, () => {
          localStorage.setItem("hls_bw", String(hls.bandwidthEstimate));
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (_evt: any, data: any) => {
          const level = hls.levels[data.level];
          console.log(`%c[VideoPlayer] 🎬 QUALITY → ${level.height}p (${Math.round(level.bitrate / 1000)}kbps)`, "color: #10B981; font-weight: bold");
        });
        
        
        let mediaErrorRecovered = false;
        hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
          console.log(`%c[VP:${bunnyVideoId?.slice(0,8)}] 🔴 HLS error — fatal=${data?.fatal} type=${data?.type} details=${data?.details}`, "color: #F87171; font-weight: bold");
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
        console.log(`%c[VP:${bunnyVideoId?.slice(0,8)}] 🔗 attachMedia called — media=${!!hls.media} videoEl=${!!video} videoInDOM=${document.contains(video)}`, "color: #A78BFA; font-weight: bold");
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
      console.log(`%c[VP:${bunnyVideoId?.slice(0,8)}] 💀 cleanup effect — unmounting, destroying HLS`, "color: #E879F9; font-weight: bold");
      if (bufferTimer.current) clearTimeout(bufferTimer.current);
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
      if (stallTimer.current) clearTimeout(stallTimer.current);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
        activeHlsCount = Math.max(0, activeHlsCount - 1);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!bunnyVideoId) return;
    if (watchedVideoIds.has(bunnyVideoId)) return;

    const conn = (navigator as any).connection;
    const ect: string = conn?.effectiveType ?? "4g";
    if (ect === "slow-2g" || ect === "2g") return;

    // Pre-fetch manifest into browser HTTP cache immediately on mount
    console.log(`[PREWARM:${bunnyVideoId?.slice(0,8)}] 🔥 starting prewarm`);
    const t0 = Date.now();
    fetch(getBunnyHLS(bunnyVideoId), { method: "GET", cache: "force-cache" })
      .then(() => console.log(`[PREWARM:${bunnyVideoId?.slice(0,8)}] ✅ done in ${Date.now()-t0}ms`))
      .catch(() => console.log(`[PREWARM:${bunnyVideoId?.slice(0,8)}] ❌ failed`));
  }, [bunnyVideoId]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio < 0.2) {
        if (!isBuffering) teardown();
        setShowPoster(true);
      }
    }, { threshold: [0, 0.2] });

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
    isPausedByScroll.current = false; // user explicitly re-engaged
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
    console.log(`[VP:${bunnyVideoId?.slice(0,8)}] autoPlay effect fired`);
    const t = setTimeout(() => {
      console.log(`[VP:${bunnyVideoId?.slice(0,8)}] autoPlay calling handlePosterPlay`);
      handlePosterPlay().then(() => {
        console.log(`[VP:${bunnyVideoId?.slice(0,8)}] autoPlay handlePosterPlay resolved`);
      }).catch((err: any) => {
        console.warn(`[VP:${bunnyVideoId?.slice(0,8)}] autoPlay handlePosterPlay error`, err);
      });
    }, 100);
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

  React.useImperativeHandle(ref, () => ({
    pause: () => videoRef.current?.pause(),
    getHls: () => hlsRef.current,
    getCurrentTime: () => videoRef.current?.currentTime ?? 0,
    _videoEl: videoRef.current,
    toggleMute: () => handleToggleMute(),
    isMuted: () => getSavedMute(),
    prewarm: () => {
      if (hasInitialized.current) return;
      const conn = (navigator as any).connection;
      const ect: string = conn?.effectiveType ?? "4g";
      if (ect === "slow-2g" || ect === "2g") return;
      console.log(`%c[VP:${bunnyVideoId?.slice(0,8)}] 🔥 prewarm() called — attaching HLS without play`, "color: #F59E0B; font-weight: bold");
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
        @keyframes vp-dot { 0%, 60%, 100% { opacity: 0.25; transform: scale(0.75); } 30% { opacity: 1; transform: scale(1.15); } }
        .vp-portal-active [data-creator-watermark] { font-size: 17px !important; padding: 2px 8px 20px 64px !important; }
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
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(20px) brightness(0.45)", transform: "scale(1.1)", zIndex: 0, pointerEvents: "none", opacity: showPoster ? 0 : 1, transition: showPoster ? "none" : "opacity 0.2s ease" }}
          />
        )}

        {blurHash && !posterLoaded && (
          <BlurHashCanvas hash={blurHash} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />
        )}

        {/* Poster + play button */}
        {(showPoster || isLoading) && (
          <div
            onClick={showPoster ? handlePosterPlay : undefined}
            style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", cursor: showPoster ? "pointer" : "default", opacity: showPoster ? 1 : 0, transition: showPoster ? "opacity 0.25s ease" : "none", pointerEvents: showPoster ? "auto" : "none" }}
          >
            <img
              src={posterSrc}
              alt=""
              fetchPriority="high"
              onLoad={handlePosterLoad}
              onError={() => setPosterError(true)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: objectFit, opacity: posterLoaded ? 1 : 0, transition: "opacity 0.25s ease" }}
            />
            {!isLoading && !isAutoplaying && !autoPlay && !isBuffering && (
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
              const video = videoRef.current;
              if (video && video.duration && (video.currentTime >= video.duration - 0.5 || video.currentTime <= 0.3)) return;
              if (bufferTimer.current) clearTimeout(bufferTimer.current);
              if (stallTimer.current) clearTimeout(stallTimer.current);
              waitStartRef.current = Date.now();
              setIsBuffering(true);
              const conn2 = (navigator as any).connection;
              const isSlow2 = (conn2?.downlink ?? 10) < 5 || ["3g","2g","slow-2g"].includes(conn2?.effectiveType ?? "");
              bufferTimer.current = setTimeout(() => {
                console.log(`[VP:${bunnyVideoId?.slice(0,8)}] ⏳ onWaiting — showing buffering dots at ${waitStartRef.current} isSlow=${isSlow2}`);
                const video = videoRef.current;
                if (!video) return;
                stallTimer.current = setTimeout(() => {
                  if (watchedVideoIds.has(bunnyVideoId!)) return; // already played successfully
                  const hls = hlsRef.current;
                  const conn = (navigator as any).connection;
                  console.log(`[VP:${bunnyVideoId?.slice(0,8)}] 🔄 stall check — paused=${video.paused} readyState=${video.readyState} buffered=${video.buffered.length > 0 ? video.buffered.end(video.buffered.length-1).toFixed(2) : 0}s currentTime=${video.currentTime.toFixed(2)}s hlsAlive=${!!hls} hlsMedia=${!!hls?.media} hlsLevels=${hls?.levels?.length ?? "n/a"}`);
                  console.log(`[VP:${bunnyVideoId?.slice(0,8)}] 🌐 network — effectiveType=${conn?.effectiveType ?? "unknown"} downlink=${conn?.downlink ?? "unknown"}Mbps rtt=${conn?.rtt ?? "unknown"}ms`);
                  console.log(`[VP:${bunnyVideoId?.slice(0,8)}] 📦 hls — level=${hls?.currentLevel} bandwidthEstimate=${hls ? Math.round(hls.bandwidthEstimate/1000) : "n/a"}kbps`);
                  if (video.readyState < 3) {
                    console.log(`[VP:${bunnyVideoId?.slice(0,8)}] 🚨 stall detected — readyState=${video.readyState} — restarting HLS load`);
                    const hls2 = hlsRef.current;
if (hls2 && hls2.media) {
  try { hls2.stopLoad(); hls2.startLoad(-1); } catch {}
}                    video.play().catch(() => {});
                  } else {
                    console.log(`[VP:${bunnyVideoId?.slice(0,8)}] ✅ stall check passed — readyState=${video.readyState}`);
                  }
                }, isSlow2 ? 8000 : 3000);
              }, isSlow2 ? 2000 : 800);
            }}
            onPlaying={() => {
              if (bufferTimer.current) { clearTimeout(bufferTimer.current); bufferTimer.current = null; }
              if (slowTimer.current)   { clearTimeout(slowTimer.current);   slowTimer.current   = null; }
              if (stallTimer.current)  { clearTimeout(stallTimer.current);  stallTimer.current  = null; }
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
              if (bunnyVideoId) {
                window.dispatchEvent(new CustomEvent("freya:video-playing", { detail: { bunnyVideoId } }));
              }
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
transition: showPoster ? "opacity 0.25s ease" : "none",
            }}
          />
        </div>

        {/* Buffering dots */}
        {(isLoading || (!hasError && isBuffering)) && (
          <div style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#8B5CF6", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0s" }} />
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#9B4FE8", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.15s" }} />
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#B44DD4", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.3s" }} />
            <span style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#EC4899", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.45s" }} />
          </div>
        )}

        

        {/* Mute button visible on poster */}
        {!hideMuteButton && <button
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
          </button>}

        {/* Creator handle overlay */}
        {creatorHandle && (
          <div data-creator-watermark style={{
            position: "absolute", top: 0, left: 0,
            zIndex: 12, pointerEvents: "none",
            fontSize: "13px", fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.02em",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)",
            width: "100%",
            padding: "2px 8px 20px 8px",
          }}>
            {creatorHandle}@Fréya.com
          </div>
        )}

        {/* Custom controls */}
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
            fullscreenTopLeft={fullscreenTopLeft}
            onOpenFullscreen={() => containerRef.current?.querySelector<HTMLButtonElement>("[aria-label='Fullscreen']")?.click()}
            displayName={displayName}
            username={username}
            avatarUrl={avatarUrl}
            caption={caption}
            isBuffering={isBuffering}
            isLoading={isLoading}
            onPosterPlay={handlePosterPlay}
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