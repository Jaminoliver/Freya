"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface LightboxPost {
  id: number;
  media: {
    id: number;
    media_type: string;
    file_url: string | null;
    thumbnail_url: string | null;
    raw_video_url: string | null;
    locked: boolean;
    display_order: number;
    processing_status: string | null;
    bunny_video_id: string | null;
  }[];
}

export default function Lightbox({ post, allPosts, initialMediaIndex = 0, onClose, onNavigate }: {
  post: LightboxPost;
  allPosts: LightboxPost[];
  initialMediaIndex?: number;
  onClose: () => void;
  onNavigate: (post: LightboxPost, mediaIndex?: number) => void;
}) {
  const [mediaIndex, setMediaIndex] = React.useState(initialMediaIndex);
  const currentPostIdx = allPosts.findIndex((p) => p.id === post.id);
  const hasPrevPost    = currentPostIdx > 0;
  const hasNextPost    = currentPostIdx < allPosts.length - 1;
  const images         = post.media?.filter((m) => m.media_type !== "video" && m.file_url) ?? [];
  const hasPrevImage   = mediaIndex > 0;
  const hasNextImage   = mediaIndex < images.length - 1;
  const activeMedia    = images[mediaIndex] ?? images[0];
  const [isMobile, setIsMobile] = React.useState(false);

  // Reset mediaIndex when post changes
  React.useEffect(() => {
    setMediaIndex(initialMediaIndex);
  }, [post.id, initialMediaIndex]);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const goPrev = () => {
    if (hasPrevImage) { setMediaIndex((i) => i - 1); return; }
    if (hasPrevPost)  onNavigate(allPosts[currentPostIdx - 1], 0);
  };

  const goNext = () => {
    if (hasNextImage) { setMediaIndex((i) => i + 1); return; }
    if (hasNextPost)  onNavigate(allPosts[currentPostIdx + 1], 0);
  };

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowLeft")   goPrev();
      if (e.key === "ArrowRight")  goNext();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [hasPrevImage, hasNextImage, hasPrevPost, hasNextPost, mediaIndex]);

  const hasPrev = hasPrevImage || hasPrevPost;
  const hasNext = hasNextImage || hasNextPost;

  if (isMobile) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, display: "flex", justifyContent: "flex-end", padding: "16px" }}>
          <button onClick={onClose} style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={20} />
          </button>
        </div>
        {images.length > 1 && (
          <div style={{ position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 10, backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", borderRadius: "20px", padding: "3px 10px", fontSize: "12px", fontWeight: 600, color: "#fff", fontFamily: "'Inter', sans-serif" }}>
            {mediaIndex + 1} / {images.length}
          </div>
        )}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          {activeMedia?.file_url && (
            <img src={activeMedia.file_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
          )}
          {hasPrev && (
            <button onClick={goPrev} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={20} />
            </button>
          )}
          {hasNext && (
            <button onClick={goNext} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronRight size={20} />
            </button>
          )}
        </div>
        {images.length > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "5px", padding: "12px" }}>
            {images.map((_, i) => (
              <button key={i} onClick={() => setMediaIndex(i)} style={{ width: i === mediaIndex ? "18px" : "6px", height: "6px", borderRadius: "3px", border: "none", backgroundColor: i === mediaIndex ? "#fff" : "rgba(255,255,255,0.45)", cursor: "pointer", padding: 0, transition: "all 0.25s", flexShrink: 0 }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingTop: "40px" }}>
      <button onClick={onClose} style={{ position: "absolute", top: "20px", right: "24px", background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", zIndex: 10 }}>
        <X size={24} strokeWidth={2} />
      </button>
      {images.length > 1 && (
        <div style={{ position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 10, backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", borderRadius: "20px", padding: "3px 10px", fontSize: "12px", fontWeight: 600, color: "#fff", fontFamily: "'Inter', sans-serif" }}>
          {mediaIndex + 1} / {images.length}
        </div>
      )}
      {hasPrev && (
        <button onClick={(e) => { e.stopPropagation(); goPrev(); }} style={{ position: "absolute", left: "16px", bottom: "50%", transform: "translateY(50%)", width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(30,30,46,0.9)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
          <ChevronLeft size={20} />
        </button>
      )}
      {hasNext && (
        <button onClick={(e) => { e.stopPropagation(); goNext(); }} style={{ position: "absolute", right: "16px", bottom: "50%", transform: "translateY(50%)", width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(30,30,46,0.9)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
          <ChevronRight size={20} />
        </button>
      )}
      {activeMedia?.file_url && (
        <img
          src={activeMedia.file_url}
          alt=""
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "600px", width: "100%", maxHeight: "calc(100vh - 40px)", objectFit: "contain", display: "block", objectPosition: "bottom" }}
        />
      )}
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "5px" }}>
          {images.map((_, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setMediaIndex(i); }} style={{ width: i === mediaIndex ? "18px" : "6px", height: "6px", borderRadius: "3px", border: "none", backgroundColor: i === mediaIndex ? "#fff" : "rgba(255,255,255,0.45)", cursor: "pointer", padding: 0, transition: "all 0.25s", flexShrink: 0 }} />
          ))}
        </div>
      )}
    </div>
  );
}