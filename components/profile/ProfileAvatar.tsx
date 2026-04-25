"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera } from "lucide-react";
import { AvatarCropModal } from "@/components/ui/AvatarCropModal";
import AvatarPreviewModal from "@/components/ui/AvatarPreviewModal";
import { uploadImage } from "@/lib/utils/uploadImage";
import { createClient } from "@/lib/supabase/client";
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
  const [avatarUrl,       setAvatarUrl]       = useState(initialAvatarUrl);
  const [cropSrc,         setCropSrc]         = useState<string | null>(null);
  const [preview,         setPreview]         = useState(false);
  const [uploading,       setUploading]       = useState(false);
  const [storyOpen,       setStoryOpen]       = useState(false);
  const [storyUploading,  setStoryUploading]  = useState(false);
  const [sheetOpen,       setSheetOpen]       = useState(false);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [dropdownPos,     setDropdownPos]     = useState({ top: 0, left: 0 });

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const avatarWrapRef = useRef<HTMLDivElement>(null);

  const { group: storyGroup, hasStory, hasUnviewed, refresh } = useCreatorStory(creatorId ?? userId);

  const handleAvatarClick = () => {
    if (!hasStory && !isEditable) { setPreview(true); return; }
    if (hasStory && !isEditable) {
      if (avatarWrapRef.current) {
        const rect = avatarWrapRef.current.getBoundingClientRect();
        const dropdownWidth          = 190;
        const dropdownHeightEstimate = 130;
        const padding                = 8;
        let top  = rect.bottom + 8;
        let left = rect.left;
        if (left + dropdownWidth > window.innerWidth - padding) left = window.innerWidth - dropdownWidth - padding;
        if (left < padding) left = padding;
        if (top + dropdownHeightEstimate > window.innerHeight - padding) top = window.innerHeight - dropdownHeightEstimate - padding;
        if (top < padding) top = padding;
        setDropdownPos({ top, left });
      }
      setSheetOpen(true);
      return;
    }
    // isEditable — always show dropdown
    if (avatarWrapRef.current) {
      const rect = avatarWrapRef.current.getBoundingClientRect();
      const dropdownWidth          = 190;
      const dropdownHeightEstimate = 130;
      const padding                = 8;
      let top  = rect.bottom + 8;
      let left = rect.left;
      if (left + dropdownWidth > window.innerWidth - padding) left = window.innerWidth - dropdownWidth - padding;
      if (left < padding) left = padding;
      if (top + dropdownHeightEstimate > window.innerHeight - padding) top = window.innerHeight - dropdownHeightEstimate - padding;
      if (top < padding) top = padding;
      setDropdownPos({ top, left });
    }
    setSheetOpen(true);
  };

  // Close on outside click / Esc
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
  }, [refresh]);

  const triggerEditPhoto = () => {
    setSheetOpen(false);
    setPreview(false);
    fileInputRef.current?.click();
  };

  const triggerAddToStory = () => {
    setSheetOpen(false);
    setPreview(false);
    setStoryOpen(true);
  };

  const menuItems = [
    ...(hasStory ? [{ label: "View story", action: () => { setSheetOpen(false); setStoryViewerOpen(true); } }] : []),
    { label: "View profile photo", action: () => { setSheetOpen(false); setPreview(true); } },
    ...(isEditable ? [{ label: "Edit profile photo", action: triggerEditPhoto }] : []),
    ...(isCreator && isEditable ? [{ label: storyUploading ? "Posting…" : "Add to Story", action: triggerAddToStory }] : []),
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
        <AvatarCropModal imageSrc={cropSrc} onSave={handleCropSave} onCancel={() => setCropSrc(null)} />
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

      {/* Modern fullscreen avatar viewer */}
      {preview && (
        <AvatarPreviewModal
          avatarUrl={avatarUrl}
          displayName={displayName}
          isEditable={isEditable}
          isCreator={isCreator}
          storyUploading={storyUploading}
          onClose={() => setPreview(false)}
          onEditAvatar={triggerEditPhoto}
          onAddToStory={triggerAddToStory}
        />
      )}

      {/* Dropdown portal — viewport-clamped */}
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
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  className="avatar-ctx-item"
                  onClick={item.action}
                  onTouchEnd={(e) => { e.preventDefault(); item.action(); }}
                  style={{
                    display:       "flex",
                    alignItems:    "center",
                    width:         "100%",
                    padding:       "10px 14px",
                    background:    "none",
                    border:        "none",
                    cursor:        "pointer",
                    color:         "rgba(255,255,255,0.85)",
                    fontSize:      "13px",
                    fontFamily:    "'Inter', sans-serif",
                    textAlign:     "left",
                    letterSpacing: "0.01em",
                    transition:    "background-color 0.12s ease",
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
        </div>

        {/* Camera badge — outside inner click div to avoid story-ring clipping, always visible when editable */}
        {isEditable && (
          <button
            type="button"
            onClick={handleAvatarClick}
            aria-label="Edit profile photo"
            style={{
              position:        "absolute",
              bottom:          "0",
              right:           "0",
              width:           "32px",
              height:          "32px",
              borderRadius:    "50%",
              background:      "linear-gradient(135deg, #8B5CF6, #7C3AED)",
              border:          "3px solid #0A0A0F",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              cursor:          "pointer",
              zIndex:          10,
              boxShadow:       "0 2px 12px rgba(139,92,246,0.5)",
              padding:         0,
              transition:      "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.08)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(139,92,246,0.7)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 2px 12px rgba(139,92,246,0.5)";
            }}
          >
            {uploading
              ? <div style={{ width: "13px", height: "13px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", animation: "spin 0.9s linear infinite" }} />
              : <Camera size={15} color="#fff" strokeWidth={2.2} />}
          </button>
        )}
      </div>
    </>
  );
}