"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
  convertToPixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, Check } from "lucide-react";

interface ImageCropModalProps {
  imageSrc: string;
  type: "avatar" | "banner";
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

const BANNER_RATIOS: { label: string; value: number }[] = [
  { label: "16:9", value: 16 / 9 },
  { label: "3:2",  value: 3 / 2  },
  { label: "4:3",  value: 4 / 3  },
  { label: "1:1",  value: 1      },
];

/**
 * CORRECT: makeAspectCrop + centerCrop require naturalWidth/naturalHeight
 * per official react-image-crop docs. Returns a % crop.
 */
function makeCentered(
  naturalWidth: number,
  naturalHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, naturalWidth, naturalHeight),
    naturalWidth,
    naturalHeight
  );
}

/**
 * Canvas draw using official pattern:
 *   scaleX = naturalWidth / renderedWidth
 *   scaleY = naturalHeight / renderedHeight
 * completedCrop (PixelCrop) is in rendered-pixel space, so we scale up to natural space.
 */
async function getCroppedBlob(
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
  type: "avatar" | "banner"
): Promise<Blob> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  let outW: number;
  let outH: number;

  if (type === "avatar") {
    outW = 500;
    outH = 500;
  } else {
    // Preserve the exact crop ratio at high resolution
    const cropRatio = pixelCrop.width / pixelCrop.height;
    outW = 1500;
    outH = Math.round(1500 / cropRatio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    outW,
    outH
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      "image/jpeg",
      0.92
    );
  });
}

export function ImageCropModal({
  imageSrc,
  type,
  onSave,
  onCancel,
}: ImageCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  // Store % crop — resize-safe per official docs
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [aspect, setAspect] = useState<number>(type === "avatar" ? 1 : 16 / 9);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isAvatar = type === "avatar";

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      // CORRECT: use naturalWidth/naturalHeight for makeAspectCrop
      const { naturalWidth, naturalHeight } = img;
      const initialAspect = isAvatar ? 1 : aspect;
      const percentCrop = makeCentered(naturalWidth, naturalHeight, initialAspect);
      setCrop(percentCrop);

      // Initialize completedCrop immediately so Save works without user interaction
      // convertToPixelCrop maps % → rendered pixels correctly
      const pixel = convertToPixelCrop(percentCrop, img.width, img.height);
      setCompletedCrop(pixel);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAvatar]
  );

  const handleSave = async () => {
    if (!completedCrop || !imgRef.current) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop, type);
      onSave(blob);
    } catch (err) {
      console.error("Crop error:", err);
    } finally {
      setSaving(false);
    }
  };

  const switchAspect = (newAspect: number) => {
    setAspect(newAspect);
    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      const percentCrop = makeCentered(naturalWidth, naturalHeight, newAspect);
      setCrop(percentCrop);

      // Keep completedCrop in sync after aspect switch
      const pixel = convertToPixelCrop(percentCrop, imgRef.current.width, imgRef.current.height);
      setCompletedCrop(pixel);
    }
  };

  if (!mounted) return null;

  // maxHeight accounts for header (60px) + bottom bar (120px) + padding (48px) + safe areas
  const maxImageHeight = `calc(100svh - 228px - env(safe-area-inset-top) - env(safe-area-inset-bottom))`;

  const modal = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          paddingTop: "calc(16px + env(safe-area-inset-top))",
          backgroundColor: "#0A0A12",
          borderBottom: "1px solid #1C1C2E",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "none", border: "none", cursor: "pointer",
            color: "#A3A3C2", fontSize: "15px",
            fontFamily: "'Inter', sans-serif", padding: "4px 0",
          }}
        >
          <X size={18} />
          Cancel
        </button>

        <span
          style={{
            fontSize: "15px", fontWeight: 600, color: "#F1F5F9",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {isAvatar ? "Crop Avatar" : "Crop Banner"}
        </span>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: saving ? "rgba(139,92,246,0.4)" : "#8B5CF6",
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            color: "#FFFFFF", fontSize: "15px", fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            padding: "8px 16px", borderRadius: "8px",
          }}
        >
          <Check size={16} />
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Image + Crop */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000",
          overflow: "hidden",
          padding: "24px",
        }}
      >
        <ReactCrop
          crop={crop}
          // CORRECT: store percentCrop (second arg) — stays accurate on resize
          onChange={(_px: PixelCrop, pct: Crop) => setCrop(pct)}
          onComplete={(c: PixelCrop) => setCompletedCrop(c)}
          aspect={aspect}
          circularCrop={isAvatar}
          keepSelection
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            onLoad={onImageLoad}
            style={{
              maxWidth: "calc(100vw - 48px)",
              maxHeight: maxImageHeight,
              width: "auto",
              height: "auto",
              display: "block",
              objectFit: "contain",
            }}
          />
        </ReactCrop>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-evenly",
          padding: "16px 16px",
          paddingBottom: "calc(64px + env(safe-area-inset-bottom))",
          backgroundColor: "#0A0A12",
          borderTop: "1px solid #1C1C2E",
          flexShrink: 0,
        }}
      >
        {isAvatar ? (
          <span
            style={{
              fontSize: "13px", color: "#6B6B8A",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Drag to reposition · Pinch to resize
          </span>
        ) : (
          BANNER_RATIOS.map(({ label, value }) => (
            <button
              key={label}
              type="button"
              onClick={() => switchAspect(value)}
              style={{
                padding: "12px 0",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: 600,
                border: "1.5px solid",
                borderColor: aspect === value ? "#8B5CF6" : "#2A2A3D",
                backgroundColor:
                  aspect === value ? "rgba(139,92,246,0.15)" : "transparent",
                color: aspect === value ? "#8B5CF6" : "#6B6B8A",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s",
                minWidth: "80px",
                flex: 1,
                maxWidth: "110px",
              }}
            >
              {label}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}