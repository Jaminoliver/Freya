"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Pencil, BookImage } from "lucide-react";

interface AvatarPreviewModalProps {
  avatarUrl?:       string | null;
  displayName:      string | null;
  isEditable?:      boolean;
  isCreator?:       boolean;
  storyUploading?:  boolean;
  onClose:          () => void;
  onEditAvatar?:    () => void;
  onAddToStory?:    () => void;
}

const GRADIENT = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";

export default function AvatarPreviewModal({
  avatarUrl,
  displayName,
  isEditable = false,
  isCreator  = false,
  storyUploading = false,
  onClose,
  onEditAvatar,
  onAddToStory,
}: AvatarPreviewModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, []);

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  const firstLetter = (displayName || "?").charAt(0).toUpperCase();

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset:    0,
        zIndex:   9999,
        display:  "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter:  "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        padding:       "24px",
        paddingTop:    "calc(24px + env(safe-area-inset-top))",
        paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        animation:     "_avatarPreviewFade 0.2s ease-out",
      }}
    >
      <style>{`
        @keyframes _avatarPreviewFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes _avatarPreviewScale {
          0%   { opacity: 0; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1); }
        }
        .avatar-preview-img {
          animation: _avatarPreviewScale 0.28s cubic-bezier(0.34, 1.4, 0.64, 1) forwards;
        }
      `}</style>

      {/* Close button — top right */}
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top:      "calc(16px + env(safe-area-inset-top))",
          right:    "16px",
          width:    "44px",
          height:   "44px",
          borderRadius:    "50%",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          backdropFilter:  "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border:    "1px solid rgba(255, 255, 255, 0.1)",
          display:   "flex",
          alignItems:"center",
          justifyContent: "center",
          cursor:    "pointer",
          color:     "#FFFFFF",
          transition:"background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
      >
        <X size={20} strokeWidth={2} />
      </button>

      {/* Avatar — large, round, centered */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="avatar-preview-img"
        style={{
          width:  "min(85vw, 400px)",
          height: "min(85vw, 400px)",
          borderRadius: "50%",
          background: avatarUrl
            ? `url(${avatarUrl}) center/cover no-repeat`
            : GRADIENT,
          display:    "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize:   "min(24vw, 120px)",
          fontWeight: 700,
          color:      "#FFFFFF",
          fontFamily: "'Inter', sans-serif",
          boxShadow:  "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        {!avatarUrl && firstLetter}
      </div>

      

      {/* Action pills (only if editable) */}
      {isEditable && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: "20px",
            display:   "flex",
            gap:       "10px",
            flexWrap:  "wrap",
            justifyContent: "center",
          }}
        >
          <button
            onClick={onEditAvatar}
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        "8px",
              padding:    "12px 20px",
              borderRadius: "100px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              backdropFilter:  "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border:     "1px solid rgba(255, 255, 255, 0.1)",
              color:      "#FFFFFF",
              fontSize:   "14px",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              cursor:     "pointer",
              transition: "all 0.15s",
              minHeight:  "44px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
          >
            <Pencil size={15} strokeWidth={2} />
            Edit Photo
          </button>

          {isCreator && (
            <button
              onClick={onAddToStory}
              disabled={storyUploading}
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        "8px",
                padding:    "12px 20px",
                borderRadius: "100px",
                background: storyUploading
                  ? "rgba(139,92,246,0.4)"
                  : "linear-gradient(135deg, #8B5CF6, #EC4899)",
                border:     "none",
                color:      "#FFFFFF",
                fontSize:   "14px",
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                cursor:     storyUploading ? "not-allowed" : "pointer",
                transition: "opacity 0.15s",
                minHeight:  "44px",
                boxShadow:  storyUploading ? "none" : "0 4px 16px rgba(139, 92, 246, 0.4)",
              }}
              onMouseEnter={(e) => { if (!storyUploading) e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <BookImage size={15} strokeWidth={2} />
              {storyUploading ? "Posting…" : "Add to Story"}
            </button>
          )}
        </div>
      )}
    </div>
  );

  return createPortal(modal, document.body);
}