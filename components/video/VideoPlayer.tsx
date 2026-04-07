"use client";

import * as React from "react";
import { decode } from "blurhash";

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

interface VideoPlayerProps {
  bunnyVideoId:      string | null;
  thumbnailUrl?:     string | null;
  processingStatus?: string | null;
  rawVideoUrl?:      string | null;
  fillParent?:       boolean;
  aspectRatio?:      string | null;
  hideInternalBlur?: boolean;
  blurHash?:         string | null;
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
}: VideoPlayerProps) {
  const videoRef       = React.useRef<HTMLVideoElement>(null);
  const containerRef   = React.useRef<HTMLDivElement>(null);
  const hlsRef         = React.useRef<any>(null);
  const hasInitialized = React.useRef(false);

  const [showPoster,    setShowPoster]    = React.useState(true);
  const [posterLoaded,  setPosterLoaded]  = React.useState(false);
  const [posterError,   setPosterError]   = React.useState(false);
  const [isBuffering,   setIsBuffering]   = React.useState(false);
  const [internalRatio, setInternalRatio] = React.useState<string | null>(null);

  const aspectRatio = fillParent ? null : (externalRatio ?? internalRatio);
  const isPortrait  = (() => {
    if (!aspectRatio) return false;
    // Handle "9/16" format
    if (aspectRatio.includes("/")) {
      const parts = aspectRatio.split("/");
      return Number(parts[0]) < Number(parts[1]);
    }
    // Handle decimal format like "0.5625"
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
      if (!entry.isIntersecting) {
        teardown();
      }
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

  const containerStyle: React.CSSProperties = fillParent ? {
    width:          "100%",
    height:         "100%",
    position:       "absolute",
    inset:          0,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
  } : {
    width:           "100%",
    position:        "relative",
    overflow:        "hidden",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    aspectRatio:     aspectRatio ?? "16/9",
    maxHeight:       isPortrait ? "80svh" : "80svh",
  };

  const videoStyle: React.CSSProperties = {
    position: "relative",
    zIndex:   2,
    display:  "block",
    width:    "100%",
    height:   "100%",
    objectFit: "contain",
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

      <div ref={containerRef} style={containerStyle}>

        {/* Blurred thumbnail background — skipped when carousel handles blur bars */}
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
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: posterLoaded ? 1 : 0, transition: "opacity 0.25s ease" }}
            />
            <div style={{ position: "relative", zIndex: 2, width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.55)", border: "2px solid rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
              <div style={{ width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: "18px solid rgba(255,255,255,0.95)", marginLeft: "4px" }} />
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          controls={!showPoster}
          playsInline
          preload="none"
          poster={posterSrc}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsBuffering(false)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onCanPlay={() => setIsBuffering(false)}
          onDoubleClick={(e) => {
            e.preventDefault();
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          }}
          style={{ ...videoStyle, visibility: showPoster ? "hidden" : "visible", animation: !showPoster ? "fadeIn 0.2s ease" : undefined }}
        />

        {isBuffering && !showPoster && (
          <div style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", border: "3px solid rgba(255,255,255,0.2)", borderTop: "3px solid rgba(255,255,255,0.9)", animation: "spin 0.8s linear infinite" }} />
          </div>
        )}
      </div>
    </>
  );
}