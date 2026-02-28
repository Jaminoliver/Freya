"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Lock, X, ChevronLeft, ChevronRight } from "lucide-react";
import VideoPlayer from "@/components/video/VideoPlayer";

function Lightbox({ media, startIndex, onClose }: { media: { type: string; url: string; thumbnail_url?: string; bunny_video_id?: string | null; processing_status?: string | null }[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = React.useState(startIndex);
  const item = media[idx];

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")  setIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIdx((i) => Math.min(media.length - 1, i + 1));
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [media.length, onClose]);

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(0,0,0,0.96)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <button onClick={onClose} style={{ position: "absolute", top: "16px", right: "16px", width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
        <X size={20} />
      </button>

      {media.length > 1 && (
        <div style={{ position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: "20px", padding: "4px 14px", fontSize: "13px", color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
          {idx + 1} / {media.length}
        </div>
      )}

      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {item.type === "video"
          ? <div style={{ width: "90vw", maxWidth: "900px" }}><VideoPlayer bunnyVideoId={item.bunny_video_id ?? null} thumbnailUrl={item.thumbnail_url} rawVideoUrl={item.url} fillParent={false} /></div>
          : <img src={item.url} alt="" style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: "8px", display: "block" }} />
        }
      </div>

      {idx > 0 && (
        <button onClick={(e) => { e.stopPropagation(); setIdx((i) => i - 1); }} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} />
        </button>
      )}

      {idx < media.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); setIdx((i) => i + 1); }} style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronRight size={24} />
        </button>
      )}
    </div>,
    document.body
  );
}

interface MediaItem {
  type: string;
  url: string;
  thumbnail_url?: string;
  bunny_video_id?: string | null;
  processing_status?: string | null;
}

interface PostMediaProps {
  media: MediaItem[];
  isLocked: boolean;
  price?: number | null;
  onUnlock?: () => void;
}

export default function PostMedia({ media, isLocked, price, onUnlock }: PostMediaProps) {
  const [current,      setCurrent]      = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIdx,  setLightboxIdx]  = React.useState(0);

  if (!media || media.length === 0) return null;

  const openLightbox = (i: number) => { setLightboxIdx(i); setLightboxOpen(true); };

  // ── PPV / Locked ──────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div style={{ position: "relative", width: "100%", backgroundColor: "#0A0A0F" }}>
        <img
          src={media[0].thumbnail_url || media[0].url}
          alt=""
          style={{ width: "100%", maxHeight: "520px", objectFit: "cover", display: "block", filter: "blur(20px)", transform: "scale(1.06)" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(10,10,15,0.3), rgba(10,10,15,0.7))",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px",
        }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "rgba(139,92,246,0.2)", border: "2px solid #8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={22} color="#8B5CF6" />
          </div>
          <p style={{ margin: 0, fontSize: "14px", color: "#C4C4D4", fontFamily: "'Inter', sans-serif" }}>This content is locked</p>
          {price && (
            <button onClick={onUnlock} style={{ padding: "10px 28px", borderRadius: "10px", background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", border: "none", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              Unlock for ₦{price.toLocaleString("en-NG")}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Single media ──────────────────────────────────────────────────────────
  if (media.length === 1) {
    if (media[0].type === "video") {
      return (
        <div style={{ borderRadius: "12px", overflow: "hidden" }}>
          <VideoPlayer
            bunnyVideoId={media[0].bunny_video_id ?? null}
            thumbnailUrl={media[0].thumbnail_url}
            rawVideoUrl={media[0].url}
            fillParent={false}
          />
        </div>
      );
    }
    return (
      <>
        {lightboxOpen && <Lightbox media={media} startIndex={0} onClose={() => setLightboxOpen(false)} />}
        <div style={{ width: "100%", cursor: "zoom-in", borderRadius: "12px", overflow: "hidden" }} onClick={() => openLightbox(0)}>
          <img src={media[0].url} alt="" style={{ width: "100%", maxHeight: "560px", objectFit: "cover", display: "block" }} />
        </div>
      </>
    );
  }

  // ── Carousel ──────────────────────────────────────────────────────────────
  return (
    <>
      {lightboxOpen && <Lightbox media={media} startIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} />}
      <div style={{ position: "relative", width: "100%", backgroundColor: "#000", borderRadius: "12px", overflow: "hidden" }}>
        {media[current].type === "video" ? (
          <VideoPlayer
            bunnyVideoId={media[current].bunny_video_id ?? null}
            thumbnailUrl={media[current].thumbnail_url}
            rawVideoUrl={media[current].url}
            fillParent={false}
          />
        ) : (
          <img
            src={media[current].url}
            alt=""
            onClick={() => openLightbox(current)}
            style={{ width: "100%", maxHeight: "560px", objectFit: "cover", display: "block", cursor: "zoom-in" }}
          />
        )}

        {current > 0 && (
          <button onClick={() => setCurrent(current - 1)} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.6)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} />
          </button>
        )}

        {current < media.length - 1 && (
          <button onClick={() => setCurrent(current + 1)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.6)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={18} />
          </button>
        )}

        <div style={{ position: "absolute", bottom: "12px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px" }}>
          {media.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? "20px" : "6px", height: "6px", borderRadius: "3px", border: "none", cursor: "pointer", backgroundColor: i === current ? "#8B5CF6" : "rgba(255,255,255,0.5)", transition: "all 0.2s ease", padding: 0 }} />
          ))}
        </div>

        <div style={{ position: "absolute", top: "12px", right: "12px", backgroundColor: "rgba(0,0,0,0.6)", borderRadius: "20px", padding: "3px 10px", fontSize: "12px", color: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
          {current + 1} / {media.length}
        </div>
      </div>
    </>
  );
}