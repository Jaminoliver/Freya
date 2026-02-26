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
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    // Detect iOS/Android — iframe is broken on iOS Safari
    const ua = navigator.userAgent;
    const mobile = /iPhone|iPad|iPod|Android/i.test(ua) || window.innerWidth < 768;
    setIsMobile(mobile);
  }, []);

  const containerStyle: React.CSSProperties = {
    width:           isMobile ? "100vw" : "100%",
    marginLeft:      isMobile ? "calc(-50vw + 50%)" : "0",
    position:        "relative",
    height:          isMobile ? "500px" : "480px",
    overflow:        "hidden",
    marginBottom:    "4px",
    backgroundColor: "#000",
  };

  // ── No video yet ──────────────────────────────────────────────────
  if (!bunnyVideoId) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={containerStyle}>
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

  // ── Mobile: native <video> + HLS (iOS Safari natively supports .m3u8) ──
  if (isMobile) {
    const hlsSrc       = getBunnyHLS(bunnyVideoId);
    const posterSrc    = thumbnailUrl || getBunnyThumbnail(bunnyVideoId);

    return (
      <div style={containerStyle}>
        <video
          src={hlsSrc}
          poster={posterSrc}
          controls
          playsInline          // required on iOS — prevents fullscreen hijack
          preload="metadata"
          style={{
            position:   "absolute",
            inset:      0,
            width:      "100%",
            height:     "100%",
            objectFit:  "contain",
            background: "#000",
          }}
        />
      </div>
    );
  }

  // ── Desktop: Bunny iframe player ─────────────────────────────────
  const iframeSrc = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${bunnyVideoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;

  return (
    <div style={containerStyle}>
      <iframe
        src={iframeSrc}
        loading="lazy"
        style={{
          position: "absolute",
          inset:    0,
          width:    "100%",
          height:   "100%",
          border:   "none",
        }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}