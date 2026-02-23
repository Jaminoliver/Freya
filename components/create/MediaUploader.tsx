"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, ImageIcon, Film } from "lucide-react";

type MediaType = "photo" | "video";

interface MediaUploaderProps {
  type: MediaType;
  files: File[];
  onChange: (files: File[]) => void;
}

const CONFIG: Record<MediaType, {
  accept: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
}> = {
  photo: {
    accept: "image/jpeg,image/png,image/webp,image/gif",
    label: "Drag & drop your photos here",
    hint: "Supported: JPG, PNG, WEBP, GIF · Max 3GB",
    icon: <ImageIcon size={28} strokeWidth={1.5} />,
  },
  video: {
    accept: "video/mp4,video/quicktime,video/webm",
    label: "Drag & drop your video here",
    hint: "Supported: MP4, MOV, WEBM · Max 3GB",
    icon: <Film size={28} strokeWidth={1.5} />,
  },
};

export function MediaUploader({ type, files, onChange }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const config = CONFIG[type];

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files, ...Array.from(incoming)];
    onChange(next);
  }, [files, onChange]);

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const previews = files.map((f) => ({
    name: f.name,
    url: URL.createObjectURL(f),
    isImage: f.type.startsWith("image/"),
    isVideo: f.type.startsWith("video/"),
    size: (f.size / (1024 * 1024)).toFixed(1) + " MB",
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          backgroundColor: isDragging ? "rgba(139,92,246,0.08)" : "#0D0D18",
          border: `1.5px dashed ${isDragging ? "#8B5CF6" : "#2A2A3D"}`,
          borderRadius: "14px",
          padding: "36px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        <div style={{
          color: isDragging ? "#8B5CF6" : "#6B6B8A",
          transition: "color 0.2s",
        }}>
          {files.length === 0 ? config.icon : <Upload size={28} strokeWidth={1.5} />}
        </div>

        <span style={{ fontSize: "14px", color: isDragging ? "#8B5CF6" : "#A3A3C2", fontWeight: 500, transition: "color 0.2s" }}>
          {files.length === 0 ? config.label : "Add more files"}
        </span>

        <span style={{ fontSize: "12px", color: "#4A4A6A" }}>{config.hint}</span>

        <button
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          style={{
            marginTop: "4px",
            padding: "8px 22px",
            borderRadius: "20px",
            border: "1.5px solid #8B5CF6",
            backgroundColor: "transparent",
            color: "#8B5CF6",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(139,92,246,0.12)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
          }}
        >
          Browse files
        </button>

        <input
          ref={inputRef}
          type="file"
          multiple={type === "photo"}
          accept={config.accept}
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* File previews */}
      {previews.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {previews.map((p, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                backgroundColor: "#0D0D18",
                border: "1px solid #2A2A3D",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              {/* Thumbnail */}
              <div style={{
                width: "44px", height: "44px",
                borderRadius: "8px",
                overflow: "hidden",
                backgroundColor: "#1C1C2E",
                flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {p.isImage ? (
                  <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : p.isVideo ? (
                  <video src={p.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                ) : null}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: "13px", fontWeight: 500, color: "#E2E8F0",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {p.name}
                </div>
                <div style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "2px" }}>{p.size}</div>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeFile(i)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#6B6B8A", display: "flex", padding: "4px",
                  borderRadius: "6px", transition: "color 0.15s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#F87171"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6B6B8A"; }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}