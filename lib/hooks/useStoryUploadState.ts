"use client";

import { useState, useCallback } from "react";
import type { UploadJob } from "@/lib/context/StoryUploadContext";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Phase = "pick" | "clip" | "preview" | "text";

export interface SelectedFile {
  file:       File;
  previewUrl: string;
  mediaType:  "photo" | "video";
  duration?:  number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const TEXT_BACKGROUNDS = [
  "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
  "linear-gradient(135deg, #1a1a2e 0%, #8B5CF6 100%)",
  "linear-gradient(135deg, #160040 0%, #EC4899 100%)",
  "linear-gradient(135deg, #0f3460 0%, #533483 100%)",
  "#0A0A0F",
  "#1C1C2E",
  "linear-gradient(135deg, #2d1b69 0%, #11998e 100%)",
  "linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)",
];

export const MAX_PHOTOS    = 3;
export const MAX_WITH_VID  = 2;
export const CLIP_DURATION = 90;
export const THUMB_COUNT   = 14;

export function getTextFontSize(len: number): number {
  if (len <= 30)  return 48;
  if (len <= 80)  return 32;
  if (len <= 150) return 22;
  return 16;
}

export function fmtDuration(s: number): string {
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface Options {
  onClose:       () => void;
  onUploadStart: (job: UploadJob) => void;
}

export function useStoryUploadState({ onClose, onUploadStart }: Options) {
  const [phase,         setPhase]         = useState<Phase>("pick");
  const [selected,      setSelected]      = useState<SelectedFile[]>([]);
  const [caption,       setCaption]       = useState("");
  const [error,         setError]         = useState<string | null>(null);
  const [captionFocus,  setCaptionFocus]  = useState(false);
  const [carouselIdx,   setCarouselIdx]   = useState(0);
  const [ctaType,       setCtaType]       = useState<"subscribe" | null>(null);
  const [ctaMessage,    setCtaMessage]    = useState("");
  const [ctaPositionY,  setCtaPositionY]  = useState(0.75);
  const [isMuted,       setIsMuted]       = useState(true);
  const [toolbarOpen,   setToolbarOpen]   = useState(false);
  const [textContent,   setTextContent]   = useState("");
  const [textBg,        setTextBg]        = useState(TEXT_BACKGROUNDS[0]);
  const [textPosting,   setTextPosting]   = useState(false);
  const [textPostErr,   setTextPostErr]   = useState<string | null>(null);
  const [clipStart,     setClipStart]     = useState(0);
  const [videoDuration, setVideoDur]      = useState(0);
  const [thumbnails,    setThumbnails]    = useState<string[]>([]);
  const [thumbsLoading, setThumbsLoading] = useState(false);

  // ── Generate thumbnails ───────────────────────────────────────────────────

  const generateThumbnails = useCallback(async (url: string, duration: number) => {
    setThumbsLoading(true);
    try {
      const vid = document.createElement("video");
      vid.src = url; vid.muted = true; vid.preload = "auto";
      await new Promise<void>((res) => { vid.onloadeddata = () => res(); vid.load(); });
      const canvas = document.createElement("canvas");
      canvas.width = 44; canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      const thumbs: string[] = [];
      for (let i = 0; i < THUMB_COUNT; i++) {
        const time = (i / (THUMB_COUNT - 1)) * duration;
        await new Promise<void>((res) => {
          const h = () => {
            ctx.drawImage(vid, 0, 0, 44, 64);
            thumbs.push(canvas.toDataURL("image/jpeg", 0.6));
            vid.removeEventListener("seeked", h);
            res();
          };
          vid.addEventListener("seeked", h);
          vid.currentTime = time;
        });
      }
      setThumbnails(thumbs);
    } catch {
      setThumbnails(Array(THUMB_COUNT).fill(""));
    } finally {
      setThumbsLoading(false);
    }
  }, []);

  // ── Add / remove files ────────────────────────────────────────────────────

  const addFiles = useCallback(async (newFiles: File[]) => {
    setError(null);
    const incoming = newFiles.map((f) => ({
      file:      f,
      mediaType: f.type.startsWith("video/") ? "video" as const : "photo" as const,
    }));
    const combined = [
      ...selected.map((s) => ({ file: s.file, mediaType: s.mediaType })),
      ...incoming,
    ];
    const videoCount = combined.filter((f) => f.mediaType === "video").length;
    const photoCount = combined.filter((f) => f.mediaType === "photo").length;

    if (videoCount > 1)                                { setError("Only 1 video allowed."); return; }
    if (combined.length > 3)                           { setError("Max 3 files at once."); return; }
    if (videoCount === 1 && photoCount > MAX_WITH_VID) { setError("Max 2 photos when adding a video."); return; }
    if (videoCount === 0 && photoCount > MAX_PHOTOS)   { setError(`Max ${MAX_PHOTOS} photos.`); return; }

    for (const { file: f } of incoming) {
      if (!f.type.startsWith("video/") && !f.type.startsWith("image/")) { setError("Only images and videos are supported."); return; }
      if (f.type.startsWith("image/") && f.size > 20 * 1024 * 1024)    { setError("Each image must be under 20 MB."); return; }
    }

    const newEntries: SelectedFile[] = await Promise.all(
      incoming.map(({ file: f, mediaType }) =>
        new Promise<SelectedFile>((resolve) => {
          const url = URL.createObjectURL(f);
          if (mediaType === "video") {
            const tmp = document.createElement("video");
            tmp.src = url;
            tmp.onloadedmetadata = () => resolve({ file: f, previewUrl: url, mediaType, duration: tmp.duration });
          } else {
            resolve({ file: f, previewUrl: url, mediaType });
          }
        })
      )
    );
    setSelected((prev) => [...prev, ...newEntries]);
  }, [selected]);

  const removeFile = useCallback((idx: number) => {
    setSelected((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].previewUrl);
      next.splice(idx, 1);
      return next;
    });
    setError(null);
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────

  const handleContinue = useCallback(() => {
    if (!selected.length) return;
    const videoEntry = selected.find((s) => s.mediaType === "video");
    if (videoEntry && videoEntry.duration && videoEntry.duration > CLIP_DURATION) {
      setVideoDur(videoEntry.duration);
      setClipStart(0);
      setPhase("clip");
      generateThumbnails(videoEntry.previewUrl, videoEntry.duration);
    } else {
      setCarouselIdx(0);
      setPhase("preview");
    }
  }, [selected, generateThumbnails]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (!selected.length) return;
    const videoEntry = selected.find((s) => s.mediaType === "video");
    const clipEnd    = videoEntry ? Math.min(clipStart + CLIP_DURATION, videoEntry.duration ?? CLIP_DURATION) : 0;
    const hasVideo   = !!videoEntry;
    const hasPhoto   = selected.some((s) => s.mediaType === "photo");
    const mediaType  = hasVideo && hasPhoto ? "mixed" : hasVideo ? "video" : "photo";
    onUploadStart({
      files:        selected.map((s) => s.file),
      caption:      caption.trim(),
      mediaType:    mediaType as any,
      clipStart,
      clipEnd,
      ctaType,
      ctaMessage:   ctaMessage.trim() || null,
      ctaPositionY: ctaType ? ctaPositionY : null,
    });
    onClose();
  }, [selected, caption, clipStart, ctaType, ctaMessage, ctaPositionY, onUploadStart, onClose]);

  const handleSendText = useCallback(async () => {
    if (!textContent.trim() || textPosting) return;
    setTextPosting(true);
    setTextPostErr(null);
    try {
      const res = await fetch("/api/stories/text", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          textContent:  textContent.trim(),
          textBg,
          ctaType:      ctaType ?? null,
          ctaMessage:   ctaMessage.trim() || null,
          ctaPositionY: ctaType ? ctaPositionY : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post story");
      onClose();
    } catch (e: any) {
      setTextPostErr(e.message ?? "Something went wrong");
    } finally {
      setTextPosting(false);
    }
  }, [textContent, textBg, ctaType, ctaMessage, ctaPositionY, textPosting, onClose]);

  const reset = useCallback(() => {
    selected.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setSelected([]); setCaption(""); setError(null);
    setThumbnails([]); setClipStart(0); setPhase("pick");
    setTextContent(""); setCtaMessage(""); setCtaType(null); setCtaPositionY(0.75);
  }, [selected]);

  // ── Computed ──────────────────────────────────────────────────────────────

  const videoEntry = selected.find((s) => s.mediaType === "video");
  const canAddMore = selected.length < 3 && !(
    selected.some((s) => s.mediaType === "video") && selected.length >= MAX_WITH_VID + 1
  );

  return {
    phase, setPhase,
    selected, setSelected,
    caption, setCaption,
    error, setError,
    captionFocus, setCaptionFocus,
    carouselIdx, setCarouselIdx,
    ctaType, setCtaType,
    ctaMessage, setCtaMessage,
    ctaPositionY, setCtaPositionY,
    isMuted, setIsMuted,
    toolbarOpen, setToolbarOpen,
    textContent, setTextContent,
    textBg, setTextBg,
    textPosting,
    textPostErr, setTextPostErr,
    clipStart, setClipStart,
    videoDuration, setVideoDur,
    thumbnails,
    thumbsLoading,
    videoEntry,
    canAddMore,
    addFiles,
    removeFile,
    handleContinue,
    handleSend,
    handleSendText,
    reset,
    generateThumbnails,
  };
}