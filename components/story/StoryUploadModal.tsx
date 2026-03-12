"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ImagePlus, Video, Send, Music, Crop, Smile, Type, Pen, Volume2 } from "lucide-react";

export interface UploadJob {
  file:      File;
  caption:   string;
  mediaType: "photo" | "video";
  clipStart: number;
  clipEnd:   number;
}

interface StoryUploadModalProps {
  onClose:       () => void;
  onUploadStart: (job: UploadJob) => void;
}

type Phase = "pick" | "clip" | "preview";

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

export default function StoryUploadModal({ onClose, onUploadStart }: StoryUploadModalProps) {
  const imageInputRef   = useRef<HTMLInputElement>(null);
  const videoInputRef   = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const scrubRef        = useRef<HTMLDivElement>(null);
  const isDragging      = useRef(false);
  const dragStartX      = useRef(0);
  const dragStartClip   = useRef(0);

  const [phase,         setPhase]         = useState<Phase>("pick");
  const [file,          setFile]          = useState<File | null>(null);
  const [previewUrl,    setPreview]       = useState<string | null>(null);
  const [mediaType,     setMType]         = useState<"photo" | "video">("photo");
  const [caption,       setCaption]       = useState("");
  const [error,         setError]         = useState<string | null>(null);
  const [captionFocus,  setCaptionFocus]  = useState(false);
  const [videoDuration, setVideoDur]      = useState(0);
  const [clipStart,     setClipStart]     = useState(0);
  const [thumbnails,    setThumbnails]    = useState<string[]>([]);
  const [thumbsLoading, setThumbsLoading] = useState(false);
  const [fileSizeStr,   setFileSizeStr]   = useState("");

  // Lock scroll and hide mobile nav/header while modal is open
  useEffect(() => {
    document.body.classList.add("story-modal-open");
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("story-modal-open");
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (phase !== "clip" || !previewVideoRef.current) return;
    previewVideoRef.current.currentTime = clipStart;
  }, [clipStart, phase]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !scrubRef.current) return;
      const rect = scrubRef.current.getBoundingClientRect();
      const dx   = e.clientX - dragStartX.current;
      const dSec = (dx / rect.width) * videoDuration;
      setClipStart((prev) => Math.max(0, Math.min(videoDuration - CLIP_DURATION, dragStartClip.current + dSec)));
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || !scrubRef.current) return;
      const rect = scrubRef.current.getBoundingClientRect();
      const dx   = e.touches[0].clientX - dragStartX.current;
      const dSec = (dx / rect.width) * videoDuration;
      setClipStart((prev) => Math.max(0, Math.min(videoDuration - CLIP_DURATION, dragStartClip.current + dSec)));
    };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend",  onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend",  onUp);
    };
  }, [videoDuration]);

  const generateThumbnails = useCallback(async (url: string, duration: number) => {
    setThumbsLoading(true);
    try {
      const vid     = document.createElement("video");
      vid.src       = url;
      vid.muted     = true;
      vid.preload   = "auto";
      await new Promise<void>((res) => { vid.onloadeddata = () => res(); vid.load(); });
      const canvas  = document.createElement("canvas");
      canvas.width  = 44;
      canvas.height = 64;
      const ctx     = canvas.getContext("2d")!;
      const thumbs: string[] = [];
      for (let i = 0; i < THUMB_COUNT; i++) {
        const time = (i / (THUMB_COUNT - 1)) * duration;
        await new Promise<void>((res) => {
          const handler = () => {
            ctx.drawImage(vid, 0, 0, 44, 64);
            thumbs.push(canvas.toDataURL("image/jpeg", 0.6));
            vid.removeEventListener("seeked", handler);
            res();
          };
          vid.addEventListener("seeked", handler);
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

  const handleFile = useCallback((f: File) => {
    const isVideo = f.type.startsWith("video/");
    const isImage = f.type.startsWith("image/");
    if (!isVideo && !isImage) { setError("Only images and videos are supported."); return; }
    if (isImage && f.size > 20 * 1024 * 1024) { setError("Image must be under 20MB."); return; }
    setError(null);
    setFile(f);
    setMType(isVideo ? "video" : "photo");
    setFileSizeStr(fmtSize(f.size));
    const url = URL.createObjectURL(f);
    setPreview(url);
    if (isVideo) {
      const tmp = document.createElement("video");
      tmp.src   = url;
      tmp.onloadedmetadata = () => {
        const dur = tmp.duration;
        setVideoDur(dur);
        setClipStart(0);
        if (dur > CLIP_DURATION) {
          setPhase("clip");
          generateThumbnails(url, dur);
        } else {
          setPhase("preview");
        }
      };
    } else {
      setPhase("preview");
    }
  }, [generateThumbnails]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleSend = () => {
    if (!file) return;
    const clipEnd = mediaType === "video"
      ? Math.min(clipStart + CLIP_DURATION, videoDuration)
      : 0;
    onUploadStart({ file, caption: caption.trim(), mediaType, clipStart, clipEnd });
    onClose();
  };

  const reset = () => {
    setFile(null); setPreview(null); setCaption("");
    setError(null); setThumbnails([]); setPhase("pick");
  };

  const clipWindowLeft  = videoDuration > 0 ? (clipStart / videoDuration) * 100 : 0;
  const clipWindowWidth = videoDuration > 0 ? Math.min(100, (CLIP_DURATION / videoDuration) * 100) : 100;
  const clipDuration    = Math.min(CLIP_DURATION, videoDuration);

  const onScrubMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current    = true;
    dragStartX.current    = e.clientX;
    dragStartClip.current = clipStart;
  };
  const onScrubTouchStart = (e: React.TouchEvent) => {
    isDragging.current    = true;
    dragStartX.current    = e.touches[0].clientX;
    dragStartClip.current = clipStart;
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <style>{`
        @keyframes sum-in { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        .sum-wrap { animation: sum-in 0.18s ease forwards; }
        .sum-caption { background:none;border:none;outline:none;width:100%;color:#fff;font-size:14px;font-family:'Inter',sans-serif; }
        .sum-caption::placeholder { color:rgba(255,255,255,0.5); }
        .sum-pick-btn:hover { background:rgba(255,255,255,0.06) !important; }
        .sum-scrub { cursor:grab; }
        .sum-scrub:active { cursor:grabbing; }
        .sum-post-btn { display:none; }
        @media (min-width: 768px) { .sum-post-btn { display:flex !important; } }
      `}</style>

      {/* z-index 9998 — sits above tab bar and all page chrome, just below StoryViewer (9999) */}
      <div
        onClick={phase === "pick" ? onClose : undefined}
        style={{ position:"fixed", inset:0, zIndex:9998, background:"#000", display:"flex", alignItems:"center", justifyContent:"center" }}
      >

        {/* ── PICK ────────────────────────────────────────────────────────── */}
        {phase === "pick" && (
          <div
            className="sum-wrap"
            onClick={(e) => e.stopPropagation()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{ position:"relative", width:"100%", height:"100dvh", maxWidth:480, backgroundColor:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:32, padding:24 }}
          >
            {/* Close — top left */}
            <button
              onClick={onClose}
              style={{ position:"fixed", top:20, left:20, background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}
            >
              <X size={18} />
            </button>

            {/* Post Story — top right, desktop only */}
            <button
              className="sum-post-btn"
              onClick={() => imageInputRef.current?.click()}
              style={{ position:"fixed", top:20, right:20, background:"linear-gradient(135deg,#8B5CF6,#EC4899)", border:"none", borderRadius:24, padding:"10px 20px", display:"none", alignItems:"center", gap:8, cursor:"pointer", color:"#fff", fontSize:13, fontWeight:700, fontFamily:"'Inter',sans-serif", boxShadow:"0 4px 16px rgba(139,92,246,0.4)" }}
            >
              <ImagePlus size={15} />
              Post Story
            </button>

            <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,0.4)", fontFamily:"'Inter',sans-serif", letterSpacing:"0.04em", textTransform:"uppercase" }}>
              Add to Story
            </p>

            <div style={{ display:"flex", gap:16 }}>
              <button
                className="sum-pick-btn"
                onClick={() => imageInputRef.current?.click()}
                style={{ width:120, height:120, borderRadius:20, border:"1px solid rgba(255,255,255,0.1)", backgroundColor:"rgba(255,255,255,0.03)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, transition:"background 0.2s" }}
              >
                <div style={{ width:46, height:46, borderRadius:14, background:"rgba(139,92,246,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <ImagePlus size={22} color="#8B5CF6" />
                </div>
                <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.7)", fontFamily:"'Inter',sans-serif" }}>Photo</span>
              </button>

              <button
                className="sum-pick-btn"
                onClick={() => videoInputRef.current?.click()}
                style={{ width:120, height:120, borderRadius:20, border:"1px solid rgba(255,255,255,0.1)", backgroundColor:"rgba(255,255,255,0.03)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, transition:"background 0.2s" }}
              >
                <div style={{ width:46, height:46, borderRadius:14, background:"rgba(236,72,153,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Video size={22} color="#EC4899" />
                </div>
                <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.7)", fontFamily:"'Inter',sans-serif" }}>Video</span>
              </button>
            </div>

            <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,0.2)", fontFamily:"'Inter',sans-serif" }}>
              or drag & drop · disappears in 24h
            </p>

            {error && <p style={{ margin:0, fontSize:12, color:"#F87171", fontFamily:"'Inter',sans-serif" }}>{error}</p>}

            <input ref={imageInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleInputChange} />
            <input ref={videoInputRef} type="file" accept="video/*" style={{ display:"none" }} onChange={handleInputChange} />
          </div>
        )}

        {/* ── CLIP ────────────────────────────────────────────────────────── */}
        {phase === "clip" && previewUrl && (
          <div
            className="sum-wrap"
            onClick={(e) => e.stopPropagation()}
            style={{ position:"relative", width:"100%", height:"100dvh", maxWidth:480, backgroundColor:"#000", display:"flex", flexDirection:"column" }}
          >
            <div style={{ flex:1, position:"relative", overflow:"hidden", minHeight:0 }}>
              <video
                ref={previewVideoRef}
                src={previewUrl}
                autoPlay muted loop playsInline
                style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }}
                onTimeUpdate={(e) => {
                  if (e.currentTarget.currentTime >= clipStart + clipDuration) {
                    e.currentTarget.currentTime = clipStart;
                  }
                }}
              />

              <div style={{ position:"absolute", top:0, left:0, right:0, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px", paddingTop:"calc(env(safe-area-inset-top) + 16px)" }}>
                <button
                  onClick={reset}
                  style={{ background:"rgba(0,0,0,0.5)", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}
                >
                  <X size={18} />
                </button>
                <div style={{ display:"flex", gap:18, alignItems:"center" }}>
                  {[Music, Crop, Smile, Type, Pen].map((Icon, i) => (
                    <button key={i} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.85)", padding:4, display:"flex" }}>
                      <Icon size={20} />
                    </button>
                  ))}
                </div>
                <div style={{ width:38 }} />
              </div>
            </div>

            <div style={{ backgroundColor:"#000", flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px 6px" }}>
                <Volume2 size={14} color="rgba(255,255,255,0.55)" />
                <span style={{ fontSize:12, color:"rgba(255,255,255,0.55)", fontFamily:"'Inter',sans-serif" }}>
                  {fmtDuration(clipDuration)} · {fileSizeStr}
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
                        <div
                          key={i}
                          style={{ flex:1, height:"100%", backgroundImage: thumb ? `url(${thumb})` : "none", backgroundSize:"cover", backgroundPosition:"center", backgroundColor:"#111", borderRight:"1px solid rgba(0,0,0,0.3)" }}
                        />
                      ))
                  }
                </div>
                <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.55)", pointerEvents:"none" }} />
                <div
                  style={{ position:"absolute", top:0, left:`${clipWindowLeft}%`, width:`${clipWindowWidth}%`, height:"100%", border:"3px solid #fff", borderRadius:4, boxSizing:"border-box", boxShadow:"0 0 0 1000px rgba(0,0,0,0.55)", zIndex:2, cursor:"grab" }}
                  onMouseDown={onScrubMouseDown}
                  onTouchStart={onScrubTouchStart}
                >
                  <div style={{ position:"absolute", left:5, top:"50%", transform:"translateY(-50%)", width:3, height:22, backgroundColor:"rgba(255,255,255,0.85)", borderRadius:2 }} />
                  <div style={{ position:"absolute", right:5, top:"50%", transform:"translateY(-50%)", width:3, height:22, backgroundColor:"rgba(255,255,255,0.85)", borderRadius:2 }} />
                  <span style={{ position:"absolute", bottom:-18, left:"50%", transform:"translateX(-50%)", fontSize:10, color:"rgba(255,255,255,0.6)", fontFamily:"'Inter',sans-serif", whiteSpace:"nowrap", pointerEvents:"none" }}>
                    {fmtDuration(clipStart)} – {fmtDuration(clipStart + clipDuration)}
                  </span>
                </div>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"0 16px 20px", paddingBottom:"calc(env(safe-area-inset-bottom) + 20px)" }}>
                <div style={{ flex:1, background: captionFocus ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.1)", borderRadius:24, padding:"10px 16px", border: captionFocus ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.08)", transition:"all 0.2s" }}>
                  <input
                    className="sum-caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    onFocus={() => setCaptionFocus(true)}
                    onBlur={() => setCaptionFocus(false)}
                    placeholder="Add a caption…"
                    maxLength={300}
                  />
                </div>
                <button
                  onClick={handleSend}
                  style={{ width:50, height:50, borderRadius:"50%", border:"none", cursor:"pointer", background:"linear-gradient(135deg, #25D366, #128C7E)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 12px rgba(37,211,102,0.4)" }}
                >
                  <Send size={20} color="#fff" style={{ marginLeft:2 }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PREVIEW ─────────────────────────────────────────────────────── */}
        {phase === "preview" && previewUrl && (
          <div
            className="sum-wrap"
            onClick={(e) => e.stopPropagation()}
            style={{ position:"relative", width:"100%", height:"100dvh", maxWidth:480, backgroundColor:"#000", display:"flex", flexDirection:"column" }}
          >
            {/* Close button */}
            <div style={{ position:"absolute", top:"calc(env(safe-area-inset-top) + 16px)", left:16, zIndex:2 }}>
              <button
                onClick={reset}
                style={{ background:"rgba(0,0,0,0.5)", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Media — fills remaining space above caption bar */}
            <div style={{ flex:1, position:"relative", overflow:"hidden", minHeight:0 }}>
              {mediaType === "video" ? (
                <video src={previewUrl} autoPlay muted loop playsInline style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }} />
              ) : (
                <img src={previewUrl} alt="preview" style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }} />
              )}
              {error && (
                <div style={{ position:"absolute", top:64, left:"50%", transform:"translateX(-50%)", backgroundColor:"rgba(239,68,68,0.9)", borderRadius:8, padding:"7px 16px", fontSize:12, color:"#fff", fontFamily:"'Inter',sans-serif", whiteSpace:"nowrap" }}>
                  {error}
                </div>
              )}
            </div>

            {/* Caption bar — solid, always visible, never overlapped by media */}
            <div style={{ flexShrink:0, backgroundColor:"#0D0D18", borderTop:"1px solid #1A1A2E", display:"flex", alignItems:"center", gap:12, padding:"12px 16px", paddingBottom:"calc(env(safe-area-inset-bottom) + 12px)" }}>
              <div style={{ flex:1, background: captionFocus ? "#1C1C2E" : "#13131F", borderRadius:24, padding:"10px 16px", border: captionFocus ? "1px solid #8B5CF6" : "1px solid #2A2A3D", transition:"all 0.2s" }}>
                <input
                  className="sum-caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onFocus={() => setCaptionFocus(true)}
                  onBlur={() => setCaptionFocus(false)}
                  placeholder="Add a caption…"
                  maxLength={300}
                />
              </div>
              <button
                onClick={handleSend}
                style={{ width:50, height:50, borderRadius:"50%", border:"none", cursor:"pointer", background:"linear-gradient(135deg, #8B5CF6, #EC4899)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 16px rgba(139,92,246,0.5)" }}
              >
                <Send size={20} color="#fff" style={{ marginLeft:2 }} />
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  , document.body);
}