"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Check, Film } from "lucide-react";

interface ThumbnailPickerProps {
  file:     File;
  onPicked: (blob: Blob, previewUrl: string) => void;
}

export function ThumbnailPicker({ file, onPicked }: ThumbnailPickerProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [blobUrl,      setBlobUrl]      = useState<string | null>(null);
  const [duration,     setDuration]     = useState(0);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [preview,      setPreview]      = useState<string | null>(null);
  const [picked,       setPicked]       = useState(false);
  const [aspectRatio,  setAspectRatio]  = useState<string>("16/9");
  const [isPortrait,   setIsPortrait]   = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
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
    return canvas.toDataURL("image/jpeg", 0.95);
  }, []);

  const handleSeeked = useCallback(() => {
    const frame = captureFrame();
    if (frame) setPreview(frame);
  }, [captureFrame]);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    setPicked(false);
    if (videoRef.current) videoRef.current.currentTime = t;
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
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setPreview(dataUrl);
    setPicked(true);
    canvas.toBlob((blob) => {
      if (blob) onPicked(blob, dataUrl);
    }, "image/jpeg", 0.95);
  }, [onPicked]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: "12px",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Hidden video + canvas */}
      <video
        ref={videoRef}
        src={blobUrl ?? undefined}
        preload="metadata"
        muted
        playsInline
        style={{ display: "none" }}
        onLoadedMetadata={() => {
  const v = videoRef.current;
  if (!v) return;
  setDuration(v.duration);
  const w = v.videoWidth;
  const h = v.videoHeight;
  setIsPortrait(h > w);
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const d   = gcd(w, h);
  setAspectRatio(`${w / d}/${h / d}`);
  // iOS requires play/pause to unblock seeking to frame 0
  v.play().then(() => {
    v.pause();
    v.currentTime = 0.1;
  }).catch(() => {
    v.currentTime = 0.1;
  });
}}
        onSeeked={handleSeeked}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Film size={14} color="#8B5CF6" />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#8A8AA0" }}>Cover frame</span>
        </div>
        {picked && (
          <span style={{
            fontSize: "12px", color: "#22C55E",
            display: "flex", alignItems: "center", gap: "4px",
          }}>
            <Check size={12} /> Applied
          </span>
        )}
      </div>

      {/* Preview */}
      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <div style={{
          width:        isPortrait ? "min(100%, 200px)" : "100%",
          aspectRatio,
          borderRadius: "12px",
          overflow:     "hidden",
          backgroundColor: "#0D0D18",
          outline:      picked ? "2px solid #8B5CF6" : "none",
          outlineOffset: "-2px",
          transition:   "outline 0.2s",
          position:     "relative",
        }}>
          {preview ? (
            <img
              src={preview}
              alt="Thumbnail preview"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "6px",
            }}>
              <Film size={22} color="#2A2A3D" />
              <span style={{ fontSize: "12px", color: "#4A4A6A" }}>Scrub to preview</span>
            </div>
          )}

          {/* Time badge */}
          {duration > 0 && (
            <div style={{
              position: "absolute", bottom: "8px", right: "8px",
              backgroundColor: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
              borderRadius: "4px",
              padding: "2px 7px",
              fontSize: "11px", color: "#fff", fontWeight: 600,
            }}>
              {formatTime(currentTime)}
            </div>
          )}
        </div>
      </div>

      {/* Scrubber */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={currentTime}
            onChange={handleScrub}
            style={{
              width: "100%", accentColor: "#8B5CF6",
              cursor: "pointer", height: "4px",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
            <span style={{ fontSize: "10px", color: "#4A4A6A" }}>0:00</span>
            <span style={{ fontSize: "10px", color: "#4A4A6A" }}>{formatTime(duration)}</span>
          </div>
        </div>

        <button
          onClick={handlePick}
          disabled={!preview}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: picked ? "rgba(34,197,94,0.1)" : "rgba(139,92,246,0.1)",
            color: picked ? "#22C55E" : "#8B5CF6",
            fontSize: "13px",
            fontWeight: 600,
            cursor: preview ? "pointer" : "default",
            fontFamily: "inherit",
            transition: "all 0.15s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            opacity: preview ? 1 : 0.4,
          }}
        >
          {picked ? <><Check size={14} /> Using this frame</> : "Set as cover"}
        </button>
      </div>
    </div>
  );
}