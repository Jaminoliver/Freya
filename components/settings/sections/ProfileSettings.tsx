"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, Loader2, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { uploadImage } from "@/lib/utils/uploadImage";

interface ProfileForm {
  display_name: string;
  username: string;
  bio: string;
  location: string;
  country: string;
  state: string;
  date_of_birth: string;
  website_url: string;
  twitter_url: string;
  instagram_url: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function ProfileSettings() {
  const [form, setForm] = useState<ProfileForm>({
    display_name: "",
    username: "",
    bio: "",
    location: "",
    country: "",
    state: "",
    date_of_birth: "",
    website_url: "",
    twitter_url: "",
    instagram_url: "",
  });

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Crop modal state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<"avatar" | "banner">("avatar");

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, bio, location, country, state, date_of_birth, website_url, twitter_url, instagram_url, avatar_url, banner_url")
        .eq("id", user.id)
        .single();
      if (data) {
        setForm({
          display_name: data.display_name ?? "",
          username: data.username ?? "",
          bio: data.bio ?? "",
          location: data.location ?? "",
          country: data.country ?? "",
          state: data.state ?? "",
          date_of_birth: data.date_of_birth ?? "",
          website_url: data.website_url ?? "",
          twitter_url: data.twitter_url ?? "",
          instagram_url: data.instagram_url ?? "",
        });
        setAvatarUrl(data.avatar_url);
        setBannerUrl(data.banner_url);
      }
    };
    load();
  }, []);

  const set = (key: keyof ProfileForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Open file picker → read file → show crop modal
  const handleFileSelect = (type: "avatar" | "banner") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropType(type);
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  // After crop — upload blob to correct bucket
  const handleCropSave = async (blob: Blob) => {
    if (!userId) return;
    const type = cropType;
    setCropImageSrc(null);

    if (type === "avatar") setUploadingAvatar(true);
    else setUploadingBanner(true);

    try {
      const supabase = createClient();
      const url = await uploadImage(blob, type, userId);

      const field = type === "avatar" ? "avatar_url" : "banner_url";
      await supabase
        .from("profiles")
        .update({ [field]: url, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (type === "avatar") setAvatarUrl(url);
      else setBannerUrl(url);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      if (type === "avatar") setUploadingAvatar(false);
      else setUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaveState("saving");
    setErrorMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: form.display_name || null,
        bio: form.bio || null,
        location: form.location || null,
        country: form.country || null,
        state: form.state || null,
        date_of_birth: form.date_of_birth || null,
        website_url: form.website_url || null,
        twitter_url: form.twitter_url || null,
        instagram_url: form.instagram_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      setSaveState("error");
      setErrorMsg(error.message);
    } else {
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  // ── Styles ──
  const inputBase: React.CSSProperties = {
    width: "100%", borderRadius: "10px", padding: "12px 14px",
    fontSize: "14px", outline: "none", backgroundColor: "#141420",
    border: "1.5px solid #2A2A3D", color: "#F1F5F9",
    boxSizing: "border-box", fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px", fontWeight: 500, color: "#8B5CF6",
    marginBottom: "6px", display: "block",
  };

  const dividerLabel: React.CSSProperties = {
    fontSize: "11px", color: "#6B6B8A", letterSpacing: "0.08em",
    textTransform: "uppercase", fontWeight: 600,
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Crop Modal */}
      {cropImageSrc && (
        <ImageCropModal
          imageSrc={cropImageSrc}
          type={cropType}
          onSave={handleCropSave}
          onCancel={() => setCropImageSrc(null)}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#F1F5F9", margin: "0 0 3px" }}>Profile</h2>
          <p style={{ fontSize: "13px", color: "#A3A3C2", margin: 0 }}>Manage your public profile information</p>
        </div>

        {/* ── BANNER + AVATAR ── */}
        <div style={{ position: "relative", marginBottom: "48px" }}>
          {/* Banner */}
          <div
            onClick={() => bannerInputRef.current?.click()}
            style={{
              width: "100%", height: "120px", borderRadius: "12px",
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
                : <Camera size={20} color="#fff" />}
              {!uploadingBanner && (
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", fontFamily: "'Inter', sans-serif" }}>
                  Edit banner
                </span>
              )}
            </div>
          </div>

          {/* Avatar */}
          <div
            onClick={() => avatarInputRef.current?.click()}
            style={{
              position: "absolute", bottom: "-36px", left: "20px",
              width: "72px", height: "72px", borderRadius: "50%",
              border: "3px solid #0A0A0F", cursor: "pointer", overflow: "hidden",
              backgroundImage: avatarUrl ? `url(${avatarUrl})` : "linear-gradient(135deg, #8B5CF6, #EC4899)",
              backgroundSize: "cover", backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {!avatarUrl && (
              <span style={{ fontSize: "24px", fontWeight: 700, color: "#fff" }}>
                {form.display_name?.charAt(0) || form.username?.charAt(0) || "?"}
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
                : <Camera size={14} color="#fff" />}
            </div>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect("avatar")} />
        <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect("banner")} />

        {/* ── BASIC INFO ── */}
        <p style={{ fontSize: "11px", fontWeight: 600, color: "#6B6B8A", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 14px" }}>Basic Info</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Display Name</label>
            <input type="text" value={form.display_name} onChange={(e) => set("display_name", e.target.value)}
              placeholder="Your public name" style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          </div>

          <div>
            <label style={labelStyle}>Username</label>
            <input type="text" value={form.username} readOnly
              style={{ ...inputBase, color: "#6B6B8A", cursor: "not-allowed" }} />
            <span style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "4px", display: "block", fontStyle: "italic" }}>
              Change username in Account settings
            </span>
          </div>

          <div>
            <label style={labelStyle}>Bio</label>
            <textarea value={form.bio} onChange={(e) => set("bio", e.target.value)}
              placeholder="Tell people about yourself..." maxLength={200} rows={3}
              style={{ ...inputBase, resize: "none", lineHeight: 1.6 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
            <span style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "4px", display: "block", textAlign: "right" }}>
              {form.bio.length}/200
            </span>
          </div>

          <div>
            <label style={labelStyle}>Date of Birth</label>
            <input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)}
              style={{ ...inputBase, colorScheme: "dark" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
            <span style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "4px", display: "block", fontStyle: "italic" }}>
              Not shown publicly — used for age verification
            </span>
          </div>
        </div>

        {/* ── LOCATION ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "28px 0 14px" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
          <span style={dividerLabel}>Location</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>City / Location</label>
            <input type="text" value={form.location} onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Lagos" style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={labelStyle}>State / Region</label>
              <input type="text" value={form.state} onChange={(e) => set("state", e.target.value)}
                placeholder="e.g. Lagos State" style={inputBase}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <input type="text" value={form.country} onChange={(e) => set("country", e.target.value)}
                placeholder="e.g. Nigeria" style={inputBase}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
            </div>
          </div>
        </div>

        {/* ── SOCIAL LINKS ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "28px 0 14px" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
          <span style={dividerLabel}>Social Links</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Website URL</label>
            <input type="url" value={form.website_url} onChange={(e) => set("website_url", e.target.value)}
              placeholder="https://yoursite.com" style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          </div>
          <div>
            <label style={labelStyle}>Twitter / X URL</label>
            <input type="url" value={form.twitter_url} onChange={(e) => set("twitter_url", e.target.value)}
              placeholder="https://x.com/yourhandle" style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          </div>
          <div>
            <label style={labelStyle}>Instagram URL</label>
            <input type="url" value={form.instagram_url} onChange={(e) => set("instagram_url", e.target.value)}
              placeholder="https://instagram.com/yourhandle" style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          </div>
        </div>

        {/* ── ERROR ── */}
        {errorMsg && (
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            backgroundColor: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.2)",
            borderRadius: "10px", padding: "12px 14px", marginTop: "24px",
          }}>
            <AlertCircle size={14} color="#EF4444" />
            <span style={{ fontSize: "13px", color: "#EF4444" }}>{errorMsg}</span>
          </div>
        )}

        {/* ── SAVE ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "28px" }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveState === "saving"}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "11px 24px", borderRadius: "8px", fontSize: "14px",
              fontWeight: 600, border: "none",
              cursor: saveState === "saving" ? "not-allowed" : "pointer",
              backgroundColor: saveState === "saved" ? "#059669" : "#8B5CF6",
              color: "#FFFFFF", boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
              fontFamily: "'Inter', sans-serif", transition: "background-color 0.2s",
              opacity: saveState === "saving" ? 0.7 : 1,
            }}
            onMouseEnter={(e) => { if (saveState === "idle") (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#7C3AED"; }}
            onMouseLeave={(e) => { if (saveState === "idle") (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#8B5CF6"; }}
          >
            {saveState === "saving" && <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} />}
            {saveState === "saved" && <Check size={14} />}
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save Changes"}
          </button>
        </div>

      </div>
    </>
  );
}