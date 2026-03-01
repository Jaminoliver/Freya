"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Check, AlertCircle, X } from "lucide-react";
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
  telegram_url: string;
  facebook_url: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";
type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "own";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => String(currentYear - 18 - i));

function parseDOB(dob: string): { day: string; month: string; year: string } {
  if (!dob) return { day: "", month: "", year: "" };
  const [y, m, d] = dob.split("-");
  return { day: d ?? "", month: m ?? "", year: y ?? "" };
}

function buildDOB(day: string, month: string, year: string): string {
  if (!day || !month || !year) return "";
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export default function ProfileSettings({ onBack }: { onBack?: () => void }) {
  const router = useRouter();

  const [form, setForm] = useState<ProfileForm>({
    display_name: "", username: "", bio: "", location: "",
    country: "", state: "", date_of_birth: "",
    website_url: "", twitter_url: "", instagram_url: "",
    telegram_url: "", facebook_url: "",
  });

  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameInput,    setUsernameInput]    = useState("");
  const [usernameStatus,   setUsernameStatus]   = useState<UsernameStatus>("idle");
  const [usernameMsg,      setUsernameMsg]       = useState<string | null>(null);
  const [suggestions,      setSuggestions]       = useState<string[]>([]);

  const [dobDay,   setDobDay]   = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear,  setDobYear]  = useState("");

  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(null);
  const [bannerUrl,       setBannerUrl]       = useState<string | null>(null);
  const [saveState,       setSaveState]       = useState<SaveState>("idle");
  const [errorMsg,        setErrorMsg]        = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [userId,          setUserId]          = useState<string | null>(null);
  const [cropImageSrc,    setCropImageSrc]    = useState<string | null>(null);
  const [cropType,        setCropType]        = useState<"avatar" | "banner">("avatar");

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, bio, location, country, state, date_of_birth, website_url, twitter_url, instagram_url, telegram_url, facebook_url, avatar_url, banner_url")
        .eq("id", user.id)
        .single();
      if (data) {
        setForm({
          display_name:  data.display_name ?? "",
          username:      data.username ?? "",
          bio:           data.bio ?? "",
          location:      data.location ?? "",
          country:       data.country ?? "",
          state:         data.state ?? "",
          date_of_birth: data.date_of_birth ?? "",
          website_url:   data.website_url ?? "",
          twitter_url:   data.twitter_url ?? "",
          instagram_url: data.instagram_url ?? "",
          telegram_url:  data.telegram_url ?? "",
          facebook_url:  data.facebook_url ?? "",
        });
        setOriginalUsername(data.username ?? "");
        setUsernameInput(data.username ?? "");
        setAvatarUrl(data.avatar_url);
        setBannerUrl(data.banner_url);
        const { day, month, year } = parseDOB(data.date_of_birth ?? "");
        setDobDay(day);
        setDobMonth(month);
        setDobYear(year);
      }
    };
    load();
  }, []);

  // ── Debounced username check ──────────────────────────────────────────────
  const checkUsername = useCallback(async (value: string) => {
    const trimmed = value.toLowerCase().trim();

    if (!trimmed) { setUsernameStatus("idle"); setUsernameMsg(null); setSuggestions([]); return; }

    // Same as original — no check needed
    if (trimmed === originalUsername.toLowerCase()) {
      setUsernameStatus("own");
      setUsernameMsg(null);
      setSuggestions([]);
      return;
    }

    // Client-side format check before hitting API
    if (!/^[a-z0-9_]{3,30}$/.test(trimmed)) {
      setUsernameStatus("invalid");
      setUsernameMsg("3–30 characters. Letters, numbers, and underscores only.");
      setSuggestions([]);
      return;
    }

    setUsernameStatus("checking");
    setUsernameMsg(null);
    setSuggestions([]);

    try {
      const res  = await fetch(`/api/check-username?username=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (data.available) {
        setUsernameStatus("available");
        setUsernameMsg("Username available");
        setSuggestions([]);
      } else {
        setUsernameStatus("taken");
        setUsernameMsg(data.reason || "Username not available");
        setSuggestions(data.suggestions ?? []);
      }
    } catch {
      setUsernameStatus("idle");
      setUsernameMsg("Could not check availability");
      setSuggestions([]);
    }
  }, [originalUsername]);

  const handleUsernameChange = (value: string) => {
    setUsernameInput(value);
    setUsernameStatus("idle");
    setUsernameMsg(null);
    setSuggestions([]);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => checkUsername(value), 500);
  };

  const set = (key: keyof ProfileForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFileSelect = (type: "avatar" | "banner") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCropType(type); setCropImageSrc(reader.result as string); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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
      await supabase.from("profiles").update({ [field]: url, updated_at: new Date().toISOString() }).eq("id", userId);
      if (type === "avatar") setAvatarUrl(url);
      else setBannerUrl(url);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      if (type === "avatar") setUploadingAvatar(false);
      else setUploadingBanner(false);
    }
  };

  const canSave =
    saveState !== "saving" &&
    (usernameStatus === "available" || usernameStatus === "own" || usernameStatus === "idle");

  const handleSave = async () => {
    if (!userId || !canSave) return;

    // Block save if username is actively being changed but status isn't resolved
    if (usernameInput.toLowerCase() !== originalUsername.toLowerCase() && usernameStatus !== "available") return;

    setSaveState("saving");
    setErrorMsg(null);
    const supabase = createClient();
    const dob = buildDOB(dobDay, dobMonth, dobYear);

    const updates: Record<string, unknown> = {
      display_name:  form.display_name || null,
      bio:           form.bio || null,
      location:      form.location || null,
      country:       form.country || null,
      state:         form.state || null,
      date_of_birth: dob || null,
      website_url:   form.website_url || null,
      twitter_url:   form.twitter_url || null,
      instagram_url: form.instagram_url || null,
      telegram_url:  form.telegram_url || null,
      facebook_url:  form.facebook_url || null,
      updated_at:    new Date().toISOString(),
    };

    // Only include username if it changed and is available
    if (usernameStatus === "available" && usernameInput.trim() !== originalUsername) {
      updates.username = usernameInput.toLowerCase().trim();
    }

    const { error } = await supabase.from("profiles").update(updates).eq("id", userId);

    if (error) {
      setSaveState("error");
      setErrorMsg(error.message);
    } else {
      const finalUsername = (updates.username as string) ?? form.username;
      setSaveState("saved");
      setTimeout(() => { router.push(`/${finalUsername}`); }, 1000);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputBase: React.CSSProperties = {
    width: "100%", borderRadius: "10px", padding: "12px 14px",
    fontSize: "14px", outline: "none", backgroundColor: "#141420",
    border: "1.5px solid #2A2A3D", color: "#F1F5F9",
    boxSizing: "border-box", fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.2s",
  };

  const selectBase: React.CSSProperties = {
    flex: 1, borderRadius: "10px", padding: "11px 10px",
    fontSize: "13px", outline: "none", backgroundColor: "#141420",
    border: "1.5px solid #2A2A3D", color: "#F1F5F9",
    boxSizing: "border-box", fontFamily: "'Inter', sans-serif",
    appearance: "none", cursor: "pointer",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B6B8A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "28px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px", fontWeight: 500, color: "#8B5CF6",
    marginBottom: "6px", display: "block",
  };

  const dividerLabel: React.CSSProperties = {
    fontSize: "11px", color: "#6B6B8A", letterSpacing: "0.08em",
    textTransform: "uppercase", fontWeight: 600,
  };

  // Username border color based on status
  const usernameBorderColor = () => {
    if (usernameStatus === "available") return "#22C55E";
    if (usernameStatus === "taken" || usernameStatus === "invalid") return "#EF4444";
    if (usernameStatus === "checking") return "#8B5CF6";
    return "#2A2A3D";
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {cropImageSrc && (
        <ImageCropModal imageSrc={cropImageSrc} type={cropType} onSave={handleCropSave} onCancel={() => setCropImageSrc(null)} />
      )}

      <div style={{ display: "flex", flexDirection: "column", paddingBottom: "80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#F1F5F9", margin: "0 0 3px" }}>Profile</h2>
            <p style={{ fontSize: "13px", color: "#A3A3C2", margin: 0 }}>Manage your public profile information</p>
          </div>
        </div>

        {/* Banner + Avatar */}
        <div style={{ marginBottom: "16px" }}>
          <div onClick={() => bannerInputRef.current?.click()}
            style={{ width: "100%", height: "120px", borderRadius: "12px", backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center", cursor: "pointer", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", opacity: bannerUrl ? 0 : 1, transition: "opacity 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = bannerUrl ? "0" : "1")}>
              {uploadingBanner ? <Loader2 size={20} color="#fff" style={{ animation: "spin 0.9s linear infinite" }} /> : <Camera size={20} color="#fff" />}
              {!uploadingBanner && <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", fontFamily: "'Inter', sans-serif" }}>Edit banner</span>}
            </div>
          </div>
          <div style={{ paddingLeft: "20px", marginTop: "-36px" }}>
            <div onClick={() => avatarInputRef.current?.click()}
              style={{ width: "72px", height: "72px", borderRadius: "50%", border: "3px solid #0A0A0F", cursor: "pointer", overflow: "hidden", backgroundImage: avatarUrl ? `url(${avatarUrl})` : "linear-gradient(135deg, #8B5CF6, #EC4899)", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              {!avatarUrl && <span style={{ fontSize: "24px", fontWeight: 700, color: "#fff" }}>{form.display_name?.charAt(0) || form.username?.charAt(0) || "?"}</span>}
              <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", opacity: 0, transition: "opacity 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}>
                {uploadingAvatar ? <Loader2 size={14} color="#fff" style={{ animation: "spin 0.9s linear infinite" }} /> : <Camera size={14} color="#fff" />}
              </div>
            </div>
          </div>
        </div>

        <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect("avatar")} />
        <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect("banner")} />

        {/* Basic Info */}
        <p style={{ fontSize: "11px", fontWeight: 600, color: "#6B6B8A", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 14px" }}>Basic Info</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Display Name */}
          <div>
            <label style={labelStyle}>Display Name</label>
            <input type="text" value={form.display_name} onChange={(e) => set("display_name", e.target.value)} placeholder="Your public name" style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")} onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          </div>

          {/* Username */}
          <div>
            <label style={labelStyle}>Username</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif", pointerEvents: "none", zIndex: 1 }}>@</span>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="yourhandle"
                maxLength={30}
                style={{ ...inputBase, paddingLeft: "28px", paddingRight: "40px", borderColor: usernameBorderColor() }}
              />
              {/* Status icon */}
              <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
                {usernameStatus === "checking" && (
                  <Loader2 size={16} color="#8B5CF6" style={{ animation: "spin 0.9s linear infinite" }} />
                )}
                {usernameStatus === "available" && (
                  <Check size={16} color="#22C55E" strokeWidth={2.5} />
                )}
                {(usernameStatus === "taken" || usernameStatus === "invalid") && (
                  <X size={16} color="#EF4444" strokeWidth={2.5} />
                )}
              </div>
            </div>

            {/* Status message */}
            {usernameMsg && (
              <span style={{ fontSize: "12px", marginTop: "5px", display: "block", color: usernameStatus === "available" ? "#22C55E" : "#EF4444", fontFamily: "'Inter', sans-serif" }}>
                {usernameMsg}
              </span>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>Try:</span>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setUsernameInput(s); handleUsernameChange(s); }}
                    style={{ padding: "3px 10px", borderRadius: "20px", border: "1px solid #2A2A3D", backgroundColor: "#1C1C2E", color: "#8B5CF6", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.15)"; e.currentTarget.style.borderColor = "#8B5CF6"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#1C1C2E"; e.currentTarget.style.borderColor = "#2A2A3D"; }}
                  >
                    @{s}
                  </button>
                ))}
              </div>
            )}

            <span style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "5px", display: "block", fontStyle: "italic" }}>
              Changing your username will update your profile URL.
            </span>
          </div>

          {/* Bio */}
          <div>
            <label style={labelStyle}>Bio</label>
            <textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Tell people about yourself..." maxLength={200} rows={3}
              style={{ ...inputBase, resize: "none", lineHeight: 1.6 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")} onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
            <span style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "4px", display: "block", textAlign: "right" }}>{form.bio.length}/200</span>
          </div>

          {/* Date of Birth */}
          <div>
            <label style={labelStyle}>Date of Birth</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <select value={dobDay} onChange={(e) => setDobDay(e.target.value)} style={selectBase}>
                <option value="" style={{ backgroundColor: "#0D0D18" }}>Day</option>
                {DAYS.map((d) => <option key={d} value={d} style={{ backgroundColor: "#0D0D18" }}>{d}</option>)}
              </select>
              <select value={dobMonth} onChange={(e) => setDobMonth(e.target.value)} style={selectBase}>
                <option value="" style={{ backgroundColor: "#0D0D18" }}>Month</option>
                {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")} style={{ backgroundColor: "#0D0D18" }}>{m}</option>)}
              </select>
              <select value={dobYear} onChange={(e) => setDobYear(e.target.value)} style={selectBase}>
                <option value="" style={{ backgroundColor: "#0D0D18" }}>Year</option>
                {YEARS.map((y) => <option key={y} value={y} style={{ backgroundColor: "#0D0D18" }}>{y}</option>)}
              </select>
            </div>
            <span style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "4px", display: "block", fontStyle: "italic" }}>Not shown publicly — used for age verification</span>
          </div>
        </div>

        {/* Location */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "28px 0 14px" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
          <span style={dividerLabel}>Location</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>City / Location</label>
            <input type="text" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Lagos" style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")} onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={labelStyle}>State / Region</label>
              <input type="text" value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="e.g. Lagos State" style={inputBase}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")} onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <input type="text" value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="e.g. Nigeria" style={inputBase}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")} onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "28px 0 14px" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
          <span style={dividerLabel}>Social Links</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Website URL</label>
            <input type="url" value={form.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="https://yoursite.com" style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")} onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          </div>
          <div>
            <label style={labelStyle}>Twitter / X URL</label>
            <input type="url" value={form.twitter_url} onChange={(e) => set("twitter_url", e.target.value)} placeholder="https://x.com/yourhandle" style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")} onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          </div>
          <div>
            <label style={labelStyle}>Instagram URL</label>
            <input type="url" value={form.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} placeholder="https://instagram.com/yourhandle" style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")} onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          </div>
          <div>
            <label style={labelStyle}>Telegram URL</label>
            <input type="url" value={form.telegram_url} onChange={(e) => set("telegram_url", e.target.value)} placeholder="https://t.me/yourhandle" style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")} onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          </div>
          <div>
            <label style={labelStyle}>Facebook URL</label>
            <input type="url" value={form.facebook_url} onChange={(e) => set("facebook_url", e.target.value)} placeholder="https://facebook.com/yourhandle" style={inputBase}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")} onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          </div>
        </div>

        {errorMsg && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "12px 14px", marginTop: "24px" }}>
            <AlertCircle size={14} color="#EF4444" />
            <span style={{ fontSize: "13px", color: "#EF4444" }}>{errorMsg}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "28px" }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "11px 24px", borderRadius: "8px", fontSize: "14px", fontWeight: 600, border: "none", cursor: canSave ? "pointer" : "not-allowed", backgroundColor: saveState === "saved" ? "#059669" : "#8B5CF6", color: "#FFFFFF", boxShadow: "0 4px 20px rgba(139,92,246,0.3)", fontFamily: "'Inter', sans-serif", transition: "background-color 0.2s", opacity: canSave ? 1 : 0.5 }}
          >
            {saveState === "saving" && <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} />}
            {saveState === "saved"  && <Check size={14} />}
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}