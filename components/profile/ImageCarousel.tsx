"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { decode } from "blurhash";

export interface MediaItem {
  id: number;
  media_type: string;
  file_url: string | null;
  thumbnail_url: string | null;
  raw_video_url: string | null;
  locked: boolean;
  display_order: number;
  processing_status: string | null;
  bunny_video_id: string | null;
  blur_hash?: string | null;
}

// ── BlurHashCanvas — renders instantly from hash string ──────────────────────
function BlurHashCanvas({ hash, style }: { hash: string; style?: React.CSSProperties }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!hash || !canvasRef.current) return;
    try {
      const pixels    = decode(hash, 32, 32);
      const ctx       = canvasRef.current.getContext("2d");
      if (!ctx) return;
      const imageData = ctx.createImageData(32, 32);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch { /* invalid hash — fail silently */ }
  }, [hash]);

  return <canvas ref={canvasRef} width={32} height={32} style={{ ...style, imageRendering: "pixelated" }} />;
}

// ── ProgressiveImage — blurhash → thumbnail → full image ─────────────────────
function ProgressiveImage({ src, placeholder, blurHash, style }: {
  src?:         string | null;
  placeholder?: string | null;
  blurHash?:    string | null;
  style?:       React.CSSProperties;
}) {
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!src) return;
    setLoaded(false);
    const img = new Image();
    img.onload  = () => setLoaded(true);
    img.onerror = () => setLoaded(true);
    img.src = src;
  }, [src]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Blurhash — instant, zero network */}
      {blurHash && !loaded && (
        <BlurHashCanvas
          hash={blurHash}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
        />
      )}
      {/* Thumbnail fades in over blurhash */}
      {placeholder && (
        <img
          src={placeholder}
          alt=""
          aria-hidden
          style={{
            position:   "absolute",
            inset:      0,
            width:      "100%",
            height:     "100%",
            objectFit:  "cover",
            filter:     "blur(20px)",
            transform:  "scale(1.05)",
            zIndex:     1,
            opacity:    loaded ? 0 : 1,
            transition: "opacity 0.3s ease",
          }}
        />
      )}
      {/* Full image */}
      <img
        src={src ?? ""}
        alt=""
        draggable={false}
        onLoad={() => setLoaded(true)}
        style={{
          ...style,
          opacity:    loaded ? 1 : 0,
          transition: "opacity 0.25s ease",
          position:   "relative",
          zIndex:     2,
        }}
      />
    </div>
  );
}

export default function ImageCarousel({ media, onImageClick, initialIndex = 0, onSlideChange }: {
  media: MediaItem[];
  onImageClick?: (index: number) => void;
  initialIndex?: number;
  onSlideChange?: (index: number) => void;
}) {
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [isDesktop, setIsDesktop] = React.useState(false);

  // Touch / drag state
  const startXRef    = React.useRef<number | null>(null);
  const startYRef    = React.useRef<number | null>(null);
  const dragDeltaX   = React.useRef(0);
  const [liveOffset, setLiveOffset] = React.useState(0); // px dragged live
  const isDragging   = React.useRef(false);
  const touchWasUsed = React.useRef(false);

  React.useEffect(() => {
    const check = () => setIsDesktop(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const goTo = React.useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setLiveOffset(0);
    setActiveIndex(index);
    onSlideChange?.(index);
    // Allow CSS transition to complete before unlocking
    setTimeout(() => setIsTransitioning(false), 380);
  }, [isTransitioning, onSlideChange]);

  // ── Touch handlers ────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    dragDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = Math.abs(e.touches[0].clientY - startYRef.current);
    if (dy > 10 && Math.abs(dx) < dy) return; // vertical scroll
    dragDeltaX.current = dx;
    // Rubber-band at edges
    const bounded =
      (dx > 0 && activeIndex === 0) || (dx < 0 && activeIndex === media.length - 1)
        ? dx * 0.25
        : dx;
    setLiveOffset(bounded);
  };

  const handleTouchEnd = () => {
    touchWasUsed.current = true;
    setTimeout(() => { touchWasUsed.current = false; }, 500);
    const dx = dragDeltaX.current;
    startXRef.current = null;
    startYRef.current = null;
    if (dx < -50 && activeIndex < media.length - 1) goTo(activeIndex + 1);
    else if (dx > 50 && activeIndex > 0) goTo(activeIndex - 1);
    else { setLiveOffset(0); }
    dragDeltaX.current = 0;
  };

  // ── Mouse handlers (desktop drag) ────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (touchWasUsed.current || isTransitioning) return;
    startXRef.current = e.clientX;
    isDragging.current = false;
    dragDeltaX.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (touchWasUsed.current || startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 5) isDragging.current = true;
    dragDeltaX.current = dx;
    const bounded =
      (dx > 0 && activeIndex === 0) || (dx < 0 && activeIndex === media.length - 1)
        ? dx * 0.25
        : dx;
    setLiveOffset(bounded);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (touchWasUsed.current) return;
    const dx = dragDeltaX.current;
    const wasDrag = isDragging.current;
    startXRef.current  = null;
    isDragging.current = false;
    dragDeltaX.current = 0;

    if (Math.abs(dx) > 50) {
      if (dx < 0 && activeIndex < media.length - 1) goTo(activeIndex + 1);
      else if (dx > 0 && activeIndex > 0) goTo(activeIndex - 1);
      else setLiveOffset(0);
    } else {
      setLiveOffset(0);
      if (!wasDrag) onImageClick?.(activeIndex);
    }
  };

  const handleMouseLeave = () => {
    if (startXRef.current !== null) {
      startXRef.current  = null;
      isDragging.current = false;
      dragDeltaX.current = 0;
      setLiveOffset(0);
    }
  };

  const arrowStyle = (side: "left" | "right"): React.CSSProperties => ({
    position:        "absolute",
    [side]:          "10px",
    top:             "50%",
    transform:       "translateY(-50%)",
    zIndex:          10,
    width:           "32px",
    height:          "32px",
    borderRadius:    "50%",
    backgroundColor: "rgba(0,0,0,0.5)",
    backdropFilter:  "blur(4px)",
    border:          "none",
    color:           "#fff",
    cursor:          isTransitioning ? "default" : "pointer",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    opacity:         isTransitioning ? 0.5 : 1,
    transition:      "opacity 0.2s",
  });

  // CSS transform slides the strip; liveOffset adds finger/drag offset
  const translateX = `calc(${-activeIndex * 100}% + ${liveOffset}px)`;

  return (
    <div
      style={{ position: "relative", width: "100%", backgroundColor: "#000", userSelect: "none", overflow: "hidden" }}
      onMouseLeave={handleMouseLeave}
    >
      {/* Slide strip */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          display:    "flex",
          width:      "100%",
          transform:  `translateX(${translateX})`,
          // Only animate when not dragging live
          transition: liveOffset === 0 ? "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
          cursor:     isDesktop ? (media.length > 1 ? "grab" : "pointer") : "default",
          willChange: "transform",
        }}
      >
        {media.map((item, i) => (
          <div
            key={i}
            style={{ flexShrink: 0, width: "100%", position: "relative", backgroundColor: "#000" }}
          >
            {/* Side blur bars */}
            <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "80px", backgroundImage: `url(${item.file_url})`, backgroundSize: "cover", backgroundPosition: "left center", filter: "blur(16px) brightness(0.7)", transform: "scaleX(1.3)", opacity: 0.9, pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "80px", backgroundImage: `url(${item.file_url})`, backgroundSize: "cover", backgroundPosition: "right center", filter: "blur(16px) brightness(0.7)", transform: "scaleX(1.3)", opacity: 0.9, pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <ProgressiveImage
                src={item.file_url}
                placeholder={item.thumbnail_url ?? item.file_url}
                blurHash={item.blur_hash}
                style={{ width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", display: "block", pointerEvents: "none" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Counter badge */}
      {media.length > 1 && (
        <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 10, backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", borderRadius: "20px", padding: "3px 10px", fontSize: "12px", fontWeight: 600, color: "#fff", fontFamily: "'Inter', sans-serif" }}>
          {activeIndex + 1} / {media.length}
        </div>
      )}

      {/* Arrow buttons */}
      {isDesktop && media.length > 1 && activeIndex > 0 && (
        <button onClick={() => goTo(activeIndex - 1)} style={arrowStyle("left")}>
          <ChevronLeft size={18} />
        </button>
      )}
      {isDesktop && media.length > 1 && activeIndex < media.length - 1 && (
        <button onClick={() => goTo(activeIndex + 1)} style={arrowStyle("right")}>
          <ChevronRight size={18} />
        </button>
      )}

      {/* Dot indicators */}
      {media.length > 1 && (
        <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", alignItems: "center", gap: "5px" }}>
          {media.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width:           i === activeIndex ? "18px" : "6px",
                height:          "6px",
                borderRadius:    "3px",
                border:          "none",
                backgroundColor: i === activeIndex ? "#fff" : "rgba(255,255,255,0.45)",
                cursor:          "pointer",
                padding:         0,
                transition:      "all 0.25s",
                flexShrink:      0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}