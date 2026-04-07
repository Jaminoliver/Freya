"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Plus, X, Play, GripVertical } from "lucide-react";

/* ── constants ──────────────────────────────────────────────────────────────── */

const MAX_FILES      = 10;
const MAX_SIZE_BYTES = 3 * 1024 * 1024 * 1024; // 3 GB

const ACCEPTED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm",
];
const ACCEPT_STRING = ACCEPTED_TYPES.join(",");

/* ── props ──────────────────────────────────────────────────────────────────── */

interface MediaUploaderProps {
  files:    File[];
  onChange: (files: File[]) => void;
}

/* ── helpers ────────────────────────────────────────────────────────────────── */

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ── component ─────────────────────────────────────────────────────────────── */

export function MediaUploader({ files, onChange }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  /* blob URLs — track for cleanup */
  const blobUrlsRef = useRef<Map<File, string>>(new Map());

  /* video durations cache */
  const [durations, setDurations] = useState<Map<File, number>>(new Map());

  /* drag state */
  const [dragIdx, setDragIdx]     = useState<number | null>(null);
  const [overIdx, setOverIdx]     = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  /* drop zone drag-over (for empty state) */
  const [dropHover, setDropHover] = useState(false);

  /* validation */
  const [error, setError] = useState<string | null>(null);

  /* cleanup blob URLs on unmount */
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  /* get or create blob URL for a file */
  const getBlobUrl = useCallback((file: File): string => {
    const existing = blobUrlsRef.current.get(file);
    if (existing) return existing;
    const url = URL.createObjectURL(file);
    blobUrlsRef.current.set(file, url);
    return url;
  }, []);

  /* extract video duration */
  const loadDuration = useCallback((file: File) => {
    if (durations.has(file) || !file.type.startsWith("video/")) return;
    const url   = getBlobUrl(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src     = url;
    video.onloadedmetadata = () => {
      setDurations((prev) => new Map(prev).set(file, video.duration));
    };
  }, [durations, getBlobUrl]);

  /* load durations for all video files */
  useEffect(() => {
    files.forEach((f) => { if (f.type.startsWith("video/")) loadDuration(f); });
  }, [files, loadDuration]);

  /* ── add files ──────────────────────────────────────────────────────────── */

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    setError(null);

    const arr = Array.from(incoming);

    for (const f of arr) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setError(`"${f.name}" is not a supported format.`);
        return;
      }
      if (f.size > MAX_SIZE_BYTES) {
        setError(`"${f.name}" exceeds the 3 GB limit.`);
        return;
      }
    }

    const total = files.length + arr.length;
    if (total > MAX_FILES) {
      setError(`You can add up to ${MAX_FILES} files.`);
      return;
    }

    /* max 1 video — TUS only handles one at a time */
    const existingVideos = files.filter((f) => f.type.startsWith("video/")).length;
    const incomingVideos = arr.filter((f) => f.type.startsWith("video/")).length;
    if (existingVideos + incomingVideos > 1) {
      setError("You can add up to 1 video per post.");
      return;
    }

    onChange([...files, ...arr]);
  }, [files, onChange]);

  /* ── remove file ────────────────────────────────────────────────────────── */

  const removeFile = useCallback((index: number) => {
    const file = files[index];
    const url  = blobUrlsRef.current.get(file);
    if (url) { URL.revokeObjectURL(url); blobUrlsRef.current.delete(file); }
    onChange(files.filter((_, i) => i !== index));
  }, [files, onChange]);

  /* ── drag to reorder ────────────────────────────────────────────────────── */

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIndex) {
      setDragIdx(null);
      setOverIdx(null);
      setIsDragging(false);
      return;
    }
    const reordered = [...files];
    const [moved]   = reordered.splice(dragIdx, 1);
    reordered.splice(dropIndex, 0, moved);
    onChange(reordered);
    setDragIdx(null);
    setOverIdx(null);
    setIsDragging(false);
  }, [dragIdx, files, onChange]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setOverIdx(null);
    setIsDragging(false);
  }, []);

  /* ── drop zone handlers (empty state) ───────────────────────────────────── */

  const onZoneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropHover(true);
  }, []);

  const onZoneDragLeave = useCallback(() => setDropHover(false), []);

  const onZoneDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropHover(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  /* ── render: empty state ────────────────────────────────────────────────── */

  if (files.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: "10px",
            backgroundColor: "rgba(239,68,68,0.06)", color: "#EF4444",
            fontSize: "13px", lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={onZoneDragOver}
          onDragLeave={onZoneDragLeave}
          onDrop={onZoneDrop}
          style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "12px",
            padding: "48px 20px",
            borderRadius: "16px",
            backgroundColor: dropHover ? "rgba(139,92,246,0.06)" : "#0D0D18",
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
        >
          {/* Icon circle */}
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            backgroundColor: dropHover ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background-color 0.2s",
          }}>
            <Plus
              size={24}
              strokeWidth={1.8}
              color={dropHover ? "#8B5CF6" : "#6B6B8A"}
              style={{ transition: "color 0.2s" }}
            />
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "15px", fontWeight: 600,
              color: dropHover ? "#8B5CF6" : "#C4C4D4",
              transition: "color 0.2s",
            }}>
              Add photos or videos
            </div>
            <div style={{
              fontSize: "12px", color: "#4A4A6A", marginTop: "4px",
            }}>
              JPG, PNG, GIF, MP4, MOV · Up to {MAX_FILES} files
            </div>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_STRING}
          style={{ display: "none" }}
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />
      </div>
    );
  }

  /* ── render: grid with files ────────────────────────────────────────────── */

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: "10px",
          backgroundColor: "rgba(239,68,68,0.06)", color: "#EF4444",
          fontSize: "13px", lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* Counter */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "13px", color: "#8A8AA0", fontWeight: 500 }}>
          {files.length}/{MAX_FILES} files
        </span>
        {files.length > 1 && (
          <span style={{ fontSize: "11px", color: "#4A4A6A" }}>
            Drag to reorder · first is cover
          </span>
        )}
      </div>

      {/* Thumbnail grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "4px",
      }}>
        {files.map((file, i) => {
          const url       = getBlobUrl(file);
          const isImage   = file.type.startsWith("image/");
          const isVideo   = file.type.startsWith("video/");
          const duration  = durations.get(file);
          const isBeingDragged = dragIdx === i;
          const isDropTarget   = overIdx === i && dragIdx !== i;

          return (
            <div
              key={`${file.name}-${file.lastModified}-${i}`}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              style={{
                position: "relative",
                aspectRatio: "1",
                borderRadius: "10px",
                overflow: "hidden",
                backgroundColor: "#0D0D18",
                cursor: isDragging ? "grabbing" : "grab",
                opacity: isBeingDragged ? 0.4 : 1,
                transform: isDropTarget ? "scale(1.03)" : "scale(1)",
                outline: isDropTarget ? "2px solid #8B5CF6" : "none",
                outlineOffset: "-2px",
                transition: "transform 0.15s, opacity 0.15s, outline 0.15s",
              }}
            >
              {/* Media preview */}
              {isImage && (
                <img
                  src={url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              )}
              {isVideo && (
                <>
                  <video
                    src={url}
                    preload="metadata"
                    muted
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  {/* Play icon overlay */}
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none",
                  }}>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "50%",
                      backgroundColor: "rgba(0,0,0,0.5)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      backdropFilter: "blur(4px)",
                    }}>
                      <Play size={14} color="#fff" fill="#fff" style={{ marginLeft: "2px" }} />
                    </div>
                  </div>
                </>
              )}

              {/* Cover badge — first item */}
              {i === 0 && files.length > 1 && (
                <div style={{
                  position: "absolute", top: "6px", left: "6px",
                  backgroundColor: "rgba(0,0,0,0.65)",
                  backdropFilter: "blur(6px)",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  fontSize: "10px", fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}>
                  Cover
                </div>
              )}

              {/* Duration badge — videos */}
              {isVideo && duration != null && (
                <div style={{
                  position: "absolute", bottom: "6px", right: "6px",
                  backgroundColor: "rgba(0,0,0,0.65)",
                  backdropFilter: "blur(6px)",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  fontSize: "10px", fontWeight: 600,
                  color: "#fff",
                }}>
                  {formatDuration(duration)}
                </div>
              )}

              {/* Remove button */}
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                style={{
                  position: "absolute", top: "6px", right: "6px",
                  width: "24px", height: "24px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(0,0,0,0.6)",
                  backdropFilter: "blur(6px)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 0,
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(239,68,68,0.8)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(0,0,0,0.6)";
                }}
              >
                <X size={13} color="#fff" strokeWidth={2.5} />
              </button>
            </div>
          );
        })}

        {/* Add more button — last cell in grid */}
        {files.length < MAX_FILES && (
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              aspectRatio: "1",
              borderRadius: "10px",
              backgroundColor: "#0D0D18",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "6px",
              cursor: "pointer",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = "#1C1C2E";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = "#0D0D18";
            }}
          >
            <Plus size={22} color="#6B6B8A" strokeWidth={1.8} />
            <span style={{ fontSize: "11px", color: "#4A4A6A", fontWeight: 500 }}>
              Add
            </span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_STRING}
        style={{ display: "none" }}
        onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}