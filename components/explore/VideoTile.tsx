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
}

const STREAM_CDN =
  process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net";

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface VideoTileProps {
  data: VideoTileData;
  isActive: boolean;
  onTileRef: (id: number, el: HTMLDivElement | null) => void;
  onUserInteract: (id: number) => void;
}

export function VideoTile({ data, isActive, onTileRef, onUserInteract }: VideoTileProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [srcLoaded, setSrcLoaded] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const bufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const previewUrl = data.bunny_video_id
    ? `https://${STREAM_CDN}/${data.bunny_video_id}/play_360p.mp4`
    : null;

  useEffect(() => {
    if (isActive && !srcLoaded) setSrcLoaded(true);
  }, [isActive, srcLoaded]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onWaiting = () => {
      bufferTimerRef.current = setTimeout(() => setBuffering(true), 300);
    };
    const onPlaying = () => {
      if (bufferTimerRef.current) { clearTimeout(bufferTimerRef.current); bufferTimerRef.current = null; }
      setBuffering(false);
    };

    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);

    if (isActive) {
      const tryPlay = () => {
        video.currentTime = 0;
        video.play().catch(() => {});
      };
      if (video.readyState >= 3) {
        tryPlay();
      } else {
        onWaiting();
        video.addEventListener("canplay", tryPlay, { once: true });
      }
    } else {
      video.pause();
      if (bufferTimerRef.current) { clearTimeout(bufferTimerRef.current); bufferTimerRef.current = null; }
      setBuffering(false);
    }

    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    };
  }, [isActive, srcLoaded]);

  const handleClick = () => router.push(`/${data.username}?scrollTo=${data.post_id}`);

  const rawThumb = data.thumbnail_url;
  const thumbnail =
    rawThumb && !rawThumb.includes("undefined") ? rawThumb : null;
  const duration = formatDuration(data.duration_seconds);
  const name = data.display_name || data.username;
  const initials = (name[0] ?? "?").toUpperCase();

  return (
    <div
      ref={(el) => onTileRef(data.post_id, el)}
      onClick={handleClick}
      onMouseEnter={() => onUserInteract(data.post_id)}
      onTouchStart={() => onUserInteract(data.post_id)}
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
      }}
    >
      {thumbnail && !thumbError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt=""
          onError={() => setThumbError(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1A1A2E 0%, #2A2A3D 100%)" }} />
      )}

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
            opacity: isActive ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        />
      )}

      {/* Loading spinner — only when active + buffering */}
      {isActive && buffering && (
        <>
          <style>{`
            @keyframes tileSpinRing {
              0% { transform: translate(-50%,-50%) rotate(0deg); }
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

      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 45%, transparent 100%)",
      }} />

      {duration && (
        <div style={{
          position: "absolute", top: "8px", right: "8px",
          backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
          color: "#fff", fontSize: "10px", fontWeight: 600,
          padding: "2px 6px", borderRadius: "4px",
          fontFamily: "'Inter', sans-serif", letterSpacing: "0.3px",
        }}>
          {duration}
        </div>
      )}

      <div style={{ position: "absolute", bottom: "10px", left: "10px", right: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <div style={{ width: "45px", height: "45px", borderRadius: "50%", padding: "1.5px", background: "conic-gradient(#C45F8C, #8B3FBF, #C45F8C)", flexShrink: 0 }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "1.5px solid #0A0A0F" }}>
              {avatarError || !data.avatar_url ? (
                <div style={{ width: "100%", height: "100%", background: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
                  {initials}
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.avatar_url} alt={name} onError={() => setAvatarError(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px", overflow: "hidden", marginBottom: "4px" }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {name}
            </p>
            <p style={{ margin: 0, fontSize: "11px", fontWeight: 400, color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              @{data.username}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(250,192,50,0.15)" stroke="#F5C842" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 18h20" /><path d="M4 18L2 8l4.5 4L12 4l5.5 8L22 8l-2 10H4z" />
              <circle cx="12" cy="4" r="1.2" fill="#F5C842" stroke="none" />
              <circle cx="6.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none" />
              <circle cx="17.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none" />
            </svg>
            <span style={{ fontSize: "12px", color: "#F5C842", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>{formatCount(data.subscriber_count)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>{formatCount(data.likes_count)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}