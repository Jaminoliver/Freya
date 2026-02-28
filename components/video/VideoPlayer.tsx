"use client";

import * as React from "react";

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

interface VideoPlayerProps {
  bunnyVideoId:      string | null;
  thumbnailUrl?:     string | null;
  processingStatus?: string | null;
  rawVideoUrl?:      string | null;
  fillParent?:       boolean;
}

export default function VideoPlayer({ bunnyVideoId, thumbnailUrl, processingStatus, rawVideoUrl, fillParent = false }: VideoPlayerProps) {
  const videoRef       = React.useRef<HTMLVideoElement>(null);
  const containerRef   = React.useRef<HTMLDivElement>(null);
  const hlsRef         = React.useRef<any>(null);
  const hasInitialized = React.useRef(false);

  const [showPoster,  setShowPoster]  = React.useState(true);
  const [posterError, setPosterError] = React.useState(false);
  const [isBuffering, setIsBuffering] = React.useState(false);
  const [aspectRatio, setAspectRatio] = React.useState<string | null>(null);

  const isPortrait     = aspectRatio === "9/16";
  const useRawFallback = processingStatus !== "completed" && !!rawVideoUrl;
  const posterSrc      = (!posterError && thumbnailUrl) ? thumbnailUrl : bunnyVideoId ? getBunnyThumbnail(bunnyVideoId) : "";

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

    // iOS Safari — native HLS
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsSrc;
      video.load();
      return;
    }

    // hls.js for Chrome/Android
    try {
      const Hls = (await import("hls.js")).default;
      if (Hls.isSupported()) {
        let savedBandwidth = 8_000_000;
        try {
          const cached = sessionStorage.getItem("hlsBandwidth");
          if (cached) savedBandwidth = Math.max(Number(cached), 2_000_000);
        } catch { }

        const hls = new Hls({
          startLevel:             999,   // clamps to highest available — max quality from first segment
          capLevelToPlayerSize:   false, // don't downgrade based on element display size
          lowLatencyMode:         false,
          abrEwmaDefaultEstimate: savedBandwidth,
          abrEwmaFastVoD:         3,
          abrEwmaSlowVoD:         9,
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (_evt: any, data: any) => {
          hls.currentLevel = data.levels.length - 1; // lock to highest after manifest
        });

        hls.on(Hls.Events.FRAG_LOADED, (_evt: any, _data: any) => {
          try {
            const bw = hls.bandwidthEstimate;
            if (bw > 0) sessionStorage.setItem("hlsBandwidth", String(Math.round(bw)));
          } catch { }
        });

        hls.loadSource(hlsSrc);
        hls.attachMedia(video);
      }
    } catch {
      video.src = hlsSrc;
    }
  }, [bunnyVideoId, useRawFallback, rawVideoUrl]);

  React.useEffect(() => {
    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
  }, []);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && !video.paused) {
        video.pause();
        setShowPoster(true);
      }
    }, { threshold: 0.2 });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleLoadedMetadata = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const { videoWidth: w, videoHeight: h } = video;
    if (h > w) setAspectRatio("9/16");
    else if (w > h) setAspectRatio("16/9");
    else setAspectRatio("1/1");
  }, []);

  const handlePosterPlay = React.useCallback(async () => {
    setShowPoster(false);
    setIsBuffering(true);
    const video = videoRef.current;
    if (!hasInitialized.current) await initVideo();
    try { await video?.play(); } catch { }
  }, [initVideo]);

  const containerStyle: React.CSSProperties = fillParent ? {
    width: "100%", height: "100%", position: "relative", overflow: "hidden",
    display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#000",
  } : {
    width: "100%", position: "relative", overflow: "hidden",
    display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#000",
    aspectRatio: isPortrait ? "9/16" : "16/9",
    maxHeight:   isPortrait ? "min(75svh, 520px)" : "520px",
  };

  const videoStyle: React.CSSProperties = {
    position: "relative", zIndex: 2, display: "block",
    width:     (isPortrait && typeof window !== "undefined" && window.innerWidth >= 768) ? "68%" : "100%",
    height:    "100%",
    objectFit: "cover",
  };

  if (!bunnyVideoId) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: "100%", aspectRatio: "16/9", backgroundColor: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "3px solid #2A2A3D", borderTop: "3px solid #8B5CF6", animation: "spin 0.9s linear infinite" }} />
          <span style={{ fontSize: "13px", color: "#8A8AA0", fontFamily: "'Inter', sans-serif" }}>Video processing — check back shortly</span>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <div ref={containerRef} style={containerStyle}>

        {/* Blurred background */}
        <img src={posterSrc} alt="" aria-hidden onError={() => setPosterError(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(20px) brightness(0.4)", transform: "scale(1.1)", zIndex: 1 }}
        />

        {/* Poster + play button */}
        {showPoster && (
          <div onClick={handlePosterPlay} style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <img src={posterSrc} alt="" onError={() => setPosterError(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "relative", zIndex: 2, width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.55)", border: "2px solid rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
              <div style={{ width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: "18px solid rgba(255,255,255,0.95)", marginLeft: "4px" }} />
            </div>
          </div>
        )}

        {/* Video */}
        <video
          ref={videoRef} controls={!showPoster} playsInline preload="none" poster={posterSrc}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsBuffering(false)}
          onPause={() => {}}
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
      </div>
    </>
  );
}