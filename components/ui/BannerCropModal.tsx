"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { X, Check } from "lucide-react";

interface BannerCropModalProps {
  imageSrc:      string;
  displayName?:  string | null;
  avatarUrl?:    string | null;
  onSave:        (blob: Blob) => void;
  onCancel:      () => void;
}

const ASPECT          = 3;           // 3:1 — locked, Twitter-style
const OUTPUT_WIDTH    = 1500;
const MIN_IMAGE_WIDTH = 1000;
const GRADIENT        = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src     = imageSrc;
  });

  // No upscaling: clamp to crop pixel width if smaller than target
  const outW = Math.min(OUTPUT_WIDTH, Math.round(pixelCrop.width));
  const outH = Math.round(outW / ASPECT);

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

export function BannerCropModal({
  imageSrc,
  displayName,
  avatarUrl,
  onSave,
  onCancel,
}: BannerCropModalProps) {
  const [crop,             setCrop]             = useState<Point>({ x: 0, y: 0 });
  const [zoom,             setZoom]             = useState(1);
  const [croppedAreaPx,    setCroppedAreaPx]    = useState<Area | null>(null);
  const [croppedAreaPct,   setCroppedAreaPct]   = useState<Area | null>(null);
  const [saving,           setSaving]           = useState(false);
  const [mounted,          setMounted]          = useState(false);
  const [isMobile,         setIsMobile]         = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [avatarError,      setAvatarError]      = useState(false);

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
        setError(`Image must be at least ${MIN_IMAGE_WIDTH}px wide for a sharp banner.`);
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

  const onCropComplete = useCallback((pct: Area, pixels: Area) => {
    setCroppedAreaPct(pct);
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

  const firstLetter = (displayName || "?").charAt(0).toUpperCase();

  // ── Live preview image transform — uses <img> for reliability across data URLs ──
  // When croppedAreaPct is null (initial load), show full image with object-fit cover.
  // When user has cropped, scale + translate the image to show only the cropped region.
  const previewImgStyle: React.CSSProperties = croppedAreaPct
    ? {
        position: "absolute",
        width:    `${100 / (croppedAreaPct.width / 100)}%`,
        height:   `${100 / (croppedAreaPct.height / 100)}%`,
        left:     `${-(croppedAreaPct.x / croppedAreaPct.width) * 100}%`,
        top:      `${-(croppedAreaPct.y / croppedAreaPct.height) * 100}%`,
        maxWidth: "none",
        pointerEvents: "none",
      }
    : {
        position:  "absolute",
        inset:     0,
        width:     "100%",
        height:    "100%",
        objectFit: "cover" as const,
        pointerEvents: "none",
      };

  const overlayStyle: React.CSSProperties = isMobile
    ? { position: "fixed", inset: 0, zIndex: 99999, backgroundColor: "#000", display: "flex", flexDirection: "column" }
    : { position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" };

  const cardStyle: React.CSSProperties = isMobile
    ? { flex: 1, display: "flex", flexDirection: "column", width: "100%", height: "100%" }
    : {
        display:        "flex",
        flexDirection:  "column",
        width:          "min(520px, 95vw)",
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
            Crop Banner
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
          minHeight: isMobile ? 0 : "240px",
          backgroundColor: "#000",
        }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={ASPECT}
            cropShape="rect"
            showGrid
            zoomWithScroll
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { backgroundColor: "#000" },
              cropAreaStyle: {
                border:    "2px solid rgba(139,92,246,0.85)",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
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
          gap: "14px",
        }}>
          {/* Zoom slider */}
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

          {/* ── Live profile preview ── */}
          <div>
            <span style={{
              display: "block",
              fontSize:    "10px", color: "#4B4B6B",
              fontFamily:  "'Inter', sans-serif", fontWeight: 500,
              textTransform: "uppercase", letterSpacing: "0.08em",
              marginBottom: "6px",
            }}>
              Profile preview
            </span>

            {/* Outer wrapper — extra space at bottom so avatar can overlap */}
            <div style={{ position: "relative", width: "100%", paddingBottom: "16px" }}>

              {/* Inner banner box — clips the image */}
              <div style={{
                position:     "relative",
                width:        "100%",
                aspectRatio:  "3 / 1",
                borderRadius: "10px",
                overflow:     "hidden",
                backgroundColor: "#1F1F2A",
                border:       "1px solid rgba(255,255,255,0.06)",
              }}>
                {/* Image — robust <img> render with fallback to full cover */}
                <img
                  src={imageSrc}
                  alt=""
                  style={previewImgStyle}
                />

                {/* Gradient overlay */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 40%, transparent 50%, rgba(0,0,0,0.55) 100%)",
                  pointerEvents: "none",
                }} />

                {/* Display name top-left */}
                {displayName && (
                  <span style={{
                    position: "absolute",
                    top:      "6px",
                    left:     "8px",
                    fontSize: "10px",
                    fontWeight: 700,
                    color:    "#FFFFFF",
                    fontFamily:"'Inter', sans-serif",
                    textShadow:"0 1px 3px rgba(0,0,0,0.7)",
                    maxWidth:  "60%",
                    overflow:  "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace:   "nowrap",
                    zIndex: 2,
                  }}>
                    {displayName}
                  </span>
                )}
              </div>

              {/* Avatar — overlaps banner bottom-left */}
              <div style={{
                position:     "absolute",
                left:         "10px",
                bottom:       "0",
                width:        "32px",
                height:       "32px",
                borderRadius: "50%",
                background:   GRADIENT,           // base fallback always shown
                border:       "2px solid #0A0A12",
                display:      "flex",
                alignItems:   "center",
                justifyContent:"center",
                fontSize:     "13px",
                fontWeight:   700,
                color:        "#fff",
                fontFamily:   "'Inter', sans-serif",
                boxShadow:    "0 2px 8px rgba(0,0,0,0.4)",
                overflow:     "hidden",
              }}>
                {avatarUrl && !avatarError ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    onError={() => setAvatarError(true)}
                    style={{
                      width:     "100%",
                      height:    "100%",
                      objectFit: "cover",
                      display:   "block",
                    }}
                  />
                ) : (
                  firstLetter
                )}
              </div>
            </div>
          </div>
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