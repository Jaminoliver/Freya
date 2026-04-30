"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ImagePlus, Video, Send, Volume2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import type { UploadJob } from "@/lib/context/StoryUploadContext";

interface StoryUploadModalProps {
  onClose:       () => void;
  onUploadStart: (job: UploadJob) => void;
}

type Phase = "pick" | "clip" | "preview" | "text";

const TEXT_BACKGROUNDS = [
  "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
  "linear-gradient(135deg, #1a1a2e 0%, #8B5CF6 100%)",
  "linear-gradient(135deg, #160040 0%, #EC4899 100%)",
  "linear-gradient(135deg, #0f3460 0%, #533483 100%)",
  "#0A0A0F",
  "#1C1C2E",
  "linear-gradient(135deg, #2d1b69 0%, #11998e 100%)",
  "linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)",
];

function getTextFontSize(len: number): number {
  if (len <= 30)  return 48;
  if (len <= 80)  return 32;
  if (len <= 150) return 22;
  return 16;
}

const MAX_PHOTOS    = 3;
const MAX_WITH_VID  = 2;
const CLIP_DURATION = 90;
const THUMB_COUNT   = 14;

function fmtDuration(s: number) {
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
function fmtSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

interface SelectedFile {
  file:       File;
  previewUrl: string;
  mediaType:  "photo" | "video";
  duration?:  number;
}

export default function StoryUploadModal({ onClose, onUploadStart }: StoryUploadModalProps) {
  const imageInputRef   = useRef<HTMLInputElement>(null);
  const videoInputRef   = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const scrubRef           = useRef<HTMLDivElement>(null);
  const previewCanvasRef   = useRef<HTMLDivElement>(null);
  const textCanvasRef      = useRef<HTMLDivElement>(null);
  const isDragging      = useRef(false);
  const dragStartX      = useRef(0);
  const dragStartClip   = useRef(0);
  const touchStartX       = useRef(0);
  const ctaCardRefPreview = useRef<HTMLDivElement>(null);
  const ctaCardRefText    = useRef<HTMLDivElement>(null);
  const ctaPosRef         = useRef(0.75);
  const [ctaInset, setCtaInset] = useState(16);

  const [phase,        setPhase]        = useState<Phase>("pick");
  const [selected,     setSelected]     = useState<SelectedFile[]>([]);
  const [caption,      setCaption]      = useState("");
  const [error,        setError]        = useState<string | null>(null);
  const [captionFocus, setCaptionFocus] = useState(false);
  const [carouselIdx,  setCarouselIdx]  = useState(0);
  const [ctaType,      setCtaType]      = useState<"subscribe" | null>(null);
  const [ctaMessage,   setCtaMessage]   = useState("");
  const [ctaSheetOpen, setCtaSheetOpen] = useState(false);
  const [ctaPositionY, setCtaPositionY] = useState(0.75);
const [isMuted, setIsMuted] = useState(true);
  const ctaDragRef                      = useRef<{ active: boolean; startY: number; startPosY: number }>({ active: false, startY: 0, startPosY: 0.75 });
const [toolbarOpen,  setToolbarOpen]  = useState(false);
  const [textContent,  setTextContent]  = useState("");
  const [textBg,       setTextBg]       = useState(TEXT_BACKGROUNDS[0]);
  const [textPosting,  setTextPosting]  = useState(false);
  const [textPostErr,  setTextPostErr]  = useState<string | null>(null);

  // Clip state
  const [clipStart,     setClipStart]     = useState(0);
  const [videoDuration, setVideoDur]      = useState(0);
  const [thumbnails,    setThumbnails]    = useState<string[]>([]);
  const [thumbsLoading, setThumbsLoading] = useState(false);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Sync video preview to clipStart
  useEffect(() => {
    if (phase !== "clip" || !previewVideoRef.current) return;
    previewVideoRef.current.currentTime = clipStart;
  }, [clipStart, phase]);

  // Scrub drag
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !scrubRef.current) return;
      const rect = scrubRef.current.getBoundingClientRect();
      const dSec = ((e.clientX - dragStartX.current) / rect.width) * videoDuration;
      setClipStart((p) => Math.max(0, Math.min(videoDuration - CLIP_DURATION, dragStartClip.current + dSec)));
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || !scrubRef.current) return;
      const rect = scrubRef.current.getBoundingClientRect();
      const dSec = ((e.touches[0].clientX - dragStartX.current) / rect.width) * videoDuration;
      setClipStart((p) => Math.max(0, Math.min(videoDuration - CLIP_DURATION, dragStartClip.current + dSec)));
    };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove",  onMouseMove);
    window.addEventListener("mouseup",    onUp);
    window.addEventListener("touchmove",  onTouchMove, { passive: true });
    window.addEventListener("touchend",   onUp);
    return () => {
      window.removeEventListener("mousemove",  onMouseMove);
      window.removeEventListener("mouseup",    onUp);
      window.removeEventListener("touchmove",  onTouchMove);
      window.removeEventListener("touchend",   onUp);
    };
  }, [videoDuration]);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!ctaDragRef.current.active) return;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const card: HTMLDivElement | null = ctaCardRefPreview.current !== null ? ctaCardRefPreview.current : ctaCardRefText.current;
      if (!card || !card.parentElement) return;
      const parentH  = card.parentElement.clientHeight;
      const cardH    = card.offsetHeight;
      const dy       = clientY - ctaDragRef.current.startY;
      const newTop   = Math.max(0, Math.min(parentH - cardH, ctaDragRef.current.startPosY + dy));
      ctaPosRef.current = (newTop + 72) / parentH;
      card.style.top = `${newTop}px`;
    };
    const onUp = () => {
      if (!ctaDragRef.current.active) return;
      ctaDragRef.current.active = false;
      setCtaPositionY(ctaPosRef.current);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchend",  onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchend",  onUp);
    };
  }, []);

  const measureVideoInset = useCallback(() => {
    const vid = previewVideoRef.current;
    if (!vid || !previewCanvasRef.current) return;
    const cW = previewCanvasRef.current.clientWidth;
    const cH = previewCanvasRef.current.clientHeight;
    const vW = vid.videoWidth;
    const vH = vid.videoHeight;
    if (!vW || !vH) return;
    const containerAR = cW / cH;
    const videoAR     = vW / vH;
    const renderedW   = videoAR > containerAR ? cW : cH * videoAR;
    setCtaInset((cW - renderedW) / 2 + 8);
  }, []);

  const generateThumbnails = useCallback(async (url: string, duration: number) => {
    setThumbsLoading(true);
    try {
      const vid   = document.createElement("video");
      vid.src     = url;
      vid.muted   = true;
      vid.preload = "auto";
      await new Promise<void>((res) => { vid.onloadeddata = () => res(); vid.load(); });
      const canvas  = document.createElement("canvas");
      canvas.width  = 44; canvas.height = 64;
      const ctx     = canvas.getContext("2d")!;
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

  // ── Add files ─────────────────────────────────────────────────────────────

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
      if (!f.type.startsWith("video/") && !f.type.startsWith("image/")) {
        setError("Only images and videos are supported."); return;
      }
      if (f.type.startsWith("image/") && f.size > 20 * 1024 * 1024) {
        setError("Each image must be under 20 MB."); return;
      }
    }

    const newEntries: SelectedFile[] = await Promise.all(
      incoming.map(({ file: f, mediaType }) =>
        new Promise<SelectedFile>((resolve) => {
          const url = URL.createObjectURL(f);
          if (mediaType === "video") {
            const tmp = document.createElement("video");
            tmp.src   = url;
            tmp.onloadedmetadata = () =>
              resolve({ file: f, previewUrl: url, mediaType, duration: tmp.duration });
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) addFiles(files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  // ── Continue ──────────────────────────────────────────────────────────────

  const handleContinue = () => {
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
  };

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = () => {
    if (!selected.length) return;
    const videoEntry = selected.find((s) => s.mediaType === "video");
    const clipEnd    = videoEntry
      ? Math.min(clipStart + CLIP_DURATION, videoEntry.duration ?? CLIP_DURATION)
      : 0;
    const hasVideo  = !!videoEntry;
    const hasPhoto  = selected.some((s) => s.mediaType === "photo");
    const mediaType = hasVideo && hasPhoto ? "mixed" : hasVideo ? "video" : "photo";
    onUploadStart({
      files:      selected.map((s) => s.file),
      caption:    caption.trim(),
      mediaType:  mediaType as any,
      clipStart,
      clipEnd,
      ctaType,
      ctaMessage:   ctaMessage.trim() || null,
      ctaPositionY: ctaType ? ctaPositionY : null,
    });
    onClose();
  };

  const handleSendText = async () => {
    if (!textContent.trim() || textPosting) return;
    setTextPosting(true);
    setTextPostErr(null);
    try {
      const res  = await fetch("/api/stories/text", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          textContent: textContent.trim(),
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
  };

  const reset = () => {
    selected.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setSelected([]); setCaption(""); setError(null);
    setThumbnails([]); setClipStart(0); setPhase("pick");
    setTextContent(""); setCtaMessage(""); setCtaType(null); setCtaPositionY(0.75);
  };

  // ── Carousel swipe ────────────────────────────────────────────────────────

  const onCarouselTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onCarouselTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) setCarouselIdx((i) => Math.min(i + 1, selected.length - 1));
    else         setCarouselIdx((i) => Math.max(i - 1, 0));
  };

  const videoEntry   = selected.find((s) => s.mediaType === "video");
  const clipDuration = Math.min(CLIP_DURATION, videoDuration);
  const clipWinLeft  = videoDuration > 0 ? (clipStart / videoDuration) * 100 : 0;
  const clipWinW     = videoDuration > 0 ? Math.min(100, (CLIP_DURATION / videoDuration) * 100) : 100;
  const canAddMore   = selected.length < 3 && !(
    selected.some((s) => s.mediaType === "video") && selected.length >= MAX_WITH_VID + 1
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <style>{`
        @keyframes sum-in        { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        @keyframes sum-sheet-in  { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes sum-cta-in    { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sum-sweep     { 0%{left:-80%} 100%{left:130%} }
        .sum-wrap { animation: sum-in 0.18s ease forwards; }
        .sum-caption { background:none;border:none;outline:none;width:100%;color:#fff;font-size:14px;font-family:'Inter',sans-serif;text-shadow:0 1px 4px rgba(0,0,0,0.6),0 0px 12px rgba(0,0,0,0.4); }
        .sum-caption::placeholder { color:rgba(255,255,255,0.7);text-shadow:0 1px 4px rgba(0,0,0,0.7); }
        .sum-scrub { cursor:grab; }
        .sum-scrub:active { cursor:grabbing; }
        .sum-thumb-remove { opacity:0;transition:opacity 0.15s; }
        .sum-thumb-wrap:hover .sum-thumb-remove { opacity:1; }
        .sum-pick-btn:hover { background:rgba(255,255,255,0.07) !important; border-color:rgba(255,255,255,0.18) !important; }
        .sum-add-more:hover { border-color:rgba(255,255,255,0.25) !important; background:rgba(255,255,255,0.05) !important; }
      `}</style>

      <div
        onClick={phase === "pick" ? onClose : undefined}
        style={{ position:"fixed", inset:0, zIndex:9998, background:"rgba(0,0,0,0.95)", display:"flex", alignItems:"center", justifyContent:"center" }}
      >

        {/* ═══════════════════════ PICK ═══════════════════════════════════ */}
        {phase === "pick" && (
          <div
            className="sum-wrap"
            onClick={(e) => e.stopPropagation()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{ position:"relative", width:"100%", height:"100dvh", maxWidth:480, backgroundColor:"#090910", display:"flex", flexDirection:"column" }}
          >
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 16px 0", paddingTop:"calc(env(safe-area-inset-top) + 16px)", flexShrink:0 }}>
              <button
                onClick={onClose}
                style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}
              >
                <X size={18} />
              </button>
              <span style={{ fontSize:14, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", letterSpacing:"-0.01em" }}>
                Add to story
              </span>
              <button
                onClick={handleContinue}
                disabled={!selected.length}
                style={{ background: selected.length ? "linear-gradient(135deg,#8B5CF6,#EC4899)" : "rgba(255,255,255,0.08)", border:"none", borderRadius:20, padding:"8px 18px", cursor: selected.length ? "pointer" : "default", color: selected.length ? "#fff" : "rgba(255,255,255,0.3)", fontSize:13, fontWeight:700, fontFamily:"'Inter',sans-serif", transition:"all 0.2s", boxShadow: selected.length ? "0 4px 16px rgba(139,92,246,0.4)" : "none" }}
              >
                Next
              </button>
            </div>

            {/* Selected thumbnails */}
            {selected.length > 0 && (
              <div style={{ padding:"16px 16px 0", flexShrink:0 }}>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {selected.map((s, idx) => (
                    <div
                      key={idx}
                      className="sum-thumb-wrap"
                      style={{ position:"relative", width:90, height:120, borderRadius:10, overflow:"hidden", flexShrink:0, border:"1.5px solid rgba(255,255,255,0.1)" }}
                    >
                      {s.mediaType === "video" ? (
                        <video src={s.previewUrl} muted playsInline style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                      ) : (
                        <img src={s.previewUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                      )}
                      {s.mediaType === "video" && s.duration && (
                        <div style={{ position:"absolute", bottom:5, left:5, backgroundColor:"rgba(0,0,0,0.65)", borderRadius:4, padding:"2px 5px", fontSize:10, color:"#fff", fontFamily:"'Inter',sans-serif", fontWeight:600 }}>
                          {fmtDuration(s.duration)}
                        </div>
                      )}
                      <button
                        className="sum-thumb-remove"
                        onClick={() => removeFile(idx)}
                        style={{ position:"absolute", top:4, right:4, width:20, height:20, borderRadius:"50%", background:"rgba(0,0,0,0.7)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}

                  {canAddMore && (
                    <button
                      className="sum-add-more"
                      onClick={() => addMoreInputRef.current?.click()}
                      style={{ width:90, height:120, borderRadius:10, border:"1.5px dashed rgba(255,255,255,0.18)", background:"rgba(255,255,255,0.03)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, color:"rgba(255,255,255,0.4)", transition:"all 0.2s" }}
                    >
                      <Plus size={20} />
                      <span style={{ fontSize:10, fontFamily:"'Inter',sans-serif", fontWeight:600 }}>Add more</span>
                    </button>
                  )}
                </div>
                <p style={{ margin:"10px 0 0", fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"'Inter',sans-serif" }}>
                  {selected.some((s) => s.mediaType === "video")
                    ? `1 video · ${selected.filter((s) => s.mediaType === "photo").length}/${MAX_WITH_VID} photos`
                    : `${selected.length}/${MAX_PHOTOS} photos`}
                </p>
              </div>
            )}

            {/* Empty state */}
            {selected.length === 0 && (
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:24, padding:24 }}>
                <div style={{ display:"flex", gap:12 }}>
                  <button
                    className="sum-pick-btn"
                    onClick={() => imageInputRef.current?.click()}
                    style={{ width:106, height:120, borderRadius:18, border:"1px solid rgba(255,255,255,0.1)", backgroundColor:"rgba(255,255,255,0.03)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, transition:"all 0.2s" }}
                  >
                    <div style={{ width:46, height:46, borderRadius:13, background:"rgba(139,92,246,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <ImagePlus size={22} color="#8B5CF6" />
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.7)", fontFamily:"'Inter',sans-serif" }}>Photo</span>
                  </button>

                  <button
                    className="sum-pick-btn"
                    onClick={() => videoInputRef.current?.click()}
                    style={{ width:106, height:120, borderRadius:18, border:"1px solid rgba(255,255,255,0.1)", backgroundColor:"rgba(255,255,255,0.03)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, transition:"all 0.2s" }}
                  >
                    <div style={{ width:46, height:46, borderRadius:13, background:"rgba(236,72,153,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Video size={22} color="#EC4899" />
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.7)", fontFamily:"'Inter',sans-serif" }}>Video</span>
                  </button>

                  <button
                    className="sum-pick-btn"
                    onClick={() => { setCtaType(null); setCtaMessage(""); setTextContent(""); setTextBg(TEXT_BACKGROUNDS[0]); setPhase("text"); }}
                    style={{ width:106, height:120, borderRadius:18, border:"1px solid rgba(255,255,255,0.1)", backgroundColor:"rgba(255,255,255,0.03)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, transition:"all 0.2s" }}
                  >
                    <div style={{ width:46, height:46, borderRadius:13, background:"rgba(16,185,129,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.7)", fontFamily:"'Inter',sans-serif" }}>Text</span>
                  </button>
                </div>
                <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,0.2)", fontFamily:"'Inter',sans-serif", textAlign:"center", lineHeight:1.6 }}>
                  Photo · Video · Text story · disappears in 24h
                </p>
              </div>
            )}

            {/* Drop zone when files already selected */}
            {selected.length > 0 && canAddMore && (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
                <button
                  className="sum-add-more"
                  onClick={() => addMoreInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)); }}
                  style={{ width:"100%", maxWidth:320, height:100, borderRadius:16, border:"1.5px dashed rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.02)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.2s" }}
                >
                  <Plus size={18} color="rgba(255,255,255,0.25)" />
                  <span style={{ fontSize:12, color:"rgba(255,255,255,0.25)", fontFamily:"'Inter',sans-serif" }}>Add more or drag & drop</span>
                </button>
              </div>
            )}

            {selected.length > 0 && !canAddMore && <div style={{ flex:1 }} />}

            {error && (
              <div style={{ margin:"0 16px 12px", padding:"9px 14px", backgroundColor:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10 }}>
                <p style={{ margin:0, fontSize:12, color:"#F87171", fontFamily:"'Inter',sans-serif" }}>{error}</p>
              </div>
            )}

            <input ref={imageInputRef}   type="file" accept="image/*"          multiple style={{ display:"none" }} onChange={handleInputChange} />
            <input ref={videoInputRef}   type="file" accept="video/*"                   style={{ display:"none" }} onChange={handleInputChange} />
            <input ref={addMoreInputRef} type="file" accept="image/*,video/*"  multiple style={{ display:"none" }} onChange={handleInputChange} />
          </div>
        )}

        {/* ═══════════════════════ CLIP ═══════════════════════════════════ */}
        {phase === "clip" && videoEntry && (
          <div
            className="sum-wrap"
            onClick={(e) => e.stopPropagation()}
            style={{ position:"relative", width:"100%", height:"100dvh", maxWidth:480, backgroundColor:"#000", display:"flex", flexDirection:"column" }}
          >
            <div style={{ flex:1, position:"relative", overflow:"hidden", minHeight:0 }}>
              <video
                ref={previewVideoRef}
                src={videoEntry.previewUrl}
                autoPlay muted loop playsInline
                style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }}
                onTimeUpdate={(e) => {
                  if (e.currentTarget.currentTime >= clipStart + clipDuration)
                    e.currentTarget.currentTime = clipStart;
                }}
              />
              <div style={{ position:"absolute", top:0, left:0, right:0, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px", paddingTop:"calc(env(safe-area-inset-top) + 16px)" }}>
                <button
                  onClick={() => setPhase("pick")}
                  style={{ background:"rgba(0,0,0,0.5)", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}
                >
                  <X size={18} />
                </button>
                <span style={{ fontSize:13, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif" }}>Trim video</span>
                <button
                  onClick={() => { setCarouselIdx(0); setPhase("preview"); }}
                  style={{ background:"linear-gradient(135deg,#8B5CF6,#EC4899)", border:"none", borderRadius:20, padding:"8px 18px", cursor:"pointer", color:"#fff", fontSize:13, fontWeight:700, fontFamily:"'Inter',sans-serif" }}
                >
                  Done
                </button>
              </div>
            </div>

            <div style={{ backgroundColor:"#000", flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px 6px" }}>
                <Volume2 size={14} color="rgba(255,255,255,0.55)" />
                <span style={{ fontSize:12, color:"rgba(255,255,255,0.55)", fontFamily:"'Inter',sans-serif" }}>
                  {fmtDuration(clipDuration)} · {fmtSize(videoEntry.file.size)}
                </span>
                <span style={{ marginLeft:"auto", fontSize:11, color:"rgba(255,255,255,0.35)", fontFamily:"'Inter',sans-serif" }}>
                  Drag to select clip
                </span>
              </div>

              <div
                ref={scrubRef}
                className="sum-scrub"
                style={{ position:"relative", height:68, margin:"0 4px 16px", borderRadius:6, overflow:"hidden" }}
              >
                <div style={{ display:"flex", height:"100%", width:"100%" }}>
                  {thumbsLoading
                    ? Array.from({ length: THUMB_COUNT }).map((_, i) => (
                        <div key={i} style={{ flex:1, height:"100%", backgroundColor:"#1C1C2E", borderRight:"1px solid #0A0A0F" }} />
                      ))
                    : thumbnails.map((thumb, i) => (
                        <div key={i} style={{ flex:1, height:"100%", backgroundImage: thumb ? `url(${thumb})` : "none", backgroundSize:"cover", backgroundPosition:"center", backgroundColor:"#111", borderRight:"1px solid rgba(0,0,0,0.3)" }} />
                      ))
                  }
                </div>
                <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)", pointerEvents:"none" }} />
                <div
                  style={{ position:"absolute", top:0, left:`${clipWinLeft}%`, width:`${clipWinW}%`, height:"100%", border:"3px solid #fff", borderRadius:4, boxSizing:"border-box", boxShadow:"0 0 0 1000px rgba(0,0,0,0.55)", zIndex:2 }}
                  onMouseDown={(e) => { e.preventDefault(); isDragging.current = true; dragStartX.current = e.clientX; dragStartClip.current = clipStart; }}
                  onTouchStart={(e) => { isDragging.current = true; dragStartX.current = e.touches[0].clientX; dragStartClip.current = clipStart; }}
                >
                  <div style={{ position:"absolute", left:5, top:"50%", transform:"translateY(-50%)", width:3, height:22, backgroundColor:"rgba(255,255,255,0.85)", borderRadius:2 }} />
                  <div style={{ position:"absolute", right:5, top:"50%", transform:"translateY(-50%)", width:3, height:22, backgroundColor:"rgba(255,255,255,0.85)", borderRadius:2 }} />
                  <span style={{ position:"absolute", bottom:-18, left:"50%", transform:"translateX(-50%)", fontSize:10, color:"rgba(255,255,255,0.6)", fontFamily:"'Inter',sans-serif", whiteSpace:"nowrap", pointerEvents:"none" }}>
                    {fmtDuration(clipStart)} – {fmtDuration(clipStart + clipDuration)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════ PREVIEW ════════════════════════════════ */}
        {phase === "preview" && selected.length > 0 && (
          <div
            className="sum-wrap"
            onClick={(e) => e.stopPropagation()}
            style={{ position:"relative", width:"100%", height:"100dvh", maxWidth:480, backgroundColor:"#000", display:"flex", flexDirection:"column" }}
          >
            {/* Back + Toolbar */}
            <div style={{ position:"absolute", top:"calc(env(safe-area-inset-top) + 16px)", left:0, right:0, zIndex:10, display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"0 16px" }}>
              <div style={{ display:"flex", gap:8 }}>
              <button
                onClick={() => {
                  const vid = selected.find((s) => s.mediaType === "video");
                  if (vid && vid.duration && vid.duration > CLIP_DURATION) setPhase("clip");
                  else setPhase("pick");
                }}
                style={{ background:"rgba(0,0,0,0.55)", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}
              >
                <X size={18} />
              </button>
              {selected.some((s) => s.mediaType === "video") && (
                <button
                  onClick={() => setIsMuted((m) => !m)}
                  style={{ background:"rgba(0,0,0,0.55)", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}
                >
                  {isMuted
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  }
                </button>
              )}
              </div>

              {/* Top-right icon toolbar */}
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, position:"relative" }}>
                <div style={{ display:"flex", gap:8 }}>
                  {/* Edit / Sticker icon */}
                  <button
                    onClick={() => setToolbarOpen((o) => !o)}
                    style={{ background: toolbarOpen || ctaType ? "rgba(139,92,246,0.7)" : "rgba(0,0,0,0.55)", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", backdropFilter:"blur(8px)", transition:"background 0.2s" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                  </button>
                </div>

                {/* Dropdown */}
                {toolbarOpen && (
                  <div style={{ background:"rgba(15,15,25,0.92)", backdropFilter:"blur(16px)", borderRadius:14, border:"1px solid rgba(255,255,255,0.12)", overflow:"hidden", minWidth:190, marginTop:4, animation:"sum-cta-in 0.18s ease forwards" }}>
                    <button
                      onClick={() => { const next = ctaType === "subscribe" ? null : "subscribe"; setCtaType(next); setToolbarOpen(false); if (next) setTimeout(measureVideoInset, 50); }}
                      style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:10, padding:"11px 14px", transition:"background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,92,246,0.15)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,#8B5CF6,#EC4899)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                      <div style={{ textAlign:"left" }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"#fff", fontFamily:"'Inter',sans-serif" }}>Subscribe CTA</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontFamily:"'Inter',sans-serif" }}>{ctaType === "subscribe" ? "Tap to remove" : "Add to story"}</div>
                      </div>
                      {ctaType === "subscribe" && (
                        <svg style={{ marginLeft:"auto" }} width="14" height="14" viewBox="0 0 12 12" fill="none"><polyline points="1,6 4,9 11,2" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Carousel */}
            <div
              ref={previewCanvasRef}
              style={{ flex:1, position:"relative", overflow:"hidden", minHeight:0 }}
              onTouchStart={(e) => { if (ctaDragRef.current.active) return; onCarouselTouchStart(e); }}
              onTouchEnd={(e) => { if (ctaDragRef.current.active) return; onCarouselTouchEnd(e); }}
              
            >
              {selected.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    position:      "absolute",
                    inset:         0,
                    opacity:       idx === carouselIdx ? 1 : 0,
                    transition:    "opacity 0.25s ease",
                    pointerEvents: idx === carouselIdx ? "auto" : "none",
                  }}
                >
                  {/* Blurred backdrop */}
                  <div style={{ position:"absolute", inset:0, overflow:"hidden" }}>
                    {s.mediaType === "video" ? (
                      <video src={s.previewUrl} muted playsInline style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", filter:"blur(18px)", transform:"scale(1.08)", opacity:0.55 }} />
                    ) : (
                      <img src={s.previewUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", filter:"blur(18px)", transform:"scale(1.08)", opacity:0.55 }} />
                    )}
                  </div>
                  {/* Foreground media — fully visible */}
                  {s.mediaType === "video" ? (
                    <video
                      key={`vid-${idx}-${carouselIdx}`}
                      src={s.previewUrl}
                      autoPlay loop playsInline
                      muted={isMuted}
                      style={{ position:"relative", zIndex:1, width:"100%", height:"100%", objectFit:"contain", display:"block" }}
                    />
                  ) : (
                    <img
                      src={s.previewUrl}
                      alt=""
                      style={{ position:"relative", zIndex:1, width:"100%", height:"100%", objectFit:"contain", display:"block" }}
                    />
                  )}
                </div>
              ))}

              {/* Arrows + dots — only when multiple */}
              {selected.length > 1 && (
                <>
                  <button
                    onClick={() => setCarouselIdx((i) => Math.max(i - 1, 0))}
                    disabled={carouselIdx === 0}
                    style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", zIndex:5, background:"rgba(0,0,0,0.55)", border:"none", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor: carouselIdx === 0 ? "default" : "pointer", color:"#fff", opacity: carouselIdx === 0 ? 0.3 : 1, transition:"opacity 0.2s" }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCarouselIdx((i) => Math.min(i + 1, selected.length - 1))}
                    disabled={carouselIdx === selected.length - 1}
                    style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", zIndex:5, background:"rgba(0,0,0,0.55)", border:"none", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor: carouselIdx === selected.length - 1 ? "default" : "pointer", color:"#fff", opacity: carouselIdx === selected.length - 1 ? 0.3 : 1, transition:"opacity 0.2s" }}
                  >
                    <ChevronRight size={20} />
                  </button>

                  {/* Dot indicators */}
                  <div style={{ position:"absolute", bottom:82, left:"50%", transform:"translateX(-50%)", display:"flex", gap:6, zIndex:5 }}>
                    {selected.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCarouselIdx(i)}
                        style={{ width: i === carouselIdx ? 18 : 6, height:6, borderRadius:3, background: i === carouselIdx ? "#fff" : "rgba(255,255,255,0.35)", border:"none", cursor:"pointer", padding:0, transition:"all 0.25s ease" }}
                      />
                    ))}
                  </div>

                  {/* Counter */}
                  <div style={{ position:"absolute", top:"calc(env(safe-area-inset-top) + 64px)", right:16, zIndex:10, background:"rgba(0,0,0,0.55)", borderRadius:12, padding:"4px 10px" }}>
                    <span style={{ fontSize:12, fontWeight:600, color:"#fff", fontFamily:"'Inter',sans-serif" }}>
                      {carouselIdx + 1}/{selected.length}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Subscribe pill moved to toolbar */}

            {/* Draggable CTA card */}
            {ctaType === "subscribe" && (
              <div
                ref={ctaCardRefPreview}
                style={{
                  position:"absolute", left:ctaInset, right:ctaInset, zIndex:8,
                  top:`calc(${ctaPositionY * 100}% - 72px)`,
                  userSelect:"none", WebkitUserSelect:"none",
                }}
              >
                {/* Grip handle — drag starts here */}
                <div
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); const card = ctaCardRefPreview.current; ctaDragRef.current = { active:true, startY:e.clientY, startPosY: card ? card.offsetTop : 0 }; }}
                  onTouchStart={(e) => { e.stopPropagation(); const card = ctaCardRefPreview.current; ctaDragRef.current = { active:true, startY:e.touches[0].clientY, startPosY: card ? card.offsetTop : 0 }; }}
                  style={{ display:"flex", justifyContent:"center", paddingBottom:6, cursor:"grab", touchAction:"none" }}
                >
                  <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                    {[0,1,2].map((i) => <div key={i} style={{ width:30, height:2.5, borderRadius:2, background:"rgba(255,255,255,0.55)" }} />)}
                  </div>
                </div>

                {/* Card body */}
                <div style={{ background:"rgba(0,0,0,0.45)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderRadius:20, padding:"10px 12px", border:"1px solid rgba(255,255,255,0.08)", position:"relative" }}>
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); setCtaType(null); setCtaMessage(""); setCtaPositionY(0.75); }}
                    style={{ position:"absolute", top:-8, right:-8, width:20, height:20, borderRadius:"50%", background:"rgba(0,0,0,0.7)", border:"1.5px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", zIndex:2, padding:0 }}
                  >
                    <X size={9} color="#fff" />
                  </button>
                  {ctaMessage.trim() && (
                    <p style={{ margin:"0 0 7px", fontSize:13, color:"rgba(255,255,255,0.9)", fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Inter',sans-serif", fontWeight:500, textAlign:"center", lineHeight:1.4, letterSpacing:"0.01em" }}>
                      {ctaMessage.trim()}
                    </p>
                  )}
                  <div style={{ display:"flex", alignItems:"center", gap:6, background:"linear-gradient(90deg,#8B5CF6,#EC4899)", borderRadius:50, padding:"8px 20px", position:"relative", overflow:"hidden", justifyContent:"center" }}>
                    <span style={{ fontSize:13, fontWeight:600, color:"#fff", fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Inter',sans-serif", position:"relative", zIndex:1, letterSpacing:"0.01em" }}>Subscribe</span>
                    <div style={{ position:"absolute", top:0, left:"-80%", width:"50%", height:"100%", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", transform:"skewX(-20deg)", animation:"sum-sweep 2.5s ease-in-out infinite" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Caption / Message + Send — floating */}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:10, padding:"12px 16px", paddingBottom:"calc(env(safe-area-inset-bottom) + 12px)" }}>
              {ctaType === "subscribe" && (
                <p style={{ margin:"0 0 6px 4px", fontSize:11, color:"#8B5CF6", fontFamily:"'Inter',sans-serif", fontWeight:600 }}>
                  ✦ Subscribe button added — drag it to reposition
                </p>
              )}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ flex:1, background: captionFocus || (ctaType ? ctaMessage : caption) ? "rgba(255,255,255,0.08)" : "transparent", backdropFilter: captionFocus || (ctaType ? ctaMessage : caption) ? "blur(20px)" : "none", WebkitBackdropFilter: captionFocus || (ctaType ? ctaMessage : caption) ? "blur(20px)" : "none", borderRadius:30, padding:"11px 18px", border: captionFocus ? "1px solid rgba(139,92,246,0.6)" : (ctaType ? ctaMessage : caption) ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.45)", transition:"all 0.25s", boxShadow: captionFocus ? "0 2px 16px rgba(0,0,0,0.25)" : "none" }}>
                  <input
                    className="sum-caption"
                    value={ctaType ? ctaMessage : caption}
                    onChange={(e) => ctaType ? setCtaMessage(e.target.value.slice(0, 80)) : setCaption(e.target.value)}
                    onFocus={() => setCaptionFocus(true)}
                    onBlur={() => setCaptionFocus(false)}
                    placeholder={ctaType ? "Add message for fans…" : "Add a caption…"}
                    maxLength={ctaType ? 80 : 300}
                  />
                </div>
                <button
                  onClick={handleSend}
                  style={{ width:46, height:46, borderRadius:"50%", border:"none", cursor:"pointer", background:"linear-gradient(135deg,#8B5CF6,#EC4899)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 20px rgba(139,92,246,0.55)", backdropFilter:"blur(8px)" }}
                >
                  <Send size={18} color="#fff" style={{ marginLeft:2 }} />
                </button>
              </div>
            </div>
          </div>
        )}
      {/* ═══════════════════════ TEXT ════════════════════════════════ */}
        {phase === "text" && (
          <div
            className="sum-wrap"
            onClick={(e) => e.stopPropagation()}
            style={{ position:"relative", width:"100%", height:"100dvh", maxWidth:480, display:"flex", flexDirection:"column" }}
          >
            {/* Canvas */}
            <div ref={textCanvasRef} style={{ flex:1, background:textBg, display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 24px 120px", position:"relative" }}
              
            >
              {/* Back button */}
              <div style={{ position:"absolute", top:"calc(env(safe-area-inset-top) + 16px)", left:16 }}>
                <button
                  onClick={() => setPhase("pick")}
                  style={{ background:"rgba(0,0,0,0.4)", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* CTA toggle */}
              <div style={{ position:"absolute", top:"calc(env(safe-area-inset-top) + 16px)", right:16, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                <button
                  onClick={() => setCtaSheetOpen((o) => !o)}
                  style={{ background: ctaSheetOpen || ctaType ? "rgba(139,92,246,0.7)" : "rgba(0,0,0,0.55)", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", backdropFilter:"blur(8px)", transition:"background 0.2s" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                </button>
                {ctaSheetOpen && (
                  <div style={{ background:"rgba(15,15,25,0.92)", backdropFilter:"blur(16px)", borderRadius:14, border:"1px solid rgba(255,255,255,0.12)", overflow:"hidden", minWidth:190, marginTop:4, animation:"sum-cta-in 0.18s ease forwards" }}>
                    <button
                      onClick={() => { setCtaType(ctaType === "subscribe" ? null : "subscribe"); setCtaSheetOpen(false); }}
                      style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:10, padding:"11px 14px", transition:"background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,92,246,0.15)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,#8B5CF6,#EC4899)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                      <div style={{ textAlign:"left" }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"#fff", fontFamily:"'Inter',sans-serif" }}>Subscribe CTA</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontFamily:"'Inter',sans-serif" }}>{ctaType === "subscribe" ? "Tap to remove" : "Add to story"}</div>
                      </div>
                      {ctaType === "subscribe" && (
                        <svg style={{ marginLeft:"auto" }} width="14" height="14" viewBox="0 0 12 12" fill="none"><polyline points="1,6 4,9 11,2" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Text area */}
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value.slice(0, 200))}
                placeholder="Type something…"
                maxLength={200}
                autoFocus
                style={{
                  background:"none", border:"none", outline:"none", resize:"none",
                  width:"100%", textAlign:"center", color:"#fff", caretColor:"#fff",
                  fontFamily:"'Inter',sans-serif", fontWeight: textContent.length <= 30 ? 700 : textContent.length <= 80 ? 600 : 400,
                  fontSize: getTextFontSize(textContent.length),
                  lineHeight: 1.3,
                  textShadow:"0 2px 12px rgba(0,0,0,0.4)",
                  overflowY:"auto", maxHeight:"60vh",
                }}
                rows={1}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = t.scrollHeight + "px";
                }}
              />

              {/* Char counter */}
              {textContent.length > 150 && (
                <div style={{ position:"absolute", bottom:130, right:20 }}>
                  <span style={{ fontSize:11, color: textContent.length >= 190 ? "#F87171" : "rgba(255,255,255,0.5)", fontFamily:"'Inter',sans-serif" }}>
                    {textContent.length}/200
                  </span>
                </div>
              )}

              {/* Draggable CTA card */}
              {ctaType === "subscribe" && (
                <div ref={ctaCardRefText} style={{ position:"absolute", left:16, right:16, zIndex:8, top:`calc(${ctaPositionY * 100}% - 72px)`, userSelect:"none", WebkitUserSelect:"none" }}>
                  <div
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); const card = ctaCardRefText.current; ctaDragRef.current = { active:true, startY:e.clientY, startPosY: card ? card.offsetTop : 0 }; }}
                    onTouchStart={(e) => { e.stopPropagation(); const card = ctaCardRefText.current; ctaDragRef.current = { active:true, startY:e.touches[0].clientY, startPosY: card ? card.offsetTop : 0 }; }}
                    style={{ display:"flex", justifyContent:"center", paddingBottom:6, cursor:"grab", touchAction:"none" }}
                  >
                    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                      {[0,1,2].map((i) => <div key={i} style={{ width:30, height:2.5, borderRadius:2, background:"rgba(255,255,255,0.55)" }} />)}
                    </div>
                  </div>
                  <div style={{ background:"rgba(0,0,0,0.45)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderRadius:20, padding:"10px 12px", border:"1px solid rgba(255,255,255,0.08)", position:"relative" }}>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setCtaType(null); setCtaMessage(""); setCtaPositionY(0.75); }}
                      style={{ position:"absolute", top:-8, right:-8, width:20, height:20, borderRadius:"50%", background:"rgba(0,0,0,0.7)", border:"1.5px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", zIndex:2, padding:0 }}
                    >
                      <X size={9} color="#fff" />
                    </button>
                    {ctaMessage.trim() && (
                      <p style={{ margin:"0 0 7px", fontSize:13, color:"rgba(255,255,255,0.9)", fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Inter',sans-serif", fontWeight:500, textAlign:"center", lineHeight:1.4, letterSpacing:"0.01em" }}>
                        {ctaMessage.trim()}
                      </p>
                    )}
                    <div style={{ display:"flex", alignItems:"center", gap:6, background:"linear-gradient(90deg,#8B5CF6,#EC4899)", borderRadius:50, padding:"8px 20px", position:"relative", overflow:"hidden", justifyContent:"center" }}>
                      <span style={{ fontSize:13, fontWeight:600, color:"#fff", fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Inter',sans-serif", position:"relative", zIndex:1, letterSpacing:"0.01em" }}>Subscribe</span>
                      <div style={{ position:"absolute", top:0, left:"-80%", width:"50%", height:"100%", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", transform:"skewX(-20deg)", animation:"sum-sweep 2.5s ease-in-out infinite" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom — background picker + CTA sheet + send */}
            <div style={{ flexShrink:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(16px)", borderTop:"1px solid rgba(255,255,255,0.08)" }}>

              

              {/* Background picker */}
              <div style={{ display:"flex", gap:8, padding:"12px 16px", overflowX:"auto", scrollbarWidth:"none" }}>
                {TEXT_BACKGROUNDS.map((bg, i) => (
                  <button
                    key={i}
                    onClick={() => setTextBg(bg)}
                    style={{
                      width:36, height:36, borderRadius:10, border: textBg === bg ? "2.5px solid #fff" : "2px solid transparent",
                      background:bg, cursor:"pointer", flexShrink:0, padding:0,
                      boxShadow: textBg === bg ? "0 0 0 1px rgba(255,255,255,0.3)" : "none",
                      transition:"all 0.15s",
                    }}
                  />
                ))}
              </div>

              {/* Error + Send */}
              {textPostErr && (
                <div style={{ margin:"0 16px 8px", padding:"8px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:10 }}>
                  <span style={{ fontSize:12, color:"#F87171", fontFamily:"'Inter',sans-serif" }}>{textPostErr}</span>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"flex-end", padding:"0 16px 16px", paddingBottom:"calc(env(safe-area-inset-bottom) + 16px)" }}>
                <button
                  onClick={handleSendText}
                  disabled={!textContent.trim() || textPosting}
                  style={{
                    width:50, height:50, borderRadius:"50%", border:"none",
                    cursor: textContent.trim() && !textPosting ? "pointer" : "default",
                    background: textContent.trim() && !textPosting ? "linear-gradient(135deg,#8B5CF6,#EC4899)" : "rgba(255,255,255,0.1)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow: textContent.trim() && !textPosting ? "0 4px 16px rgba(139,92,246,0.5)" : "none",
                    transition:"all 0.2s",
                  }}
                >
                  {textPosting
                    ? <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTop:"2px solid #fff", animation:"sb-spin 0.8s linear infinite" }} />
                    : <Send size={20} color={textContent.trim() ? "#fff" : "rgba(255,255,255,0.3)"} style={{ marginLeft:2 }} />
                  }
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  , document.body);
}