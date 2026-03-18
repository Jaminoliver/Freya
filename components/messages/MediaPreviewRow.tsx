"use client";

import { useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";

interface Props {
  files:    File[];
  onRemove: (index: number) => void;
  onAdd?:   (files: File[]) => void;
}

export function MediaPreviewRow({ files, onRemove, onAdd }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const added = Array.from(e.target.files ?? []);
    if (added.length > 0) onAdd?.(added);
    e.target.value = "";
  };

  return (
    <div
      style={{
        display:         "flex",
        alignItems:      "center",
        gap:             "8px",
        padding:         "10px 16px",
        borderTop:       "1px solid #1E1E2E",
        backgroundColor: "#0D0D1A",
        overflowX:       "auto",
        scrollbarWidth:  "none",
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {files.map((file, index) => (
        <FileThumb key={index} file={file} onRemove={() => onRemove(index)} />
      ))}

      <button
        onClick={() => fileRef.current?.click()}
        style={{
          width:           "72px",
          height:          "72px",
          borderRadius:    "8px",
          border:          "1.5px dashed #4A4A6A",
          backgroundColor: "#1C1C2E",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          cursor:          "pointer",
          flexShrink:      0,
          transition:      "border-color 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#4A4A6A")}
      >
        <Plus size={20} color="#8B5CF6" strokeWidth={2} />
      </button>
    </div>
  );
}

function FileThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isVideo = file.type.startsWith("video/");
  const [blobUrl]   = useState(() => URL.createObjectURL(file));
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isVideo) return;

    // Generate canvas thumbnail — works on Safari iOS
    const video = document.createElement("video");
    video.src        = blobUrl;
    video.muted      = true;
    video.playsInline = true;
    video.preload    = "metadata";

    const onLoaded = () => {
      video.currentTime = 0.001;
    };

    const onSeeked = () => {
      try {
        const canvas    = document.createElement("canvas");
        canvas.width    = 144;
        canvas.height   = 144;
        const ctx       = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, 144, 144);
          setThumbUrl(canvas.toDataURL("image/jpeg", 0.8));
        }
      } catch {}
      video.removeEventListener("seeked",         onSeeked);
      video.removeEventListener("loadedmetadata", onLoaded);
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("seeked",         onSeeked);
    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("seeked",         onSeeked);
    };
  }, [blobUrl, isVideo]);

  return (
    <div
      style={{
        position:        "relative",
        width:           "72px",
        height:          "72px",
        borderRadius:    "8px",
        overflow:        "hidden",
        flexShrink:      0,
        backgroundColor: "#2A2A3D",
      }}
    >
      {isVideo ? (
        thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          // Fallback while thumbnail generates
          <div style={{ width: "100%", height: "100%", backgroundColor: "#2A2A3D", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <polygon points="7,4 17,10 7,16" fill="rgba(255,255,255,0.4)" />
            </svg>
          </div>
        )
      ) : (
        <img
          src={blobUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}

      <button
        onClick={onRemove}
        style={{
          position:        "absolute",
          top:             "4px",
          right:           "4px",
          width:           "18px",
          height:          "18px",
          borderRadius:    "50%",
          border:          "none",
          cursor:          "pointer",
          backgroundColor: "#FF6B6B",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          padding:         0,
        }}
      >
        <X size={10} color="#FFFFFF" strokeWidth={2.5} />
      </button>
    </div>
  );
}