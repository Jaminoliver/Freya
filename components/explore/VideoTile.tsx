"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface VideoTileData {
  type: "video";
  post_id: number;
  creator_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  thumbnail_url: string | null;
  bunny_video_id: string | null;
  like_count: number;
  comment_count: number;
  duration_seconds: number | null;
  subscriber_count: number;
  likes_count: number;
  is_free?: boolean;
  liked?: boolean;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  aspect_ratio?: number | null;
}

const STREAM_CDN =
  process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net";

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

// formatDuration removed — duration badge no longer rendered

interface VideoTileProps {
  data: VideoTileData;
  isActive: boolean;
  isModalOpen?: boolean;
  onTileRef: (id: number, el: HTMLDivElement | null) => void;
  onOpenFullscreen: (data: VideoTileData, initialTime: number) => void;
  onPreviewEnd?: (postId: number) => void;
}

export function VideoTile({
  data,
  isActive,
  isModalOpen = false,
  onTileRef,
  onOpenFullscreen,
  onPreviewEnd,
}: VideoTileProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [srcLoaded, setSrcLoaded] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const bufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouchRef = useRef(false);
  // Guard: prevents onPreviewEnd firing more than once per activation
  const hasEndedRef = useRef(false);

  const previewUrl = data.bunny_video_id
    ? `https://${STREAM_CDN}/${data.bunny_video_id}/play_360p.mp4`
    : null;

  // Lazy-load src only when tile first becomes active
  useEffect(() => {
    if (isActive && !srcLoaded) setSrcLoaded(true);
  }, [isActive, srcLoaded]);

  // Pause tile video while fullscreen modal is open
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isModalOpen) {
      video.pause();
    } else if (isActive && video.paused) {
      video.play().catch(() => {});
    }
  }, [isModalOpen, isActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onWaiting = () => {
      bufferTimerRef.current = setTimeout(() => setBuffering(true), 300);
    };
    const onPlaying = () => {
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
        bufferTimerRef.current = null;
      }
      setBuffering(false);
    };

    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);

    if (isActive && !isModalOpen) {
      // Reset end guard each time this tile becomes active
      hasEndedRef.current = false;

      const tryPlay = () => {
        video.currentTime = 0;
        video.muted = true;
        console.log("[VideoTile] playing", { post_id: data.post_id, t: performance.now().toFixed(1) });
        video.play().catch(() => {});
      };

      // Clip preview to 5 seconds — hasEndedRef prevents double-fire
      const handleTimeUpdate = () => {
        if (video.currentTime >= 5 && !hasEndedRef.current) {
          hasEndedRef.current = true;
          video.currentTime = 0;
          video.pause();
          console.log("[VideoTile] 5s end fired", { post_id: data.post_id, t: performance.now().toFixed(1) });
          onPreviewEnd?.(data.post_id);
        }
      };

      video.addEventListener("timeupdate", handleTimeUpdate);

      if (video.readyState >= 3) {
        tryPlay();
      } else {
        if (video.src) video.load();
        video.addEventListener("canplay", tryPlay, { once: true });
      }

      return () => {
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("timeupdate", handleTimeUpdate);
        if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
      };
    } else {
      console.log("[VideoTile] pausing", { post_id: data.post_id, isActive, isModalOpen });
      video.pause();
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
        bufferTimerRef.current = null;
      }
      setBuffering(false);
    }

    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    };
  }, [isActive, isModalOpen, srcLoaded, onPreviewEnd, data.post_id]);

  // Pass current playback time so modal resumes exactly where tile left off
  const handleClick = () => {
    const t0 = performance.now();
    console.log("[VideoTile] click fired", { post_id: data.post_id, t: t0.toFixed(1) });
    const currentTime = videoRef.current?.currentTime ?? 0;
    if (videoRef.current) videoRef.current.pause();
    onOpenFullscreen(data, currentTime);
    console.log("[VideoTile] onOpenFullscreen called", { delay: (performance.now() - t0).toFixed(1) + "ms" });
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/${data.username}`);
  };

  const rawThumb = data.thumbnail_url;
  const thumbnail = rawThumb && !rawThumb.includes("undefined") ? rawThumb : null;

  const name = data.display_name || data.username;
  const initials = (name[0] ?? "?").toUpperCase();

  return (
    <div
      ref={(el) => onTileRef(data.post_id, el)}
      onClick={handleClick}
      onTouchStart={() => { isTouchRef.current = true; console.log("[VideoTile] touchStart", performance.now().toFixed(1)); }}
      style={{
        position: "relative",
        width: "100%",
        height: "280px",
        borderRadius: "12px",
        overflow: "hidden",
        cursor: "pointer",
        backgroundColor: "#1A1A2E",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "manipulation",
      }}
    >
      {/* Thumbnail */}
      {thumbnail && !thumbError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt=""
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onError={() => setThumbError(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1A1A2E 0%, #2A2A3D 100%)" }} />
      )}

      {/* Preview video — loop added so ended tiles restart instead of freezing */}
      {previewUrl && (
        <video
          ref={videoRef}
          src={srcLoaded ? previewUrl : undefined}
          muted
          playsInline
          preload="auto"
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover",
            opacity: isActive && !isModalOpen ? 1 : 0,
            transition: "opacity 0.15s ease",
          }}
        />
      )}

      {/* Buffering spinner */}
      {isActive && !isModalOpen && buffering && (
        <>
          <style>{`
            @keyframes tileSpinRing {
              0%   { transform: translate(-50%,-50%) rotate(0deg); }
              100% { transform: translate(-50%,-50%) rotate(360deg); }
            }
          `}</style>
          <div style={{
            position: "absolute", top: "42%", left: "50%",
            transform: "translate(-50%,-50%)", zIndex: 3,
          }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              border: "2.5px solid rgba(255,255,255,0.15)",
              borderTopColor: "rgba(255,255,255,0.8)",
              animation: "tileSpinRing 0.8s linear infinite",
            }} />
          </div>
        </>
      )}

      {/* Gradient overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 45%, transparent 100%)",
      }} />

      {/* Free badge */}
      {data.is_free && (
        <span style={{
          position: "absolute", top: "8px", left: "8px",
          backgroundColor: "rgba(16,185,129,0.85)", backdropFilter: "blur(6px)",
          borderRadius: "20px", padding: "4px 12px", fontSize: "11px",
          fontWeight: 700, color: "#fff", zIndex: 2,
          fontFamily: "'Inter', sans-serif",
        }}>
          Free
        </span>
      )}

      {/* Bottom creator info */}
      <div style={{ position: "absolute", bottom: "10px", left: "10px", right: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          {/* Avatar */}
          <div onClick={handleAvatarClick} style={{
            width: "45px", height: "45px", borderRadius: "50%", padding: "1.5px",
            background: "transparent", flexShrink: 0, cursor: "pointer",
          }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "1.5px solid #0A0A0F" }}>
              {avatarError || !data.avatar_url ? (
                <div style={{
                  width: "100%", height: "100%", background: "#8B5CF6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: "'Inter', sans-serif",
                }}>
                  {initials}
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.avatar_url}
                  alt={name}
                  onError={() => setAvatarError(true)}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              )}
            </div>
          </div>

          {/* Name + handle */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1px", overflow: "hidden" }}>
            <p style={{
              margin: 0, fontSize: "13px", fontWeight: 700, color: "#fff",
              fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {name}
            </p>
            <p style={{
              margin: 0, fontSize: "11px", fontWeight: 400, color: "rgba(255,255,255,0.55)",
              fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis",
            }}>
              @{data.username}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(250,192,50,0.15)" stroke="#F5C842" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 18h20" /><path d="M4 18L2 8l4.5 4L12 4l5.5 8L22 8l-2 10H4z" />
              <circle cx="12" cy="4" r="1.2" fill="#F5C842" stroke="none" />
              <circle cx="6.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none" />
              <circle cx="17.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none" />
            </svg>
            <span style={{ fontSize: "12px", color: "#F5C842", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
              {formatCount(data.subscriber_count)}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
              {formatCount(data.likes_count)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}