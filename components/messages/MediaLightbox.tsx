"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { VideoPlayerHandle } from "@/components/video/VideoPlayer";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import VideoPlayer from "@/components/video/VideoPlayer";

interface MediaItem {
  url:              string;
  type:             "image" | "video";
  messageId:        number;
  processingStatus?: string | null;
  rawVideoUrl?:      string | null;
  bunnyVideoId?:     string | null;
}

interface Props {
  items:        MediaItem[];
  initialIndex: number;
  onClose:      () => void;
}



export function MediaLightbox({ items, initialIndex, onClose }: Props) {
  const [index,   setIndex]   = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [lbMuted, setLbMuted] = useState(() => { try { return localStorage.getItem("vp_muted") === "true"; } catch { return false; } });
  const touchStartX   = useRef<number | null>(null);
  const thumbScrolled = useRef(false);
  const vpRef         = useRef<VideoPlayerHandle | null>(null);
  const current     = items[index];

  const prev = useCallback(() => {
    setLoading(true);
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  const next = useCallback(() => {
    setLoading(true);
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowLeft")   prev();
      if (e.key === "ArrowRight")  next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
    touchStartX.current = null;
  };

  if (!current) return null;

  return createPortal(
    <div
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          9999,
        backgroundColor: "rgba(0,0,0,0.95)",
        display:         "flex",
        flexDirection:   "column",
        fontFamily:      "'Inter',sans-serif",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", flexShrink: 0 }}>
        <span style={{ fontSize: "13px", color: "#A3A3C2" }}>
          {index + 1} / {items.length}
        </span>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#FFFFFF", display: "flex", alignItems: "center", padding: "6px", borderRadius: "8px", transition: "background 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <X size={22} strokeWidth={1.8} />
        </button>
      </div>

      {/* Media area */}
      <div
        style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}
        onClick={onClose}
      >
        {/* Prev button */}
        {items.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            style={{ position: "absolute", left: "12px", zIndex: 10, background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", color: "#FFFFFF", display: "flex", alignItems: "center", padding: "10px", borderRadius: "50%", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.8)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.5)")}
          >
            <ChevronLeft size={22} strokeWidth={1.8} />
          </button>
        )}

        {/* Media */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ width: "90vw", height: "80vh", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", isolation: "isolate" }}
        >
          {loading && current.type === "image" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "56px", height: "56px", animation: "vp-ring-pulse 1.4s ease-in-out infinite", filter: "drop-shadow(0 0 12px rgba(139,92,246,0.5)) drop-shadow(0 0 20px rgba(236,72,153,0.3))" }}>
  <svg width="56" height="56" viewBox="0 0 56 56" style={{ animation: "vp-ring-rotate 1s linear infinite", display: "block" }}>
    <defs>
      <linearGradient id="lb-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
    <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
    <circle cx="28" cy="28" r="22" fill="none" stroke="url(#lb-ring-grad)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="55 138" />
  </svg>
</div>
            </div>
          )}

          {current.type === "image" ? (
            <img
              key={current.url}
              src={current.url}
              alt=""
              onLoad={() => setLoading(false)}
              style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain", borderRadius: "8px", opacity: loading ? 0 : 1, transition: "opacity 0.2s" }}
            />
          ) : (
            (() => {
              const vid = current.bunnyVideoId ?? current.url.match(/b-cdn\.net\/([^/]+)\//)?.[1] ?? null;
              return (
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <VideoPlayer
                      ref={vpRef}
                      key={current.url}
                      bunnyVideoId={vid}
                      processingStatus={current.processingStatus ?? null}
                      rawVideoUrl={current.rawVideoUrl ?? null}
                      fillParent
                      objectFit="contain"
                      hideInternalBlur
                      autoPlay
                      hideMuteButton
                    />
                    <button
                      style={{ position: "absolute", top: 12, right: 12, zIndex: 9999, background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(6px)", WebkitTapHighlightColor: "transparent" }}
                      onClick={(e) => { e.stopPropagation(); vpRef.current?.toggleMute(); setLbMuted((m) => !m); }}
                      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); vpRef.current?.toggleMute(); setLbMuted((m) => !m); }}
                      aria-label={lbMuted ? "Unmute" : "Mute"}
                    >
                      {lbMuted ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                      )}
                    </button>
                </div>
              );
            })()
          )}
        </div>

        {/* Next button */}
        {items.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            style={{ position: "absolute", right: "12px", zIndex: 10, background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", color: "#FFFFFF", display: "flex", alignItems: "center", padding: "10px", borderRadius: "50%", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.8)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.5)")}
          >
            <ChevronRight size={22} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div
          onScroll={() => { thumbScrolled.current = true; }}
          onTouchStart={(e) => { e.stopPropagation(); thumbScrolled.current = false; }}
          onTouchEnd={(e) => { e.stopPropagation(); }}
          style={{ display: "flex", gap: "6px", padding: "12px 16px", overflowX: "auto", flexShrink: 0, scrollbarWidth: "none", justifyContent: "center" }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { if (thumbScrolled.current) { thumbScrolled.current = false; return; } setLoading(true); setIndex(i); }}
              style={{
                flexShrink:    0,
                width:         "52px",
                height:        "52px",
                borderRadius:  "6px",
                overflow:      "hidden",
                border:        i === index ? "2px solid #8B5CF6" : "2px solid transparent",
                padding:       0,
                cursor:        "pointer",
                backgroundColor: "#2A2A3D",
                transition:    "border-color 0.15s",
              }}
            >
              {item.type === "image" ? (
                <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : item.url.includes("b-cdn.net") && (item.url.includes("play_720p.mp4") || item.url.includes("playlist.m3u8")) ? (
                <img src={item.url.replace(/play_720p\.mp4|playlist\.m3u8/, "thumbnail.jpg").split("#")[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <video muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }}>
                  <source src={`${item.url.split("#")[0]}#t=0.001`} />
                </video>
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes lbSpin { to { transform: rotate(360deg); } }
        @keyframes vp-ring-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes vp-ring-pulse  { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.06); opacity: 1; } }
      `}</style>
    </div>,
    document.body
  );
}