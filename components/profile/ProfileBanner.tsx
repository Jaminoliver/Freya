"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, MoreVertical, Flag, Ban, ShieldOff } from "lucide-react";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { ReportModal } from "@/components/messages/ReportModal";
import BlockConfirmModal from "@/components/ui/BlockConfirmModal";
import { useBlockRestrict } from "@/lib/hooks/useBlockRestrict";
import { uploadImage } from "@/lib/utils/uploadImage";
import { createClient } from "@/lib/supabase/client";

interface ProfileBannerProps {
  bannerUrl?:       string | null;
  displayName?:     string | null;
  isEditable?:      boolean;
  isCreator?:       boolean;
  onEditBanner?:    () => void;
  onBack?:          () => void;
  stats?: {
    posts:       number;
    likes:       number;
    followers:   number;
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
  onBack,
  stats,
  userId,
  username,
  onBannerUpdated,
}: ProfileBannerProps) {
  const router = useRouter();
  const [bannerUrl,         setBannerUrl]         = useState(initialBannerUrl);
  const [cropSrc,           setCropSrc]           = useState<string | null>(null);
  const [uploading,         setUploading]         = useState(false);
  const [menuOpen,          setMenuOpen]          = useState(false);
  const [reportOpen,        setReportOpen]        = useState(false);
  const [blockConfirm,      setBlockConfirm]      = useState(false);
  const [unblockConfirm,    setUnblockConfirm]    = useState(false);
  const [restrictConfirm,   setRestrictConfirm]   = useState(false);
  const [unrestrictConfirm, setUnrestrictConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef      = useRef<HTMLDivElement>(null);

  const {
    isBlocked, isRestricted,
    block, unblock, restrict, unrestrict,
    fetchStatus,
  } = useBlockRestrict({ userId: userId ?? "", fetchOnMount: !isEditable && !!userId });

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

  const handleBlockConfirm = async () => {
    await block();
    router.back();
  };

  const handleBack = () => {
    if (onBack) { onBack(); return; }
    router.back();
  };

  const restrictDormant = isBlocked;

  const menuItems = [
    {
      icon:    <Flag      size={15} strokeWidth={1.8} />,
      label:   "Report",
      color:   "#FFFFFF",
      dormant: false,
      action:  () => { setMenuOpen(false); setReportOpen(true); },
    },
    {
      icon:    <ShieldOff size={15} strokeWidth={1.8} />,
      label:   isRestricted ? "Unrestrict user" : "Restrict user",
      color:   restrictDormant ? "#3A3A4D" : isRestricted ? "#10B981" : "#F59E0B",
      dormant: restrictDormant,
      action:  restrictDormant
        ? undefined
        : () => { setMenuOpen(false); isRestricted ? setUnrestrictConfirm(true) : setRestrictConfirm(true); },
    },
    {
      icon:    <Ban size={15} strokeWidth={1.8} />,
      label:   isBlocked ? "Unblock user" : "Block user",
      color:   isBlocked ? "#10B981" : "#EF4444",
      dormant: false,
      action:  () => { setMenuOpen(false); isBlocked ? setUnblockConfirm(true) : setBlockConfirm(true); },
    },
  ];

  const statItems = stats ? [
    {
      id: "posts",
      value: formatCount(stats.posts),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
        </svg>
      ),
      color: "#FFFFFF",
      onClick: undefined as ((e: React.MouseEvent) => void) | undefined,
    },
    {
      id: "likes",
      value: formatCount(stats.likes),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      ),
      color: "#FFFFFF",
      onClick: undefined as ((e: React.MouseEvent) => void) | undefined,
    },
    {
      id: "followers",
      value: formatCount(stats.followers),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      ),
      color: "#FFFFFF",
      onClick: undefined as ((e: React.MouseEvent) => void) | undefined,
    },
    {
      id: "subscribers",
      value: formatCount(stats.subscribers),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(250,192,50,0.15)" stroke="#F5C842" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 18h20"/>
          <path d="M4 18L2 8l4.5 4L12 4l5.5 8L22 8l-2 10H4z"/>
          <circle cx="12" cy="4" r="1.2" fill="#F5C842" stroke="none"/>
          <circle cx="6.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none"/>
          <circle cx="17.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none"/>
        </svg>
      ),
      color: "#F5C842",
      onClick: isEditable && isCreator
        ? (e: React.MouseEvent) => { e.stopPropagation(); router.push("/settings?panel=fans"); }
        : undefined,
    },
  ] : [];

  return (
    <>
      {cropSrc && (
        <ImageCropModal imageSrc={cropSrc} type="banner" onSave={handleCropSave} onCancel={() => setCropSrc(null)} />
      )}

      {reportOpen && (
        <ReportModal
          context="user"
          username={username}
          reportedUserId={userId}
          onClose={() => setReportOpen(false)}
          onBlockUser={handleBlockConfirm}
        />
      )}

      <BlockConfirmModal isOpen={blockConfirm}      onClose={() => setBlockConfirm(false)}      onConfirm={handleBlockConfirm} type="block"    username={username ?? ""} />
      <BlockConfirmModal isOpen={unblockConfirm}    onClose={() => setUnblockConfirm(false)}    onConfirm={unblock}            type="block"    username={username ?? ""} />
      <BlockConfirmModal isOpen={restrictConfirm}   onClose={() => setRestrictConfirm(false)}   onConfirm={restrict}           type="restrict" username={username ?? ""} />
      <BlockConfirmModal isOpen={unrestrictConfirm} onClose={() => setUnrestrictConfirm(false)} onConfirm={unrestrict}         type="restrict" username={username ?? ""} />

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

        {/* Top-left: back button + display name */}
        <div style={{ position: "absolute", top: "12px", left: "12px", zIndex: 2, display: "flex", alignItems: "center", gap: "8px" }}>
          {!isEditable && (
            <button
              onClick={(e) => { e.stopPropagation(); handleBack(); }}
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

        {/* 3-dot menu */}
        {!isEditable && userId && (
          <div
            ref={menuRef}
            style={{ position: "absolute", top: "12px", right: "12px", zIndex: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setMenuOpen((o) => !o); if (!menuOpen) fetchStatus(); }}
              style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(20,20,32,0.75)", backdropFilter: "blur(8px)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <MoreVertical size={18} color="#FFFFFF" strokeWidth={1.8} />
            </button>

            {menuOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "12px", padding: "6px", minWidth: "180px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 20 }}>
                {menuItems.map(({ icon, label, color, dormant, action }) => (
                  <button
                    key={label}
                    onClick={() => { if (!dormant && action) action(); }}
                    disabled={dormant}
                    style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", borderRadius: "8px", border: "none", cursor: dormant ? "default" : "pointer", backgroundColor: "transparent", color, fontSize: "14px", fontFamily: "'Inter', sans-serif", textAlign: "left", opacity: dormant ? 0.35 : 1, transition: "background-color 0.15s ease" }}
                    onMouseEnter={(e) => { if (!dormant) e.currentTarget.style.backgroundColor = "#2A2A3D"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats row */}
        {stats && (
          <div style={{ position: "absolute", bottom: "14px", right: "14px", zIndex: 2, display: "flex", alignItems: "center", gap: "18px" }}>
            {statItems.map((stat) =>
              stat.onClick ? (
                <button
                  key={stat.id}
                  onClick={stat.onClick}
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: 0, opacity: 1, transition: "opacity 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  {stat.icon}
                  <span style={{ fontSize: "13px", fontWeight: 700, color: stat.color, fontFamily: "'Inter', sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{stat.value}</span>
                </button>
              ) : (
                <div key={stat.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {stat.icon}
                  <span style={{ fontSize: "13px", fontWeight: 700, color: stat.color, fontFamily: "'Inter', sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{stat.value}</span>
                </div>
              )
            )}
          </div>
        )}

        {/* Editable states */}
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