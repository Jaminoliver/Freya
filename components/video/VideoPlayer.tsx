"use client";

import * as React from "react";

const BUNNY_PULL_ZONE = "vz-8bc100f4-3c0.b-cdn.net";

export function getBunnyThumbnail(videoId: string) {
  return `https://${BUNNY_PULL_ZONE}/${videoId}/thumbnail.jpg`;
}

export function getBunnyHLS(videoId: string) {
  return `https://${BUNNY_PULL_ZONE}/${videoId}/playlist.m3u8`;
}

interface VideoPlayerProps {
  bunnyVideoId: string | null;
  thumbnailUrl?: string | null;
  processingStatus?: string | null;
}

export default function VideoPlayer({
  bunnyVideoId,
  thumbnailUrl,
  processingStatus,
}: VideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  const thumb = bunnyVideoId ? getBunnyThumbnail(bunnyVideoId) : (thumbnailUrl ?? null);
  const hlsSrc = bunnyVideoId ? getBunnyHLS(bunnyVideoId) : null;

  // Detect mobile
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // HLS playback
  React.useEffect(() => {
    if (!playing || !videoRef.current || !hlsSrc) return;
    const vid = videoRef.current;

    if (vid.canPlayType("application/vnd.apple.mpegurl")) {
      vid.src = hlsSrc;
      vid.play();
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(hlsSrc);
          hls.attachMedia(vid);
          hls.on(Hls.Events.MANIFEST_PARSED, () => vid.play());
        }
      });
    }
  }, [playing, hlsSrc]);

  // ── Still processing ──────────────────────────────────────────────
  if (!bunnyVideoId || processingStatus !== "completed") {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: isMobile ? "100vw" : "100%",
          marginLeft: isMobile ? "calc(-50vw + 50%)" : "0",
          position: "relative",
          height: isMobile ? "500px" : undefined,
          paddingTop: isMobile ? undefined : "56.25%",
          backgroundColor: "#0F0F1A",
          marginBottom: "4px",
        }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "3px solid #2A2A3D", borderTop: "3px solid #8B5CF6", animation: "spin 0.9s linear infinite" }} />
            <span style={{ fontSize: "13px", color: "#8A8AA0", fontFamily: "'Inter', sans-serif" }}>
              Video processing — check back shortly
            </span>
          </div>
        </div>
      </>
    );
  }

  // ── Shared container styles ───────────────────────────────────────
  const containerStyle: React.CSSProperties = isMobile
    ? {
        width: "100vw",
        marginLeft: "calc(-50vw + 50%)",
        position: "relative",
        overflow: "hidden",
        marginBottom: "4px",
        height: "500px",
        backgroundColor: "#000",
      }
    : {
        width: "100%",
        position: "relative",
        height: "480px",
        overflow: "hidden",
        marginBottom: "4px",
        backgroundColor: "#000",
      };

  // ── Thumbnail state (before play) ────────────────────────────────
  if (!playing) {
    return (
      <div style={containerStyle} onClick={() => setPlaying(true)}>

        {/* Blurred background — fills black bars on portrait videos */}
        {thumb && (
          <img
            src={thumb}
            alt=""
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              width: "calc(100% + 40px)",
              height: "calc(100% + 40px)",
              top: "-20px",
              left: "-20px",
              objectFit: "cover",
              filter: "blur(22px)",
              transform: "scale(1.05)",
              opacity: 0.85,
            }}
          />
        )}

        {/* Dark overlay on blur */}
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" }} />

        {/* Actual thumbnail centered on top */}
        {thumb && (
          <img
            src={thumb}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        )}

        {/* Play button */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: "rgba(139,92,246,0.92)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 24px rgba(139,92,246,0.5)",
          cursor: "pointer",
          zIndex: 2,
        }}>
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <path d="M7 4.5L16 10L7 15.5V4.5Z" fill="#fff" />
          </svg>
        </div>
      </div>
    );
  }

  // ── Playing state ─────────────────────────────────────────────────
  return (
    <div style={containerStyle}>

      {/* Blurred thumbnail as background while video plays (fills black bars) */}
      {thumb && (
        <img
          src={thumb}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "calc(100% + 40px)",
            height: "calc(100% + 40px)",
            top: "-20px",
            left: "-20px",
            objectFit: "cover",
            filter: "blur(22px)",
            transform: "scale(1.05)",
            opacity: 0.7,
          }}
        />
      )}

      {/* Dark overlay */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }} />

      {/* Video on top */}
      <video
        ref={videoRef}
        controls
        playsInline
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 1,
        }}
      />
    </div>
  );
}