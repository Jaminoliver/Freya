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

// ── Get actual painted video height inside object-fit:contain container ───────
function getRenderedVideoHeight(video: HTMLVideoElement): number {
  const { videoWidth, videoHeight, offsetWidth, offsetHeight } = video;
  if (!videoWidth || !videoHeight) return offsetHeight;
  const videoRatio   = videoWidth / videoHeight;
  const elementRatio = offsetWidth / offsetHeight;
  if (elementRatio > videoRatio) return offsetHeight; // pillarboxed — full height used
  return offsetWidth / videoRatio;                    // letterboxed — height is constrained
}

// ── Custom Controls Overlay ───────────────────────────────────────────────────
interface ControlsProps {
  videoRef:      React.RefObject<HTMLVideoElement | null>;
  containerRef:  React.RefObject<HTMLDivElement | null>;
  isMuted:       boolean;
  onToggleMute:  () => void;
  onFirstPlay?:  () => void;
  isMobile?:     boolean;
  isPortrait?:   boolean;
  bottomOffset?: number;
  isPlaying?:         boolean;
  fullscreenTopLeft?: boolean;
}

function VideoControls({ videoRef, containerRef, isMuted, onToggleMute, onFirstPlay, isMobile, isPortrait, bottomOffset = 0, isPlaying: isPlayingProp = false, fullscreenTopLeft = false }: ControlsProps) {
  const [playing,      setPlaying]      = React.useState(() => !!(videoRef.current && !videoRef.current.paused));
  const [centerFlash,  setCenterFlash]  = React.useState<"play"|"pause"|null>(null);
  const [currentTime,  setCurrentTime]  = React.useState(0);
  const [duration,     setDuration]     = React.useState(() => videoRef.current?.duration || 0);
  const [buffered,     setBuffered]     = React.useState(0);
  const [visible,      setVisible]      = React.useState(true);
  const [seeking,      setSeeking]      = React.useState(false);
  const [isFullscreen,     setIsFullscreen]     = React.useState(false);
  const [isFakeFullscreen, setIsFakeFullscreen] = React.useState(false);

  const hideTimer             = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef           = React.useRef<HTMLDivElement>(null);
  const portalRef             = React.useRef<HTMLDivElement | null>(null);
  const originalParent        = React.useRef<Element | null>(null);
  const originalNextSibling   = React.useRef<ChildNode | null>(null);
  const origRadiusRef         = React.useRef<string>("");
  const originalSizeRef       = React.useRef<{ width: string; height: string }>({ width: "", height: "" });

  // ── Auto-hide controls ────────────────────────────────────────────────
  const showControls = React.useCallback(() => {
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    console.log('[VPC] showControls — arming timer t:', Date.now());
    hideTimer.current = setTimeout(() => {
      const video = videoRef.current;
      console.log('[VPC] timer fired — paused:', video?.paused, 't:', Date.now());
      if (video && !video.paused) setVisible(false);
      else console.log('[VPC] timer fired but paused — skip hide');
    }, 1500);
  }, [videoRef]);

  React.useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  // When parent signals playback started, arm the hide timer
  React.useEffect(() => {
    if (isPlayingProp) showControls();
  }, [isPlayingProp, showControls]);

  // ── Sync with video element ───────────────────────────────────────────
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay     = () => { console.log('[VPC] onPlay event t:', Date.now()); setPlaying(true); onFirstPlay?.(); showControls(); };
    const onPause    = () => { console.log('[VPC] onPause event t:', Date.now()); setPlaying(false); setVisible(true); if (hideTimer.current) clearTimeout(hideTimer.current); };
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
  const exitFakeFullscreen = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // FLIP: First — record fullscreen position
    const first = container.getBoundingClientRect();

    const parent  = originalParent.current;
    const sibling = originalNextSibling.current;

    // GPU-promote before DOM move
    container.style.willChange = "transform";
    (container.style as any).webkitBackfaceVisibility = "hidden";
    container.style.transformOrigin = "top left";

    // Teleport back, restore original size exactly so FLIP measures correctly
    Object.assign(container.style, { width: originalSizeRef.current.width, height: originalSizeRef.current.height, transition: "none", transform: "translateZ(0)" });
    if (parent) {
      if (sibling) parent.insertBefore(container, sibling);
      else parent.appendChild(container);
    }

    // FLIP: Last — record original position
    const last = container.getBoundingClientRect();

    // FLIP: Invert — snap element visually back to fullscreen coords
    const dx     = first.left - last.left;
    const dy     = first.top  - last.top;
    const scaleX = first.width  / last.width;
    const scaleY = first.height / last.height;
    container.style.transform    = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
    container.style.borderRadius = "0px";

    // Fade out backdrop
    if (portalRef.current) {
      portalRef.current.style.transition      = "background-color 280ms cubic-bezier(0.4,0,0.2,1)";
      portalRef.current.style.backgroundColor = "rgba(0,0,0,0)";
    }

    // FLIP: Play — double rAF so browser paints the inverted frame first
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.style.transition   = "transform 280ms cubic-bezier(0.4,0,0.2,1), border-radius 280ms cubic-bezier(0.4,0,0.2,1)";
        container.style.transform    = "none";
        container.style.borderRadius = origRadiusRef.current || "";
      });
    });

    // Cleanup after exit animation settles
    const onDone = (ev: TransitionEvent) => {
      if (ev.propertyName !== "transform") return;
      container.style.willChange       = "";
      container.style.transformOrigin  = "";
      container.style.transition       = "";
      (container.style as any).webkitBackfaceVisibility = "";
      const savedScroll = (portalRef.current as any)?._savedScroll ?? 0;
      portalRef.current?.remove();
      portalRef.current = null;
      window.scrollTo({ top: savedScroll, behavior: "instant" });
      container.removeEventListener("transitionend", onDone);
      setIsFakeFullscreen(false);
    };
    container.addEventListener("transitionend", onDone);
  }, [containerRef]);

  const handleFullscreen = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const video     = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    if (!isFakeFullscreen) {
        originalParent.current      = container.parentElement;
        originalNextSibling.current = container.nextSibling;

        // FLIP: First — snapshot position before any DOM change
        const first       = container.getBoundingClientRect();
        const origRadius  = getComputedStyle(container).borderRadius;
        origRadiusRef.current   = origRadius;
        originalSizeRef.current = { width: container.style.width, height: container.style.height };

        // GPU-promote before teleport to avoid paint flash
        container.style.willChange = "transform";
        (container.style as any).webkitBackfaceVisibility = "hidden";
        container.style.transformOrigin = "top left";

        // Portal starts fully transparent — no black flash
        const portal = document.createElement("div");
        Object.assign(portal.style, {
          position:        "fixed",
          inset:           "0",
          zIndex:          "9999",
          backgroundColor: "rgba(0,0,0,0)",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          transition:      "background-color 340ms cubic-bezier(0.4,0,0.2,1)",
        });
        document.body.appendChild(portal);
        portalRef.current = portal;

        // Teleport
        Object.assign(container.style, { width: "100%", height: "100%", transition: "none" });
        portal.appendChild(container);

        // FLIP: Last — measure fullscreen position
        const last   = container.getBoundingClientRect();
        const dx     = first.left - last.left;
        const dy     = first.top  - last.top;
        const scaleX = first.width  / last.width;
        const scaleY = first.height / last.height;

        // FLIP: Invert — snap visually back to original spot
        container.style.transform    = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
        container.style.borderRadius = origRadius;

        // FLIP: Play — double rAF ensures browser paints the inverted frame
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            container.style.transition   = "transform 340ms cubic-bezier(0.4,0,0.2,1), border-radius 340ms cubic-bezier(0.4,0,0.2,1)";
            container.style.transform    = "none";
            container.style.borderRadius = "0px";
            portal.style.backgroundColor = "rgba(0,0,0,1)";
          });
        });

        // Cleanup will-change after animation settles
        const onDone = (ev: TransitionEvent) => {
          if (ev.propertyName !== "transform") return;
          container.style.willChange = "";
          container.removeEventListener("transitionend", onDone);
        };
        container.addEventListener("transitionend", onDone);

        // Lock desktop scroll
        portal.addEventListener("wheel", (ev) => { ev.preventDefault(); }, { passive: false });

        // Swipe-down to exit — live drag animation, scroll-up ignored
        let swipeStartY = 0;

        portal.addEventListener("touchstart", (ev) => {
          swipeStartY = ev.touches[0].clientY;
          container.style.transition = "none";
        }, { passive: true });

        portal.addEventListener("touchmove", (ev) => {
          const delta = ev.touches[0].clientY - swipeStartY;
          if (delta <= 0) return; // scroll-up does nothing
          ev.preventDefault();   // lock page scroll behind portal

          const progress  = Math.min(delta / 320, 1);
          const translateY = delta * 0.55;
          const scale      = 1 - progress * 0.07;
          const radius     = progress * 20;

          container.style.transform    = `translateY(${translateY}px) scale(${scale})`;
          container.style.borderRadius = `${radius}px`;
          portal.style.backgroundColor = `rgba(0,0,0,${Math.max(0, 1 - progress * 0.65)})`;
        }, { passive: false });

        portal.addEventListener("touchend", (ev) => {
          const delta = ev.changedTouches[0].clientY - swipeStartY;
          if (delta > 120) {
            exitFakeFullscreen();
          } else {
            // Spring back
            container.style.transition   = "transform 380ms cubic-bezier(0.34,1.56,0.64,1), border-radius 280ms ease";
            container.style.transform    = "none";
            container.style.borderRadius = "0px";
            portal.style.transition      = "background-color 280ms ease";
            portal.style.backgroundColor = "rgba(0,0,0,1)";
          }
        }, { passive: true });

        (portalRef.current as any)._savedScroll = window.scrollY;
        setIsFakeFullscreen(true);
      } else {
        exitFakeFullscreen();
      }
      showControls();
  }, [videoRef, containerRef, isFakeFullscreen, showControls, exitFakeFullscreen]);

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
          console.log('[VPC] touchStart — wasPlaying:', wasPlaying, 't:', Date.now());
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
            console.log('[VPC] quickTap — wasPlaying:', wasPlaying, 'held:', held, 't:', Date.now());
            // Quick tap — toggle from the original state
            if (wasPlaying) {
              flashCenter("pause");        // we already paused on touchstart
            } else {
              v.play().catch(() => {});
              flashCenter("play");
            }
          } else {
            console.log('[VPC] longPress release — wasPlaying:', wasPlaying, 'held:', held, 't:', Date.now());
            // Long press release — resume if it was playing before
            if (wasPlaying) v.play().catch(() => {});
          }
          console.log('[VPC] calling showControls at t:', Date.now());
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

      {/* X button — only visible in fake fullscreen */}
      {isFakeFullscreen && (
        <button
          style={{ position: "absolute", top: 8, left: 12, zIndex: 15, background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(6px)", WebkitTapHighlightColor: "transparent" }}
          onClick={handleFullscreen}
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleFullscreen(e); }}
          aria-label="Exit fullscreen"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}

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

      {/* Play indicator — shows when paused, hides when playing */}
      {!playing && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 8, pointerEvents: "none" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      )}

      {/* Bottom controls overlay */}
      <div
        className="vp-controls-bar"
        style={{
          position:      "absolute",
          bottom:        (isMobile && isPortrait) ? (fullscreenTopLeft ? bottomOffset + 48 : bottomOffset + 24) : bottomOffset, left: 0, right: 0,
          zIndex:        10,
          opacity:       visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
          transition:    "opacity 0.25s ease",
          background:    isFakeFullscreen ? "none" : "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)",
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
          style={{ position: "relative", width: "100%", height: "20px", display: "flex", alignItems: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent", touchAction: "none", zIndex: 11, paddingRight: "8px", boxSizing: "border-box" }}
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
          <button style={{ ...btnStyle }} onClick={handlePlayPause} onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handlePlayPause(e); }} aria-label={playing ? "Pause" : "Play"}>
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
        </div>
      </div>

      <button style={{ ...btnStyle, position: "absolute", bottom: (isMobile && isPortrait ? (fullscreenTopLeft ? bottomOffset + 48 : bottomOffset + 24) : bottomOffset) + 10, right: 8, zIndex: 15, pointerEvents: "auto" }} onClick={handleFullscreen} onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleFullscreen(e); }} aria-label={isFakeFullscreen || isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
        {(isFullscreen || isFakeFullscreen) ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
        )}
      </button>
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
  autoPlay          = false,
  fullscreenTopLeft = false,
  knownWidth        = null,
  knownHeight       = null,
  creatorHandle,
}: VideoPlayerProps) {
  const videoRef       = React.useRef<HTMLVideoElement | null>(null);
  const containerRef   = React.useRef<HTMLDivElement | null>(null);
  const hlsRef         = React.useRef<any>(null);
  const hasInitialized = React.useRef(false);
  const bufferTimer    = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingTimer   = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [isMobile,     setIsMobile]     = React.useState(false);
  const [isPlaying,    setIsPlaying]    = React.useState(false);

  const slowTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(!window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [bottomOffset, setBottomOffset] = React.useState(0);

  // Mobile-only: watch container size and recompute how far controls must shift up
  // so they sit at the bottom of the actual painted video, not the container edge.
  React.useEffect(() => {
    // if (!isMobile) return; // temp: test in emulator
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const video = videoRef.current;
      if (!video) return;
      const vw = knownWidth  || video.videoWidth;
      const vh = knownHeight || video.videoHeight;
      if (!vw || !vh) return;
      const containerW = container.offsetWidth;
      const containerH = container.offsetHeight;
      const videoRatio = vw / vh;
      const elemRatio  = containerW / containerH;
      const renderedH  = elemRatio > videoRatio ? containerH : containerW / videoRatio;
      const bars       = Math.max(0, (containerH - renderedH) / 2);
      console.log('[VP] update', { vw, vh, containerW, containerH, videoRatio, elemRatio, renderedH, bars, bottomOffset: bars > 4 ? Math.round(bars) : 0 });
      setBottomOffset(bars > 4 ? Math.round(bars) : 0);
    };

    // Watch container size changes
    const ro = new ResizeObserver(update);
    ro.observe(container);

    // Also re-run whenever the video element fires loadedmetadata
    // (videoWidth/videoHeight aren't available until then)
    const onMeta = () => update();
    container.addEventListener("loadedmetadata", onMeta, true); // capture so it catches child video events

    update();
    return () => {
      ro.disconnect();
      container.removeEventListener("loadedmetadata", onMeta, true);
    };
  }, [isMobile, videoRef]);

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
        hls.on(Hls.Events.MANIFEST_PARSED, (_evt: any, data: any) => {
          const levels = data.levels.map((l: any, i: number) => `${i}: ${l.height}p @ ${Math.round(l.bitrate/1000)}kbps`);
          console.log(`%c[VideoPlayer] 📋 LEVELS`, "color: #F59E0B; font-weight: bold", levels);
          console.log(`%c[VideoPlayer] 💾 savedBw`, "color: #F59E0B; font-weight: bold", Number(localStorage.getItem("hls_bw")));
          hls.startLevel = data.levels.length - 1;
          hls.currentLevel = data.levels.length - 1;
          console.log(`%c[VideoPlayer] 🎯 startLevel set to`, "color: #F59E0B; font-weight: bold", hls.startLevel, hls.currentLevel);
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
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari only — native HLS, no HLS.js control available
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

  React.useEffect(() => {
    if (!autoPlay) return;
    handlePosterPlay();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            {!isLoading && <svg width="44" height="44" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" style={{ position: "relative", zIndex: 2 }}><polygon points="5,3 19,12 5,21"/></svg>}
          </div>
        )}

        {/* Video element — no native controls */}
        <video
          ref={videoRef}
          playsInline
          preload="none"
          loop
          muted={isMuted}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => {
            // Don't clear isBuffering here — onPlay fires before frames paint.
            // Only onPlaying truly means "video is now showing frames."
          }}
          onPause={() => { setIsPlaying(false); }}
          onEnded={() => { setIsPlaying(false); }}
          onWaiting={() => {
            if (bufferTimer.current) clearTimeout(bufferTimer.current);
            bufferTimer.current = setTimeout(() => setIsBuffering(true), 300);
          }}
          onPlaying={() => {
            if (bufferTimer.current) { clearTimeout(bufferTimer.current); bufferTimer.current = null; }
            if (slowTimer.current)   { clearTimeout(slowTimer.current);   slowTimer.current   = null; }
            if (loadingTimer.current) { clearTimeout(loadingTimer.current); loadingTimer.current = null; }
            setIsBuffering(false);
            setHasStarted(true);
            setIsPlaying(true);
            setShowSlowDots(false);
            setIsLoading(false);
            setShowPoster(false);
          }}
          onCanPlay={() => {
            // Don't clear isBuffering here either — wait for actual playback.
          }}
          onError={() => { setHasError(true); setIsBuffering(false); }}
          style={{ ...videoStyle, opacity: showPoster ? 0 : 1, transition: "opacity 0.25s ease" }}
        />

        {/* Loading — pulsing gradient ring (SVG, reliable everywhere).
            Shows during entire load window: poster dismissed → first frame paints,
            plus any mid-playback stall. */}
        {(isLoading || (!showPoster && !hasError && isBuffering)) && (
          <div style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#8B5CF6", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0s" }} />
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#B44DD4", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.2s" }} />
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#EC4899", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.4s" }} />
          </div>
        )}

        {/* Slow-loading dots — IG style, shown over poster when startup takes >800ms */}
        {showSlowDots && showPoster && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: "16px", zIndex: 11, display: "flex", justifyContent: "center", gap: "6px", pointerEvents: "none" }}>
            <style>{`
              @keyframes vp-dot { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); } 40% { opacity: 1; transform: scale(1); } }
            `}</style>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#8B5CF6", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0s",   boxShadow: "0 0 4px rgba(0,0,0,0.5)" }} />
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#B44DD4", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.2s", boxShadow: "0 0 4px rgba(0,0,0,0.5)" }} />
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#EC4899", animation: "vp-dot 1.2s infinite ease-in-out", animationDelay: "0.4s", boxShadow: "0 0 4px rgba(0,0,0,0.5)" }} />
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

        {/* Custom controls — only shown after poster is dismissed */}
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

        {!showPoster && !hasError && (
          <>
            {console.log('[VP] controls', { isMobile, bottomOffset, isPortrait, objectFit })}
            <VideoControls
              videoRef={videoRef}
              containerRef={containerRef}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              onFirstPlay={() => setHasStarted(true)}
              isMobile={isMobile}
              isPortrait={isPortrait || objectFit === "cover"}
              bottomOffset={bottomOffset}
              isPlaying={isPlaying}
              fullscreenTopLeft={fullscreenTopLeft}
            />
          </>
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