"use client";

import { useRef, useState, useCallback } from "react";
import { X, Send, ChevronLeft, ChevronRight } from "lucide-react";
import {
  type Phase,
  type SelectedFile,
  CLIP_DURATION,
} from "@/lib/hooks/useStoryUploadState";

interface StoryPreviewPhaseProps {
  selected:         SelectedFile[];
  carouselIdx:      number;
  setCarouselIdx:   (n: number) => void;
  getCtaForSlide:        (i: number) => { type: "subscribe" | null; message: string; positionY: number };
  setCtaTypeForSlide:    (i: number, t: "subscribe" | null) => void;
  setCtaMessageForSlide: (i: number, m: string) => void;
  setCtaPositionForSlide:(i: number, n: number) => void;
  caption:          string;
  setCaption:       (s: string) => void;
  captionFocus:     boolean;
  setCaptionFocus:  (b: boolean) => void;
  isMuted:          boolean;
  setIsMuted:       (b: boolean | ((prev: boolean) => boolean)) => void;
  toolbarOpen:      boolean;
  setToolbarOpen:   (b: boolean | ((prev: boolean) => boolean)) => void;
  clipStart:        number;
  setPhase:         (p: Phase) => void;
  handleSend:       () => void;
  ctaDragRef:       React.MutableRefObject<{ active: boolean; startY: number; startPosY: number }>;
  ctaPosRef:        React.MutableRefObject<number>;
  ctaCardRef:       React.RefObject<HTMLDivElement | null>;
}

export default function StoryPreviewPhase({
  selected, carouselIdx, setCarouselIdx,
  getCtaForSlide, setCtaTypeForSlide, setCtaMessageForSlide, setCtaPositionForSlide,
  caption, setCaption, captionFocus, setCaptionFocus,
  isMuted, setIsMuted, toolbarOpen, setToolbarOpen,
  clipStart, setPhase, handleSend,
  ctaDragRef, ctaPosRef, ctaCardRef,
}: StoryPreviewPhaseProps) {
  const { type: ctaType, message: ctaMessage, positionY: ctaPositionY } = getCtaForSlide(carouselIdx);
  const setCtaType      = (t: "subscribe" | null) => setCtaTypeForSlide(carouselIdx, t);
  const setCtaMessage   = (m: string) => setCtaMessageForSlide(carouselIdx, m);
  const setCtaPositionY = (n: number) => setCtaPositionForSlide(carouselIdx, n);
  const previewCanvasRef = useRef<HTMLDivElement>(null);
  const touchStartX      = useRef(0);
  const [ctaInset, setCtaInset] = useState(16);

  const measureVideoInset = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const allVids = canvas?.querySelectorAll("video");
    const vid = allVids?.[0] as HTMLVideoElement | undefined;
    if (!vid || !canvas) return;
    const cW = canvas.clientWidth;
    const cH = canvas.clientHeight;
    const vW = vid.videoWidth;
    const vH = vid.videoHeight;
    if (!vW || !vH) return;
    const containerAR = cW / cH;
    const videoAR     = vW / vH;
    const renderedW   = videoAR > containerAR ? cW : cH * videoAR;
    setCtaInset((cW - renderedW) / 2 + 8);
  }, []);

  const onCarouselTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onCarouselTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) setCarouselIdx(Math.min(carouselIdx + 1, selected.length - 1));
    else         setCarouselIdx(Math.max(carouselIdx - 1, 0));
  };

  const hasVideo = selected.some((s) => s.mediaType === "video");

  return (
    <div
      className="sum-wrap"
      onClick={(e) => e.stopPropagation()}
      style={{ position:"relative", width:"100%", height:"100dvh", maxWidth:480, backgroundColor:"#000", display:"flex", flexDirection:"column" }}
    >
      {/* Top bar — back + mute + toolbar */}
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
          {hasVideo && (
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

        {/* Toolbar — CTA toggle */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, position:"relative" }}>
          <button
            onClick={() => setToolbarOpen((o) => !o)}
            style={{ background: toolbarOpen || ctaType ? "rgba(139,92,246,0.7)" : "rgba(0,0,0,0.55)", border:"none", borderRadius:"50%", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", backdropFilter:"blur(8px)", transition:"background 0.2s" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </button>

          {toolbarOpen && (
            <div style={{ background:"rgba(15,15,25,0.92)", backdropFilter:"blur(16px)", borderRadius:14, border:"1px solid rgba(255,255,255,0.12)", overflow:"hidden", minWidth:190, marginTop:4, animation:"sum-cta-in 0.18s ease forwards" }}>
              <button
                onClick={() => {
                  const next = ctaType === "subscribe" ? null : "subscribe";
                  setCtaType(next);
                  setToolbarOpen(false);
                  if (next) setTimeout(measureVideoInset, 50);
                }}
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
        onTouchEnd={(e)   => { if (ctaDragRef.current.active) return; onCarouselTouchEnd(e); }}
      >
        {selected.map((s, idx) => (
          <div
            key={idx}
            style={{ position:"absolute", inset:0, opacity: idx === carouselIdx ? 1 : 0, transition:"opacity 0.25s ease", pointerEvents: idx === carouselIdx ? "auto" : "none" }}
          >
            {/* Blurred backdrop */}
            <div style={{ position:"absolute", inset:0, overflow:"hidden" }}>
              {s.mediaType === "video"
                ? <video src={s.previewUrl} muted playsInline style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", filter:"blur(18px)", transform:"scale(1.08)", opacity:0.55 }} />
                : <img   src={s.previewUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", filter:"blur(18px)", transform:"scale(1.08)", opacity:0.55 }} />
              }
            </div>
            {/* Foreground */}
            {s.mediaType === "video"
              ? <video key={`vid-${idx}-${carouselIdx}`} src={s.previewUrl} autoPlay loop playsInline muted={isMuted} style={{ position:"relative", zIndex:1, width:"100%", height:"100%", objectFit:"contain", display:"block" }} />
              : <img   src={s.previewUrl} alt="" style={{ position:"relative", zIndex:1, width:"100%", height:"100%", objectFit:"contain", display:"block" }} />
            }
          </div>
        ))}

        {/* Multi-file arrows + dots + counter */}
        {selected.length > 1 && (
          <>
            <button onClick={() => setCarouselIdx(Math.max(carouselIdx - 1, 0))} disabled={carouselIdx === 0}
              style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", zIndex:5, background:"rgba(0,0,0,0.55)", border:"none", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor: carouselIdx === 0 ? "default" : "pointer", color:"#fff", opacity: carouselIdx === 0 ? 0.3 : 1, transition:"opacity 0.2s" }}>
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setCarouselIdx(Math.min(carouselIdx + 1, selected.length - 1))} disabled={carouselIdx === selected.length - 1}
              style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", zIndex:5, background:"rgba(0,0,0,0.55)", border:"none", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor: carouselIdx === selected.length - 1 ? "default" : "pointer", color:"#fff", opacity: carouselIdx === selected.length - 1 ? 0.3 : 1, transition:"opacity 0.2s" }}>
              <ChevronRight size={20} />
            </button>
            <div style={{ position:"absolute", bottom:82, left:"50%", transform:"translateX(-50%)", display:"flex", gap:6, zIndex:5 }}>
              {selected.map((_, i) => (
                <button key={i} onClick={() => setCarouselIdx(i)}
                  style={{ width: i === carouselIdx ? 18 : 6, height:6, borderRadius:3, background: i === carouselIdx ? "#fff" : "rgba(255,255,255,0.35)", border:"none", cursor:"pointer", padding:0, transition:"all 0.25s ease" }} />
              ))}
            </div>
            <div style={{ position:"absolute", top:"calc(env(safe-area-inset-top) + 64px)", right:16, zIndex:10, background:"rgba(0,0,0,0.55)", borderRadius:12, padding:"4px 10px" }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#fff", fontFamily:"'Inter',sans-serif" }}>{carouselIdx + 1}/{selected.length}</span>
            </div>
          </>
        )}
      </div>

      {/* Draggable CTA card */}
      {ctaType === "subscribe" && (
        <div
          ref={ctaCardRef}
          style={{ position:"absolute", left:ctaInset, right:ctaInset, zIndex:8, top:`calc(${ctaPositionY * 100}% - 72px)`, userSelect:"none", WebkitUserSelect:"none" as any }}
        >
          {/* Grip handle */}
          <div
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); ctaDragRef.current = { active:true, startY:e.clientY, startPosY: ctaCardRef.current?.offsetTop ?? 0 }; }}
            onTouchStart={(e) => { e.stopPropagation(); ctaDragRef.current = { active:true, startY:e.touches[0].clientY, startPosY: ctaCardRef.current?.offsetTop ?? 0 }; }}
            style={{ display:"flex", justifyContent:"center", paddingBottom:6, cursor:"grab", touchAction:"none" }}
          >
            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
              {[0,1,2].map((i) => <div key={i} style={{ width:30, height:2.5, borderRadius:2, background:"rgba(255,255,255,0.55)" }} />)}
            </div>
          </div>
          {/* Card */}
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

      {/* Floating caption / message + send */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:10, padding:"12px 16px", paddingBottom:"calc(env(safe-area-inset-bottom) + 20px)" }}>
        {ctaType === "subscribe" && (
          <p style={{ margin:"0 0 6px 4px", fontSize:11, color:"#8B5CF6", fontFamily:"'Inter',sans-serif", fontWeight:600 }}>
            ✦ Subscribe button added — drag it to reposition
          </p>
        )}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            flex:1, background: captionFocus || (ctaType ? ctaMessage : caption) ? "rgba(255,255,255,0.08)" : "transparent",
            backdropFilter: captionFocus || (ctaType ? ctaMessage : caption) ? "blur(20px)" : "none",
            WebkitBackdropFilter: captionFocus || (ctaType ? ctaMessage : caption) ? "blur(20px)" : "none",
            borderRadius:30, padding:"11px 18px",
            border: captionFocus ? "1px solid rgba(139,92,246,0.6)" : (ctaType ? ctaMessage : caption) ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.45)",
            transition:"all 0.25s", boxShadow: captionFocus ? "0 2px 16px rgba(0,0,0,0.25)" : "none",
          }}>
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
            style={{ width:46, height:46, borderRadius:"50%", border:"none", cursor:"pointer", background:"linear-gradient(135deg,#8B5CF6,#EC4899)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 20px rgba(139,92,246,0.55)" }}
          >
            <Send size={18} color="#fff" style={{ marginLeft:2 }} />
          </button>
        </div>
      </div>
    </div>
  );
}