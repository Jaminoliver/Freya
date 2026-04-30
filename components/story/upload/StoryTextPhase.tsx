"use client";

import { useRef, useState } from "react";
import { X, Send } from "lucide-react";
import {
  type Phase,
  TEXT_BACKGROUNDS,
  getTextFontSize,
} from "@/lib/hooks/useStoryUploadState";

interface StoryTextPhaseProps {
  ctaType:         "subscribe" | null;
  setCtaType:      (t: "subscribe" | null) => void;
  ctaMessage:      string;
  setCtaMessage:   (m: string) => void;
  ctaPositionY:    number;
  setCtaPositionY: (n: number) => void;
  textContent:     string;
  setTextContent:  (t: string) => void;
  textBg:          string;
  setTextBg:       (bg: string) => void;
  textPosting:     boolean;
  textPostErr:     string | null;
  setPhase:        (p: Phase) => void;
  handleSendText:  () => void;
  ctaDragRef:      React.MutableRefObject<{ active: boolean; startY: number; startPosY: number }>;
  ctaPosRef:       React.MutableRefObject<number>;
  ctaCardRef:      React.RefObject<HTMLDivElement | null>;
}

export default function StoryTextPhase({
  ctaType, setCtaType, ctaMessage, setCtaMessage,
  ctaPositionY, setCtaPositionY,
  textContent, setTextContent, textBg, setTextBg,
  textPosting, textPostErr, setPhase, handleSendText,
  ctaDragRef, ctaPosRef, ctaCardRef,
}: StoryTextPhaseProps) {
  const [ctaSheetOpen, setCtaSheetOpen] = useState(false);

  return (
    <div
      className="sum-wrap"
      onClick={(e) => e.stopPropagation()}
      style={{ position:"relative", width:"100%", height:"100dvh", maxWidth:480, display:"flex", flexDirection:"column" }}
    >
      {/* Canvas */}
      <div
        style={{ flex:1, background:textBg, display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 24px 120px", position:"relative" }}
      >
        {/* Back */}
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

        {/* Text textarea */}
        <textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value.slice(0, 200))}
          placeholder="Type something…"
          maxLength={200}
          autoFocus
          style={{
            background:"none", border:"none", outline:"none", resize:"none",
            width:"100%", textAlign:"center", color:"#fff", caretColor:"#fff",
            fontFamily:"'Inter',sans-serif",
            fontWeight: textContent.length <= 30 ? 700 : textContent.length <= 80 ? 600 : 400,
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
          <div
            ref={ctaCardRef}
            style={{ position:"absolute", left:16, right:16, zIndex:8, top:`calc(${ctaPositionY * 100}% - 72px)`, userSelect:"none", WebkitUserSelect:"none" as any }}
          >
            {/* Grip */}
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
      </div>

      {/* Bottom — background picker + send */}
      <div style={{ flexShrink:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(16px)", borderTop:"1px solid rgba(255,255,255,0.08)" }}>

        {/* Background picker */}
        <div style={{ display:"flex", gap:8, padding:"12px 16px", overflowX:"auto", scrollbarWidth:"none" }}>
          {TEXT_BACKGROUNDS.map((bg, i) => (
            <button
              key={i}
              onClick={() => setTextBg(bg)}
              style={{
                width:36, height:36, borderRadius:10,
                border: textBg === bg ? "2.5px solid #fff" : "2px solid transparent",
                background:bg, cursor:"pointer", flexShrink:0, padding:0,
                boxShadow: textBg === bg ? "0 0 0 1px rgba(255,255,255,0.3)" : "none",
                transition:"all 0.15s",
              }}
            />
          ))}
        </div>

        {/* Error */}
        {textPostErr && (
          <div style={{ margin:"0 16px 8px", padding:"8px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:10 }}>
            <span style={{ fontSize:12, color:"#F87171", fontFamily:"'Inter',sans-serif" }}>{textPostErr}</span>
          </div>
        )}

        {/* Send */}
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
  );
}