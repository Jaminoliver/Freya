"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { decode } from "blurhash";
import VideoPlayer, { getBunnyThumbnail } from "@/components/video/VideoPlayer";
import ImageCarousel from "@/components/profile/ImageCarousel";
import DoubleTapLike from "@/components/shared/DoubleTapLike";

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
}

interface PostMediaViewerProps {
  media:          NormalizedMedia[];
  isLocked:       boolean;
  price?:         number | null;
  onDoubleTap?:   () => void;
  onSingleTap?:   (index: number) => void;
  onUnlock?:      () => void;
  initialSlide?:  number;
  onSlideChange?: (index: number) => void;
}

function getStaticRatio(width?: number | null, height?: number | null): string | null {
  if (!width || !height) return null;
  return `${width}/${height}`;
}

const ratioCache = new Map<string, string>();

function useThumbAspectRatio(src: string | undefined, width?: number | null, height?: number | null): string | null {
  const staticRatio = getStaticRatio(width, height);
  const cached = src ? ratioCache.get(src) ?? null : null;
  const [ratio, setRatio] = React.useState<string | null>(staticRatio ?? cached);

  React.useEffect(() => {
    if (staticRatio) return; // already have it from w/h
    if (!src || ratioCache.has(src)) return;
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      if (!w || !h) return;
      const r = `${w}/${h}`;
      ratioCache.set(src, r);
      setRatio(r);
    };
    img.src = src;
  }, [src, staticRatio]);

  return ratio;
}

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
    } catch { }
  }, [hash]);

  return <canvas ref={canvasRef} width={32} height={32} style={{ ...style, imageRendering: "pixelated" }} />;
}

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
      {blurHash && !loaded && (
        <BlurHashCanvas hash={blurHash} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />
      )}
      {placeholder && (
        <img src={placeholder} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(20px)", transform: "scale(1.05)", zIndex: 1, opacity: loaded ? 0 : 1, transition: "opacity 0.3s ease" }} />
      )}
      <img
        src={src ?? ""}
        alt=""
        draggable={false}
        onLoad={() => setLoaded(true)}
        style={{ ...style, opacity: loaded ? 1 : 0, transition: "opacity 0.25s ease", position: "relative", zIndex: 2 }}
      />
    </div>
  );
}

export default function PostMediaViewer({
  media, isLocked, price, onDoubleTap, onSingleTap, onUnlock, initialSlide = 0, onSlideChange,
}: PostMediaViewerProps) {
  const first      = media[0] ?? null;
  const isVideo    = first?.type === "video";
  const isMultiImg = !isVideo && media.length > 1;

  const thumbSrc = isVideo && first?.bunnyVideoId
    ? getBunnyThumbnail(first.bunnyVideoId)
    : first?.thumbnailUrl ?? first?.url ?? undefined;

  const aspectRatio  = useThumbAspectRatio(thumbSrc, first?.width, first?.height);
  const noop         = () => {};
  const doubleTap    = onDoubleTap ?? noop;
  const singleTapAt0 = () => onSingleTap?.(0);

  if (!media.length || !first) return null;

  // ── Locked ───────────────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div style={{ position: "relative", overflow: "hidden", width: "100%", backgroundColor: "#000" }}>
        {first.blurHash && (
          <BlurHashCanvas hash={first.blurHash} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />
        )}
        {thumbSrc && (
          <img src={thumbSrc} alt="" style={{ position: "relative", zIndex: 1, width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", display: "block", filter: "blur(16px)", transform: "scale(1.05)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, zIndex: 2, backgroundColor: "rgba(10,10,15,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", minHeight: thumbSrc ? undefined : "280px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(139,92,246,0.2)", border: "1.5px solid #8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={18} color="#8B5CF6" />
          </div>
          <button onClick={onUnlock} style={{ padding: "8px 20px", borderRadius: "8px", backgroundColor: "#8B5CF6", border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            {price ? `Unlock for ₦${(price / 100).toLocaleString("en-NG")}` : "Subscribe to unlock"}
          </button>
        </div>
      </div>
    );
  }

  // ── Video ─────────────────────────────────────────────────────────────────────
  if (isVideo) {
    const [w, h]        = (aspectRatio ?? "16/9").split("/").map(Number);
    const isPortrait    = h > w;
    const containerAR   = aspectRatio ?? "16/9";
    const blurSrc       = first.thumbnailUrl ?? (first.bunnyVideoId ? getBunnyThumbnail(first.bunnyVideoId) : undefined);
    const bucketedRatio = isPortrait ? "9/16" : (w === h ? "1/1" : "16/9") as "9/16" | "16/9" | "1/1";

    return (
      <DoubleTapLike onDoubleTap={doubleTap} style={{ width: "100%", display: "block" }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: containerAR, maxHeight: isPortrait ? "min(80svh, 600px)" : "520px", overflow: "hidden", backgroundColor: "#000" }}>
          {blurSrc && (
            <>
              <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "80px", backgroundImage: `url(${blurSrc})`, backgroundSize: "cover", backgroundPosition: "left center", filter: "blur(16px) brightness(0.5)", transform: "scaleX(1.3)", opacity: 0.9, zIndex: 1 }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "80px", backgroundImage: `url(${blurSrc})`, backgroundSize: "cover", backgroundPosition: "right center", filter: "blur(16px) brightness(0.5)", transform: "scaleX(1.3)", opacity: 0.9, zIndex: 1 }} />
            </>
          )}
          <VideoPlayer
            bunnyVideoId={first.bunnyVideoId ?? null}
            thumbnailUrl={first.thumbnailUrl ?? null}
            processingStatus={first.processingStatus ?? null}
            rawVideoUrl={first.rawVideoUrl ?? null}
            fillParent={true}
            aspectRatio={bucketedRatio}
            hideInternalBlur={true}
            blurHash={first.blurHash}
          />
        </div>
      </DoubleTapLike>
    );
  }

  // ── Multi-photo carousel ──────────────────────────────────────────────────────
  if (isMultiImg) {
    const carouselMedia = media.map((m, i) => ({
      id:                i,
      media_type:        "image" as const,
      file_url:          m.url,
      thumbnail_url:     m.thumbnailUrl ?? null,
      raw_video_url:     null,
      locked:            false,
      display_order:     i,
      processing_status: null,
      bunny_video_id:    null,
      blur_hash:         m.blurHash ?? null,
    }));

    return (
      <DoubleTapLike onDoubleTap={doubleTap} style={{ width: "100%" }}>
        <ImageCarousel
          media={carouselMedia}
          onImageClick={(index) => onSingleTap?.(index)}
          initialIndex={initialSlide}
          onSlideChange={onSlideChange}
        />
      </DoubleTapLike>
    );
  }

  // ── Single image ──────────────────────────────────────────────────────────────
  const placeholderSrc = first.thumbnailUrl ?? first.url ?? undefined;

  return (
    <DoubleTapLike onSingleTap={singleTapAt0} onDoubleTap={doubleTap} style={{ width: "100%", cursor: "zoom-in" }}>
      <div style={{ position: "relative", overflow: "hidden", backgroundColor: "#000", width: "100%", aspectRatio: aspectRatio ?? "4/3", maxHeight: "80vh" }}>
        {first.url && (
          <>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "80px", backgroundImage: `url(${first.url})`, backgroundSize: "cover", backgroundPosition: "left center", filter: "blur(16px) brightness(0.7)", transform: "scaleX(1.3)", opacity: 0.9, zIndex: 1 }} />
            <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "80px", backgroundImage: `url(${first.url})`, backgroundSize: "cover", backgroundPosition: "right center", filter: "blur(16px) brightness(0.7)", transform: "scaleX(1.3)", opacity: 0.9, zIndex: 1 }} />
          </>
        )}
        <ProgressiveImage
          src={first.url ?? undefined}
          placeholder={placeholderSrc}
          blurHash={first.blurHash}
          style={{ position: "relative", zIndex: 2, width: "100%", height: "100%", maxHeight: "80vh", objectFit: "contain", display: "block" }}
        />
      </div>
    </DoubleTapLike>
  );
}