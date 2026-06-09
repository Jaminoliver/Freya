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
  durationSeconds?:  number | null;
}

interface PostMediaViewerProps {
  media:                NormalizedMedia[];
  isLocked:             boolean;
  isUnlockedPPV?:       boolean;
  isPPV?:               boolean;
  isFreeSubscription?:  boolean;
  price?:               number | null;
  onDoubleTap?:         () => void;
  onSingleTap?:         (index: number) => void;
  onUnlock?:            () => void;
  initialSlide?:        number;
  onSlideChange?:       (index: number) => void;
  maxHeight?:           string;
  fullscreenTopLeft?:   boolean;
  creatorHandle?:        string;
  disableMobileShrink?:  boolean;
  eager?:                boolean;
  displayName?:          string;
  username?:             string;
  avatarUrl?:            string | null;
  caption?:              string | null;
  durationSeconds?:      number | null;
  postData?:             PostFullscreenData;
}

const thumbRatioCache = new Map<string, number>();

const LOCK_STYLES = `
  @keyframes pmv-sweep{0%{left:-80%}100%{left:130%}}
  @keyframes pmv-pulse{
    0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(139,92,246,0.45)}
    50%{transform:scale(1.04);box-shadow:0 0 18px 6px rgba(236,72,153,0.25)}
  }
`;

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
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {blurHash && !loaded && (
        <BlurHashCanvas hash={blurHash} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />
      )}
      <img
        ref={imgRef}
        src={src ?? ""}
        alt=""
        draggable={false}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "low"}
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

// ── SubscribeButton ───────────────────────────────────────────────────────────
function SubscribeButton({ label, badge, onClick }: {
  label:   string;
  badge?:  string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: badge ? "space-between" : "center",
        width:          "100%",
        maxWidth:       "280px",
        padding:        "11px 16px",
        borderRadius:   "50px",
        background:     "linear-gradient(135deg, #8B5CF6, #EC4899)",
        border:         "none",
        cursor:         "pointer",
        fontFamily:     "'Inter', sans-serif",
        position:       "relative",
        overflow:       "hidden",
        animation:      "pmv-pulse 2.2s ease-in-out infinite",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "0.88";
        e.currentTarget.style.animationPlayState = "paused";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.animationPlayState = "running";
      }}
    >
      <span style={{
        position:     "absolute",
        top:          0,
        left:         "-80%",
        width:        "50%",
        height:       "100%",
        background:   "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)",
        transform:    "skewX(-20deg)",
        animation:    "pmv-sweep 2.5s ease-in-out infinite",
        pointerEvents:"none",
      }} />
      <span style={{
        fontSize:   "13px",
        fontWeight: 700,
        color:      "#fff",
        position:   "relative",
        zIndex:     1,
        display:    "flex",
        alignItems: "center",
        gap:        "6px",
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        {label}
      </span>
      {badge && (
        <span style={{
          fontSize:   "11px",
          fontWeight: 600,
          color:      "rgba(255,255,255,0.9)",
          background: "rgba(255,255,255,0.15)",
          padding:    "3px 10px",
          borderRadius:"20px",
          position:   "relative",
          zIndex:     1,
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ── PostMediaViewer ──────────────────────────────────────────────────────────
import type { VideoPlayerHandle, PostFullscreenData } from "@/components/video/VideoPlayer";

export default React.forwardRef<VideoPlayerHandle, PostMediaViewerProps>(function PostMediaViewer({
  media,
  isLocked,
  isUnlockedPPV = false,
  isPPV = false,
  isFreeSubscription = false,
  price,
  onDoubleTap,
  onSingleTap,
  onUnlock,
  initialSlide = 0,
  onSlideChange,
  maxHeight = "85svh",
  fullscreenTopLeft = false,
  creatorHandle,
  disableMobileShrink = false,
  eager = false,
  displayName,
  username,
  avatarUrl,
  caption,
  durationSeconds,
  postData,
}: PostMediaViewerProps, ref) {
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

  const [isMobileView, setIsMobileView] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 430);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!media.length || !first) return null;

  // ── Locked ────────────────────────────────────────────────────────────────
  if (isLocked) {
    const blurSrc = isVideo
      ? (first.bunnyVideoId ? getBunnyThumbnail(first.bunnyVideoId) : first.thumbnailUrl ?? undefined)
      : (first.thumbnailUrl ?? first.url ?? undefined);

    const isPPVLocked  = isPPV && price != null && price > 0;
    const displayPrice = isPPVLocked ? price! / 100 : 0;

    return (
      <div style={{ position: "relative", overflow: "hidden", width: "100%" }}>
        <style>{LOCK_STYLES}</style>
        <div style={{
          position:        "relative",
          width:           "100%",
          aspectRatio:     String(ratio),
          maxHeight:       "85svh",
          backgroundColor: "#0A0A0F",
          overflow:        "hidden",
        }}>
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
                position:  "absolute",
                inset:     0,
                width:     "100%",
                height:    "100%",
                objectFit: "cover",
                filter:    "blur(6px) brightness(0.45)",
                transform: "scale(1.08)",
                zIndex:    1,
              }}
            />
          )}
          <div style={{
            position:   "absolute",
            inset:      0,
            zIndex:     2,
            background: "linear-gradient(to bottom, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0.65) 100%)",
          }} />
          <div style={{
            position:       "absolute",
            inset:          0,
            zIndex:         3,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            gap:            "16px",
          }}>
            <div style={{
              width:           "56px",
              height:          "56px",
              borderRadius:    "50%",
              background:      "rgba(139,92,246,0.15)",
              border:          "1.5px solid rgba(139,92,246,0.6)",
              backdropFilter:  "blur(8px)",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              boxShadow:       "0 0 24px rgba(139,92,246,0.3)",
            }}>
              <Lock size={22} color="#A78BFA" strokeWidth={2} />
            </div>
            {isPPVLocked ? (
              <>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    fontSize:      "11px",
                    fontWeight:    700,
                    letterSpacing: "0.1em",
                    color:         "#A78BFA",
                    textTransform: "uppercase",
                    fontFamily:    "'Inter', sans-serif",
                    marginBottom:  "4px",
                  }}>
                    Pay-Per-View
                  </div>
                  <div style={{
                    fontSize:      "26px",
                    fontWeight:    800,
                    color:         "#FFFFFF",
                    fontFamily:    "'Inter', sans-serif",
                    letterSpacing: "-0.5px",
                  }}>
                    ₦{displayPrice.toLocaleString("en-NG")}
                  </div>
                </div>
                <SubscribeButton
                  label="Unlock content"
                  badge={`₦${displayPrice.toLocaleString("en-NG")}`}
                  onClick={onUnlock}
                />
              </>
            ) : (
              <>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    fontSize:      "11px",
                    fontWeight:    700,
                    letterSpacing: "0.1em",
                    color:         "#A78BFA",
                    textTransform: "uppercase",
                    fontFamily:    "'Inter', sans-serif",
                    marginBottom:  "4px",
                  }}>
                    {isFreeSubscription ? "Free subscription" : "Subscribers only"}
                  </div>
                </div>
                <SubscribeButton
                  label={isFreeSubscription ? "Subscribe for free to view" : "Subscribe to view content"}
                  badge={isFreeSubscription ? "Free" : undefined}
                  onClick={onUnlock}
                />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  

  if (isVideo) {
    const rawVideoRatio = (() => {
      if (first?.aspectRatio != null && first.aspectRatio > 0) return first.aspectRatio;
      if (first?.width && first?.height) return first.width / first.height;
      return ratio;
    })();

    const isPortrait  = rawVideoRatio < 1;
    const videoRatio  = Math.min(Math.max(rawVideoRatio, 9 / 16), 1.91);

    // X-style: portrait videos on mobile sit in a narrower container (left-aligned)
    // Width shrinks → height naturally follows the same ratio → nothing cropped
    const containerWidth = isMobileView && isPortrait && !disableMobileShrink ? "85%" : "100%";

    const blurSrc = first.bunnyVideoId
      ? getBunnyThumbnail(first.bunnyVideoId)
      : first.thumbnailUrl ?? undefined;

    return (
      <DoubleTapLike onDoubleTap={doubleTap} style={{ width: "100%", display: "block" }}>
        <div style={{ width: containerWidth, borderRadius: "14px", border: "1px solid #1E1E2E", overflow: "hidden", clipPath: isMobileView ? "inset(0 round 14px)" : "none" }}>
        <div
          style={{
            width:                "100%",
            position:             "relative",
            aspectRatio:          !isMobileView && isPortrait ? "4 / 3" : String(videoRatio),
            overflow:             isMobileView ? "hidden" : "visible",
            backgroundColor:      "#000",
            backgroundImage:      blurSrc ? `url(${blurSrc})` : undefined,
            backgroundSize:       "cover",
            backgroundPosition:   "center",
          }}
        >
          {!isMobileView && blurSrc && (
            <div style={{
              position:             "absolute",
              inset:                0,
              backdropFilter:       "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              backgroundColor:      "rgba(0,0,0,0.35)",
              zIndex:               0,
              pointerEvents:        "none",
            }} />
          )}
          <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%" }}>
            <VideoPlayer
              ref={ref}
              bunnyVideoId={first.bunnyVideoId ?? null}
              thumbnailUrl={first.thumbnailUrl ?? null}
              processingStatus={first.processingStatus ?? null}
              rawVideoUrl={first.rawVideoUrl ?? null}
              fillParent={true}
              hideInternalBlur={true}
              blurHash={first.blurHash}
              objectFit={isMobileView && isPortrait ? "cover" : "contain"}
              fullscreenTopLeft={fullscreenTopLeft}
              knownWidth={first.width ?? null}
              knownHeight={first.height ?? null}
              creatorHandle={creatorHandle}
              eager={eager}
              displayName={displayName}
              username={username}
              avatarUrl={avatarUrl}
              caption={caption}
              durationSeconds={first.durationSeconds ?? null}
              postData={postData}
            />
          </div>
          {isUnlockedPPV && <UnlockedPPVBadge />}
        </div>
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
        <div style={{ position: "relative", width: "100%", borderRadius: "14px", border: "1px solid #1E1E2E", overflow: "hidden", clipPath: "inset(0 round 14px)" }}>
          <ImageCarousel
            media={carouselMedia}
            onImageClick={(index) => onSingleTap?.(index)}
            initialIndex={initialSlide}
            onSlideChange={onSlideChange}
            containerRatio={tallestRatio}
            isUnlockedPPV={isUnlockedPPV}
          />
          {creatorHandle && (
            <div style={{
              position: "absolute", top: 0, left: 0,
              zIndex: 12, pointerEvents: "none",
              fontSize: "14px", fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.02em",
              background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)",
              width: "100%",
              padding: "2px 8px 20px",
            }}>
              {creatorHandle}@Fréya.com
            </div>
          )}
        </div>
      </DoubleTapLike>
    );
  }

  // ── Single image ──────────────────────────────────────────────────────────
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
      <div
        style={{
          position:             "relative",
          width:                "100%",
          aspectRatio:          String(imageRatio),
          maxHeight:            "85svh",
          backgroundColor:      "#0A0A0F",
          overflow:             "hidden",
          borderRadius:         "14px",
          border:               "1px solid #1E1E2E",
          clipPath:             "inset(0 round 14px)",
          backgroundImage:      first.url ? `url(${first.url})` : undefined,
          backgroundSize:       "cover",
          backgroundPosition:   "center",
        }}
      >
        {first.url && (
          <div style={{
            position:             "absolute",
            inset:                0,
            backdropFilter:       "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            backgroundColor:      "rgba(0,0,0,0.35)",
            zIndex:               0,
            pointerEvents:        "none",
          }} />
        )}
        <ProgressiveImage
          src={first.url}
          blurHash={first.blurHash}
          eager
          style={{ width: "100%", height: "100%", objectFit: isMobileView ? "cover" : "contain", display: "block" }}
        />
        {isUnlockedPPV && <UnlockedPPVBadge />}
        {creatorHandle && (
          <div style={{
            position: "absolute", top: 0, left: 0,
            zIndex: 12, pointerEvents: "none",
            fontSize: "14px", fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.02em",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)",
            width: "100%",
            padding: "2px 8px 20px",
          }}>
            {creatorHandle}@Fréya.com
          </div>
        )}
      </div>
    </DoubleTapLike>
  );
});