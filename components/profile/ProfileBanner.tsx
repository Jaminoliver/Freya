"use client";

import { useRef, useState } from "react";
import { Camera, Image, Heart, Users, FileText } from "lucide-react";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { uploadImage } from "@/lib/utils/uploadImage";
import { createClient } from "@/lib/supabase/client";

interface ProfileBannerProps {
  bannerUrl?: string | null;
  displayName?: string | null;
  isEditable?: boolean;
  isCreator?: boolean;
  onEditBanner?: () => void;
  stats?: {
    posts: number;
    media: number;
    likes: number;
    subscribers: number;
  };
  userId?: string;
  onBannerUpdated?: (url: string) => void;
}

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export default function ProfileBanner({
  bannerUrl: initialBannerUrl,
  displayName,
  isEditable = false,
  isCreator = false,
  onEditBanner,
  stats,
  userId,
  onBannerUpdated,
}: ProfileBannerProps) {
  const [bannerUrl, setBannerUrl] = useState(initialBannerUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!isEditable) return;
    if (onEditBanner) { onEditBanner(); return; }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropSave = async (blob: Blob) => {
    setCropSrc(null);
    if (!userId) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const url = await uploadImage(blob, "banner", userId);
      await supabase.from("profiles").update({ banner_url: url, updated_at: new Date().toISOString() }).eq("id", userId);
      setBannerUrl(url);
      onBannerUpdated?.(url);
    } catch (err) {
      console.error("Banner upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          type="banner"
          onSave={handleCropSave}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

      <div
        onClick={handleClick}
        style={{
          position: "relative",
          width: "100%",
          height: "180px",
          background: bannerUrl
            ? `url(${bannerUrl}) center/cover no-repeat`
            : isCreator
            ? "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)"
            : "#1F1F2A",
          cursor: isEditable ? "pointer" : "default",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 40%, transparent 50%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />

        {displayName && (
          <div style={{ position: "absolute", top: "14px", left: "16px", zIndex: 2 }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Inter', sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
              {displayName}
            </span>
          </div>
        )}

        {stats && (
          <div style={{ position: "absolute", bottom: "12px", right: "14px", zIndex: 2, display: "flex", alignItems: "center", gap: "14px" }}>
            {[
              { icon: <FileText size={16} strokeWidth={2} />, value: formatCount(stats.posts), label: "Posts" },
              { icon: <Image size={16} strokeWidth={2} />, value: formatCount(stats.media), label: "Media" },
              { icon: <Heart size={16} strokeWidth={2} />, value: formatCount(stats.likes), label: "Likes" },
              { icon: <Users size={16} strokeWidth={2} />, value: formatCount(stats.subscribers), label: "Subs" },
            ].map((stat) => (
              <div key={stat.label} style={{ display: "flex", alignItems: "center", gap: "5px", color: "#FFFFFF" }}>
                <span style={{ opacity: 0.85 }}>{stat.icon}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: "'Inter', sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEditable && !bannerUrl && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "rgba(20,20,32,0.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
              <Camera size={22} color="#A3A3C2" strokeWidth={1.8} />
            </div>
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#A3A3C2", fontFamily: "'Inter', sans-serif" }}>Add Cover Photo</span>
          </div>
        )}

        {/* Edit button when banner exists */}
        {isEditable && bannerUrl && (
          <button
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            style={{ position: "absolute", top: "12px", right: "12px", width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(20,20,32,0.75)", backdropFilter: "blur(8px)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 3 }}
          >
            {uploading
              ? <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid #555", borderTop: "2px solid #A3A3C2", animation: "spin 0.9s linear infinite" }} />
              : <Camera size={18} color="#A3A3C2" strokeWidth={1.8} />}
          </button>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
}