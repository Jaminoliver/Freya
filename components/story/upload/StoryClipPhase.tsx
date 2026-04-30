"use client";

import { useRef, useEffect } from "react";
import { X, Volume2 } from "lucide-react";
import {
  type Phase,
  type SelectedFile,
  CLIP_DURATION,
  THUMB_COUNT,
  fmtDuration,
  fmtSize,
} from "@/lib/hooks/useStoryUploadState";

interface StoryClipPhaseProps {
  videoEntry:    SelectedFile;
  clipStart:     number;
  setClipStart:  React.Dispatch<React.SetStateAction<number>>;
  videoDuration: number;
  thumbnails:    string[];
  thumbsLoading: boolean;
  setPhase:      (p: Phase) => void;
  setCarouselIdx:(n: number) => void;
}

export default function StoryClipPhase({
  videoEntry, clipStart, setClipStart, videoDuration,
  thumbnails, thumbsLoading, setPhase, setCarouselIdx,
}: StoryClipPhaseProps) {
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const scrubRef        = useRef<HTMLDivElement>(null);
  const isDragging      = useRef(false);
  const dragStartX      = useRef(0);
  const dragStartClip   = useRef(0);

  const clipDuration = Math.min(CLIP_DURATION, videoDuration);
  const clipWinLeft  = videoDuration > 0 ? (clipStart / videoDuration) * 100 : 0;
  const clipWinW     = videoDuration > 0 ? Math.min(100, (CLIP_DURATION / videoDuration) * 100) : 100;

  // Sync video to clipStart
  useEffect(() => {
    if (!previewVideoRef.current) return;
    previewVideoRef.current.currentTime = clipStart;
  }, [clipStart]);

  // Window-level scrub drag
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
  }, [videoDuration, setClipStart]);

  return (
    <div
      className="sum-wrap"
      onClick={(e) => e.stopPropagation()}
      style={{ position:"relative", width:"100%", height:"100dvh", maxWidth:480, backgroundColor:"#000", display:"flex", flexDirection:"column" }}
    >
      {/* Video preview */}
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

      {/* Scrubber */}
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
  );
}