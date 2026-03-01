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

export default function Lightbox({ post, allPosts, onClose, onNavigate }: {
  post: LightboxPost;
  allPosts: LightboxPost[];
  onClose: () => void;
  onNavigate: (post: LightboxPost) => void;
}) {
  const currentIdx = allPosts.findIndex((p) => p.id === post.id);
  const hasPrev    = currentIdx > 0;
  const hasNext    = currentIdx < allPosts.length - 1;
  const firstMedia = post.media?.[0];
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft"  && hasPrev) onNavigate(allPosts[currentIdx - 1]);
      if (e.key === "ArrowRight" && hasNext) onNavigate(allPosts[currentIdx + 1]);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [hasPrev, hasNext, currentIdx, allPosts, onClose, onNavigate]);

  if (isMobile) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, display: "flex", justifyContent: "flex-end", padding: "16px" }}>
          <button onClick={onClose} style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          {firstMedia?.file_url && (
            <img src={firstMedia.file_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
          )}
          {hasPrev && (
            <button onClick={() => onNavigate(allPosts[currentIdx - 1])} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={20} />
            </button>
          )}
          {hasNext && (
            <button onClick={() => onNavigate(allPosts[currentIdx + 1])} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingTop: "40px" }}>
      <button onClick={onClose} style={{ position: "absolute", top: "20px", right: "24px", background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", zIndex: 10 }}>
        <X size={24} strokeWidth={2} />
      </button>
      {hasPrev && (
        <button onClick={(e) => { e.stopPropagation(); onNavigate(allPosts[currentIdx - 1]); }} style={{ position: "absolute", left: "16px", bottom: "50%", transform: "translateY(50%)", width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(30,30,46,0.9)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
          <ChevronLeft size={20} />
        </button>
      )}
      {hasNext && (
        <button onClick={(e) => { e.stopPropagation(); onNavigate(allPosts[currentIdx + 1]); }} style={{ position: "absolute", right: "16px", bottom: "50%", transform: "translateY(50%)", width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(30,30,46,0.9)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
          <ChevronRight size={20} />
        </button>
      )}
      {firstMedia?.file_url && (
        <img
          src={firstMedia.file_url}
          alt=""
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "600px", width: "100%", maxHeight: "calc(100vh - 40px)", objectFit: "contain", display: "block", objectPosition: "bottom" }}
        />
      )}
    </div>
  );
}