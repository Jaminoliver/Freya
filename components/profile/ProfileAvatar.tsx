"use client";

import { useRef, useState } from "react";
import { Camera, X, Pencil } from "lucide-react";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { uploadImage } from "@/lib/utils/uploadImage";
import { createClient } from "@/lib/supabase/client";

interface ProfileAvatarProps {
  avatarUrl?: string | null;
  displayName: string | null;
  isEditable?: boolean;
  isOnline?: boolean;
  onEditAvatar?: () => void;
  userId?: string;
  onAvatarUpdated?: (url: string) => void;
}

export default function ProfileAvatar({
  avatarUrl: initialAvatarUrl,
  displayName,
  isEditable = false,
  isOnline = false,
  onEditAvatar,
  userId,
  onAvatarUpdated,
}: ProfileAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firstLetter = (displayName || "?").charAt(0).toUpperCase();

  const handleAvatarClick = () => {
    if (isEditable) {
      setPreview(true);
    }
  };

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

      {/* Preview Modal */}
      {preview && (
        <div
          onClick={() => setPreview(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              backgroundColor: "#13131F",
              borderRadius: "16px",
              border: "1px solid #2A2A3D",
              overflow: "hidden",
              maxWidth: "320px",
              width: "100%",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
          >
            {/* Full image */}
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                background: avatarUrl
                  ? `url(${avatarUrl}) center/cover no-repeat`
                  : "linear-gradient(135deg, #8B5CF6, #EC4899)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "72px", fontWeight: 700, color: "#fff",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {!avatarUrl && firstLetter}
            </div>

            {/* Bottom bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>
                {displayName}
              </span>

              {isEditable && (
                <button
                  onClick={() => { setPreview(false); fileInputRef.current?.click(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    padding: "6px 12px", borderRadius: "6px",
                    backgroundColor: "#8B5CF6", border: "none",
                    color: "#fff", fontSize: "12px", fontWeight: 600,
                    fontFamily: "'Inter', sans-serif", cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Pencil size={12} />
                  Edit Photo
                </button>
              )}
            </div>

            {/* Close */}
            <button
              onClick={() => setPreview(false)}
              style={{
                position: "absolute", top: "10px", right: "10px",
                background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%",
                width: "28px", height: "28px",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff", backdropFilter: "blur(4px)",
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

      <div style={{ position: "relative", width: "96px", height: "96px", marginTop: "-38px", marginLeft: "10px" }}>
        <div
          onClick={handleAvatarClick}
          style={{
            width: "96px", height: "96px", borderRadius: "50%",
            background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : "linear-gradient(135deg, #8B5CF6, #EC4899)",
            border: "3px solid #0A0A0F",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "36px", fontWeight: 700, color: "#FFFFFF",
            fontFamily: "'Inter', sans-serif",
            cursor: isEditable ? "pointer" : "default",
            position: "relative", overflow: "hidden",
          }}
        >
          {!avatarUrl && firstLetter}

          {isEditable && (
            <div
              style={{
                position: "absolute", inset: 0,
                backgroundColor: "rgba(10,10,15,0.7)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px",
                opacity: avatarUrl ? 0 : 1, transition: "opacity 0.2s ease",
              }}
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

        {isOnline && (
          <div style={{ position: "absolute", bottom: "6px", right: "6px", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#10B981", border: "2px solid #0A0A0F" }} />
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}