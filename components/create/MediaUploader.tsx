"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Plus, X, Play, GripVertical } from "lucide-react";

/* ── constants ──────────────────────────────────────────────────────────────── */

const MAX_IMAGES     = 3;
const MAX_VIDEOS     = 1;
const MAX_SIZE_BYTES     = 2 * 1024 * 1024 * 1024; // 2 GB
const MAX_VIDEO_DURATION = 60 * 60; // 60 minutes in seconds

const ACCEPTED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm",
];
// Accept string is computed dynamically in the component based on current files

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

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url   = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src     = url;

    const cleanup = () => URL.revokeObjectURL(url);

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout reading video duration"));
    }, 8000);

    video.onloadedmetadata = () => {
      clearTimeout(timer);
      cleanup();
      resolve(video.duration);
    };
    video.onerror = () => {
      clearTimeout(timer);
      cleanup();
      reject(new Error("Could not read video duration"));
    };
  });
}

/* ── component ─────────────────────────────────────────────────────────────── */

export function MediaUploader({ files, onChange }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const blobUrlsRef = useRef<Map<File, string>>(new Map());

  const [durations,   setDurations]   = useState<Map<File, number>>(new Map());
  const [posterUrls,  setPosterUrls]  = useState<Map<File, string>>(new Map());

  const [dragIdx, setDragIdx]       = useState<number | null>(null);
  const [overIdx, setOverIdx]       = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [dropHover, setDropHover] = useState(false);

  // Dynamic accept: once user has images, only accept images; video only accepts video
  const hasExistingImages = files.some((f) => f.type.startsWith("image/"));
  const hasExistingVideo  = files.some((f) => f.type.startsWith("video/"));
  const dynamicAccept = hasExistingImages
    ? "image/jpeg,image/png,image/webp,image/gif"
    : hasExistingVideo
    ? "" // no more files allowed — video is solo
    : ACCEPTED_TYPES.join(",");

  const existingImagesCount = files.filter((f) => f.type.startsWith("image/")).length;

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const getBlobUrl = useCallback((file: File): string => {
    const existing = blobUrlsRef.current.get(file);
    if (existing) return existing;
    const url = URL.createObjectURL(file);
    blobUrlsRef.current.set(file, url);
    return url;
  }, []);

  const loadDuration = useCallback((file: File) => {
    if (durations.has(file) || !file.type.startsWith("video/")) return;
    const url    = getBlobUrl(file);
    const video  = document.createElement("video");
    const canvas = document.createElement("canvas");
    video.preload    = "metadata";
    video.muted      = true;
    video.playsInline = true;
    video.src        = url;
    video.onloadedmetadata = () => {
      setDurations((prev) => new Map(prev).set(file, video.duration));
      video.currentTime = 0.1;
    };
    video.onseeked = () => {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const poster = canvas.toDataURL("image/jpeg", 0.8);
      setPosterUrls((prev) => new Map(prev).set(file, poster));
    };
    video.play().then(() => video.pause()).catch(() => {});
  }, [durations, getBlobUrl]);

  useEffect(() => {
    files.forEach((f) => { if (f.type.startsWith("video/")) loadDuration(f); });
  }, [files, loadDuration]);

  /* ── add files ──────────────────────────────────────────────────────────── */

  const addFiles = useCallback(async (incoming: FileList | null) => {
    if (!incoming) return;
    setError(null);

    const arr = Array.from(incoming);

    // 1. Format + size check
    for (const f of arr) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setError(`"${f.name}" is not a supported format.`);
        return;
      }
      if (f.size > MAX_SIZE_BYTES) {
        setError(`"${f.name}" exceeds the 2 GB limit.`);
        return;
      }
    }

    // 2. Duration check for videos (async, before anything is added)
    for (const f of arr) {
      if (f.type.startsWith("video/")) {
        try {
          const duration = await getVideoDuration(f);
          if (duration > MAX_VIDEO_DURATION) {
            const mins = Math.floor(duration / 60);
            setError(`Video is ${mins} min — max allowed is 60 min.`);
            return;
          }
        } catch {
          setError("Could not verify video length. Please try a shorter video.");
          return;
        }
      }
    }

    const existingImages = files.filter((f) => f.type.startsWith("image/"));
    const existingVideos = files.filter((f) => f.type.startsWith("video/"));
    const incomingImages = arr.filter((f) => f.type.startsWith("image/"));
    const incomingVideos = arr.filter((f) => f.type.startsWith("video/"));

    // 2. Block mixed selection in the incoming batch itself
    if (incomingImages.length > 0 && incomingVideos.length > 0) {
      setError("You can't mix images and videos in one post.");
      return;
    }

    // 3. Block adding video when images already exist
    if (incomingVideos.length > 0 && existingImages.length > 0) {
      setError("Remove your images before adding a video.");
      return;
    }

    // 4. Block adding images when video already exists
    if (incomingImages.length > 0 && existingVideos.length > 0) {
      setError("Remove your video before adding images.");
      return;
    }

    // 5. Image count limit
    if (incomingImages.length > 0) {
      if (existingImages.length >= MAX_IMAGES) {
        setError(`You can add up to ${MAX_IMAGES} images per post.`);
        return;
      }
      if (existingImages.length + incomingImages.length > MAX_IMAGES) {
        setError(`You can add up to ${MAX_IMAGES} images. You have ${existingImages.length}, so only ${MAX_IMAGES - existingImages.length} more allowed.`);
        return;
      }
    }

    // 6. Video count limit
    if (incomingVideos.length > 0) {
      if (existingVideos.length >= MAX_VIDEOS) {
        setError("You can only add 1 video per post.");
        return;
      }
      if (incomingVideos.length > MAX_VIDEOS) {
        setError("You can only add 1 video per post.");
        return;
      }
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

  const onZoneDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setDropHover(true); }, []);
  const onZoneDragLeave = useCallback(() => setDropHover(false), []);
  const onZoneDrop      = useCallback((e: React.DragEvent) => {
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
            fontSize: "14px", lineHeight: 1.5,
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
            width: "64px", height: "64px", borderRadius: "50%",   /* ← bigger circle */
            backgroundColor: dropHover ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background-color 0.2s",
          }}>
            <Plus
              size={28}                                             /* ← bigger icon */
              strokeWidth={2}
              color={dropHover ? "#8B5CF6" : "#C4C4D4"}            /* ← whiter */
              style={{ transition: "color 0.2s" }}
            />
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "16px", fontWeight: 600,                   /* ← bigger */
              color: dropHover ? "#8B5CF6" : "#FFFFFF",            /* ← whiter */
              transition: "color 0.2s",
            }}>
              Add photos or videos
            </div>
            <div style={{
              fontSize: "13px", color: "#6B6B8A", marginTop: "4px", /* ← bigger */
            }}>
              1 video or up to 3 images · JPG, PNG, GIF, MP4, MOV
            </div>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={dynamicAccept}
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
          fontSize: "14px", lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* Counter */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "14px", color: "#D4D4E8", fontWeight: 500 }}>  {/* ← whiter */}
          {hasExistingVideo
            ? "1/1 video"
            : `${existingImagesCount}/${MAX_IMAGES} images`}
        </span>
        {files.length > 1 && (
          <span style={{ fontSize: "12px", color: "#8A8AA0" }}>           {/* ← whiter */}
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
          const url              = getBlobUrl(file);
          const isImage          = file.type.startsWith("image/");
          const isVideo          = file.type.startsWith("video/");
          const duration         = durations.get(file);
          const isBeingDragged   = dragIdx === i;
          const isDropTarget     = overIdx === i && dragIdx !== i;

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
              {isImage && (
                <img
                  src={url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              )}
              {isVideo && (
                <>
                  {posterUrls.get(file) ? (
                    <img
                      src={posterUrls.get(file)}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", backgroundColor: "#0D0D18" }} />
                  )}
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none",
                  }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "50%",  /* ← bigger */
                      backgroundColor: "rgba(0,0,0,0.5)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      backdropFilter: "blur(4px)",
                    }}>
                      <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: "2px" }} />  {/* ← bigger */}
                    </div>
                  </div>
                </>
              )}

              {/* Cover badge */}
              {i === 0 && files.length > 1 && (
                <div style={{
                  position: "absolute", top: "6px", left: "6px",
                  backgroundColor: "rgba(0,0,0,0.65)",
                  backdropFilter: "blur(6px)",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  fontSize: "11px", fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}>
                  Cover
                </div>
              )}

              {/* Duration badge */}
              {isVideo && duration != null && (
                <div style={{
                  position: "absolute", bottom: "6px", right: "6px",
                  backgroundColor: "rgba(0,0,0,0.65)",
                  backdropFilter: "blur(6px)",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  fontSize: "11px", fontWeight: 600,
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
                  width: "26px", height: "26px",                /* ← bigger */
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
                <X size={14} color="#fff" strokeWidth={2.5} />   {/* ← bigger */}
              </button>
            </div>
          );
        })}

        {/* Add more button */}
        {!hasExistingVideo && existingImagesCount < MAX_IMAGES && (
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
            <Plus size={26} color="#C4C4D4" strokeWidth={1.8} />   {/* ← bigger + whiter */}
            <span style={{ fontSize: "12px", color: "#8A8AA0", fontWeight: 500 }}>  {/* ← whiter */}
              Add
            </span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={dynamicAccept}
        style={{ display: "none" }}
        onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}