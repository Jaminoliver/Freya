"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Image, Heart, Users, FileText, MoreVertical, Flag, Ban } from "lucide-react";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { ReportModal } from "@/components/messages/ReportModal";
import { uploadImage } from "@/lib/utils/uploadImage";
import { createClient } from "@/lib/supabase/client";

interface ProfileBannerProps {
  bannerUrl?:       string | null;
  displayName?:     string | null;
  isEditable?:      boolean;
  isCreator?:       boolean;
  onEditBanner?:    () => void;
  stats?: {
    posts:       number;
    media:       number;
    likes:       number;
    subscribers: number;
  };
  userId?:           string;
  username?:         string;
  onBannerUpdated?:  (url: string) => void;
}

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export default function ProfileBanner({
  bannerUrl: initialBannerUrl,
  displayName,
  isEditable = false,
  isCreator  = false,
  onEditBanner,
  stats,
  userId,
  username,
  onBannerUpdated,
}: ProfileBannerProps) {
  const router = useRouter();
  const [bannerUrl,  setBannerUrl]  = useState(initialBannerUrl);
  const [cropSrc,    setCropSrc]    = useState<string | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef      = useRef<HTMLDivElement>(null);

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

  const handleBlock = async () => {
    if (!userId) return;
    await fetch("/api/users/block", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId }),
    });
  };

  const statItems = stats
    ? [
        { icon: <FileText size={16} strokeWidth={2} />, value: formatCount(stats.posts),       label: "Posts", onClick: undefined },
        { icon: <Image    size={16} strokeWidth={2} />, value: formatCount(stats.media),       label: "Media", onClick: undefined },
        { icon: <Heart    size={16} strokeWidth={2} />, value: formatCount(stats.likes),       label: "Likes", onClick: undefined },
        {
          icon:    <Users size={16} strokeWidth={2} />,
          value:   formatCount(stats.subscribers),
          label:   "Subs",
          onClick: isEditable && isCreator
            ? (e: React.MouseEvent) => { e.stopPropagation(); router.push("/settings?panel=fans"); }
            : undefined,
        },
      ]
    : [];

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

      {reportOpen && (
        <ReportModal
          context="user"
          username={username}
          reportedUserId={userId}
          onClose={() => setReportOpen(false)}
          onBlockUser={handleBlock}
        />
      )}

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

      <div
        onClick={handleClick}
        style={{
          position:   "relative",
          width:      "100%",
          height:     "180px",
          background: bannerUrl
            ? `url(${bannerUrl}) center/cover no-repeat`
            : isCreator
            ? "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)"
            : "#1F1F2A",
          cursor:   isEditable ? "pointer" : "default",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 40%, transparent 50%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />

        {/* Top-left: back button (non-editable only) + display name */}
        <div style={{ position: "absolute", top: "12px", left: "12px", zIndex: 2, display: "flex", alignItems: "center", gap: "8px" }}>
          {!isEditable && (
            <button
              onClick={(e) => { e.stopPropagation(); router.back(); }}
              style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(20,20,32,0.75)", backdropFilter: "blur(8px)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M11 4L6 9L11 14" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {displayName && (
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Inter', sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
              {displayName}
            </span>
          )}
        </div>

        {/* 3-dot menu — non-editable profiles only */}
        {!isEditable && userId && (
          <div
            ref={menuRef}
            style={{ position: "absolute", top: "12px", right: "12px", zIndex: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMenuOpen((o) => !o)}
              style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(20,20,32,0.75)", backdropFilter: "blur(8px)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <MoreVertical size={18} color="#FFFFFF" strokeWidth={1.8} />
            </button>

            {menuOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "12px", padding: "6px", minWidth: "160px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 20 }}>
                {[
                  { icon: <Flag size={15} strokeWidth={1.8} />, label: "Report",     color: "#FFFFFF", action: () => { setMenuOpen(false); setReportOpen(true); } },
                  { icon: <Ban  size={15} strokeWidth={1.8} />, label: "Block user", color: "#EF4444", action: () => { setMenuOpen(false); handleBlock(); } },
                ].map(({ icon, label, color, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: "transparent", color, fontSize: "14px", fontFamily: "'Inter', sans-serif", textAlign: "left", transition: "background-color 0.15s ease" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {stats && (
          <div style={{ position: "absolute", bottom: "12px", right: "14px", zIndex: 2, display: "flex", alignItems: "center", gap: "14px" }}>
            {statItems.map((stat) =>
              stat.onClick ? (
                <button key={stat.label} onClick={stat.onClick}
                  style={{ display: "flex", alignItems: "center", gap: "5px", color: "#FFFFFF", background: "none", border: "none", cursor: "pointer", padding: 0, opacity: 1, transition: "opacity 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  title="View fans"
                >
                  <span style={{ opacity: 0.85 }}>{stat.icon}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: "'Inter', sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{stat.value}</span>
                </button>
              ) : (
                <div key={stat.label} style={{ display: "flex", alignItems: "center", gap: "5px", color: "#FFFFFF" }}>
                  <span style={{ opacity: 0.85 }}>{stat.icon}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: "'Inter', sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{stat.value}</span>
                </div>
              )
            )}
          </div>
        )}

        {isEditable && !bannerUrl && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "rgba(20,20,32,0.6)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
              <Camera size={22} color="#A3A3C2" strokeWidth={1.8} />
            </div>
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#A3A3C2", fontFamily: "'Inter', sans-serif" }}>Add Cover Photo</span>
          </div>
        )}

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

        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      </div>
    </>
  );
}