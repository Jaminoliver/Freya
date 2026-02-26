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
  const [pausedFrame, setPausedFrame] = React.useState<string | null>(null);
  const [isPlaying,   setIsPlaying]   = React.useState(false);
  const [aspectRatio, setAspectRatio] = React.useState<string | null>(null);
  const isPortrait = aspectRatio === "9/16";

  React.useEffect(() => {
    const ua     = navigator.userAgent;
    const mobile = /iPhone|iPad|iPod|Android/i.test(ua) || window.innerWidth < 768;
    setIsMobile(mobile);
  }, []);

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
    setPausedFrame(null);
    setIsPlaying(true);
  }, []);

  if (!bunnyVideoId) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: "100%", aspectRatio: "16/9", backgroundColor: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
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

  // Shared video styles — Safari fix: min-height: 100% forces object-fit cover on load
  const videoStyles: React.CSSProperties = {
    position:   "absolute",
    top:        0,
    left:       0,
    width:      "100%",
    height:     "100%",
    minHeight:  "100%",   // ← Safari iOS fix: object-fit cover doesn't apply without this
    objectFit:  "cover",
    background: "#000",
  };

  // Shared paused frame overlay styles
  const pausedFrameStyles: React.CSSProperties = {
    position:      "absolute",
    inset:         0,
    width:         "100%",
    height:        "100%",
    minHeight:     "100%",  // ← same Safari fix applied to overlay
    objectFit:     "cover",
    background:    "#000",
    zIndex:        1,
    pointerEvents: "none",
  };

  // ── Mobile: native <video> ────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        ref={containerRef}
        style={{
          width:           "100%",
          height:          isPortrait ? "520px" : "360px",
          position:        "relative",
          backgroundColor: "#000",
          overflow:        "hidden",
        }}
      >
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
          style={videoStyles}
        />

        {pausedFrame && !isPlaying && (
          <img src={pausedFrame} alt="" aria-hidden style={pausedFrameStyles} />
        )}
      </div>
    );
  }

  // ── Desktop: native <video> (not iframe — no CSS control over iframe) ────
  return (
    <div
      ref={containerRef}
      style={{
        width:           "100%",
        height:          isPortrait ? "500px" : "420px",
        position:        "relative",
        overflow:        "hidden",
        backgroundColor: "#000",
      }}
    >
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
        style={videoStyles}
      />

      {pausedFrame && !isPlaying && (
        <img src={pausedFrame} alt="" aria-hidden style={pausedFrameStyles} />
      )}
    </div>
  );
}