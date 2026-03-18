"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Play } from "lucide-react";

interface MediaItem {
  url:  string;
  type: "image" | "video";
}

function VideoThumb({ src, isSending, locked }: { src: string; isSending: boolean; locked: boolean }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const isBlobUrl = src.startsWith("blob:");

  useEffect(() => {
    // For blob URLs (during upload) — generate canvas thumbnail for Safari
    if (!isBlobUrl) return;

    const video       = document.createElement("video");
    // Add #t=0.001 hint for browsers that support it
    video.src         = src.includes("#") ? src : `${src}#t=0.001`;
    video.muted       = true;
    video.playsInline = true;
    video.preload     = "metadata";

    const onLoaded = () => { video.currentTime = 0.001; };
    const onSeeked = () => {
      try {
        const canvas  = document.createElement("canvas");
        canvas.width  = 280;
        canvas.height = 200;
        const ctx     = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, 280, 200);
          setThumbUrl(canvas.toDataURL("image/jpeg", 0.8));
        }
      } catch {}
      video.removeEventListener("seeked",         onSeeked);
      video.removeEventListener("loadedmetadata", onLoaded);
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("seeked",         onSeeked);
    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("seeked",         onSeeked);
    };
  }, [src, isBlobUrl]);

  // For CDN URLs — append #t=0.001 so Safari shows first frame
  const videoSrc = !isBlobUrl && !src.includes("#") ? `${src}#t=0.001` : src;

  // If blob and we have a canvas thumbnail — use image
  if (isBlobUrl && thumbUrl) {
    return (
      <img
        src={thumbUrl}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: isSending ? 0.5 : 1 }}
      />
    );
  }

  // If blob but no thumbnail yet — show placeholder
  if (isBlobUrl && !thumbUrl) {
    return (
      <div style={{ width: "100%", height: "100%", backgroundColor: "#2A2A3D", display: "flex", alignItems: "center", justifyContent: "center", opacity: isSending ? 0.5 : 1 }}>
        <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
          <polygon points="7,4 17,10 7,16" fill="rgba(255,255,255,0.3)" />
        </svg>
      </div>
    );
  }

  // CDN URL — use video element with #t=0.001
  return (
    <video
      src={videoSrc}
      muted
      playsInline
      preload="metadata"
      style={{
        width:      "100%",
        height:     "100%",
        objectFit:  "cover",
        display:    "block",
        opacity:    isSending ? 0.5 : 1,
        transition: "opacity 0.3s ease",
      }}
    />
  );
}

interface Props {
  mediaItems:      MediaItem[];
  isPPV?:          boolean;
  price?:          number;
  isUnlocked?:     boolean;
  onClickItem?:    (index: number) => void;
  isSending?:      boolean;
  uploadProgress?: number;
  isFailed?:       boolean;
}

export function MediaGrid({ mediaItems, isPPV, price, isUnlocked, onClickItem, isSending, uploadProgress = 0, isFailed }: Props) {
  const count  = mediaItems.length;
  const extra  = count > 4 ? count - 4 : 0;
  const locked = isPPV && !isUnlocked;

  const getGridStyle = (): React.CSSProperties => {
    if (count === 1) return { display: "block" };
    return { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" };
  };

  const getItemHeight = () => (count === 1 ? "200px" : "120px");
  const getGridColumn = (i: number) => count === 3 && i === 2 ? "1" : "auto";

  const outerRadius        = 22;
  const innerRadius        = 16;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const progressOffset     = innerCircumference - (uploadProgress / 100) * innerCircumference;

  return (
    <div style={{ position: "relative", borderRadius: "12px 12px 0 0", overflow: "hidden" }}>
      <style>{`
        @keyframes mediaSpinRing { to { transform: rotate(360deg); } }
      `}</style>

      <div style={getGridStyle()}>
        {mediaItems.slice(0, 4).map((item, i) => (
          <div
            key={i}
            onClick={() => !locked && !isSending && onClickItem?.(i)}
            style={{
              position:        "relative",
              overflow:        "hidden",
              height:          getItemHeight(),
              backgroundColor: "#2A2A3D",
              gridColumn:      getGridColumn(i),
              cursor:          locked || isSending ? "default" : "pointer",
            }}
          >
            {item.type === "video" ? (
              <VideoThumb src={item.url} isSending={!!isSending} locked={!!locked} />
            ) : (
              <img
                src={item.url}
                alt=""
                style={{
                  width:      "100%",
                  height:     "100%",
                  objectFit:  "cover",
                  display:    "block",
                  filter:     locked ? "blur(12px)" : "none",
                  transform:  locked ? "scale(1.1)" : "scale(1)",
                  opacity:    isSending ? 0.5 : 1,
                  transition: "opacity 0.3s ease, filter 0.3s ease",
                }}
              />
            )}

            {locked && (
              <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)" }} />
            )}

            {!locked && !isSending && item.type === "video" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                </div>
              </div>
            )}

            {extra > 0 && i === 3 && (
              <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#FFFFFF", fontSize: "18px", fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>+{extra} more</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {locked && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", pointerEvents: "none" }}>
          <Lock size={28} color="#FFFFFF" strokeWidth={1.8} />
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#FFFFFF", fontFamily: "'Inter',sans-serif", letterSpacing: "0.06em" }}>PPV</span>
        </div>
      )}
      {locked && price && (
        <div style={{ position: "absolute", bottom: "10px", left: "10px", backgroundColor: "#F5A623", color: "#0A0A0F", fontSize: "12px", fontWeight: 700, padding: "3px 8px", borderRadius: "8px", fontFamily: "'Inter',sans-serif" }}>
          ₦{(price / 100).toLocaleString()}
        </div>
      )}

      {isSending && !isFailed && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)", pointerEvents: "none" }}>
          <svg width="56" height="56" style={{ position: "absolute", animation: "mediaSpinRing 1.2s linear infinite" }}>
            <circle cx="28" cy="28" r={outerRadius} fill="none" stroke="rgba(139,92,246,0.3)" strokeWidth="2.5" />
            <circle cx="28" cy="28" r={outerRadius} fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeDasharray={`${outerCircumference * 0.3} ${outerCircumference * 0.7}`} strokeLinecap="round" />
          </svg>
          <svg width="56" height="56" style={{ position: "absolute", transform: "rotate(-90deg)" }}>
            <circle cx="28" cy="28" r={innerRadius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle cx="28" cy="28" r={innerRadius} fill="none" stroke="#FFFFFF" strokeWidth="3" strokeDasharray={innerCircumference} strokeDashoffset={progressOffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.3s ease" }} />
          </svg>
          {uploadProgress >= 100 && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: "absolute" }}>
              <path d="M3 8L6.5 11.5L13 4" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      )}

      {isFailed && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", gap: "6px", pointerEvents: "none" }}>
          <span style={{ fontSize: "22px" }}>⚠️</span>
          <span style={{ fontSize: "11px", color: "#EF4444", fontWeight: 600, fontFamily: "'Inter',sans-serif" }}>Failed</span>
        </div>
      )}
    </div>
  );
}