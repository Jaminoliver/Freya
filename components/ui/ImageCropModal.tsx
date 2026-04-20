"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { X, Check } from "lucide-react";

interface ImageCropModalProps {
  imageSrc: string;
  type: "avatar" | "banner";
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

const BANNER_RATIOS = [
  { label: "16:9", value: 16 / 9 },
  { label: "3:2",  value: 3 / 2  },
  { label: "4:3",  value: 4 / 3  },
  { label: "1:1",  value: 1      },
];

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  type: "avatar" | "banner"
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  let outW: number, outH: number;
  if (type === "avatar") {
    outW = outH = 500;
  } else {
    const ratio = pixelCrop.width / pixelCrop.height;
    outW = 1500;
    outH = Math.round(1500 / ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width  = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, outW, outH
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Blob creation failed"))),
      "image/jpeg",
      0.92
    );
  });
}

export function ImageCropModal({ imageSrc, type, onSave, onCancel }: ImageCropModalProps) {
  const isAvatar = type === "avatar";

  const [crop,             setCrop]             = useState<Point>({ x: 0, y: 0 });
  const [zoom,             setZoom]             = useState(1);
  const [aspect,           setAspect]           = useState(isAvatar ? 1 : 16 / 9);
  const [croppedAreaPx,    setCroppedAreaPx]    = useState<Area | null>(null);
  const [croppedAreaPct,   setCroppedAreaPct]   = useState<Area | null>(null);
  const [saving,           setSaving]           = useState(false);
  const [mounted,          setMounted]          = useState(false);
  const [isMobile,         setIsMobile]         = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPx(pixels);
  }, []);

  // For live preview we need percentage crop
  const onCropChange = useCallback((c: Point) => setCrop(c), []);

  // react-easy-crop also gives percentage area on every change via onCropComplete
  // We track it separately for the preview
  const onCropCompleteWithPct = useCallback((pct: Area, pixels: Area) => {
    setCroppedAreaPct(pct);
    setCroppedAreaPx(pixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPx) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPx, type);
      onSave(blob);
    } catch (err) {
      console.error("Crop error:", err);
    } finally {
      setSaving(false);
    }
  };

  const switchAspect = (newAspect: number) => {
    setAspect(newAspect);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  if (!mounted) return null;

  // ── Live banner preview ───────────────────────────────────────────────────
  // croppedAreaPct values are 0-100 (percentage of natural image dimensions)
  const previewBgStyle: React.CSSProperties = croppedAreaPct
    ? {
        backgroundImage:    `url(${imageSrc})`,
        backgroundRepeat:   "no-repeat",
        backgroundSize:     `${100 * 100 / croppedAreaPct.width}% ${100 * 100 / croppedAreaPct.height}%`,
        backgroundPosition: `${-croppedAreaPct.x * (100 / croppedAreaPct.width)}% ${-croppedAreaPct.y * (100 / croppedAreaPct.height)}%`,
      }
    : { backgroundColor: "#1F1F2A" };

  // ── Layout: fullscreen on mobile, centered card on desktop ───────────────
  const overlayStyle: React.CSSProperties = isMobile
    ? { position: "fixed", inset: 0, zIndex: 99999, backgroundColor: "#000", display: "flex", flexDirection: "column" }
    : { position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" };

  const cardStyle: React.CSSProperties = isMobile
    ? { flex: 1, display: "flex", flexDirection: "column", width: "100%", height: "100%" }
    : {
        display: "flex", flexDirection: "column",
        width: "min(500px, 95vw)",
        maxHeight: "92vh",
        borderRadius: "20px",
        overflow: "hidden",
        backgroundColor: "#0A0A12",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.08)",
      };

  const modal = (
    <div style={overlayStyle} onClick={isMobile ? undefined : onCancel}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px",
          paddingTop: isMobile ? "calc(14px + env(safe-area-inset-top))" : "14px",
          paddingBottom: "14px",
          backgroundColor: "#0A0A12",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          gap: "12px",
        }}>
          {/* Cancel */}
          <button
            type="button"
            onClick={onCancel}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "6px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
              color: "#A3A3C2",
              fontSize: "14px",
              fontFamily: "'Inter', sans-serif",
              padding: "8px 14px",
              borderRadius: "10px",
              minHeight: "40px",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
          >
            <X size={15} strokeWidth={2} />
            {!isMobile && "Cancel"}
          </button>

          {/* Title */}
          <span style={{
            fontSize: "15px", fontWeight: 600, color: "#F1F5F9",
            fontFamily: "'Inter', sans-serif", letterSpacing: "-0.01em",
          }}>
            {isAvatar ? "Crop Avatar" : "Crop Banner"}
          </span>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "6px",
              background: saving ? "rgba(139,92,246,0.4)" : "linear-gradient(135deg, #8B5CF6, #7C3AED)",
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              color: "#FFFFFF",
              fontSize: "14px", fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              padding: "8px 16px",
              borderRadius: "10px",
              minHeight: "40px",
              boxShadow: saving ? "none" : "0 2px 12px rgba(139,92,246,0.4)",
              transition: "all 0.15s",
            }}
          >
            <Check size={15} strokeWidth={2.5} />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* ── Crop canvas ────────────────────────────────────────────────── */}
        <div style={{
          position: "relative",
          flex: 1,
          minHeight: isMobile ? 0 : "280px",
          backgroundColor: "#000",
        }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={onCropChange}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteWithPct}
            cropShape={isAvatar ? "round" : "rect"}
            showGrid
            zoomWithScroll
            style={{
              containerStyle: { backgroundColor: "#000" },
              cropAreaStyle: {
                border: "2px solid rgba(139,92,246,0.85)",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              },
            }}
          />
        </div>



        {/* ── Bottom controls ─────────────────────────────────────────────── */}
        <div style={{
          backgroundColor: "#0A0A12",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "14px 16px",
          paddingBottom: isMobile ? "calc(14px + env(safe-area-inset-bottom))" : "14px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>

          {/* Zoom slider */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "11px", color: "#4B4B6B", fontFamily: "'Inter', sans-serif", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0, width: "36px" }}>
              Zoom
            </span>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", color: "#4B4B6B" }}>−</span>
              <input
                type="range"
                min={1} max={3} step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: "#8B5CF6",
                  cursor: "pointer",
                  height: "4px",
                }}
              />
              <span style={{ fontSize: "13px", color: "#4B4B6B" }}>+</span>
            </div>
          </div>

          {/* Aspect ratio pills — banner only */}
          {!isAvatar && (
            <div style={{ display: "flex", gap: "8px" }}>
              {BANNER_RATIOS.map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => switchAspect(value)}
                  style={{
                    flex: 1,
                    minHeight: "44px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: 600,
                    border: "1.5px solid",
                    borderColor: aspect === value ? "#8B5CF6" : "rgba(255,255,255,0.08)",
                    backgroundColor: aspect === value ? "rgba(139,92,246,0.15)" : "transparent",
                    color: aspect === value ? "#8B5CF6" : "#6B6B8A",
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (aspect !== value) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    if (aspect !== value) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Avatar hint */}
          {isAvatar && (
            <p style={{ margin: 0, fontSize: "12px", color: "#4B4B6B", fontFamily: "'Inter', sans-serif", textAlign: "center" }}>
              Drag or pinch to reposition · Scroll to zoom
            </p>
          )}
        </div>
      </div>

      {/* Inject slider thumb styles */}
      <style>{`
        input[type=range]::-webkit-slider-thumb { width: 18px; height: 18px; }
        input[type=range]::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #8B5CF6; border: none; }
      `}</style>
    </div>
  );

  return createPortal(modal, document.body);
}