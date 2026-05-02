"use client";

import { useRef, useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  type Phase,
  type SelectedFile,
  CLIP_DURATION,
  MIN_CLIP_DURATION,
  THUMB_COUNT,
  fmtDuration,
  fmtSize,
} from "@/lib/hooks/useStoryUploadState";

interface StoryClipPhaseProps {
  videoEntry:    SelectedFile;
  clipStart:     number;
  setClipStart:  React.Dispatch<React.SetStateAction<number>>;
  clipEnd:       number;
  setClipEnd:    React.Dispatch<React.SetStateAction<number>>;
  videoDuration: number;
  thumbnails:    string[];
  thumbsLoading: boolean;
  setPhase:      (p: Phase) => void;
  setCarouselIdx:(n: number) => void;
  isMuted:       boolean;
  setIsMuted:    (b: boolean | ((prev: boolean) => boolean)) => void;
}

export default function StoryClipPhase({
  videoEntry, clipStart, setClipStart, clipEnd, setClipEnd, videoDuration,
  thumbnails, thumbsLoading, setPhase, setCarouselIdx, isMuted, setIsMuted,
}: StoryClipPhaseProps) {
  const [isPaused, setIsPaused] = useState(false);
  const previewVideoRef  = useRef<HTMLVideoElement>(null);
  const scrubRef         = useRef<HTMLDivElement>(null);
  const dragging         = useRef<"left" | "right" | null>(null);
  const dragStartX       = useRef(0);
  const dragStartClip    = useRef(0);

  const leftPct  = videoDuration > 0 ? (clipStart / videoDuration) * 100 : 0;
  const rightPct = videoDuration > 0 ? (clipEnd   / videoDuration) * 100 : 100;
  const clipDur  = clipEnd - clipStart;

  // Sync preview to clipStart on mount
  useEffect(() => {
    if (previewVideoRef.current) previewVideoRef.current.currentTime = clipStart;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Window-level drag
  useEffect(() => {
    const onMove = (clientX: number) => {
      if (!dragging.current || !scrubRef.current) return;
      const rect   = scrubRef.current.getBoundingClientRect();
      const dSec   = ((clientX - dragStartX.current) / rect.width) * videoDuration;
      const vid    = previewVideoRef.current;

      if (dragging.current === "left") {
        setClipStart((prev) => {
          const next = Math.max(0, Math.min(dragStartClip.current + dSec, clipEnd - MIN_CLIP_DURATION));
          if (vid) vid.currentTime = next;
          return next;
        });
      } else {
        setClipEnd((prev) => {
          const next = Math.min(
            videoDuration,
            Math.max(dragStartClip.current + dSec, clipStart + MIN_CLIP_DURATION),
            clipStart + CLIP_DURATION,
          );
          if (vid) vid.currentTime = Math.max(next - 0.5, clipStart);
          return next;
        });
      }
    };

    const onMouseMove  = (e: MouseEvent)  => onMove(e.clientX);
    const onTouchMove  = (e: TouchEvent)  => onMove(e.touches[0].clientX);
    const onUp         = ()               => { dragging.current = null; };

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
  }, [videoDuration, clipStart, clipEnd, setClipStart, setClipEnd]);

  const toggleClipPlayPause = () => {
    const vid = previewVideoRef.current;
    if (!vid) return;
    if (isPaused) { vid.play().catch(() => {}); setIsPaused(false); }
    else { vid.pause(); setIsPaused(true); }
    const el = document.getElementById("clip-center-overlay");
    if (el) { el.style.opacity = "1"; setTimeout(() => { el.style.opacity = "0"; }, 900); }
  };

  const startDrag = (side: "left" | "right", clientX: number) => {
    dragging.current    = side;
    dragStartX.current  = clientX;
    dragStartClip.current = side === "left" ? clipStart : clipEnd;
  };

  return (
    <div
      className="sum-wrap"
      onClick={(e) => e.stopPropagation()}
      style={{ position:"relative", width:"100%", height:"100dvh", maxWidth:480, backgroundColor:"#000", display:"flex", flexDirection:"column", overscrollBehaviorX:"none", touchAction:"pan-y" }}
    >
      {/* Video preview */}
      <div style={{ flex:1, position:"relative", overflow:"hidden", minHeight:0 }}>
        <video
          ref={previewVideoRef}
          src={videoEntry.previewUrl}
          autoPlay playsInline
          muted={isMuted}
          style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.currentTime >= clipEnd) { v.currentTime = clipStart; if (!isPaused) v.play().catch(() => {}); }
          }}
        />

        {/* Top bar */}
        <div style={{ position:"absolute", top:0, left:0, right:0, zIndex:5, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px", paddingTop:"calc(env(safe-area-inset-top) + 16px)" }}>
          <div style={{ display:"flex", gap:8 }}>
            <button
              onClick={() => setPhase("pick")}
              style={{ background:"rgba(0,0,0,0.5)", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}
            >
              <X size={18} />
            </button>
            <button
              onClick={toggleClipPlayPause}
              style={{ background:"rgba(0,0,0,0.5)", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}
            >
              {isPaused
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              }
            </button>
            <button
              onClick={() => setIsMuted((m) => !m)}
              style={{ background:"rgba(0,0,0,0.5)", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff" }}
            >
              {isMuted
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              }
            </button>
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:"#fff", fontFamily:"'Inter',sans-serif", textShadow:"0 1px 4px rgba(0,0,0,0.8)" }}>Trim clip</span>
          <button
            onClick={() => { setCarouselIdx(0); setPhase("preview"); }}
            style={{ background:"linear-gradient(135deg,#8B5CF6,#EC4899)", border:"none", borderRadius:20, padding:"8px 18px", cursor:"pointer", color:"#fff", fontSize:13, fontWeight:700, fontFamily:"'Inter',sans-serif" }}
          >
            Done
          </button>
        </div>

        {/* Center tap overlay */}
        <div
          onClick={toggleClipPlayPause}
          onTouchEnd={(e) => e.stopPropagation()}
          style={{ position:"absolute", inset:0, zIndex:4, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", pointerEvents:"auto" }}
        >
          <div style={{ opacity:0, transition:"opacity 0.4s ease", background:"rgba(0,0,0,0.45)", borderRadius:"50%", width:64, height:64, display:"flex", alignItems:"center", justifyContent:"center" }}
            id="clip-center-overlay"
          >
            {isPaused
              ? <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg>
              : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            }
          </div>
        </div>
        <div style={{ position:"absolute", bottom:16, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,0.6)", borderRadius:20, padding:"5px 14px", backdropFilter:"blur(8px)" }}>
          <span style={{ fontSize:13, fontWeight:600, color:"#fff", fontFamily:"'Inter',sans-serif" }}>
            {Math.round(clipDur)}s
          </span>
        </div>
      </div>

      {/* Scrubber */}
      <div style={{ backgroundColor:"#0A0A0F", flexShrink:0, paddingBottom:"calc(env(safe-area-inset-bottom) + 16px)" }}>

        {/* Info row */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px 8px" }}>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontFamily:"'Inter',sans-serif" }}>
            {fmtSize(videoEntry.file.size)}
          </span>
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)", fontFamily:"'Inter',sans-serif" }}>
            {MIN_CLIP_DURATION}s min · {CLIP_DURATION}s max
          </span>
        </div>

        {/* Filmstrip */}
        <div
          ref={scrubRef}
          style={{ position:"relative", height:72, margin:"0 16px 16px", borderRadius:10, overflow:"visible", userSelect:"none", WebkitUserSelect:"none" }}
        >
          {/* Frames */}
          <div style={{ display:"flex", height:"100%", width:"100%", borderRadius:10, overflow:"hidden" }}>
            {thumbsLoading
              ? Array.from({ length: THUMB_COUNT }).map((_, i) => (
                  <div key={i} style={{ flex:1, height:"100%", backgroundColor:"#1C1C2E", borderRight:"1px solid #0A0A0F" }} />
                ))
              : thumbnails.map((thumb, i) => (
                  <div key={i} style={{ flex:1, height:"100%", backgroundImage: thumb ? `url(${thumb})` : "none", backgroundSize:"cover", backgroundPosition:"center", backgroundColor:"#111", borderRight:"1px solid rgba(0,0,0,0.3)" }} />
                ))
            }
          </div>

          {/* Dim outside left */}
          <div style={{ position:"absolute", top:0, left:0, width:`${leftPct}%`, height:"100%", background:"rgba(0,0,0,0.6)", borderRadius:"10px 0 0 10px", pointerEvents:"none" }} />

          {/* Dim outside right */}
          <div style={{ position:"absolute", top:0, right:0, width:`${100 - rightPct}%`, height:"100%", background:"rgba(0,0,0,0.6)", borderRadius:"0 10px 10px 0", pointerEvents:"none" }} />

          {/* Active window border — top + bottom */}
          <div style={{ position:"absolute", top:0, left:`${leftPct}%`, width:`${rightPct - leftPct}%`, height:"100%", border:"2.5px solid #fff", borderLeft:"none", borderRight:"none", pointerEvents:"none", zIndex:2 }} />

          {/* Left handle label */}
          <div style={{ position:"absolute", top:-28, left:`${leftPct}%`, transform:"translateX(-50%)", background:"rgba(0,0,0,0.7)", borderRadius:8, padding:"3px 8px", pointerEvents:"none", zIndex:5, backdropFilter:"blur(6px)", whiteSpace:"nowrap" }}>
            <span style={{ fontSize:11, fontWeight:600, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{fmtDuration(clipStart)}</span>
          </div>

          {/* Left handle */}
          <div
            onMouseDown={(e) => { e.preventDefault(); startDrag("left", e.clientX); }}
            onTouchStart={(e) => { startDrag("left", e.touches[0].clientX); }}
            style={{
              position:"absolute", top:0, left:`${leftPct}%`,
              width:22, height:"100%",
              transform:"translateX(-50%)",
              cursor:"col-resize", zIndex:4,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}
          >
            <div style={{ width:22, height:"100%", background:"#fff", borderRadius:"10px 0 0 10px", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                {[0,1,2].map((i) => <div key={i} style={{ width:2.5, height:14, borderRadius:2, background:"rgba(0,0,0,0.5)" }} />)}
              </div>
            </div>
          </div>

          {/* Right handle label */}
          <div style={{ position:"absolute", top:-28, left:`${rightPct}%`, transform:"translateX(-50%)", background:"rgba(0,0,0,0.7)", borderRadius:8, padding:"3px 8px", pointerEvents:"none", zIndex:5, backdropFilter:"blur(6px)", whiteSpace:"nowrap" }}>
            <span style={{ fontSize:11, fontWeight:600, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{fmtDuration(clipEnd)}</span>
          </div>

          {/* Right handle */}
          <div
            onMouseDown={(e) => { e.preventDefault(); startDrag("right", e.clientX); }}
            onTouchStart={(e) => { startDrag("right", e.touches[0].clientX); }}
            style={{
              position:"absolute", top:0, left:`${rightPct}%`,
              width:22, height:"100%",
              transform:"translateX(-50%)",
              cursor:"col-resize", zIndex:4,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}
          >
            <div style={{ width:22, height:"100%", background:"#fff", borderRadius:"0 10px 10px 0", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                {[0,1,2].map((i) => <div key={i} style={{ width:2.5, height:14, borderRadius:2, background:"rgba(0,0,0,0.5)" }} />)}
              </div>
            </div>
          </div>

          {/* Playhead — animated via onTimeUpdate */}
          <div
            id="clip-playhead"
            style={{
              position:"absolute", top:0,
              left:`${leftPct}%`,
              width:2, height:"100%",
              background:"rgba(255,255,255,0.7)",
              borderRadius:2, zIndex:3, pointerEvents:"none",
              transition:"left 0.1s linear",
            }}
          />
        </div>
      </div>
    </div>
  );
}