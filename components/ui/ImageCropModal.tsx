"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, Check, ZoomIn, ZoomOut } from "lucide-react";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropModalProps {
  imageSrc: string;
  type: "avatar" | "banner";
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

// Output dimensions
const OUTPUT = {
  avatar: { width: 500, height: 500 },
  banner: { width: 1500, height: 500 },
};

async function getCroppedBlob(
  imageSrc: string,
  cropArea: CropArea,
  type: "avatar" | "banner"
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = imageSrc;
  });

  const { width: outW, height: outH } = OUTPUT[type];

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // Scale crop to output size
  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    outW,
    outH
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => { if (blob) resolve(blob); else reject(new Error("Failed to create blob")); },
      "image/jpeg",
      0.92
    );
  });
}

export function ImageCropModal({ imageSrc, type, onSave, onCancel }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [saving, setSaving] = useState(false);

  const isAvatar = type === "avatar";
  const aspect = isAvatar ? 1 : 3;

  const onCropComplete = useCallback((_: unknown, croppedPixels: CropArea) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, type);
      onSave(blob);
    } catch (err) {
      console.error("Crop error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "#000000", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px", paddingTop: "calc(16px + env(safe-area-inset-top))",
        backgroundColor: "#0A0A12", borderBottom: "1px solid #1C1C2E", flexShrink: 0,
      }}>
        <button type="button" onClick={onCancel} style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "none", border: "none", cursor: "pointer",
          color: "#A3A3C2", fontSize: "15px", fontFamily: "'Inter', sans-serif", padding: "4px 0",
        }}>
          <X size={18} />
          Cancel
        </button>

        <span style={{ fontSize: "15px", fontWeight: 600, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>
          {isAvatar ? "Crop Avatar" : "Crop Banner"}
        </span>

        <button type="button" onClick={handleSave} disabled={saving} style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: saving ? "rgba(139,92,246,0.4)" : "#8B5CF6",
          border: "none", cursor: saving ? "not-allowed" : "pointer",
          color: "#FFFFFF", fontSize: "15px", fontWeight: 600,
          fontFamily: "'Inter', sans-serif", padding: "8px 16px", borderRadius: "8px",
        }}>
          <Check size={16} />
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Hint */}
      <div style={{
        textAlign: "center", padding: "10px 20px", fontSize: "12px",
        color: "#6B6B8A", backgroundColor: "#0A0A12", flexShrink: 0,
        fontFamily: "'Inter', sans-serif",
      }}>
        Pinch to zoom · Drag to reposition
      </div>

      {/* Crop area */}
      <div style={{ position: "relative", flex: 1, backgroundColor: "#000" }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          cropShape={isAvatar ? "round" : "rect"}
          showGrid={!isAvatar}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { backgroundColor: "#000" },
            cropAreaStyle: {
              border: `2px solid ${isAvatar ? "#8B5CF6" : "#FF6B6B"}`,
              boxShadow: `0 0 0 9999px rgba(0,0,0,0.7)`,
            },
          }}
        />
      </div>

      {/* Zoom controls */}
      <div style={{
        display: "flex", alignItems: "center", gap: "16px",
        padding: "16px 32px", paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
        backgroundColor: "#0A0A12", borderTop: "1px solid #1C1C2E", flexShrink: 0,
      }}>
        <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", padding: "4px" }}>
          <ZoomOut size={20} />
        </button>
        <input type="range" min={1} max={3} step={0.01} value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ flex: 1, accentColor: "#8B5CF6", cursor: "pointer" }} />
        <button type="button" onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", padding: "4px" }}>
          <ZoomIn size={20} />
        </button>
      </div>
    </div>
  );
}