"use client";

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import { Lock, LockOpen } from "lucide-react";
import { decode } from "blurhash";
import VideoPlayer, { getBunnyThumbnail } from "@/components/video/VideoPlayer";
import ImageCarousel from "@/components/profile/ImageCarousel";
import DoubleTapLike from "@/components/shared/DoubleTapLike";
import { clampRatio } from "@/lib/utils/clampRatio";

export interface NormalizedMedia {
  type:              "image" | "video";
  url:               string | null;
  bunnyVideoId?:     string | null;
  thumbnailUrl?:     string | null;
  processingStatus?: string | null;
  rawVideoUrl?:      string | null;
  blurHash?:         string | null;
  width?:            number | null;
  height?:           number | null;
  aspectRatio?:      number | null;
}

interface PostMediaViewerProps {
  media:            NormalizedMedia[];
  isLocked:         boolean;
  isUnlockedPPV?:   boolean;
  price?:           number | null;
  onDoubleTap?:     () => void;
  onSingleTap?:     (index: number) => void;
  onUnlock?:        () => void;
  initialSlide?:    number;
  onSlideChange?:   (index: number) => void;
}

const thumbRatioCache = new Map<string, number>();

function useMediaRatio(
  item: NormalizedMedia | null,
  thumbSrc: string | undefined,
  isVideo: boolean,
): number {
  const cached = thumbSrc ? thumbRatioCache.get(thumbSrc) ?? null : null;
  const [detected, setDetected] = React.useState<number | null>(cached);

  React.useEffect(() => {
    if (!thumbSrc || thumbRatioCache.has(thumbSrc)) return;
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      if (!w || !h) return;
      const r = clampRatio(w, h);
      thumbRatioCache.set(thumbSrc, r);
      setDetected(r);
    };
    img.src = thumbSrc;
  }, [thumbSrc]);

  if (item?.aspectRatio != null && item.aspectRatio > 0) {
    return clampRatio(item.aspectRatio, 1);
  }

  if (item?.width && item?.height) {
    return clampRatio(item.width, item.height);
  }

  if (detected != null) return detected;

  return 1;
}

// ── BlurHashCanvas ────────────────────────────────────────────────────────────
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

  return (
    <canvas ref={canvasRef} width={W} height={H} style={{ ...style, imageRendering: "auto" }} />
  );
}

// ── ProgressiveImage ──────────────────────────────────────────────────────────
function ProgressiveImage({ src, placeholder, blurHash, style }: {
  src?:         string | null;
  placeholder?: string | null;
  blurHash?:    string | null;
  style?:       React.CSSProperties;
}) {
  const [loaded, setLoaded] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    setLoaded(false);
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {blurHash && !loaded && (
        <BlurHashCanvas hash={blurHash} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />
      )}
      {placeholder && !loaded && (
        <img
          src={placeholder}
          alt=""
          aria-hidden
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", filter: "blur(20px)", transform: "scale(1.05)",
            zIndex: 1,
          }}
        />
      )}
      <img
        ref={imgRef}
        src={src ?? ""}
        alt=""
        draggable={false}
        loading="lazy"
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

// ── PostMediaViewer ──────────────────────────────────────────────────────────
export default function PostMediaViewer({
  media, isLocked, isUnlockedPPV = false, price, onDoubleTap, onSingleTap, onUnlock, initialSlide = 0, onSlideChange,
}: PostMediaViewerProps) {
  const first      = media[0] ?? null;
  const isVideo    = first?.type === "video";
  const isMultiImg = !isVideo && media.length > 1;

  const thumbSrc = isVideo
    ? (first?.bunnyVideoId ? getBunnyThumbnail(first.bunnyVideoId) : first?.thumbnailUrl ?? undefined)
    : first?.thumbnailUrl ?? first?.url ?? undefined;

  const ratio = useMediaRatio(first, thumbSrc, isVideo);

  const noop         = () => {};
  const doubleTap    = onDoubleTap ?? noop;
  const singleTapAt0 = () => onSingleTap?.(0);

  if (!media.length || !first) return null;

  // ── Locked (PPV) ─────────────────────────────────────────────────────────
  if (isLocked) {
    const blurSrc = isVideo
      ? (first.bunnyVideoId ? getBunnyThumbnail(first.bunnyVideoId) : first.thumbnailUrl ?? undefined)
      : (first.thumbnailUrl ?? first.url ?? undefined);
    const isPPV        = price != null && price > 0;
    const displayPrice = isPPV ? price! / 100 : 0;

    return (
      <div style={{ position: "relative", overflow: "hidden", width: "100%" }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: String(ratio), backgroundColor: "#0A0A0F", overflow: "hidden" }}>
          {first.blurHash && (
            <BlurHashCanvas
              hash={first.blurHash}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
            />
          )}
          {blurSrc && (
            <img
              src={blurSrc}
              alt=""
              loading="lazy"
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                objectFit: "cover",
                filter: "blur(6px) brightness(0.45)",
                transform: "scale(1.08)",
                zIndex: 1,
              }}
            />
          )}

          {/* Dark overlay */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            background: "linear-gradient(to bottom, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0.65) 100%)",
          }} />

          {/* Lock UI */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 3,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "16px",
          }}>
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

            {isPPV ? (
              <>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
                    color: "#A78BFA", textTransform: "uppercase",
                    fontFamily: "'Inter', sans-serif", marginBottom: "4px",
                  }}>
                    Pay-Per-View
                  </div>
                  <div style={{
                    fontSize: "26px", fontWeight: 800,
                    color: "#FFFFFF", fontFamily: "'Inter', sans-serif",
                    letterSpacing: "-0.5px",
                  }}>
                    ₦{displayPrice.toLocaleString("en-NG")}
                  </div>
                </div>

                <button
                  onClick={onUnlock}
                  style={{
                    padding: "11px 28px", borderRadius: "10px",
                    background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                    border: "none", color: "#fff", fontSize: "14px", fontWeight: 700,
                    cursor: "pointer", fontFamily: "'Inter', sans-serif",
                    boxShadow: "0 4px 16px rgba(139,92,246,0.45)", transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  Unlock for ₦{displayPrice.toLocaleString("en-NG")}
                </button>
              </>
            ) : (
              <button
                onClick={onUnlock}
                style={{
                  padding: "11px 28px", borderRadius: "10px",
                  background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                  border: "none", color: "#fff", fontSize: "14px", fontWeight: 700,
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  boxShadow: "0 4px 16px rgba(139,92,246,0.45)", transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                Subscribe to unlock
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Video ────────────────────────────────────────────────────────────────
  if (isVideo) {
    const videoRatio = (() => {
      if (first?.aspectRatio != null && first.aspectRatio > 0) {
        return Math.min(Math.max(first.aspectRatio, 9 / 16), 1.91);
      }
      if (first?.width && first?.height) {
        return Math.min(Math.max(first.width / first.height, 9 / 16), 1.91);
      }
      return ratio;
    })();

    const blurSrc = first.bunnyVideoId
      ? getBunnyThumbnail(first.bunnyVideoId)
      : first.thumbnailUrl ?? undefined;

    return (
      <DoubleTapLike onDoubleTap={doubleTap} style={{ width: "100%", display: "block" }}>
        <div
          style={{
            width: "100%", position: "relative", overflow: "hidden",
            aspectRatio: String(videoRatio), maxHeight: "85svh", backgroundColor: "#000",
            backgroundImage: blurSrc ? `url(${blurSrc})` : undefined,
            backgroundSize: "cover", backgroundPosition: "center",
          }}
        >
          {blurSrc && (
            <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", backgroundColor: "rgba(0,0,0,0.35)", zIndex: 0, pointerEvents: "none" }} />
          )}
          <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%" }}>
            <VideoPlayer
              bunnyVideoId={first.bunnyVideoId ?? null}
              thumbnailUrl={first.thumbnailUrl ?? null}
              processingStatus={first.processingStatus ?? null}
              rawVideoUrl={first.rawVideoUrl ?? null}
              fillParent={true}
              hideInternalBlur={true}
              blurHash={first.blurHash}
              objectFit="contain"
            />
          </div>

          {isUnlockedPPV && <UnlockedPPVBadge />}
        </div>
      </DoubleTapLike>
    );
  }

  // ── Multi-photo carousel ─────────────────────────────────────────────────
  if (isMultiImg) {
    const carouselMedia = media.map((m, i) => ({
      id:                i,
      media_type:        m.type,
      file_url:          m.url,
      thumbnail_url:     m.thumbnailUrl ?? null,
      raw_video_url:     m.rawVideoUrl ?? null,
      locked:            false,
      display_order:     i,
      processing_status: m.processingStatus ?? null,
      bunny_video_id:    m.bunnyVideoId ?? null,
      blur_hash:         m.blurHash ?? null,
      width:             m.width ?? null,
      height:            m.height ?? null,
      aspect_ratio:      m.aspectRatio ?? null,
    }));

    const tallestRatio = media.reduce((min, m) => {
      let r: number | null = null;
      if (m.aspectRatio != null && m.aspectRatio > 0) r = clampRatio(m.aspectRatio, 1);
      else if (m.width && m.height) r = clampRatio(m.width, m.height);
      return r != null && r < min ? r : min;
    }, ratio);

    return (
      <DoubleTapLike onDoubleTap={doubleTap} style={{ width: "100%" }}>
        <ImageCarousel
          media={carouselMedia}
          onImageClick={(index) => onSingleTap?.(index)}
          initialIndex={initialSlide}
          onSlideChange={onSlideChange}
          containerRatio={tallestRatio}
          isUnlockedPPV={isUnlockedPPV}
        />
      </DoubleTapLike>
    );
  }

  // ── Single image ─────────────────────────────────────────────────────────────
  const imageRatio = (() => {
    if (first?.aspectRatio != null && first.aspectRatio > 0) {
      return Math.min(Math.max(first.aspectRatio, 0.4), 1.91);
    }
    if (first?.width && first?.height) {
      return Math.min(Math.max(first.width / first.height, 0.4), 1.91);
    }
    return ratio;
  })();

  return (
    <DoubleTapLike onSingleTap={singleTapAt0} onDoubleTap={doubleTap} style={{ width: "100%", cursor: "zoom-in" }}>
      <style>{`
        @media (min-width: 768px) {
          .pmv-blur-bg {
            display: block !important;
          }
        }
      `}</style>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: String(imageRatio),
          maxHeight: "85svh",
          backgroundColor: "#000",
          overflow: "hidden",
        }}
      >
        {/* Blurred background — desktop only */}
        <div
          className="pmv-blur-bg"
          style={{ display: "none", position: "absolute", inset: 0, zIndex: 0 }}
        >
          <img
            src={first.url ?? ""}
            alt=""
            aria-hidden
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              filter: "blur(24px) brightness(0.5)", transform: "scale(1.08)",
            }}
          />
        </div>

        {/* Main image */}
        <img
          src={first.url ?? ""}
          alt=""
          draggable={false}
          loading="lazy"
          style={{
            position: "relative", zIndex: 1,
            width: "100%", height: "100%",
            objectFit: "contain", display: "block",
          }}
        />

        {isUnlockedPPV && <UnlockedPPVBadge />}
      </div>
    </DoubleTapLike>
  );
}