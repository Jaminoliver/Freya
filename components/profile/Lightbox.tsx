"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface LightboxPost {
  id: number;
  media: {
    id: number;
    media_type: string;
    file_url: string | null;
    thumbnail_url: string | null;
    raw_video_url: string | null;
    locked: boolean;
    display_order: number;
    processing_status: string | null;
    bunny_video_id: string | null;
  }[];
}

export default function Lightbox({ post, allPosts, initialMediaIndex = 0, onClose, onNavigate }: {
  post: LightboxPost;
  allPosts: LightboxPost[];
  initialMediaIndex?: number;
  onClose: () => void;
  onNavigate: (post: LightboxPost, mediaIndex?: number) => void;
}) {
  const [mediaIndex, setMediaIndex] = React.useState(initialMediaIndex);
  const currentPostIdx = allPosts.findIndex((p) => p.id === post.id);
  const hasPrevPost    = currentPostIdx > 0;
  const hasNextPost    = currentPostIdx < allPosts.length - 1;
  const images         = post.media?.filter((m) => m.media_type !== "video" && m.file_url) ?? [];
  const hasPrevImage   = mediaIndex > 0;
  const hasNextImage   = mediaIndex < images.length - 1;
  const [mounted,  setMounted]  = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  const touchStartX   = React.useRef<number | null>(null);
  const touchCurrentX = React.useRef<number | null>(null);
  const dragging      = React.useRef(false);
  const [dragOffset, setDragOffset] = React.useState(0);

  React.useEffect(() => {
    setMounted(true);
    setIsMobile(window.matchMedia("(hover: none), (pointer: coarse)").matches);
  }, []);

  React.useEffect(() => {
    if (mounted && isMobile) onClose();
  }, [mounted, isMobile, onClose]);

  // Lock body scroll when lightbox is open, restore on close
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top      = `-${scrollY}px`;
    document.body.style.width    = "100%";
    return () => {
      document.body.style.overflow = prev;
      document.body.style.position = "";
      document.body.style.top      = "";
      document.body.style.width    = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  React.useEffect(() => { setMediaIndex(initialMediaIndex); }, [post.id, initialMediaIndex]);

  const goPrev = React.useCallback(() => {
    if (hasPrevImage) { setMediaIndex((i) => i - 1); return; }
    if (hasPrevPost)  onNavigate(allPosts[currentPostIdx - 1], 0);
  }, [hasPrevImage, hasPrevPost, currentPostIdx, allPosts, onNavigate]);

  const goNext = React.useCallback(() => {
    if (hasNextImage) { setMediaIndex((i) => i + 1); return; }
    if (hasNextPost)  onNavigate(allPosts[currentPostIdx + 1], 0);
  }, [hasNextImage, hasNextPost, currentPostIdx, allPosts, onNavigate]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowLeft")  goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [goPrev, goNext, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current   = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    dragging.current      = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!dragging.current || touchStartX.current === null) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    touchCurrentX.current = e.touches[0].clientX;
    const atLeftEdge  = diff > 0 && !hasPrevImage && !hasPrevPost;
    const atRightEdge = diff < 0 && !hasNextImage && !hasNextPost;
    setDragOffset(atLeftEdge || atRightEdge ? diff * 0.2 : diff);
  };

  const handleTouchEnd = () => {
    if (!dragging.current || touchStartX.current === null) return;
    const diff = (touchCurrentX.current ?? touchStartX.current) - touchStartX.current;
    dragging.current = false;
    setDragOffset(0);
    if (Math.abs(diff) > 60) diff < 0 ? goNext() : goPrev();
    touchStartX.current = touchCurrentX.current = null;
  };

  const hasPrev = hasPrevImage || hasPrevPost;
  const hasNext = hasNextImage || hasNextPost;

  if (!mounted || isMobile || images.length === 0) return null;

  const totalSlides = images.length;
  const translateX  = -(mediaIndex / totalSlides) * 100;

  return ReactDOM.createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", overflow: "hidden", touchAction: "none" }}
    >
      {/* Top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", pointerEvents: "none" }}>
        {images.length > 1 ? (
          <div style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", borderRadius: "20px", padding: "3px 10px", fontSize: "12px", fontWeight: 600, color: "#fff", fontFamily: "'Inter', sans-serif", pointerEvents: "auto" }}>
            {mediaIndex + 1} / {images.length}
          </div>
        ) : <div />}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#fff", border: "none", color: "#000", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.5)", pointerEvents: "auto" }}
        >
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Sliding strip */}
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{
          display:    "flex",
          width:      `${totalSlides * 100}%`,
          height:     "100%",
          transform:  `translateX(calc(${translateX}% + ${dragOffset}px))`,
          transition: dragging.current ? "none" : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          willChange: "transform",
        }}>
          {images.map((img) => (
            <div key={img.id} style={{ width: `${100 / totalSlides}%`, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {img.file_url && (
                <img
                  src={img.file_url}
                  alt=""
                  draggable={false}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block", userSelect: "none" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Arrows */}
        {hasPrev && (
          <button onClick={(e) => { e.stopPropagation(); goPrev(); }} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
            <ChevronLeft size={20} />
          </button>
        )}
        {hasNext && (
          <button onClick={(e) => { e.stopPropagation(); goNext(); }} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)", display: "flex", justifyContent: "center", gap: "5px", zIndex: 10 }}>
          {images.map((_, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setMediaIndex(i); }} style={{ width: i === mediaIndex ? "18px" : "6px", height: "6px", borderRadius: "3px", border: "none", backgroundColor: i === mediaIndex ? "#fff" : "rgba(255,255,255,0.45)", cursor: "pointer", padding: 0, transition: "all 0.25s", flexShrink: 0 }} />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}