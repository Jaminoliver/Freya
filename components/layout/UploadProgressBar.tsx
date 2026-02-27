"use client";

import React from "react";
import { useUpload } from "@/lib/context/UploadContext";

function CircleProgress({ pct, size = 36 }: { pct: number; size?: number }) {
  const r      = (size - 4) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2A2A3D" strokeWidth={3} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={pct === 100 ? "#22C55E" : "#8B5CF6"}
        strokeWidth={3}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.3s" }}
      />
      <text
        x="50%" y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={pct === 100 ? "#22C55E" : "#E2E8F0"}
        fontSize="9"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
        style={{ transform: "rotate(90deg)", transformOrigin: "50% 50%" }}
      >
        {pct}
      </text>
    </svg>
  );
}

export default function UploadProgressBar() {
  const { uploads, dismissUpload, retryUpload } = useUpload();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted || uploads.length === 0) return null;

  return (
    <div style={{
      position:      "fixed",
      bottom:        "80px",
      right:         "16px",
      zIndex:        1000,
      display:       "flex",
      flexDirection: "column",
      gap:           "8px",
      maxWidth:      "300px",
      width:         "100%",
      fontFamily:    "'Inter', sans-serif",
    }}>
      {uploads.map((u) => (
        <div
          key={u.id}
          style={{
            backgroundColor: "#13131F",
            border:          `1px solid ${u.phase === "error" ? "rgba(239,68,68,0.3)" : u.phase === "done" ? "rgba(34,197,94,0.2)" : "#2A2A3D"}`,
            borderRadius:    "12px",
            padding:         "10px 14px",
            display:         "flex",
            alignItems:      "center",
            gap:             "10px",
            boxShadow:       "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          {/* Circle / Error icon */}
          {u.phase === "error" ? (
            <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "rgba(239,68,68,0.15)", border: "2px solid #EF4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 14, color: "#EF4444" }}>✕</span>
            </div>
          ) : (
            <div style={{ flexShrink: 0 }}>
              <CircleProgress pct={u.progress} />
            </div>
          )}

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#E2E8F0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {u.fileName}
            </div>
            <div style={{ fontSize: "11px", color: u.phase === "error" ? "#EF4444" : "#6B6B8A", marginTop: "2px" }}>
              {u.phase === "error"         ? (u.error || "Upload failed")
               : u.phase === "done"       ? "Ready to play ✓"
               : u.phase === "processing" ? "Processing video…"
               : "Uploading…"}
            </div>
          </div>

          {/* Retry button on error */}
          {u.phase === "error" && u.file && (
            <button
              onClick={() => retryUpload(u.id)}
              style={{
                background:   "none",
                border:       "1px solid #8B5CF6",
                borderRadius: "8px",
                cursor:       "pointer",
                color:        "#8B5CF6",
                fontSize:     "11px",
                fontWeight:   600,
                padding:      "4px 8px",
                flexShrink:   0,
                fontFamily:   "'Inter', sans-serif",
              }}
            >
              Retry
            </button>
          )}

          {/* Dismiss button */}
          {(u.phase === "done" || u.phase === "error") && (
            <button
              onClick={() => dismissUpload(u.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", fontSize: 16, padding: "2px", flexShrink: 0 }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}