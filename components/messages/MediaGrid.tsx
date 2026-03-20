"use client";

import { useEffect, useState } from "react";
import { Lock, Play } from "lucide-react";

interface MediaItem {
  url:  string;
  type: "image" | "video";
}

function VideoThumb({ src, isSending, locked }: { src: string; isSending: boolean; locked: boolean }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const isBlobUrl = src.startsWith("blob:");

  useEffect(() => {
    if (!isBlobUrl) return;
    const video       = document.createElement("video");
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

  const videoSrc = !isBlobUrl && !src.includes("#") ? `${src}#t=0.001` : src;

  if (isBlobUrl && thumbUrl) {
    return (
      <img src={thumbUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: isSending ? 0.5 : 1, filter: locked ? "blur(12px)" : "none", transform: locked ? "scale(1.1)" : "scale(1)", transition: "filter 0.3s ease" }} />
    );
  }
  if (isBlobUrl && !thumbUrl) {
    return (
      <div style={{ width: "100%", height: "100%", backgroundColor: "#2A2A3D", display: "flex", alignItems: "center", justifyContent: "center", opacity: isSending ? 0.5 : 1 }}>
        <svg width="28" height="28" viewBox="0 0 20 20" fill="none"><polygon points="7,4 17,10 7,16" fill="rgba(255,255,255,0.3)" /></svg>
      </div>
    );
  }
  return (
    <video src={videoSrc} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: isSending ? 0.5 : 1, filter: locked ? "blur(12px)" : "none", transform: locked ? "scale(1.1)" : "scale(1)", transition: "opacity 0.3s ease, filter 0.3s ease" }} />
  );
}

interface Props {
  mediaItems:      MediaItem[];
  isPPV?:          boolean;
  price?:          number;
  isUnlocked?:     boolean;
  thumbnailUrl?:   string | null;
  onClickItem?:    (index: number) => void;
  isSending?:      boolean;
  uploadProgress?: number;
  isFailed?:       boolean;
}

export function MediaGrid({
  mediaItems, isPPV, price, isUnlocked, thumbnailUrl, onClickItem, isSending, uploadProgress = 0, isFailed,
}: Props) {
  const count  = mediaItems.length;
  const extra  = count > 4 ? count - 4 : 0;
  const locked = isPPV && !isUnlocked;

  const getGridStyle = (): React.CSSProperties => {
    if (count === 1) return { display: "block" };
    return { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" };
  };
  const getItemHeight = () => (count === 1 ? "220px" : "120px");
  const getGridColumn = (i: number) => count === 3 && i === 2 ? "1" : "auto";

  const outerRadius        = 22;
  const innerRadius        = 16;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const progressOffset     = innerCircumference - (uploadProgress / 100) * innerCircumference;
  const priceNaira         = price ? price / 100 : 0;

  // ── Locked PPV — receiver view ────────────────────────────────────────────
  if (locked) {
    return (
      <div style={{ position: "relative", borderRadius: "12px 12px 0 0", overflow: "hidden", width: "100%", height: "220px", backgroundColor: "#0A0A0F" }}>

        {/* Blurred thumbnail if available — matches PostMediaViewer */}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover",
              filter: "blur(6px) brightness(0.45)",
              transform: "scale(1.08)",
              zIndex: 0,
            }}
          />
        ) : (
          <>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0D0D1A 0%, #1A0D2E 40%, #0A0A0F 100%)", zIndex: 0 }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(139,92,246,0.08) 1px, transparent 0)", backgroundSize: "24px 24px", zIndex: 0 }} />
          </>
        )}

        {/* Gradient overlay — matches PostMediaViewer */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "linear-gradient(to bottom, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0.65) 100%)",
        }} />

        {/* Lock UI — matches PostMediaViewer exactly */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: "16px",
        }}>
          {/* Lock ring */}
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: "rgba(139,92,246,0.15)",
            border: "1.5px solid rgba(139,92,246,0.6)",
            backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 24px rgba(139,92,246,0.3)",
          }}>
            <Lock size={22} color="#A78BFA" strokeWidth={2} />
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#A78BFA", textTransform: "uppercase", fontFamily: "'Inter', sans-serif", marginBottom: "4px" }}>
              Pay-Per-View
            </div>
            {price && price > 0 && (
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#FFFFFF", fontFamily: "'Inter', sans-serif", letterSpacing: "-0.5px" }}>
                ₦{priceNaira.toLocaleString("en-NG")}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Sender / unlocked view ────────────────────────────────────────────────
  return (
    <div style={{ position: "relative", borderRadius: "12px 12px 0 0", overflow: "hidden" }}>
      <style>{`@keyframes mediaSpinRing { to { transform: rotate(360deg); } }`}</style>

      <div style={getGridStyle()}>
        {mediaItems.slice(0, 4).map((item, i) => (
          <div
            key={i}
            onClick={() => !isSending && onClickItem?.(i)}
            style={{
              position: "relative", overflow: "hidden",
              height: getItemHeight(), backgroundColor: "#2A2A3D",
              gridColumn: getGridColumn(i),
              cursor: isSending ? "default" : "pointer",
            }}
          >
            {!item.url ? (
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1C1C2E 0%, #2A1F3D 50%, #1A1A2E 100%)" }} />
            ) : item.type === "video" ? (
              <VideoThumb src={item.url} isSending={!!isSending} locked={false} />
            ) : (
              <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: isSending ? 0.5 : 1, transition: "opacity 0.3s ease", WebkitTouchCallout: "none" as any, userSelect: "none" }} />
            )}

            {!isSending && item.type === "video" && item.url && (
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

      {/* Sender PPV badge */}
      {isPPV && isUnlocked && price && price > 0 && (
        <div style={{
          position: "absolute", bottom: "10px", left: "10px",
          display: "flex", alignItems: "center", gap: "5px",
          backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
          border: "1px solid rgba(139,92,246,0.4)",
          borderRadius: "20px", padding: "4px 10px",
        }}>
          <Lock size={11} color="#A78BFA" strokeWidth={2} />
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Inter',sans-serif" }}>₦{priceNaira.toLocaleString("en-NG")}</span>
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