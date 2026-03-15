"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useRef } from "react";

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

      {/* Add more button */}
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
  const [url] = useState(() => URL.createObjectURL(file));
  const isVideo = file.type.startsWith("video/");

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
        <video
          src={url}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          muted
        />
      ) : (
        <img
          src={url}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}

      {/* Remove button */}
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