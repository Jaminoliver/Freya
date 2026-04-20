"use client";

import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { uploadImage } from "@/lib/utils/uploadImage";

const SHIMMER_KEYFRAMES = `
@keyframes spin { to { transform: rotate(360deg); } }
`;

interface AvatarBannerUploadProps {
  userId: string;
  displayName: string;
  username: string;
  initialAvatarUrl?: string | null;
  initialBannerUrl?: string | null;
}

export default function AvatarBannerUpload({ userId, displayName, username, initialAvatarUrl, initialBannerUrl }: AvatarBannerUploadProps) {
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(initialAvatarUrl ?? null);
  const [bannerUrl,       setBannerUrl]       = useState<string | null>(initialBannerUrl ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [cropImageSrc,    setCropImageSrc]    = useState<string | null>(null);
  const [cropType,        setCropType]        = useState<"avatar" | "banner">("avatar");

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (type: "avatar" | "banner") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCropType(type); setCropImageSrc(reader.result as string); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropSave = async (blob: Blob) => {
    const type = cropType;
    setCropImageSrc(null);
    if (type === "avatar") setUploadingAvatar(true); else setUploadingBanner(true);
    try {
      const supabase = createClient();
      const url = await uploadImage(blob, type, userId);
      const field = type === "avatar" ? "avatar_url" : "banner_url";
      await supabase.from("profiles").update({ [field]: url, updated_at: new Date().toISOString() }).eq("id", userId);
      if (type === "avatar") setAvatarUrl(url); else setBannerUrl(url);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      if (type === "avatar") setUploadingAvatar(false); else setUploadingBanner(false);
    }
  };

  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>

      {cropImageSrc && (
        <ImageCropModal
          imageSrc={cropImageSrc}
          type={cropType}
          onSave={handleCropSave}
          onCancel={() => setCropImageSrc(null)}
        />
      )}

      <div style={{ marginBottom: "16px" }}>
        {/* Banner */}
        <div
          onClick={() => bannerInputRef.current?.click()}
          style={{
            width: "100%", height: "180px", borderRadius: "12px",
            backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D",
            backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
            backgroundSize: "cover", backgroundPosition: "center",
            cursor: "pointer", position: "relative", overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: "4px",
              opacity: bannerUrl ? 0 : 1, transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = bannerUrl ? "0" : "1")}
          >
            {uploadingBanner
              ? <Loader2 size={20} color="#fff" style={{ animation: "spin 0.9s linear infinite" }} />
              : <Camera size={20} color="#fff" />
            }
            {!uploadingBanner && (
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", fontFamily: "'Inter', sans-serif" }}>
                Edit banner
              </span>
            )}
          </div>
        </div>

        {/* Avatar */}
        <div style={{ paddingLeft: "20px", marginTop: "-36px" }}>
          <div
            onClick={() => avatarInputRef.current?.click()}
            style={{
              width: "100px", height: "100px", borderRadius: "50%",
              border: "3px solid #0A0A0F", cursor: "pointer", overflow: "hidden",
              backgroundImage: avatarUrl ? `url(${avatarUrl})` : "linear-gradient(135deg, #8B5CF6, #EC4899)",
              backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat",
              display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
            }}
          >
            {!avatarUrl && (
              <span style={{ fontSize: "32px", fontWeight: 700, color: "#fff" }}>
                {displayName?.charAt(0) || username?.charAt(0) || "?"}
              </span>
            )}
            <div
              style={{
                position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "50%", opacity: 0, transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
            >
              {uploadingAvatar
                ? <Loader2 size={14} color="#fff" style={{ animation: "spin 0.9s linear infinite" }} />
                : <Camera size={14} color="#fff" />
              }
            </div>
          </div>
        </div>
      </div>

      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect("avatar")} />
      <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect("banner")} />
    </>
  );
}