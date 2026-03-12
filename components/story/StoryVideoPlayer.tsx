"use client";

import { useRef, useEffect, useCallback } from "react";

const BUNNY_PULL_ZONE = "vz-8bc100f4-3c0.b-cdn.net";

interface Props {
  mediaUrl:     string;
  thumbnailUrl: string | null;
  muted:        boolean;
  paused:       boolean;
  active:       boolean;
  storyIndex:   number;
  onPlaying:    (storyIndex: number) => void;
  onTimeUpdate: (pct: number, storyIndex: number) => void;
  onEnded:      (storyIndex: number) => void;
  onBuffering:  (buffering: boolean) => void;
}

export default function StoryVideoPlayer({
  mediaUrl, thumbnailUrl, muted, paused, active, storyIndex,
  onPlaying, onTimeUpdate, onEnded, onBuffering,
}: Props) {
  const videoRef       = useRef<HTMLVideoElement>(null);
  const hlsRef         = useRef<any>(null);
  const hasInitialized = useRef(false);
  const rafRef         = useRef<number | null>(null);

  const activeRef       = useRef(active);
  const pausedRef       = useRef(paused);
  const onPlayingRef    = useRef(onPlaying);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onEndedRef      = useRef(onEnded);
  const onBufferingRef  = useRef(onBuffering);
  useEffect(() => { activeRef.current = active; },             [active]);
  useEffect(() => { pausedRef.current = paused; },             [paused]);
  useEffect(() => { onPlayingRef.current = onPlaying; },       [onPlaying]);
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; }, [onTimeUpdate]);
  useEffect(() => { onEndedRef.current = onEnded; },           [onEnded]);
  useEffect(() => { onBufferingRef.current = onBuffering; },   [onBuffering]);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startRaf = useCallback(() => {
    stopRaf();
    const tick = () => {
      const video = videoRef.current;
      if (!video || !activeRef.current || pausedRef.current) { rafRef.current = null; return; }
      const { currentTime, duration } = video;
      if (duration && isFinite(duration) && duration > 0) {
        onTimeUpdateRef.current(Math.min(currentTime / duration, 1), storyIndex);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [storyIndex, stopRaf]);

  const tryPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeRef.current || pausedRef.current) return;
    video.play().catch(() => {});
  }, []);

  // Init HLS once on mount — mediaUrl already contains the full Bunny HLS URL
  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasInitialized.current) return;
    hasInitialized.current = true;

    // Derive HLS URL: if the mediaUrl is already an m3u8 use it directly,
    // otherwise assume it's a Bunny video ID and build the playlist URL.
    const url = mediaUrl.includes(".m3u8")
      ? mediaUrl
      : `https://${BUNNY_PULL_ZONE}/${mediaUrl}/playlist.m3u8`;

    // Native HLS (Safari / iOS)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.load();
      video.addEventListener("loadedmetadata", tryPlay, { once: true });
      return;
    }

    // hls.js path
    import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported()) {
        video.src = url;
        video.load();
        video.addEventListener("loadedmetadata", tryPlay, { once: true });
        return;
      }

      const hls = new Hls({
        capLevelToPlayerSize:   false,
        lowLatencyMode:         false,
        abrEwmaDefaultEstimate: 50_000_000,
        abrBandWidthFactor:     1,
        abrBandWidthUpFactor:   1,
        maxLoadingDelay:        2,
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_: any, data: any) => {
        const highest = data.levels.length - 1;
        hls.currentLevel = highest;
        hls.loadLevel    = highest;
        tryPlay();
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_: any, data: any) => {
        if (!data.fatal) return;
        if      (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR)   hls.recoverMediaError();
        else { hls.destroy(); hlsRef.current = null; video.src = url; video.load(); }
      });

      hlsRef.current = hls;
    }).catch(() => {
      video.src = url;
      video.load();
    });

    return () => {
      stopRaf();
      hasInitialized.current = false;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Active change — play or pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.muted       = muted;
      video.currentTime = 0;
      tryPlay();
    } else {
      stopRaf();
      video.pause();
      video.currentTime = 0;
    }
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mute sync
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  // Pause / resume
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;
    if (paused) { stopRaf(); video.pause(); }
    else        { tryPlay(); }
  }, [paused, active, stopRaf, tryPlay]);

  // Merged: both waiting and pause just stop the RAF and signal buffering
  const handleStall = useCallback(() => {
    stopRaf();
    onBufferingRef.current(true);
  }, [stopRaf]);

  const handleCanPlay = useCallback(() => {
    if (!activeRef.current) return;
    if (videoRef.current) videoRef.current.style.opacity = "1";
  }, []);

  const handlePlaying = useCallback(() => {
    if (!activeRef.current) return;
    if (videoRef.current) videoRef.current.style.opacity = "1";
    onBufferingRef.current(false);
    onPlayingRef.current(storyIndex);
    startRaf();
  }, [storyIndex, startRaf]);

  const handleEnded = useCallback(() => {
    stopRaf();
    onEndedRef.current(storyIndex);
  }, [storyIndex, stopRaf]);

  return (
    <div style={{
      position:      "absolute",
      inset:         0,
      opacity:       active ? 1 : 0,
      pointerEvents: active ? "auto" : "none",
      zIndex:        active ? 1 : 0,
    }}>
      {thumbnailUrl && (
        <img src={thumbnailUrl} alt="" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", filter: "blur(20px)", transform: "scale(1.08)", pointerEvents: "none",
        }} />
      )}
      <video
        ref={videoRef}
        muted={muted}
        playsInline
        preload="auto"
        onContextMenu={(e) => e.preventDefault()}
        onCanPlay={handleCanPlay}
        onPlaying={handlePlaying}
        onWaiting={handleStall}
        onPause={handleStall}
        onEnded={handleEnded}
        style={{
          position:      "absolute",
          inset:         0,
          width:         "100%",
          height:        "100%",
          objectFit:     "contain",
          pointerEvents: "none",
          opacity:       0,
        }}
      />
    </div>
  );
}