"use client";

import React, { useState, useEffect } from "react";
import {
  X, AlertCircle, CheckCircle, Film, Image, FileText,
  BarChart2, ChevronUp, ChevronDown, RotateCcw, Wifi,
} from "lucide-react";
import { usePostUpload, type UploadItem } from "@/lib/context/PostUploadContext";

// ── Formatters ────────────────────────────────────────────────────────────────

function formatSpeed(bps: number): string {
  if (bps >= 1_048_576) return `${(bps / 1_048_576).toFixed(1)} MB/s`;
  if (bps >= 1_024)     return `${Math.round(bps / 1_024)} KB/s`;
  return `${Math.round(bps)} B/s`;
}

function formatEta(sec: number): string {
  if (sec < 60)   return `~${sec}s left`;
  if (sec < 3600) return `~${Math.ceil(sec / 60)}m left`;
  return `~${Math.ceil(sec / 3600)}h left`;
}

function phaseColor(phase: UploadItem["phase"]): string {
  if (phase === "error")  return "#EF4444";
  if (phase === "done")   return "#22C55E";
  if (phase === "paused") return "#F59E0B";
  return "#8B5CF6";
}

function FileIcon({ item, size = 14 }: { item: UploadItem; size?: number }) {
  if (item._isText)                         return <FileText  size={size} />;
  if (item._isPoll)                         return <BarChart2 size={size} />;
  if (item._isPhoto || item._isMultiPhoto)  return <Image     size={size} />;
  return <Film size={size} />;
}

// ── Animated reconnecting dots ────────────────────────────────────────────────

function AnimatedDots() {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const id = setInterval(
      () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
      420,
    );
    return () => clearInterval(id);
  }, []);
  return <>{dots}</>;
}

// ── Status line ───────────────────────────────────────────────────────────────

function StatusLine({ item }: { item: UploadItem }) {
  const style: React.CSSProperties = { fontSize: 11, display: "flex", alignItems: "center", gap: 4 };

  if (item.phase === "paused") {
    return (
      <span style={{ ...style, color: "#F59E0B" }}>
        <Wifi size={10} /> Reconnecting<AnimatedDots />
      </span>
    );
  }
  if (item.phase === "error") {
    return (
      <span style={{ ...style, color: "#EF4444", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.error || "Upload failed"}
      </span>
    );
  }
  if (item.phase === "done") {
    return <span style={{ ...style, color: "#22C55E" }}>Done ✓</span>;
  }
  if (item.phase === "processing") {
    return <span style={{ ...style, color: "#A3A3C2" }}>Processing…</span>;
  }

  // Uploading
  const parts: string[] = [];
  if (item.speedBps && item.speedBps > 100) parts.push(formatSpeed(item.speedBps));
  if (item.eta      && item.eta > 0 && item.eta < 7200) parts.push(formatEta(item.eta));
  return (
    <span style={{ ...style, color: "#6B6B8A" }}>
      {parts.length > 0 ? parts.join(" · ") : "Uploading…"}
    </span>
  );
}

// ── Linear progress bar ───────────────────────────────────────────────────────

function ProgressBar({ item }: { item: UploadItem }) {
  const color       = phaseColor(item.phase);
  const isShimmery  = item.phase === "processing";

  return (
    <div style={{
      width:           "100%",
      height:          3,
      backgroundColor: "#1A1A2E",
      borderRadius:    99,
      overflow:        "hidden",
      marginTop:       7,
    }}>
      <div style={{
        height:          "100%",
        width:           `${item.progress}%`,
        backgroundColor: color,
        borderRadius:    99,
        transition:      "width 0.35s ease, background-color 0.3s ease",
        ...(isShimmery ? {
          backgroundImage: `linear-gradient(90deg, ${color} 0%, #C084FC 50%, ${color} 100%)`,
          backgroundSize:  "200% 100%",
          animation:       "upbar-shimmer 1.5s ease infinite",
        } : {}),
      }} />
    </div>
  );
}

// ── Single row in the expanded list ──────────────────────────────────────────

function UploadRow({
  item, onDismiss, onRetry,
}: {
  item:      UploadItem;
  onDismiss: (id: string) => void;
  onRetry:   (id: string) => void;
}) {
  const isActive  = item.phase === "uploading" || item.phase === "paused" || item.phase === "processing";
  const canRetry  = item.phase === "error" && (!!item.file || !!(item.files?.length));
  const color     = phaseColor(item.phase);

  return (
    <div style={{ padding: "10px 14px", borderBottom: "1px solid #111120" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

        {/* Icon */}
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          backgroundColor: "#1A1A2E",
          display: "flex", alignItems: "center", justifyContent: "center",
          color, flexShrink: 0,
        }}>
          {item.phase === "done"  ? <CheckCircle size={14} /> :
           item.phase === "error" ? <AlertCircle size={14} /> :
           <FileIcon item={item} size={14} />}
        </div>

        {/* Name + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: "#E2E8F0",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {item.fileName}
          </div>
          <StatusLine item={item} />
        </div>

        {/* % */}
        {isActive && (
          <span style={{ fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>
            {item.progress}%
          </span>
        )}

        {/* Cancel / Dismiss — 44×44 touch target */}
        <button
          onClick={() => onDismiss(item.id)}
          aria-label={isActive ? "Cancel upload" : "Dismiss"}
          style={{
            width: 44, height: 44, borderRadius: "50%",
            border: "none", backgroundColor: "transparent",
            color: "#4A4A6A", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <X size={15} />
        </button>
      </div>

      {item.phase !== "done" && <ProgressBar item={item} />}

      {/* Full-width retry */}
      {canRetry && (
        <button
          onClick={() => onRetry(item.id)}
          style={{
            width: "100%", marginTop: 8, padding: "7px 0",
            borderRadius: 8, border: "1px solid rgba(139,92,246,0.35)",
            backgroundColor: "rgba(139,92,246,0.07)",
            color: "#8B5CF6", fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Inter', sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <RotateCcw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UploadProgressBar() {
  const { uploads, dismissUpload, retryUpload } = usePostUpload();
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted,    setMounted]    = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Message uploads have their own inline progress in the chat bubble
  const visible = uploads.filter((u) => !u._isMessage);

  // Auto-collapse when down to 1 or 0
  useEffect(() => {
    if (visible.length <= 1) setIsExpanded(false);
  }, [visible.length]);

  // Most important upload to feature in the collapsed bar
  const primary =
    visible.find((u) => u.phase === "uploading")  ??
    visible.find((u) => u.phase === "paused")      ??
    visible.find((u) => u.phase === "processing")  ??
    visible.find((u) => u.phase === "error")       ??
    visible[0];

  if (!mounted || !primary || visible.length === 0) return null;

  const extraCount = visible.length - 1;
  const hasExtra   = extraCount > 0;
  const color      = phaseColor(primary.phase);
  const isActive   = primary.phase === "uploading" || primary.phase === "paused" || primary.phase === "processing";
  const canRetry   = primary.phase === "error" && (!!primary.file || !!(primary.files?.length));

  const borderColor =
    primary.phase === "error"  ? "rgba(239,68,68,0.28)"  :
    primary.phase === "done"   ? "rgba(34,197,94,0.22)"   :
    primary.phase === "paused" ? "rgba(245,158,11,0.28)"  :
    "#2A2A3D";

  return (
    <>
      <style>{`
        @keyframes upbar-slide-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes upbar-shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes upbar-spin {
          to { transform: rotate(360deg); }
        }
        /* Tray — desktop default */
        .up-tray {
          position:    fixed;
          right:       16px;
          bottom:      16px;
          width:       320px;
          z-index:     200;
          font-family: 'Inter', sans-serif;
          animation:   upbar-slide-in 0.22s ease;
        }
        /* Mobile override — full width, above the bottom nav */
        @media (max-width: 767px) {
          .up-tray {
            right:  0 !important;
            left:   0 !important;
            bottom: 72px !important;
            width:  100% !important;
          }
        }
        .up-icon-btn { transition: color 0.15s, background-color 0.15s; }
        .up-icon-btn:hover { color: #E2E8F0 !important; background-color: rgba(255,255,255,0.06) !important; }
      `}</style>

      <div className="up-tray">

        {/* ── Expanded list — slides up above the collapsed bar ── */}
        {isExpanded && visible.length > 1 && (
          <div style={{
            backgroundColor: "#0D0D18",
            border:          "1px solid #2A2A3D",
            borderBottom:    "none",
            borderRadius:    "16px 16px 0 0",
            overflow:        "hidden",
            maxHeight:       340,
            overflowY:       "auto",
          }}>
            {/* Sticky header */}
            <div style={{
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "space-between",
              padding:         "10px 14px",
              borderBottom:    "1px solid #111120",
              position:        "sticky",
              top:             0,
              backgroundColor: "#0D0D18",
              zIndex:          1,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#A3A3C2" }}>
                Uploads ({visible.length})
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: "none", border: "none", cursor: "pointer",
                  color: "#6B6B8A", fontSize: 11, fontWeight: 600,
                  padding: "4px 8px", borderRadius: 6,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <ChevronDown size={13} /> Collapse
              </button>
            </div>

            {visible.map((item) => (
              <UploadRow
                key={item.id}
                item={item}
                onDismiss={dismissUpload}
                onRetry={retryUpload}
              />
            ))}
          </div>
        )}

        {/* ── Collapsed primary bar ── */}
        <div style={{
          backgroundColor: "#0D0D18",
          border:          `1px solid ${borderColor}`,
          borderRadius:    isExpanded && visible.length > 1 ? "0 0 16px 16px" : 16,
          padding:         "10px 12px 10px 14px",
          boxShadow:       "0 8px 32px rgba(0,0,0,0.6)",
          transition:      "border-color 0.3s ease, border-radius 0.2s ease",
        }}>

          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

            {/* File type icon */}
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              backgroundColor: "#1A1A2E",
              display: "flex", alignItems: "center", justifyContent: "center",
              color, flexShrink: 0,
            }}>
              {primary.phase === "done" ? (
                <CheckCircle size={16} />
              ) : primary.phase === "error" ? (
                <AlertCircle size={16} />
              ) : primary.phase === "processing" ? (
                <div style={{ animation: "upbar-spin 1.1s linear infinite", display: "flex" }}>
                  <FileIcon item={primary} size={15} />
                </div>
              ) : (
                <FileIcon item={primary} size={15} />
              )}
            </div>

            {/* Name + sub-line */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: "#E2E8F0",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {primary.fileName}
              </div>
              <div style={{ marginTop: 2 }}>
                {hasExtra && !isExpanded ? (
                  <span style={{ fontSize: 11, color: "#6B6B8A" }}>
                    +{extraCount} more ·{" "}
                    <span
                      onClick={() => setIsExpanded(true)}
                      style={{ color: "#8B5CF6", cursor: "pointer", fontWeight: 600 }}
                    >
                      see all
                    </span>
                  </span>
                ) : (
                  <StatusLine item={primary} />
                )}
              </div>
            </div>

            {/* Progress % */}
            {isActive && (
              <span style={{ fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>
                {primary.progress}%
              </span>
            )}

            {/* Expand / collapse toggle — only shown when multiple uploads */}
            {hasExtra && (
              <button
                className="up-icon-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? "Collapse" : "Expand all uploads"}
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  border: "none", backgroundColor: "transparent",
                  color: "#6B6B8A", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            )}

            {/* Cancel / Dismiss — 44×44 minimum touch target */}
            <button
              className="up-icon-btn"
              onClick={() => dismissUpload(primary.id)}
              aria-label={isActive ? "Cancel upload" : "Dismiss"}
              style={{
                width: 44, height: 44, borderRadius: "50%",
                border: "none", backgroundColor: "transparent",
                color: "#4A4A6A", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Progress bar */}
          {primary.phase !== "done" && <ProgressBar item={primary} />}

          {/* Full-width retry — single error upload, easy to tap on mobile */}
          {canRetry && !hasExtra && (
            <button
              onClick={() => retryUpload(primary.id)}
              style={{
                width: "100%", marginTop: 8, padding: "8px 0",
                borderRadius: 9, border: "1px solid rgba(139,92,246,0.35)",
                backgroundColor: "rgba(139,92,246,0.07)",
                color: "#8B5CF6", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <RotateCcw size={12} /> Retry upload
            </button>
          )}
        </div>

      </div>
    </>
  );
}