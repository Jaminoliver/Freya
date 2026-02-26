"use client";

import * as React from "react";

const BUNNY_PULL_ZONE  = "vz-8bc100f4-3c0.b-cdn.net";
const BUNNY_LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID;

export function getBunnyThumbnail(videoId: string) {
  return `https://${BUNNY_PULL_ZONE}/${videoId}/thumbnail.jpg`;
}

export function getBunnyHLS(videoId: string) {
  return `https://${BUNNY_PULL_ZONE}/${videoId}/playlist.m3u8`;
}

interface VideoPlayerProps {
  bunnyVideoId:      string | null;
  thumbnailUrl?:     string | null;
  processingStatus?: string | null;
  rawVideoUrl?:      string | null;
}

export default function VideoPlayer({
  bunnyVideoId,
  thumbnailUrl,
  processingStatus,
  rawVideoUrl,
}: VideoPlayerProps) {
  const videoRef     = React.useRef<HTMLVideoElement>(null);
  const canvasRef    = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [isMobile,    setIsMobile]    = React.useState(false);
  const [posterError, setPosterError] = React.useState(false);
  // FIX: paused frame — overlaid as <img> so black screen never shows
  const [pausedFrame, setPausedFrame] = React.useState<string | null>(null);
  const [isPlaying,   setIsPlaying]   = React.useState(false);
  // FIX: detected from video metadata — not hardcoded
  const [aspectRatio, setAspectRatio] = React.useState<string>("9/16");

  React.useEffect(() => {
    const ua     = navigator.userAgent;
    const mobile = /iPhone|iPad|iPod|Android/i.test(ua) || window.innerWidth < 768;
    setIsMobile(mobile);
  }, []);

  // FIX: Capture current frame to canvas, return as dataURL
  const captureFrame = React.useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPausedFrame(canvas.toDataURL("image/jpeg", 0.85));
  }, []);

  // FIX: Pause video + capture frame when scrolled out of view
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && !video.paused) {
          captureFrame();
          video.pause();
        }
      },
      { threshold: 0.2 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [captureFrame, isMobile]);

  // FIX: Detect aspect ratio from video metadata
  const handleLoadedMetadata = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const { videoWidth: w, videoHeight: h } = video;
    if (h > w)      setAspectRatio("9/16");
    else if (w > h) setAspectRatio("16/9");
    else            setAspectRatio("1/1");
  }, []);

  const handlePause = React.useCallback(() => {
    captureFrame();
    setIsPlaying(false);
  }, [captureFrame]);

  const handlePlay = React.useCallback(() => {
    setPausedFrame(null); // clear snapshot — show live video
    setIsPlaying(true);
  }, []);

  // ── No video yet ──────────────────────────────────────────────────
  if (!bunnyVideoId) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: "100%", aspectRatio: "9/16", backgroundColor: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "3px solid #2A2A3D", borderTop: "3px solid #8B5CF6", animation: "spin 0.9s linear infinite" }} />
          <span style={{ fontSize: "13px", color: "#8A8AA0", fontFamily: "'Inter', sans-serif" }}>
            Video processing — check back shortly
          </span>
        </div>
      </>
    );
  }

  const posterSrc = (!posterError && thumbnailUrl)
    ? thumbnailUrl
    : getBunnyThumbnail(bunnyVideoId);

  // ── Mobile: native <video> ────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        ref={containerRef}
        style={{
          // FIX: full bleed — no side constraints
          width:           "100%",
          aspectRatio,
          position:        "relative",
          backgroundColor: "#000",
          overflow:        "hidden",
        }}
      >
        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <video
          ref={videoRef}
          src={getBunnyHLS(bunnyVideoId)}
          poster={posterSrc}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onPause={handlePause}
          onPlay={handlePlay}
          onError={() => setPosterError(true)}
          style={{
            position:  "absolute",
            inset:     0,
            width:     "100%",
            height:    "100%",
            objectFit: "contain",
            background: "#000",
          }}
        />

        {/* FIX: paused frame overlay — prevents black screen on scroll */}
        {pausedFrame && !isPlaying && (
          <img
            src={pausedFrame}
            alt=""
            aria-hidden
            style={{
              position:   "absolute",
              inset:      0,
              width:      "100%",
              height:     "100%",
              objectFit:  "contain",
              background: "#000",
              // Sits above video but below controls
              zIndex: 1,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    );
  }

  // ── Desktop: Bunny iframe player ─────────────────────────────────
  const iframeSrc = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${bunnyVideoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;

  return (
    <div
      ref={containerRef}
      style={{
        width:       "100%",
        aspectRatio,
        position:    "relative",
        overflow:    "hidden",
        backgroundColor: "#000",
      }}
    >
      <iframe
        src={iframeSrc}
        loading="lazy"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}