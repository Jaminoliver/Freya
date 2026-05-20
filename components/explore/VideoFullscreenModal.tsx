"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import VideoPlayer from "@/components/video/VideoPlayer";
import type { VideoTileData } from "@/components/explore/VideoTile";

interface Props {
  data: VideoTileData;
  onClose: () => void;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export function VideoFullscreenModal({ data, onClose }: Props) {
  const router = useRouter();
  const [avatarError, setAvatarError] = useState(false);
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const name = data.display_name || data.username;
  const initials = (name[0] ?? "?").toUpperCase();

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Lock body scroll while modal open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Auto-hide creator bar after 3s, show on touch/move
  const showBar = () => {
    setVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), 3000);
  };

  useEffect(() => {
    hideTimerRef.current = setTimeout(() => setVisible(false), 3000);
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, []);

  const handleClose = () => {
    onClose();
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    router.push(`/${data.username}`);
  };

  return (
    <>
      <style>{`
        @keyframes vfm-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes vfm-slideup {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        style={{
          position:        "fixed",
          inset:           0,
          zIndex:          9998,
          backgroundColor: "#000",
          animation:       "vfm-fadein 0.25s ease",
        }}
        onClick={handleClose}
      />

      {/* Modal container */}
      <div
        onTouchStart={showBar}
        onMouseMove={showBar}
        style={{
          position:       "fixed",
          inset:          0,
          zIndex:         9999,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
        }}
      >
        {/* X button — top left, matches VideoPlayer style exactly */}
        <button
          onClick={(e) => { e.stopPropagation(); handleClose(); }}
          style={{
            position:       "absolute",
            top:            12,
            left:           12,
            zIndex:         10001,
            background:     "rgba(0,0,0,0.45)",
            border:         "none",
            borderRadius:   "50%",
            width:          44,
            height:         44,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            cursor:         "pointer",
            backdropFilter: "blur(6px)",
            WebkitTapHighlightColor: "transparent",
            transition:     "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.65)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.45)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Video — fills screen, stopPropagation so clicks don't close */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: "absolute", inset: 0 }}
        >
          <VideoPlayer
            bunnyVideoId={data.bunny_video_id}
            thumbnailUrl={data.thumbnail_url}
            fillParent
            objectFit="contain"
            autoPlay
            fullscreenTopLeft={false}
          />
        </div>

        {/* Bottom creator bar — same gradient as VideoPlayer controls */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position:   "absolute",
            bottom:     0,
            left:       0,
            right:      0,
            zIndex:     10000,
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
            padding:    "48px 16px 40px",
            opacity:    visible ? 1 : 0,
            transition: "opacity 0.3s ease",
            pointerEvents: visible ? "auto" : "none",
          }}
        >
          {/* Creator row — tappable, goes to profile */}
          <div
            onClick={handleProfileClick}
            style={{
              display:     "flex",
              alignItems:  "center",
              gap:         "12px",
              cursor:      "pointer",
              marginBottom: "14px",
            }}
          >
            {/* Avatar with gradient ring — matches VideoTile exactly */}
            <div style={{
              width:      52,
              height:     52,
              borderRadius: "50%",
              padding:    "1.5px",
              background: "conic-gradient(#C45F8C, #8B3FBF, #C45F8C)",
              flexShrink: 0,
            }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "1.5px solid #0A0A0F" }}>
                {avatarError || !data.avatar_url ? (
                  <div style={{ width: "100%", height: "100%", background: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
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
            <div style={{ flex: 1, overflow: "hidden" }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {name}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                @{data.username}
              </p>
            </div>

            {/* View profile pill */}
            <div style={{
              padding:      "7px 14px",
              borderRadius: "20px",
              border:       "1.5px solid rgba(255,255,255,0.25)",
              color:        "#fff",
              fontSize:     12,
              fontWeight:   600,
              fontFamily:   "'Inter', sans-serif",
              flexShrink:   0,
              backdropFilter: "blur(6px)",
              background:   "rgba(255,255,255,0.08)",
            }}>
              View profile
            </div>
          </div>

          {/* Stats row — matches VideoTile stat icons */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="rgba(250,192,50,0.15)" stroke="#F5C842" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 18h20"/><path d="M4 18L2 8l4.5 4L12 4l5.5 8L22 8l-2 10H4z"/>
                <circle cx="12" cy="4" r="1.2" fill="#F5C842" stroke="none"/>
                <circle cx="6.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none"/>
                <circle cx="17.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none"/>
              </svg>
              <span style={{ fontSize: 13, color: "#F5C842", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
                {formatCount(data.subscriber_count)}
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', sans-serif" }}>subscribers</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
                {formatCount(data.likes_count)}
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', sans-serif" }}>likes</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}