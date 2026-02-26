"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Upload, Check, ImageIcon } from "lucide-react";

interface ThumbnailPickerProps {
  file:     File;
  onPicked: (blob: Blob, previewUrl: string) => void;
}

const FRAME_COUNT = 4;

export function ThumbnailPicker({ file, onPicked }: ThumbnailPickerProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const galleryRef  = useRef<HTMLInputElement>(null);

  const [blobUrl,     setBlobUrl]     = useState<string | null>(null);
  const [frames,      setFrames]      = useState<string[]>([]);  // base64 data URLs
  const [selected,    setSelected]    = useState<number | "gallery" | null>(null);
  const [preview,     setPreview]     = useState<string | null>(null);
  const [loadingFrames, setLoadingFrames] = useState(true);

  // Create blob URL once — state so video src re-renders with the value
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const captureAt = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement, time: number): Promise<string> => {
    return new Promise((resolve) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        canvas.width  = video.videoWidth  || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve("");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      video.addEventListener("seeked", onSeeked);
      video.currentTime = time;
    });
  }, []);

  // Generate 4 evenly spaced frames once video metadata loads
  const generateFrames = useCallback(async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.duration) return;

    setLoadingFrames(true);
    const duration = video.duration;
    const captured: string[] = [];

    // Spread frames evenly — avoid very start/end (black frames)
    for (let i = 0; i < FRAME_COUNT; i++) {
      const t = (duration / (FRAME_COUNT + 1)) * (i + 1);
      const frame = await captureAt(video, canvas, t);
      captured.push(frame);
    }

    setFrames(captured);
    // Auto-select first frame
    setSelected(0);
    setPreview(captured[0]);

    // Fire onPicked with first frame automatically
    canvas.toBlob((blob) => {
      if (blob) onPicked(blob, captured[0]);
    }, "image/jpeg", 0.85);

    setLoadingFrames(false);
  }, [captureAt, onPicked]);

  const handleSelectFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !frames[index]) return;
    setSelected(index);
    setPreview(frames[index]);

    // Convert data URL back to blob
    fetch(frames[index])
      .then((r) => r.blob())
      .then((blob) => onPicked(blob, frames[index]));
  }, [frames, onPicked]);

  const handleGalleryPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setSelected("gallery");
    setPreview(url);
    onPicked(f, url);
    // Reset input so same file can be re-picked
    e.target.value = "";
  }, [onPicked]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

      {/* Hidden elements */}
      <video
        ref={videoRef}
        src={blobUrl ?? undefined}
        preload="metadata"
        muted
        playsInline
        style={{ display: "none" }}
        onLoadedMetadata={generateFrames}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleGalleryPick}
      />

      {/* Label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#A3A3C2", fontFamily: "'Inter', sans-serif" }}>
          Choose thumbnail
        </span>
        {selected !== null && (
          <span style={{ fontSize: "12px", color: "#22C55E", display: "flex", alignItems: "center", gap: "4px", fontFamily: "'Inter', sans-serif" }}>
            <Check size={12} /> Selected
          </span>
        )}
      </div>

      {/* 16:9 large preview */}
      <div style={{
        width:           "100%",
        aspectRatio:     "16 / 9",
        borderRadius:    "10px",
        overflow:        "hidden",
        backgroundColor: "#0A0A14",
        border:          "1.5px solid #2A2A3D",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
      }}>
        {preview ? (
          <img src={preview} alt="Thumbnail preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: "12px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>
            {loadingFrames ? "Generating frames…" : "Pick a frame below"}
          </span>
        )}
      </div>

      {/* Frame tiles row */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${FRAME_COUNT + 1}, 1fr)`, gap: "8px" }}>

        {/* Auto-generated frame tiles */}
        {loadingFrames
          ? Array.from({ length: FRAME_COUNT }).map((_, i) => (
              <div key={i} style={{
                aspectRatio:     "16 / 9",
                borderRadius:    "8px",
                backgroundColor: "#1C1C2E",
                border:          "1.5px solid #2A2A3D",
                animation:       "pulse 1.5s infinite",
              }} />
            ))
          : frames.map((frame, i) => (
              <button
                key={i}
                onClick={() => handleSelectFrame(i)}
                style={{
                  aspectRatio:     "16 / 9",
                  borderRadius:    "8px",
                  overflow:        "hidden",
                  border:          selected === i ? "2px solid #8B5CF6" : "1.5px solid #2A2A3D",
                  padding:         0,
                  cursor:          "pointer",
                  position:        "relative",
                  transition:      "border-color 0.15s",
                  flexShrink:      0,
                }}
              >
                <img src={frame} alt={`Frame ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                {selected === i && (
                  <div style={{
                    position:        "absolute",
                    bottom:          "4px",
                    right:           "4px",
                    backgroundColor: "#8B5CF6",
                    borderRadius:    "50%",
                    width:           "18px",
                    height:          "18px",
                    display:         "flex",
                    alignItems:      "center",
                    justifyContent:  "center",
                  }}>
                    <Check size={11} color="#fff" />
                  </div>
                )}
              </button>
            ))
        }

        {/* Gallery upload tile */}
        <button
          onClick={() => galleryRef.current?.click()}
          style={{
            aspectRatio:     "16 / 9",
            borderRadius:    "8px",
            border:          selected === "gallery" ? "2px solid #8B5CF6" : "1.5px dashed #2A2A3D",
            backgroundColor: selected === "gallery" ? "rgba(139,92,246,0.08)" : "#0D0D18",
            cursor:          "pointer",
            display:         "flex",
            flexDirection:   "column",
            alignItems:      "center",
            justifyContent:  "center",
            gap:             "4px",
            transition:      "all 0.15s",
            padding:         0,
          }}
          onMouseEnter={(e) => { if (selected !== "gallery") (e.currentTarget as HTMLButtonElement).style.borderColor = "#8B5CF6"; }}
          onMouseLeave={(e) => { if (selected !== "gallery") (e.currentTarget as HTMLButtonElement).style.borderColor = "#2A2A3D"; }}
        >
          {selected === "gallery" ? (
            <Check size={16} color="#8B5CF6" />
          ) : (
            <ImageIcon size={16} color="#6B6B8A" strokeWidth={1.5} />
          )}
          <span style={{ fontSize: "10px", color: selected === "gallery" ? "#8B5CF6" : "#6B6B8A", fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
            Upload
          </span>
        </button>

      </div>
    </div>
  );
}