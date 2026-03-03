"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import VideoPlayer, { getBunnyThumbnail } from "@/components/video/VideoPlayer";
import ImageCarousel from "@/components/profile/ImageCarousel";
import DoubleTapLike from "@/components/shared/DoubleTapLike";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NormalizedMedia {
  type:              "image" | "video";
  url:               string | null;
  bunnyVideoId?:     string | null;
  thumbnailUrl?:     string | null;
  processingStatus?: string | null;
  rawVideoUrl?:      string | null;
}

interface PostMediaViewerProps {
  media:        NormalizedMedia[];
  isLocked:     boolean;
  price?:       number | null;
  onDoubleTap?: () => void;
  onSingleTap?: (index: number) => void;
  onUnlock?:    () => void;
}

// ── Hook: detects aspect ratio from thumbnail before VideoPlayer mounts ───────

function useThumbAspectRatio(src: string | undefined): "9/16" | "16/9" | "1/1" | null {
  const [ratio, setRatio] = React.useState<"9/16" | "16/9" | "1/1" | null>(null);

  React.useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      if (!w || !h) return;
      if (h > w)      setRatio("9/16");
      else if (w > h) setRatio("16/9");
      else            setRatio("1/1");
    };
    img.src = src;
  }, [src]);

  return ratio;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PostMediaViewer({
  media,
  isLocked,
  price,
  onDoubleTap,
  onSingleTap,
  onUnlock,
}: PostMediaViewerProps) {
  const first      = media[0] ?? null;
  const isVideo    = first?.type === "video";
  const isMultiImg = !isVideo && media.length > 1;

  const thumbSrc = isVideo && first?.bunnyVideoId
    ? getBunnyThumbnail(first.bunnyVideoId)
    : first?.thumbnailUrl ?? first?.url ?? undefined;

  const aspectRatio = useThumbAspectRatio(thumbSrc);

  const noop         = () => {};
  const doubleTap    = onDoubleTap ?? noop;
  const singleTapAt0 = () => onSingleTap?.(0);

  if (!media.length || !first) return null;

  // ── Locked ─────────────────────────────────────────────────────────────────

  if (isLocked) {
    return (
      <div style={{ position: "relative", overflow: "hidden", width: "100%", backgroundColor: "#000" }}>
        {thumbSrc && (
          <img
            src={thumbSrc}
            alt=""
            style={{
              width: "100%", height: "auto", maxHeight: "80vh",
              objectFit: "contain", display: "block",
              filter: "blur(16px)", transform: "scale(1.05)",
            }}
          />
        )}
        <div
          style={{
            position: "absolute", inset: 0,
            backgroundColor: "rgba(10,10,15,0.5)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "10px", minHeight: thumbSrc ? undefined : "280px",
          }}
        >
          <div
            style={{
              width: "44px", height: "44px", borderRadius: "50%",
              backgroundColor: "rgba(139,92,246,0.2)",
              border: "1.5px solid #8B5CF6",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Lock size={18} color="#8B5CF6" />
          </div>
          <button
            onClick={onUnlock}
            style={{
              padding: "8px 20px", borderRadius: "8px",
              backgroundColor: "#8B5CF6", border: "none",
              color: "#fff", fontSize: "13px", fontWeight: 700,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
            }}
          >
            {price ? `Unlock for ₦${(price / 100).toLocaleString("en-NG")}` : "Subscribe to unlock"}
          </button>
        </div>
      </div>
    );
  }

  // ── Video ───────────────────────────────────────────────────────────────────

  if (isVideo) {
    const isPortrait  = aspectRatio === "9/16";
    const containerAR = aspectRatio ?? "16/9";

    return (
      <DoubleTapLike onDoubleTap={doubleTap} style={{ width: "100%", display: "block" }}>
        <div
          style={{
            position:        "relative",
            width:           "100%",
            aspectRatio:     containerAR,
            maxHeight:       isPortrait ? "min(80svh, 600px)" : "520px",
            overflow:        "hidden",
            backgroundColor: "#000",
          }}
        >
          <VideoPlayer
            bunnyVideoId={first.bunnyVideoId ?? null}
            thumbnailUrl={first.thumbnailUrl ?? null}
            processingStatus={first.processingStatus ?? null}
            rawVideoUrl={first.rawVideoUrl ?? null}
            fillParent={true}
          />
        </div>
      </DoubleTapLike>
    );
  }

  // ── Multi-photo carousel ────────────────────────────────────────────────────

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
    }));

    return (
      <DoubleTapLike onDoubleTap={doubleTap} style={{ width: "100%" }}>
        <ImageCarousel
          media={carouselMedia}
          onImageClick={(index) => onSingleTap?.(index)}
        />
      </DoubleTapLike>
    );
  }

  // ── Single image ────────────────────────────────────────────────────────────

  return (
    <DoubleTapLike
      onSingleTap={singleTapAt0}
      onDoubleTap={doubleTap}
      style={{ width: "100%", cursor: "zoom-in" }}
    >
      <div style={{ position: "relative", overflow: "hidden", backgroundColor: "#000", width: "100%" }}>
        {first.url && (
          <>
            <div
              style={{
                position: "absolute", top: 0, bottom: 0, left: 0, width: "80px",
                backgroundImage: `url(${first.url})`,
                backgroundSize: "cover", backgroundPosition: "left center",
                filter: "blur(16px) brightness(0.7)",
                transform: "scaleX(1.3)", opacity: 0.9,
              }}
            />
            <div
              style={{
                position: "absolute", top: 0, bottom: 0, right: 0, width: "80px",
                backgroundImage: `url(${first.url})`,
                backgroundSize: "cover", backgroundPosition: "right center",
                filter: "blur(16px) brightness(0.7)",
                transform: "scaleX(1.3)", opacity: 0.9,
              }}
            />
          </>
        )}
        <img
          src={first.url ?? undefined}
          alt=""
          style={{
            position: "relative", zIndex: 1,
            width: "100%", height: "auto",
            maxHeight: "80vh", objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    </DoubleTapLike>
  );
}