"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface MediaItem {
  url:       string;
  type:      "image" | "video";
  messageId: number;
}

interface Props {
  items:        MediaItem[];
  initialIndex: number;
  onClose:      () => void;
}

export function MediaLightbox({ items, initialIndex, onClose }: Props) {
  const [index,   setIndex]   = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const touchStartX = useRef<number | null>(null);
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

  return (
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
          style={{ maxWidth: "90vw", maxHeight: "80vh", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {loading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid #2A2A3D", borderTopColor: "#8B5CF6", animation: "lbSpin 0.7s linear infinite" }} />
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
            <video
              key={current.url}
              src={current.url}
              controls
              autoPlay
              onCanPlay={() => setLoading(false)}
              style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: "8px", backgroundColor: "#000", opacity: loading ? 0 : 1, transition: "opacity 0.2s" }}
            />
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
        <div style={{ display: "flex", gap: "6px", padding: "12px 16px", overflowX: "auto", flexShrink: 0, scrollbarWidth: "none", justifyContent: "center" }}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { setLoading(true); setIndex(i); }}
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
              ) : (
                <video src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes lbSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}