"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, LockOpen } from "lucide-react";
import { decode } from "blurhash";
import VideoPlayer, { getBunnyThumbnail } from "@/components/video/VideoPlayer";

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
  width?: number | null;
  height?: number | null;
  aspect_ratio?: number | null;
}

const W = 128, H = 128;

function BlurHashCanvas({ hash, style }: { hash: string; style?: React.CSSProperties }) {
  const canvasRef = React.useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || !hash) return;
    try {
      const pixels    = decode(hash, W, H);
      const ctx       = canvas.getContext("2d");
      if (!ctx) return;
      const imageData = ctx.createImageData(W, H);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch { }
  }, [hash]);
  return <canvas ref={canvasRef} width={W} height={H} style={{ ...style, imageRendering: "auto" }} />;
}

function ProgressiveImage({ src, blurHash, style, eager }: {
  src?:      string | null;
  blurHash?: string | null;
  style?:    React.CSSProperties;
  eager?:    boolean;
}) {
  const [loaded, setLoaded] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    setLoaded(false);
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setLoaded(true);
  }, [src]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {blurHash && !loaded && (
        <BlurHashCanvas hash={blurHash} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />
      )}
      <img
        ref={imgRef}
        src={src || undefined}
        alt=""
        draggable={false}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "low"}
        onLoad={() => setLoaded(true)}
        style={{
          ...style,
          position: "relative", zIndex: 2,
          opacity:    loaded ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      />
    </div>
  );
}

function UnlockedPPVBadge() {
  return (
    <div style={{
      position: "absolute", top: "10px", left: "10px", zIndex: 20,
      display: "flex", alignItems: "center", gap: "5px",
      padding: "4px 10px 4px 7px", borderRadius: "20px",
      background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.5)",
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      boxShadow: "0 2px 12px rgba(139,92,246,0.25)",
    }}>
      <LockOpen size={13} color="#C4B5FD" strokeWidth={2.2} />
      <span style={{ fontSize: "11px", fontWeight: 700, color: "#C4B5FD", fontFamily: "'Inter', sans-serif", letterSpacing: "0.04em", lineHeight: 1 }}>
        Unlocked
      </span>
    </div>
  );
}

export default function ImageCarousel({
  media,
  onImageClick,
  initialIndex = 0,
  onSlideChange,
  containerRatio = 1,
  isUnlockedPPV = false,
}: {
  media: MediaItem[];
  onImageClick?: (index: number) => void;
  initialIndex?: number;
  onSlideChange?: (index: number) => void;
  containerRatio?: number;
  isUnlockedPPV?: boolean;
}) {
  const [activeIndex, setActiveIndex]         = React.useState(initialIndex);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [isDesktop, setIsDesktop]             = React.useState(false);

  // ── All drag state in refs — no state updates during drag ──
  const stripRef          = React.useRef<HTMLDivElement>(null);
  const liveOffsetRef     = React.useRef(0);
  const startXRef         = React.useRef<number | null>(null);
  const startYRef         = React.useRef<number | null>(null);
  const dragDeltaX        = React.useRef(0);
  const isDragging        = React.useRef(false);
  const isHorizontal      = React.useRef<boolean | null>(null);
  const activeIndexRef    = React.useRef(activeIndex);
  const isTransitioningRef = React.useRef(false);

  // Keep refs in sync with state
  React.useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);
  React.useEffect(() => { isTransitioningRef.current = isTransitioning; }, [isTransitioning]);

  React.useEffect(() => {
    const check = () => setIsDesktop(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Direct DOM transform — zero state updates during drag ──
  const applyTransform = React.useCallback((offset: number, animated: boolean) => {
    const el = stripRef.current;
    if (!el) return;
    const idx = activeIndexRef.current;
    el.style.transition = animated ? "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)" : "none";
    el.style.transform  = `translateX(calc(${-idx * 100}% + ${offset}px))`;
  }, []);

  const goTo = React.useCallback((index: number) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setIsTransitioning(true);
    liveOffsetRef.current = 0;
    setActiveIndex(index);
    activeIndexRef.current = index;
    onSlideChange?.(index);

    // Apply animated transition directly
    const el = stripRef.current;
    if (el) {
      el.style.transition = "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)";
      el.style.transform  = `translateX(${-index * 100}%)`;
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
      setIsTransitioning(false);
    }, 380);
  }, [onSlideChange]);

  // ── Touch handlers ──
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (isTransitioningRef.current) return;
    startXRef.current  = e.touches[0].clientX;
    startYRef.current  = e.touches[0].clientY;
    dragDeltaX.current = 0;
    isHorizontal.current = null;
    isDragging.current = false;
  }, []);

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;

    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Determine gesture direction once, early
    if (isHorizontal.current === null && (absDx > 3 || absDy > 3)) {
      isHorizontal.current = absDx > absDy;
    }

    // Not horizontal — let iOS scroll
    if (isHorizontal.current === false) return;

    // Horizontal confirmed — prevent iOS from stealing
    e.preventDefault();
    isDragging.current = true;
    dragDeltaX.current = dx;

    const idx = activeIndexRef.current;
    const atStart = idx === 0;
    const atEnd   = idx === media.length - 1;
    const bounded = (dx > 0 && atStart) || (dx < 0 && atEnd) ? dx * 0.25 : dx;

    liveOffsetRef.current = bounded;
    applyTransform(bounded, false);
  }, [media.length, applyTransform]);

    const handleTouchEnd = React.useCallback(() => {
    const dx = dragDeltaX.current;
    startXRef.current    = null;
    startYRef.current    = null;
    isHorizontal.current = null;
    dragDeltaX.current   = 0;
    isDragging.current   = false;
    liveOffsetRef.current = 0;

    const idx = activeIndexRef.current;

    if (dx < -50 && idx < media.length - 1) goTo(idx + 1);
    else if (dx > 50 && idx > 0) goTo(idx - 1);
    else applyTransform(0, true);
  }, [media.length, goTo, applyTransform]);

  // ── Mouse handlers (desktop only) ──
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (isTransitioningRef.current) return;
    startXRef.current  = e.clientX;
    isDragging.current = false;
    dragDeltaX.current = 0;
  }, []);

  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 5) isDragging.current = true;
    dragDeltaX.current = dx;

    const idx = activeIndexRef.current;
    const bounded = (dx > 0 && idx === 0) || (dx < 0 && idx === media.length - 1) ? dx * 0.25 : dx;
    liveOffsetRef.current = bounded;
    applyTransform(bounded, false);
  }, [media.length, applyTransform]);

  const handleMouseUp = React.useCallback((e: React.MouseEvent) => {
    if (startXRef.current === null) return;
    const dx     = dragDeltaX.current;
    const wasDrag = isDragging.current;
    startXRef.current  = null;
    isDragging.current = false;
    dragDeltaX.current = 0;
    liveOffsetRef.current = 0;

    const idx = activeIndexRef.current;
    const currentItem = media[idx];
    const isVideoSlide = currentItem?.media_type === "video";

    if (Math.abs(dx) > 50) {
      if (dx < 0 && idx < media.length - 1) goTo(idx + 1);
      else if (dx > 0 && idx > 0) goTo(idx - 1);
      else applyTransform(0, true);
    } else {
      applyTransform(0, true);
      if (!wasDrag && !isVideoSlide) onImageClick?.(idx);
    }
  }, [media.length, goTo, applyTransform, onImageClick]);

  const handleMouseLeave = React.useCallback(() => {
    if (startXRef.current === null) return;
    startXRef.current  = null;
    isDragging.current = false;
    dragDeltaX.current = 0;
    liveOffsetRef.current = 0;
    applyTransform(0, true);
  }, [applyTransform]);

  

  const arrowStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute", [side]: "10px", top: "50%", transform: "translateY(-50%)",
    zIndex: 10, width: "32px", height: "32px", borderRadius: "50%",
    backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
    border: "none", color: "#fff", cursor: isTransitioning ? "default" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    opacity: isTransitioning ? 0.5 : 1, transition: "opacity 0.2s",
  });

  return (
    <div
      style={{
        position: "relative", width: "100%", backgroundColor: "#000",
        userSelect: "none", overflow: "hidden",
        aspectRatio: String(containerRatio), maxHeight: "85svh",
      }}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={stripRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={(e) => handleMouseUp(e)}
        style={{
          display: "flex", width: "100%", height: "100%",
          transform: `translateX(${-activeIndex * 100}%)`,
          // No transition here — managed directly via applyTransform
          cursor: isDesktop ? (media.length > 1 ? "grab" : "pointer") : "default",
          willChange: "transform",
          touchAction: "pan-y",
        }}
      >
        {media.map((item, i) => {
          const isActive   = i === activeIndex;
          const distance   = Math.abs(i - activeIndex);
          const shouldLoad = distance <= 2;
          const isVideo    = item.media_type === "video";

          if (i === 0 && isActive) {
            // log once per active-slide change for the first slide
            console.log(`%c[Carousel] slide ${activeIndex + 1}/${media.length} active, loading slides ${Math.max(0, activeIndex - 2) + 1}–${Math.min(media.length, activeIndex + 3)}`, "color: #EC4899");
          }

          const videoBlurSrc = item.bunny_video_id
            ? getBunnyThumbnail(item.bunny_video_id)
            : item.thumbnail_url ?? undefined;

          return (
            <div
              key={i}
              style={{ flexShrink: 0, width: "100%", height: "100%", position: "relative", overflow: "hidden" }}
            >
              {isVideo ? (
                shouldLoad ? (
                  <>
                    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                      {videoBlurSrc && (
                        <img src={videoBlurSrc} alt="" aria-hidden style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(24px) brightness(0.5)", transform: "scale(1.08)" }} />
                      )}
                    </div>
                    <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
                      <VideoPlayer
                        bunnyVideoId={item.bunny_video_id}
                        thumbnailUrl={item.thumbnail_url}
                        processingStatus={item.processing_status}
                        rawVideoUrl={item.raw_video_url}
                        fillParent={true}
                        hideInternalBlur={true}
                        blurHash={item.blur_hash}
                        objectFit="contain"
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ width: "100%", height: "100%", backgroundColor: "#0A0A14" }}>
                    {item.blur_hash && <BlurHashCanvas hash={item.blur_hash} style={{ width: "100%", height: "100%" }} />}
                  </div>
                )
              ) : (
                shouldLoad ? (
                  <>
                    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                      {item.file_url && <img src={item.file_url} alt="" aria-hidden style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(24px) brightness(0.5)", transform: "scale(1.08)" }} />}
                    </div>
                    <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
                      <ProgressiveImage
                        src={item.file_url}
                        blurHash={item.blur_hash}
                        eager={isActive}
                        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", pointerEvents: "none" }}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ width: "100%", height: "100%", backgroundColor: "#0A0A14" }}>
                    {item.blur_hash && <BlurHashCanvas hash={item.blur_hash} style={{ width: "100%", height: "100%" }} />}
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {isUnlockedPPV && <UnlockedPPVBadge />}

      {media.length > 1 && !isUnlockedPPV && (
        <div style={{ position: "absolute", top: "10px", left: "10px", zIndex: 10, backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", borderRadius: "20px", padding: "3px 10px", fontSize: "12px", fontWeight: 600, color: "#fff", fontFamily: "'Inter', sans-serif" }}>
          {activeIndex + 1} / {media.length}
        </div>
      )}

      {isDesktop && media.length > 1 && activeIndex > 0 && (
        <button onClick={() => goTo(activeIndex - 1)} style={arrowStyle("left")}><ChevronLeft size={18} /></button>
      )}
      {isDesktop && media.length > 1 && activeIndex < media.length - 1 && (
        <button onClick={() => goTo(activeIndex + 1)} style={arrowStyle("right")}><ChevronRight size={18} /></button>
      )}

      {media.length > 1 && (
        <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", alignItems: "center", gap: "2px" }}>
          {media.map((_, i) => (
            <div key={i} style={{ width: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <button
                onClick={() => goTo(i)}
                style={{
                  width: i === activeIndex ? "18px" : "6px", height: "6px",
                  borderRadius: "3px", border: "none",
                  backgroundColor: i === activeIndex ? "#fff" : "rgba(255,255,255,0.45)",
                  cursor: "pointer", padding: 0, transition: "all 0.25s", flexShrink: 0,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}