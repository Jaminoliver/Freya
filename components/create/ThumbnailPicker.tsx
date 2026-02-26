"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Check } from "lucide-react";

interface ThumbnailPickerProps {
  file:     File;
  onPicked: (blob: Blob, previewUrl: string) => void;
}

export function ThumbnailPicker({ file, onPicked }: ThumbnailPickerProps) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const blobUrl    = useRef<string | null>(null);

  const [duration,    setDuration]    = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [preview,     setPreview]     = useState<string | null>(null);
  const [picked,      setPicked]      = useState(false);

  useEffect(() => {
    blobUrl.current = URL.createObjectURL(file);
    return () => {
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    };
  }, [file]);

  const captureFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  }, []);

  const handleSeeked = useCallback(() => {
    const frame = captureFrame();
    if (frame) setPreview(frame);
  }, [captureFrame]);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    setPicked(false);
    if (videoRef.current) {
      videoRef.current.currentTime = t;
    }
  }, []);

  const handlePick = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPreview(dataUrl);
    setPicked(true);

    canvas.toBlob((blob) => {
      if (blob) onPicked(blob, dataUrl);
    }, "image/jpeg", 0.9);
  }, [onPicked]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
      <video
        ref={videoRef}
        src={blobUrl.current ?? undefined}
        preload="metadata"
        muted
        playsInline
        style={{ display: "none" }}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (!v) return;
          setDuration(v.duration);
          v.currentTime = 0;
        }}
        onSeeked={handleSeeked}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#A3A3C2", fontFamily: "'Inter', sans-serif" }}>
          Choose thumbnail frame
        </span>
        {picked && (
          <span style={{ fontSize: "12px", color: "#22C55E", display: "flex", alignItems: "center", gap: "4px", fontFamily: "'Inter', sans-serif" }}>
            <Check size={13} /> Saved
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "8px", overflow: "hidden",
          backgroundColor: "#1C1C2E", flexShrink: 0, border: picked ? "2px solid #8B5CF6" : "1.5px solid #2A2A3D",
          transition: "border-color 0.2s",
        }}>
          {preview ? (
            <img src={preview} alt="Thumbnail preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "11px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>Scrub →</span>
            </div>
          )}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", paddingTop: "4px" }}>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={currentTime}
            onChange={handleScrub}
            style={{ width: "100%", accentColor: "#8B5CF6", cursor: "pointer" }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>
              {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
            </span>
            <button
              onClick={handlePick}
              style={{
                padding: "6px 16px", borderRadius: "16px",
                border: "1.5px solid #8B5CF6",
                backgroundColor: picked ? "rgba(139,92,246,0.15)" : "transparent",
                color: "#8B5CF6", fontSize: "12px", fontWeight: 600,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s",
              }}
            >
              {picked ? "✓ Using this frame" : "Use this frame"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}