"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, X, Pencil, BookImage } from "lucide-react";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { uploadImage } from "@/lib/utils/uploadImage";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { AvatarWithStoryRing } from "@/components/ui/AvatarWithStoryRing";
import StoryUploadModal from "@/components/story/StoryUploadModal";
import type { UploadJob } from "@/lib/context/StoryUploadContext";
import StoryViewer from "@/components/story/StoryViewer";
import { useCreatorStory } from "@/lib/hooks/useCreatorStory";
import { createPortal } from "react-dom";

interface ProfileAvatarProps {
  avatarUrl?:       string | null;
  displayName:      string | null;
  isEditable?:      boolean;
  isOnline?:        boolean;
  onEditAvatar?:    () => void;
  userId?:          string;
  creatorId?:       string;
  onAvatarUpdated?: (url: string) => void;
  isCreator?:       boolean;
}

const GRADIENT = "linear-gradient(to right, #8B5CF6, #EC4899)";

export default function ProfileAvatar({
  avatarUrl: initialAvatarUrl,
  displayName,
  isEditable = false,
  isOnline = false,
  onEditAvatar,
  userId,
  creatorId,
  onAvatarUpdated,
  isCreator = false,
}: ProfileAvatarProps) {
  const [avatarUrl,      setAvatarUrl]      = useState(initialAvatarUrl);
  const [cropSrc,        setCropSrc]        = useState<string | null>(null);
  const [preview,        setPreview]        = useState(false);
  const [uploading,      setUploading]      = useState(false);
  const [storyOpen,      setStoryOpen]      = useState(false);
  const [storyUploading, setStoryUploading] = useState(false);
  const [sheetOpen,      setSheetOpen]      = useState(false);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [dropdownPos,    setDropdownPos]    = useState({ top: 0, left: 0 });

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const avatarWrapRef = useRef<HTMLDivElement>(null);

  const { group: storyGroup, hasStory, hasUnviewed, refresh } = useCreatorStory(creatorId ?? userId);

  const firstLetter = (displayName || "?").charAt(0).toUpperCase();

  const handleAvatarClick = () => {
    if (avatarWrapRef.current) {
      const rect = avatarWrapRef.current.getBoundingClientRect();
      setDropdownPos({
        top:  rect.bottom + 8,
        left: rect.left,
      });
    }
    setSheetOpen(true);
  };

  // Close on outside click
  useEffect(() => {
    if (!sheetOpen) return;
    const handler = (e: MouseEvent) => {
      if (avatarWrapRef.current && !avatarWrapRef.current.contains(e.target as Node)) {
        setSheetOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === "Escape") setSheetOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [sheetOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCropSrc(reader.result as string); setPreview(false); setSheetOpen(false); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropSave = async (blob: Blob) => {
    setCropSrc(null);
    if (!userId) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const url = await uploadImage(blob, "avatar", userId);
      await supabase.from("profiles").update({ avatar_url: url, updated_at: new Date().toISOString() }).eq("id", userId);
      setAvatarUrl(url);
      onAvatarUpdated?.(url);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleStoryUploadStart = useCallback(async (job: UploadJob) => {
    setStoryOpen(false);
    setStoryUploading(true);
    try {
      const form = new FormData();
      form.append("file",      job.files[0]);
      form.append("mediaType", job.mediaType);
      if (job.caption) form.append("caption", job.caption);
      form.append("clipStart", String(job.clipStart));
      form.append("clipEnd",   String(job.clipEnd));
      const res  = await fetch("/api/stories", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
    } catch (err) {
      console.error("Story upload failed:", err);
    } finally {
      setStoryUploading(false);
      refresh();
    }
  }, []);

  const menuItems = [
    ...(hasStory ? [{ label: "View story",        action: () => { setSheetOpen(false); setStoryViewerOpen(true); } }] : []),
    ...(isEditable
      ? [{ label: "Edit profile photo", action: () => { setSheetOpen(false); fileInputRef.current?.click(); } }]
      : [{ label: "View profile photo", action: () => { setSheetOpen(false); setPreview(true); } }]
    ),
    ...(isCreator && isEditable ? [{ label: storyUploading ? "Posting…" : "Add to Story", action: () => { setSheetOpen(false); setStoryOpen(true); } }] : []),
  ];

  return (
    <>
      <style>{`
        @keyframes _avatarCtxPop {
          0%   { opacity: 0; transform: scale(0.88) translateY(-6px); }
          60%  { opacity: 1; transform: scale(1.02) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .avatar-ctx-popup {
          animation: _avatarCtxPop 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards;
          transform-origin: top left;
        }
        .avatar-ctx-popup::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 14px;
          background: rgba(8, 8, 18, 0.88);
          -webkit-backdrop-filter: blur(32px);
          backdrop-filter: blur(32px);
          z-index: -1;
        }
        .avatar-ctx-item:hover  { background-color: rgba(255,255,255,0.05) !important; }
        .avatar-ctx-item:active { background-color: rgba(255,255,255,0.08) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {cropSrc && (
        <ImageCropModal imageSrc={cropSrc} type="avatar" onSave={handleCropSave} onCancel={() => setCropSrc(null)} />
      )}

      {storyOpen && (
        <StoryUploadModal onClose={() => setStoryOpen(false)} onUploadStart={handleStoryUploadStart} />
      )}

      {storyViewerOpen && storyGroup && (
        <StoryViewer
          groups={[storyGroup]}
          startGroupIndex={0}
          onClose={() => { setStoryViewerOpen(false); refresh(); }}
        />
      )}

      {/* Preview Modal */}
      {preview && (
        <div onClick={() => setPreview(false)} style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", backgroundColor: "#13131F", borderRadius: "16px", border: "1px solid #2A2A3D", overflow: "hidden", maxWidth: "320px", width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
            <div style={{ width: "100%", aspectRatio: "1 / 1", background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "72px", fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif" }}>
              {!avatarUrl && firstLetter}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#F1F5F9", fontFamily: "'Inter', sans-serif", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</span>
              {isEditable && (
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  {isCreator && (
                    <button onClick={() => { setPreview(false); setStoryOpen(true); }} disabled={storyUploading} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "6px", background: storyUploading ? "rgba(139,92,246,0.4)" : GRADIENT, border: "none", color: "#fff", fontSize: "12px", fontWeight: 600, fontFamily: "'Inter', sans-serif", cursor: storyUploading ? "not-allowed" : "pointer", whiteSpace: "nowrap", transition: "opacity 0.15s" }} onMouseEnter={(e) => { if (!storyUploading) e.currentTarget.style.opacity = "0.85"; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
                      <BookImage size={12} />
                      {storyUploading ? "Posting…" : "Add to Story"}
                    </button>
                  )}
                  <button onClick={() => { setPreview(false); fileInputRef.current?.click(); }} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "6px", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", color: "#C4C4D4", fontSize: "12px", fontWeight: 600, fontFamily: "'Inter', sans-serif", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#2A2A3D"; e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#1C1C2E"; e.currentTarget.style.color = "#C4C4D4"; }}>
                    <Pencil size={12} /> Edit Photo
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => setPreview(false)} style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", backdropFilter: "blur(4px)" }}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Dropdown portal — drops below avatar */}
      {sheetOpen && typeof document !== "undefined" && createPortal(
        <>
          <div
            onMouseDown={() => setSheetOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 500 }}
          />
          <div
            className="avatar-ctx-popup"
            style={{
              position:        "fixed",
              top:             dropdownPos.top,
              left:            dropdownPos.left,
              zIndex:          501,
              backgroundColor: "transparent",
              border:          "1px solid rgba(255,255,255,0.08)",
              borderRadius:    "14px",
              boxShadow:       "0 12px 40px rgba(0,0,0,0.5)",
              fontFamily:      "'Inter', sans-serif",
              width:           "190px",
              overflow:        "hidden",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "6px 0" }}>
              {menuItems.map((item, i) => (
                <button
                  key={item.label}
                  className="avatar-ctx-item"
                  onClick={item.action}
                  onTouchEnd={(e) => { e.preventDefault(); item.action(); }}
                  style={{
                    display:    "flex",
                    alignItems: "center",
                    width:      "100%",
                    padding:    "10px 14px",
                    background: "none",
                    border:     "none",
                    cursor:     "pointer",
                    color:      "rgba(255,255,255,0.85)",
                    fontSize:   "13px",
                    fontFamily: "'Inter', sans-serif",
                    textAlign:  "left",
                    letterSpacing: "0.01em",
                    transition: "background-color 0.12s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

      <div ref={avatarWrapRef} style={{ position: "relative", marginTop: "-42px", marginLeft: "10px", display: "inline-block" }}>
        <div onClick={handleAvatarClick} style={{ cursor: "pointer", position: "relative" }}>
          <AvatarWithStoryRing
            src={avatarUrl ?? undefined}
            alt={displayName ?? "?"}
            size={96}
            hasStory={hasStory}
            hasUnviewed={hasUnviewed}
            onClick={handleAvatarClick}
            borderColor="#0A0A0F"
          />
          {isEditable && (
            <div
              style={{ position: "absolute", inset: 0, borderRadius: "50%", backgroundColor: "rgba(10,10,15,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", opacity: avatarUrl ? 0 : 1, transition: "opacity 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = avatarUrl ? "0" : "1"; }}
            >
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(31,31,42,0.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {uploading
                  ? <div style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #555", borderTop: "2px solid #A3A3C2", animation: "spin 0.9s linear infinite" }} />
                  : <Camera size={16} color="#A3A3C2" strokeWidth={1.8} />}
              </div>
              <span style={{ fontSize: "10px", fontWeight: 500, color: "#A3A3C2", fontFamily: "'Inter', sans-serif" }}>
                {avatarUrl ? "View" : "Add Photo"}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}