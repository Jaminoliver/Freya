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

function ProgressiveImage({ src, placeholder, blurHash, style, eager }: {
  src?:            string | null;
  placeholder?:    string | null;
  blurHash?:       string | null;
  style?:          React.CSSProperties;
  eager?:          boolean;
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
      {placeholder && !loaded && (
        <img src={placeholder} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(20px)", transform: "scale(1.05)", zIndex: 1 }} />
      )}
      <img
        ref={imgRef}
        src={src ?? undefined}
        alt=""
        draggable={false}
        loading={eager ? "eager" : "lazy"}
        onLoad={() => setLoaded(true)}
        style={{ ...style, opacity: loaded ? 1 : 0, transition: "opacity 0.25s ease", position: "relative", zIndex: 2 }}
      />
    </div>
  );
}

// ── UnlockedPPVBadge ──────────────────────────────────────────────────────────
function UnlockedPPVBadge() {
  return (
    <div
      style={{
        position:       "absolute",
        top:            "10px",
        left:           "10px",
        zIndex:         20,
        display:        "flex",
        alignItems:     "center",
        gap:            "5px",
        padding:        "4px 10px 4px 7px",
        borderRadius:   "20px",
        background:     "rgba(139,92,246,0.18)",
        border:         "1px solid rgba(139,92,246,0.5)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow:      "0 2px 12px rgba(139,92,246,0.25)",
      }}
    >
      <LockOpen size={13} color="#C4B5FD" strokeWidth={2.2} />
      <span
        style={{
          fontSize:      "11px",
          fontWeight:    700,
          color:         "#C4B5FD",
          fontFamily:    "'Inter', sans-serif",
          letterSpacing: "0.04em",
          lineHeight:    1,
        }}
      >
        Unlocked
      </span>
    </div>
  );
}

export default function ImageCarousel({ media, onImageClick, initialIndex = 0, onSlideChange, containerRatio = 1, isUnlockedPPV = false }: {
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

  const startXRef         = React.useRef<number | null>(null);
  const startYRef         = React.useRef<number | null>(null);
  const dragDeltaX        = React.useRef(0);
  const [liveOffset, setLiveOffset] = React.useState(0);
  const isDragging        = React.useRef(false);
  const touchWasUsed      = React.useRef(false);
  const isHorizontalSwipe = React.useRef<boolean | null>(null);
  const stripRef          = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const check = () => setIsDesktop(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  React.useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (startXRef.current === null || startYRef.current === null) return;
      const dx = Math.abs(e.touches[0].clientX - startXRef.current);
      const dy = Math.abs(e.touches[0].clientY - startYRef.current);
      if (isHorizontalSwipe.current === null && (dx > 3 || dy > 3)) isHorizontalSwipe.current = dx > dy;
      if (isHorizontalSwipe.current) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  const goTo = React.useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setLiveOffset(0);
    setActiveIndex(index);
    onSlideChange?.(index);
    setTimeout(() => setIsTransitioning(false), 380);
  }, [isTransitioning, onSlideChange]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    dragDeltaX.current = 0;
    isHorizontalSwipe.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = Math.abs(e.touches[0].clientY - startYRef.current);
    if (isHorizontalSwipe.current === false) return;
    if (dy > 10 && Math.abs(dx) < dy) return;
    dragDeltaX.current = dx;
    const bounded = (dx > 0 && activeIndex === 0) || (dx < 0 && activeIndex === media.length - 1) ? dx * 0.25 : dx;
    setLiveOffset(bounded);
  };

  const handleTouchEnd = () => {
    touchWasUsed.current = true;
    setTimeout(() => { touchWasUsed.current = false; }, 500);
    const dx = dragDeltaX.current;
    startXRef.current = null;
    startYRef.current = null;
    isHorizontalSwipe.current = null;
    if (dx < -50 && activeIndex < media.length - 1) goTo(activeIndex + 1);
    else if (dx > 50 && activeIndex > 0) goTo(activeIndex - 1);
    else setLiveOffset(0);
    dragDeltaX.current = 0;
  };

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
    const bounded = (dx > 0 && activeIndex === 0) || (dx < 0 && activeIndex === media.length - 1) ? dx * 0.25 : dx;
    setLiveOffset(bounded);
  };

  const handleMouseUp = () => {
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
    position: "absolute", [side]: "10px", top: "50%", transform: "translateY(-50%)",
    zIndex: 10, width: "32px", height: "32px", borderRadius: "50%",
    backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
    border: "none", color: "#fff", cursor: isTransitioning ? "default" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    opacity: isTransitioning ? 0.5 : 1, transition: "opacity 0.2s",
  });

  const translateX = `calc(${-activeIndex * 100}% + ${liveOffset}px)`;

  return (
    <div
      style={{
        position: "relative", width: "100%", backgroundColor: "#000",
        userSelect: "none", overflow: "hidden",
        aspectRatio: String(containerRatio), maxHeight: "85svh",
      }}
      onMouseLeave={handleMouseLeave}
    >
      <style>{`
        @media (min-width: 768px) {
          .ic-blur-bg {
            display: block !important;
          }
        }
      `}</style>

      <div
        ref={stripRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          display: "flex", width: "100%", height: "100%",
          transform: `translateX(${translateX})`,
          transition: liveOffset === 0 ? "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
          cursor: isDesktop ? (media.length > 1 ? "grab" : "pointer") : "default",
          willChange: "transform",
          touchAction: "pan-y",
        }}
      >
        {media.map((item, i) => {
          const isActive   = i === activeIndex;
          const isAdjacent = Math.abs(i - activeIndex) === 1;
          const shouldLoad = isActive || isAdjacent;
          const isVideo    = item.media_type === "video";

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
                        <img
                          src={videoBlurSrc}
                          alt=""
                          aria-hidden
                          style={{
                            width: "100%", height: "100%",
                            objectFit: "cover",
                            filter: "blur(24px) brightness(0.5)",
                            transform: "scale(1.08)",
                          }}
                        />
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
                    <div
                      className="ic-blur-bg"
                      style={{ display: "none", position: "absolute", inset: 0, zIndex: 0 }}
                    >
                      <img
                        src={item.file_url ?? ""}
                        alt=""
                        aria-hidden
                        style={{
                          width: "100%", height: "100%",
                          objectFit: "cover",
                          filter: "blur(24px) brightness(0.5)",
                          transform: "scale(1.08)",
                        }}
                      />
                    </div>
                    <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
                      <ProgressiveImage
                        src={item.file_url}
                        placeholder={item.thumbnail_url}
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

      {/* Unlocked PPV badge — sits above the carousel strip */}
      {isUnlockedPPV && <UnlockedPPVBadge />}

      {media.length > 1 && (
        <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 10, backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", borderRadius: "20px", padding: "3px 10px", fontSize: "12px", fontWeight: 600, color: "#fff", fontFamily: "'Inter', sans-serif" }}>
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