"use client";

import { useRef } from "react";
import { X, ImagePlus, Video, Plus } from "lucide-react";
import {
  type Phase,
  type SelectedFile,
  TEXT_BACKGROUNDS,
  MAX_PHOTOS,
  MAX_WITH_VID,
  fmtDuration,
} from "@/lib/hooks/useStoryUploadState";

interface StoryPickPhaseProps {
  selected:       SelectedFile[];
  error:          string | null;
  canAddMore:     boolean;
  onClose:        () => void;
  handleContinue: () => void;
  addFiles:       (files: File[]) => void;
  removeFile:     (idx: number) => void;
  setPhase:       (p: Phase) => void;
  setCtaType:     (t: "subscribe" | null) => void;
  setCtaMessage:  (m: string) => void;
  setTextContent: (t: string) => void;
  setTextBg:      (bg: string) => void;
}

export default function StoryPickPhase({
  selected, error, canAddMore, onClose, handleContinue,
  addFiles, removeFile, setPhase, setCtaType, setCtaMessage, setTextContent, setTextBg,
}: StoryPickPhaseProps) {
  const imageInputRef   = useRef<HTMLInputElement>(null);
  const videoInputRef   = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) addFiles(files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  return (
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
                  <video
                    src={s.previewUrl}
                    muted
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(e) => { e.currentTarget.currentTime = 0.1; }}
                    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
                  />
                ) : (
                  <img
                    src={s.previewUrl}
                    alt=""
                    decoding="async"
                    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
                  />
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

      {/* Empty state — 3 cards */}
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

      {/* Drop zone — files selected, can add more */}
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

      <input ref={imageInputRef}   type="file" accept="image/*"         multiple style={{ display:"none" }} onChange={handleInputChange} />
      <input ref={videoInputRef}   type="file" accept="video/*"                  style={{ display:"none" }} onChange={handleInputChange} />
      <input ref={addMoreInputRef} type="file" accept="image/*,video/*" multiple style={{ display:"none" }} onChange={handleInputChange} />
    </div>
  );
}