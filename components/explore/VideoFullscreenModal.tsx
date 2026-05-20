"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { VideoTileData } from "@/components/explore/VideoTile";

const STREAM_CDN =
  process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net";

interface Props {
  data: VideoTileData;
  onClose: () => void;
  initialTime?: number;
  isMuted: boolean;
  onMuteChange: (muted: boolean) => void;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function VideoFullscreenModal({
  data,
  onClose,
  initialTime = 0,
  isMuted,
  onMuteChange,
}: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const videoSrc = data.bunny_video_id
    ? `https://${STREAM_CDN}/${data.bunny_video_id}/play_720p.mp4`
    : null;

  const name = data.display_name || data.username;
  const initials = (name[0] ?? "?").toUpperCase();
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Mount animation
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Auto-play on mount, resume from tile's current time
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    video.muted = isMuted;
    const tryPlay = () => {
      if (initialTime > 0) video.currentTime = initialTime;
      video.play().catch(() => {});
    };
    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener("loadeddata", tryPlay, { once: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoSrc]);

  // Sync mute to video
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  // Keep isPaused in sync with actual video state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay  = () => setIsPaused(false);
    const onPause = () => setIsPaused(true);
    video.addEventListener("play",  onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play",  onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  // Tap video to toggle pause/play
  const handleVideoTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  // Seek bar
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || isSeeking) return;
    setCurrentTime(video.currentTime);
  }, [isSeeking]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  }, []);

  const handleSeekStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsSeeking(true);
    videoRef.current?.pause();
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) videoRef.current.currentTime = val;
  };

  const handleSeekEnd = () => {
    videoRef.current?.play().catch(() => {});
    setIsSeeking(false);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMuteChange(!isMuted);
  };

  const handleClose = () => {
    if (videoRef.current) videoRef.current.pause();
    onClose();
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClose();
    router.push(`/${data.username}`);
  };

  return (
    <>
      <style>{`
        @keyframes vfm-scale-in {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes vfm-bar-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes vfm-play-pop {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          40%  { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          70%  { transform: translate(-50%, -50%) scale(0.95); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }

        .vfm-seek {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 3px;
          border-radius: 0;
          background: linear-gradient(
            to right,
            rgba(255,255,255,0.95) ${progress}%,
            rgba(255,255,255,0.25) ${progress}%
          );
          outline: none;
          cursor: pointer;
          padding: 0;
          margin: 0;
          display: block;
        }
        .vfm-seek::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          margin-top: -4.5px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }
        .vfm-seek::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff;
          border: none;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }
        .vfm-seek-wrapper {
          padding: 10px 0 0;
          cursor: pointer;
        }
        .vfm-seek-wrapper:hover .vfm-seek { height: 4px; }

        .vfm-panel {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vfm-inner {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        @media (min-width: 768px) {
          .vfm-panel {
            background: rgba(0,0,0,0.75);
            backdrop-filter: blur(8px);
          }
          .vfm-inner {
            max-width: 420px;
            max-height: 90vh;
            border-radius: 16px;
            box-shadow: 0 32px 80px rgba(0,0,0,0.8);
          }
        }
      `}</style>

      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9998, backgroundColor: "#000" }}
        onClick={handleClose}
      />

      <div
        className="vfm-panel"
        style={{
          animation: mounted ? "vfm-scale-in 0.2s ease-out forwards" : "none",
          opacity: mounted ? undefined : 0,
        }}
      >
        <div className="vfm-inner">

          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
            style={{
              position: "absolute", top: 12, left: 12, zIndex: 10001,
              background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%",
              width: 44, height: 44, display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer",
              backdropFilter: "blur(6px)", WebkitTapHighlightColor: "transparent",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.65)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.45)")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            style={{
              position: "absolute", top: 12, right: 12, zIndex: 10001,
              background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%",
              width: 44, height: 44, display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer",
              backdropFilter: "blur(6px)", WebkitTapHighlightColor: "transparent",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.65)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.45)")}
          >
            {isMuted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>

          {/* Video — tappable to pause/play */}
          {videoSrc && (
            <video
              ref={videoRef}
              src={videoSrc}
              muted={isMuted}
              playsInline
              loop
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onClick={handleVideoTap}
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: "contain",
                backgroundColor: "#000",
                display: "block",
                cursor: "pointer",
              }}
            />
          )}

          {/* Play icon — only shown when paused, no background */}
          {isPaused && (
            <div
              onClick={handleVideoTap}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                zIndex: 10000,
                pointerEvents: "auto",
                cursor: "pointer",
                animation: "vfm-play-pop 0.25s ease-out forwards",
                transform: "translate(-50%, -50%)",
                filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.6))",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.92)" stroke="none" style={{ marginLeft: 5 }}>
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          )}

          {/* Bottom overlay — always visible */}
          <div
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              zIndex: 10000,
              animation: mounted ? "vfm-bar-up 0.25s ease-out 0.05s both" : "none",
            }}
          >
            <div style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)",
              padding: "56px 16px 16px",
            }}>
              {/* Creator row */}
              <div
                onClick={handleProfileClick}
                style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", marginBottom: "14px" }}
              >
                <div style={{ width: 52, height: 52, borderRadius: "50%", padding: "1.5px", background: "conic-gradient(#C45F8C, #8B3FBF, #C45F8C)", flexShrink: 0 }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "1.5px solid #0A0A0F" }}>
                    {avatarError || !data.avatar_url ? (
                      <div style={{ width: "100%", height: "100%", background: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
                        {initials}
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={data.avatar_url} alt={name} onError={() => setAvatarError(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, overflow: "hidden" }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {name}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    @{data.username}
                  </p>
                </div>

                <div style={{ padding: "7px 14px", borderRadius: "20px", border: "1.5px solid rgba(255,255,255,0.25)", color: "#fff", fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif", flexShrink: 0, backdropFilter: "blur(6px)", background: "rgba(255,255,255,0.08)" }}>
                  View profile
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="rgba(250,192,50,0.15)" stroke="#F5C842" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 18h20" /><path d="M4 18L2 8l4.5 4L12 4l5.5 8L22 8l-2 10H4z" />
                    <circle cx="12" cy="4" r="1.2" fill="#F5C842" stroke="none" />
                    <circle cx="6.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none" />
                    <circle cx="17.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none" />
                  </svg>
                  <span style={{ fontSize: 13, color: "#F5C842", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>{formatCount(data.subscriber_count)}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', sans-serif" }}>subscribers</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>{formatCount(data.likes_count)}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', sans-serif" }}>likes</span>
                </div>

                <div style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
            </div>

            {/* Seek bar */}
            <div className="vfm-seek-wrapper" style={{ background: "rgba(0,0,0,0.88)", padding: "10px 0 0" }} onClick={(e) => e.stopPropagation()}>
              <input
                type="range"
                className="vfm-seek"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onMouseDown={handleSeekStart}
                onTouchStart={handleSeekStart}
                onChange={handleSeekChange}
                onMouseUp={handleSeekEnd}
                onTouchEnd={handleSeekEnd}
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}