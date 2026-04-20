"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { X, Check } from "lucide-react";

interface AvatarCropModalProps {
  imageSrc: string;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

const OUTPUT_SIZE     = 500;
const MIN_IMAGE_WIDTH = 400;

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src     = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width  = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, OUTPUT_SIZE, OUTPUT_SIZE
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Blob creation failed"))),
      "image/jpeg",
      0.92
    );
  });
}

export function AvatarCropModal({ imageSrc, onSave, onCancel }: AvatarCropModalProps) {
  const [crop,           setCrop]           = useState<Point>({ x: 0, y: 0 });
  const [zoom,           setZoom]           = useState(1);
  const [croppedAreaPx,  setCroppedAreaPx]  = useState<Area | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [mounted,        setMounted]        = useState(false);
  const [isMobile,       setIsMobile]       = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Min image width check
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth < MIN_IMAGE_WIDTH) {
        setError(`Image must be at least ${MIN_IMAGE_WIDTH}px wide for a sharp avatar.`);
      }
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // Lock body scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, []);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPx(pixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPx || error) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPx);
      onSave(blob);
    } catch (err) {
      console.error("Crop error:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  const overlayStyle: React.CSSProperties = isMobile
    ? { position: "fixed", inset: 0, zIndex: 99999, backgroundColor: "#000", display: "flex", flexDirection: "column" }
    : { position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" };

  const cardStyle: React.CSSProperties = isMobile
    ? { flex: 1, display: "flex", flexDirection: "column", width: "100%", height: "100%" }
    : {
        display:        "flex",
        flexDirection:  "column",
        width:          "min(480px, 95vw)",
        maxHeight:      "92vh",
        borderRadius:   "20px",
        overflow:       "hidden",
        backgroundColor:"#0A0A12",
        border:         "1px solid rgba(255,255,255,0.07)",
        boxShadow:      "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.08)",
      };

  const modal = (
    <div style={overlayStyle} onClick={isMobile ? undefined : onCancel}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ───────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px",
          paddingTop:    isMobile ? "calc(14px + env(safe-area-inset-top))" : "14px",
          paddingBottom: "14px",
          backgroundColor: "#0A0A12",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          gap: "12px",
        }}>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              background: "rgba(255,255,255,0.05)",
              border:     "1px solid rgba(255,255,255,0.08)",
              cursor:     "pointer",
              color:      "#A3A3C2",
              fontSize:   "14px",
              fontFamily: "'Inter', sans-serif",
              padding:    isMobile ? "0" : "8px 14px",
              width:      isMobile ? "40px" : "auto",
              height:     "40px",
              borderRadius: "10px",
              transition:   "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
          >
            <X size={16} strokeWidth={2} />
            {!isMobile && "Cancel"}
          </button>

          <span style={{
            fontSize:   "15px", fontWeight: 600, color: "#F1F5F9",
            fontFamily: "'Inter', sans-serif", letterSpacing: "-0.01em",
          }}>
            Crop Photo
          </span>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !!error}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              background:  (saving || error) ? "rgba(139,92,246,0.4)" : "linear-gradient(135deg, #8B5CF6, #7C3AED)",
              border:      "none",
              cursor:      (saving || error) ? "not-allowed" : "pointer",
              color:       "#FFFFFF",
              fontSize:    "14px",
              fontWeight:  600,
              fontFamily:  "'Inter', sans-serif",
              padding:     "8px 16px",
              minHeight:   "40px",
              borderRadius:"10px",
              boxShadow:   (saving || error) ? "none" : "0 2px 12px rgba(139,92,246,0.4)",
              transition:  "all 0.15s",
            }}
          >
            <Check size={15} strokeWidth={2.5} />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* ── Crop canvas ──────────────────────────────────── */}
        <div style={{
          position: "relative",
          flex: 1,
          minHeight: isMobile ? 0 : "320px",
          backgroundColor: "#000",
        }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            zoomWithScroll
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { backgroundColor: "#000" },
              cropAreaStyle: {
                border:    "2px solid rgba(139,92,246,0.85)",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
              },
            }}
          />

          {error && (
            <div style={{
              position: "absolute",
              left:     "50%",
              bottom:   "16px",
              transform:"translateX(-50%)",
              padding:  "10px 14px",
              borderRadius:    "10px",
              backgroundColor: "rgba(220, 38, 38, 0.95)",
              color:           "#FFFFFF",
              fontSize:        "12px",
              fontWeight:      500,
              fontFamily:      "'Inter', sans-serif",
              maxWidth:        "calc(100% - 32px)",
              textAlign:       "center",
              boxShadow:       "0 8px 24px rgba(0,0,0,0.5)",
            }}>
              {error}
            </div>
          )}
        </div>

        {/* ── Bottom controls ─────────────────────────────── */}
        <div style={{
          backgroundColor: "#0A0A12",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "14px 16px",
          paddingBottom: isMobile ? "calc(14px + env(safe-area-inset-bottom))" : "14px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              fontSize:    "11px", color: "#4B4B6B",
              fontFamily:  "'Inter', sans-serif", fontWeight: 500,
              textTransform: "uppercase", letterSpacing: "0.08em",
              flexShrink: 0, width: "36px",
            }}>
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

          <p style={{
            margin: 0,
            fontSize: "11px",
            color: "#4B4B6B",
            fontFamily: "'Inter', sans-serif",
            textAlign: "center",
          }}>
            Drag or pinch to reposition · Scroll to zoom
          </p>
        </div>
      </div>

      <style>{`
        input[type=range]::-webkit-slider-thumb { width: 18px; height: 18px; }
        input[type=range]::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #8B5CF6; border: none; }
      `}</style>
    </div>
  );

  return createPortal(modal, document.body);
}