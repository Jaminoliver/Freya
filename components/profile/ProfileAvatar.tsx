"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, X, Pencil, BookImage } from "lucide-react";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { uploadImage } from "@/lib/utils/uploadImage";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import StoryUploadModal, { type UploadJob } from "@/components/story/StoryUploadModal";

interface ProfileAvatarProps {
  avatarUrl?: string | null;
  displayName: string | null;
  isEditable?: boolean;
  isOnline?: boolean;
  onEditAvatar?: () => void;
  userId?: string;
  onAvatarUpdated?: (url: string) => void;
  isCreator?: boolean;
}

const GRADIENT = "linear-gradient(to right, #8B5CF6, #EC4899)";

export default function ProfileAvatar({
  avatarUrl: initialAvatarUrl,
  displayName,
  isEditable = false,
  isOnline = false,
  onEditAvatar,
  userId,
  onAvatarUpdated,
  isCreator = false,
}: ProfileAvatarProps) {
  const [avatarUrl,    setAvatarUrl]    = useState(initialAvatarUrl);
  const [cropSrc,      setCropSrc]      = useState<string | null>(null);
  const [preview,      setPreview]      = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [storyOpen,    setStoryOpen]    = useState(false);
  const [storyUploading, setStoryUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firstLetter = (displayName || "?").charAt(0).toUpperCase();

  const handleAvatarClick = () => { if (isEditable) setPreview(true); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCropSrc(reader.result as string); setPreview(false); };
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

  // Background story upload — mirrors StoryBar logic
  const handleStoryUploadStart = useCallback(async (job: UploadJob) => {
    setStoryOpen(false);
    setStoryUploading(true);
    try {
      const form = new FormData();
      form.append("file",      job.file);
      form.append("mediaType", job.mediaType);
      if (job.caption)  form.append("caption",   job.caption);
      form.append("clipStart", String(job.clipStart));
      form.append("clipEnd",   String(job.clipEnd));
      const res  = await fetch("/api/stories", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
    } catch (err) {
      console.error("Story upload failed:", err);
    } finally {
      setStoryUploading(false);
    }
  }, []);

  return (
    <>
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          type="avatar"
          onSave={handleCropSave}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {storyOpen && (
        <StoryUploadModal
          onClose={() => setStoryOpen(false)}
          onUploadStart={handleStoryUploadStart}
        />
      )}

      {/* Preview Modal */}
      {preview && (
        <div
          onClick={() => setPreview(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", backgroundColor: "#13131F", borderRadius: "16px", border: "1px solid #2A2A3D", overflow: "hidden", maxWidth: "320px", width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
          >
            <div
              style={{ width: "100%", aspectRatio: "1 / 1", background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "72px", fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif" }}
            >
              {!avatarUrl && firstLetter}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#F1F5F9", fontFamily: "'Inter', sans-serif", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName}
              </span>

              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                {/* Add to Story — creators only */}
                {isCreator && isEditable && (
                  <button
                    onClick={() => { setPreview(false); setStoryOpen(true); }}
                    disabled={storyUploading}
                    style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      padding: "6px 12px", borderRadius: "6px",
                      background: storyUploading ? "rgba(139,92,246,0.4)" : GRADIENT,
                      border: "none", color: "#fff",
                      fontSize: "12px", fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                      cursor: storyUploading ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap", transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!storyUploading) e.currentTarget.style.opacity = "0.85"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  >
                    <BookImage size={12} />
                    {storyUploading ? "Posting…" : "Add to Story"}
                  </button>
                )}

                {/* Edit Photo */}
                {isEditable && (
                  <button
                    onClick={() => { setPreview(false); fileInputRef.current?.click(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      padding: "6px 12px", borderRadius: "6px",
                      backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D",
                      color: "#C4C4D4", fontSize: "12px", fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                      cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#2A2A3D"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#1C1C2E"; e.currentTarget.style.color = "#C4C4D4"; }}
                  >
                    <Pencil size={12} /> Edit Photo
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => setPreview(false)}
              style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", backdropFilter: "blur(4px)" }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

      <div style={{ position: "relative", marginTop: "-42px", marginLeft: "10px", display: "inline-block" }}>
        <div onClick={handleAvatarClick} style={{ cursor: isEditable ? "pointer" : "default", position: "relative" }}>
          <Avatar
            src={avatarUrl ?? undefined}
            alt={displayName ?? "?"}
            size="2xl"
            showRing
            isOnline={isOnline}
            showOnlineStatus={isOnline}
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}