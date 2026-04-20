"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AvatarBannerUpload from "./AvatarBannerUpload";

// ─── Types ────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────
function getFlag(code: string): string {
  return code.toUpperCase().replace(/./g, (ch) =>
    String.fromCodePoint(0x1f1e6 - 65 + ch.charCodeAt(0))
  );
}

const COUNTRIES: { name: string; code: string }[] = [
  {name:"Afghanistan",code:"AF"},{name:"Albania",code:"AL"},{name:"Algeria",code:"DZ"},
  {name:"Andorra",code:"AD"},{name:"Angola",code:"AO"},{name:"Argentina",code:"AR"},
  {name:"Armenia",code:"AM"},{name:"Australia",code:"AU"},{name:"Austria",code:"AT"},
  {name:"Azerbaijan",code:"AZ"},{name:"Bahamas",code:"BS"},{name:"Bahrain",code:"BH"},
  {name:"Bangladesh",code:"BD"},{name:"Belarus",code:"BY"},{name:"Belgium",code:"BE"},
  {name:"Belize",code:"BZ"},{name:"Benin",code:"BJ"},{name:"Bhutan",code:"BT"},
  {name:"Bolivia",code:"BO"},{name:"Bosnia and Herzegovina",code:"BA"},{name:"Botswana",code:"BW"},
  {name:"Brazil",code:"BR"},{name:"Brunei",code:"BN"},{name:"Bulgaria",code:"BG"},
  {name:"Burkina Faso",code:"BF"},{name:"Burundi",code:"BI"},{name:"Cambodia",code:"KH"},
  {name:"Cameroon",code:"CM"},{name:"Canada",code:"CA"},{name:"Chad",code:"TD"},
  {name:"Chile",code:"CL"},{name:"China",code:"CN"},{name:"Colombia",code:"CO"},
  {name:"Congo",code:"CG"},{name:"Costa Rica",code:"CR"},{name:"Croatia",code:"HR"},
  {name:"Cuba",code:"CU"},{name:"Cyprus",code:"CY"},{name:"Czech Republic",code:"CZ"},
  {name:"Denmark",code:"DK"},{name:"Djibouti",code:"DJ"},{name:"Dominican Republic",code:"DO"},
  {name:"DR Congo",code:"CD"},{name:"Ecuador",code:"EC"},{name:"Egypt",code:"EG"},
  {name:"El Salvador",code:"SV"},{name:"Estonia",code:"EE"},{name:"Ethiopia",code:"ET"},
  {name:"Finland",code:"FI"},{name:"France",code:"FR"},{name:"Gabon",code:"GA"},
  {name:"Gambia",code:"GM"},{name:"Georgia",code:"GE"},{name:"Germany",code:"DE"},
  {name:"Ghana",code:"GH"},{name:"Greece",code:"GR"},{name:"Guatemala",code:"GT"},
  {name:"Guinea",code:"GN"},{name:"Haiti",code:"HT"},{name:"Honduras",code:"HN"},
  {name:"Hungary",code:"HU"},{name:"Iceland",code:"IS"},{name:"India",code:"IN"},
  {name:"Indonesia",code:"ID"},{name:"Iran",code:"IR"},{name:"Iraq",code:"IQ"},
  {name:"Ireland",code:"IE"},{name:"Israel",code:"IL"},{name:"Italy",code:"IT"},
  {name:"Jamaica",code:"JM"},{name:"Japan",code:"JP"},{name:"Jordan",code:"JO"},
  {name:"Kazakhstan",code:"KZ"},{name:"Kenya",code:"KE"},{name:"Kuwait",code:"KW"},
  {name:"Kyrgyzstan",code:"KG"},{name:"Laos",code:"LA"},{name:"Latvia",code:"LV"},
  {name:"Lebanon",code:"LB"},{name:"Liberia",code:"LR"},{name:"Libya",code:"LY"},
  {name:"Lithuania",code:"LT"},{name:"Luxembourg",code:"LU"},{name:"Madagascar",code:"MG"},
  {name:"Malawi",code:"MW"},{name:"Malaysia",code:"MY"},{name:"Mali",code:"ML"},
  {name:"Malta",code:"MT"},{name:"Mauritania",code:"MR"},{name:"Mauritius",code:"MU"},
  {name:"Mexico",code:"MX"},{name:"Moldova",code:"MD"},{name:"Mongolia",code:"MN"},
  {name:"Montenegro",code:"ME"},{name:"Morocco",code:"MA"},{name:"Mozambique",code:"MZ"},
  {name:"Myanmar",code:"MM"},{name:"Namibia",code:"NA"},{name:"Nepal",code:"NP"},
  {name:"Netherlands",code:"NL"},{name:"New Zealand",code:"NZ"},{name:"Nicaragua",code:"NI"},
  {name:"Niger",code:"NE"},{name:"Nigeria",code:"NG"},{name:"North Korea",code:"KP"},
  {name:"Norway",code:"NO"},{name:"Oman",code:"OM"},{name:"Pakistan",code:"PK"},
  {name:"Panama",code:"PA"},{name:"Papua New Guinea",code:"PG"},{name:"Paraguay",code:"PY"},
  {name:"Peru",code:"PE"},{name:"Philippines",code:"PH"},{name:"Poland",code:"PL"},
  {name:"Portugal",code:"PT"},{name:"Qatar",code:"QA"},{name:"Romania",code:"RO"},
  {name:"Russia",code:"RU"},{name:"Rwanda",code:"RW"},{name:"Saudi Arabia",code:"SA"},
  {name:"Senegal",code:"SN"},{name:"Serbia",code:"RS"},{name:"Sierra Leone",code:"SL"},
  {name:"Singapore",code:"SG"},{name:"Slovakia",code:"SK"},{name:"Slovenia",code:"SI"},
  {name:"Somalia",code:"SO"},{name:"South Africa",code:"ZA"},{name:"South Korea",code:"KR"},
  {name:"South Sudan",code:"SS"},{name:"Spain",code:"ES"},{name:"Sri Lanka",code:"LK"},
  {name:"Sudan",code:"SD"},{name:"Sweden",code:"SE"},{name:"Switzerland",code:"CH"},
  {name:"Syria",code:"SY"},{name:"Taiwan",code:"TW"},{name:"Tajikistan",code:"TJ"},
  {name:"Tanzania",code:"TZ"},{name:"Thailand",code:"TH"},{name:"Togo",code:"TG"},
  {name:"Trinidad and Tobago",code:"TT"},{name:"Tunisia",code:"TN"},{name:"Turkey",code:"TR"},
  {name:"Turkmenistan",code:"TM"},{name:"Uganda",code:"UG"},{name:"Ukraine",code:"UA"},
  {name:"United Arab Emirates",code:"AE"},{name:"United Kingdom",code:"GB"},
  {name:"United States",code:"US"},{name:"Uruguay",code:"UY"},{name:"Uzbekistan",code:"UZ"},
  {name:"Venezuela",code:"VE"},{name:"Vietnam",code:"VN"},{name:"Yemen",code:"YE"},
  {name:"Zambia",code:"ZM"},{name:"Zimbabwe",code:"ZW"},
];

// ─── Shimmer skeleton ─────────────────────────
const SHIMMER_KEYFRAMES = `
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
@keyframes spin { to { transform: rotate(360deg); } }
`;

const shimmerStyle: React.CSSProperties = {
  backgroundImage: "linear-gradient(90deg, #0F0F1A 0px, #1A1A2E 80px, #0F0F1A 160px)",
  backgroundSize: "600px 100%",
  animation: "shimmer 1.6s infinite linear",
  borderRadius: "6px",
};

function SkeletonBlock({
  width, height, style,
}: {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        ...shimmerStyle,
        width: width ?? "100%",
        height: height ?? "14px",
        borderRadius: "6px",
        ...style,
      }}
    />
  );
}

function ProfileSkeleton() {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <SkeletonBlock width="100%" height={120} style={{ borderRadius: "12px" }} />
      <div style={{ paddingLeft: "20px", marginTop: "-36px", marginBottom: "16px" }}>
        <SkeletonBlock width={72} height={72} style={{ borderRadius: "50%", border: "3px solid #0A0A0F" }} />
      </div>
      <SkeletonBlock width="25%" height={11} style={{ marginBottom: "14px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {(["30%", "25%", "15%"] as string[]).map((w, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <SkeletonBlock width={w} height={12} />
            <SkeletonBlock width="100%" height={i === 2 ? 80 : 44} style={{ borderRadius: "10px" }} />
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <SkeletonBlock width="30%" height={12} />
          <div style={{ display: "flex", gap: "8px" }}>
            <SkeletonBlock width="30%" height={88} style={{ borderRadius: "12px" }} />
            <SkeletonBlock width="25%" height={88} style={{ borderRadius: "12px" }} />
            <SkeletonBlock width="45%" height={88} style={{ borderRadius: "12px" }} />
          </div>
        </div>
      </div>
      {["Location", "Social Links"].map((label) => (
        <div key={label}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "28px 0 14px" }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
            <SkeletonBlock width={70} height={11} />
            <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {Array.from({ length: label === "Location" ? 2 : 5 }).map((_, i) => (
              <SkeletonBlock key={i} width="100%" height={44} style={{ borderRadius: "10px" }} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Main Component ───────────────────────────
export default function ProfileSettings({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<ProfileForm>({
    display_name: "", username: "", bio: "", location: "",
    country: "", state: "", date_of_birth: "",
    website_url: "", twitter_url: "", instagram_url: "",
    telegram_url: "", facebook_url: "",
  });

  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameInput,    setUsernameInput]    = useState("");
  const [usernameStatus,   setUsernameStatus]   = useState<UsernameStatus>("idle");
  const [usernameMsg,      setUsernameMsg]      = useState<string | null>(null);
  const [suggestions,      setSuggestions]      = useState<string[]>([]);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null);
  const [userId,    setUserId]    = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load profile ──────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select(
          "display_name, username, bio, location, country, state, date_of_birth, website_url, twitter_url, instagram_url, telegram_url, facebook_url, avatar_url, banner_url"
        )
        .eq("id", user.id)
        .single();

      if (data) {
        setForm({
          display_name:  data.display_name  ?? "",
          username:      data.username      ?? "",
          bio:           data.bio           ?? "",
          location:      data.location      ?? "",
          country:       data.country       ?? "",
          state:         data.state         ?? "",
          date_of_birth: data.date_of_birth ?? "",
          website_url:   data.website_url   ?? "",
          twitter_url:   data.twitter_url   ?? "",
          instagram_url: data.instagram_url ?? "",
          telegram_url:  data.telegram_url  ?? "",
          facebook_url:  data.facebook_url  ?? "",
        });
        setOriginalUsername(data.username ?? "");
        setUsernameInput(data.username ?? "");
        setAvatarUrl(data.avatar_url ?? null);
        setBannerUrl(data.banner_url ?? null);
      }
      setLoading(false);
    };
    load();
  }, []);

  // ── Username check ────────────────────────
  const checkUsername = useCallback(async (value: string) => {
    const trimmed = value.toLowerCase().trim();
    if (!trimmed) { setUsernameStatus("idle"); setUsernameMsg(null); setSuggestions([]); return; }
    if (trimmed === originalUsername.toLowerCase()) { setUsernameStatus("own"); setUsernameMsg(null); setSuggestions([]); return; }
    if (!/^[a-z0-9_]{3,30}$/.test(trimmed)) {
      setUsernameStatus("invalid");
      setUsernameMsg("3–30 characters. Letters, numbers, and underscores only.");
      setSuggestions([]);
      return;
    }
    setUsernameStatus("checking"); setUsernameMsg(null); setSuggestions([]);
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
    setUsernameInput(value); setUsernameStatus("idle"); setUsernameMsg(null); setSuggestions([]);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => checkUsername(value), 500);
  };

  const set = (key: keyof ProfileForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Focus handlers ────────────────────────
  // For most inputs: only apply the purple border. Let the browser handle scroll natively.
  const focusBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "#8B5CF6";
  };

  // For deep inputs (social links, bottom of form): use visualViewport resize event
  // so scroll fires AFTER the keyboard finishes opening — not on a guess timeout.
  const focusDeep = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#8B5CF6";
    const el = e.currentTarget;
    const vv = window.visualViewport;
    if (!vv) {
      // fallback for browsers without visualViewport support
      setTimeout(() => el?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
      return;
    }
    const onResize = () => {
      vv.removeEventListener("resize", onResize);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    vv.addEventListener("resize", onResize);
    // Safety cleanup in case keyboard doesn't trigger a resize (e.g. desktop)
    setTimeout(() => vv.removeEventListener("resize", onResize), 1500);
  };

  const blurReset = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "#2A2A3D";
  };

  // ── Save ──────────────────────────────────
  const canSave =
    saveState !== "saving" &&
    (usernameStatus === "available" || usernameStatus === "own" || usernameStatus === "idle");

  const handleSave = async () => {
    if (!userId || !canSave) return;
    if (usernameInput.toLowerCase() !== originalUsername.toLowerCase() && usernameStatus !== "available") return;
    setSaveState("saving"); setErrorMsg(null);
    const supabase = createClient();
    const updates: Record<string, unknown> = {
      display_name: form.display_name  || null,
      bio:          form.bio           || null,
      location:     form.location      || null,
      country:      form.country       || null,
      state:        form.state         || null,
      date_of_birth: form.date_of_birth || null,
      website_url:   form.website_url  || null,
      twitter_url:   form.twitter_url  || null,
      instagram_url: form.instagram_url || null,
      telegram_url:  form.telegram_url  || null,
      facebook_url:  form.facebook_url  || null,
      updated_at:    new Date().toISOString(),
    };
    if (usernameStatus === "available" && usernameInput.trim() !== originalUsername) {
      updates.username = usernameInput.toLowerCase().trim();
    }
    const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
    if (error) {
      setSaveState("error"); setErrorMsg(error.message);
    } else {
      const finalUsername = (updates.username as string) ?? form.username;
      setSaveState("saved");
      setTimeout(() => { router.push(`/${finalUsername}`); }, 1000);
    }
  };

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

  const usernameBorderColor = () => {
    if (usernameStatus === "available") return "#22C55E";
    if (usernameStatus === "taken" || usernameStatus === "invalid") return "#EF4444";
    if (usernameStatus === "checking") return "#8B5CF6";
    return "#2A2A3D";
  };

  // ── Render ────────────────────────────────
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div style={{ display: "flex", flexDirection: "column", paddingBottom: "80px" }}>
        {loading ? (
          <ProfileSkeleton />
        ) : (
          <>
            {userId && (
              <AvatarBannerUpload
                userId={userId}
                displayName={form.display_name}
                username={form.username}
                initialAvatarUrl={avatarUrl}
                initialBannerUrl={bannerUrl}
              />
            )}

            {/* ── Basic Info ── */}
            <p style={{
              fontSize: "11px", fontWeight: 600, color: "#6B6B8A",
              letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 14px",
            }}>
              Basic Info
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

              {/* Display Name */}
              <div>
                <label style={labelStyle}>Display Name</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => set("display_name", e.target.value)}
                  placeholder="Your public name"
                  style={inputBase}
                  onFocus={focusBorder}
                  onBlur={blurReset}
                />
              </div>

              {/* Username */}
              <div>
                <label style={labelStyle}>Username</label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
                    fontSize: "14px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif",
                    pointerEvents: "none", zIndex: 1,
                  }}>@</span>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="yourhandle"
                    maxLength={30}
                    style={{ ...inputBase, paddingLeft: "28px", paddingRight: "40px", borderColor: usernameBorderColor() }}
                    onFocus={focusBorder}
                    onBlur={blurReset}
                  />
                  <div style={{
                    position: "absolute", right: "12px", top: "50%",
                    transform: "translateY(-50%)", display: "flex", alignItems: "center",
                  }}>
                    {usernameStatus === "checking" && (
                      <Loader2 size={16} color="#8B5CF6" style={{ animation: "spin 0.9s linear infinite" }} />
                    )}
                    {usernameStatus === "available" && <Check size={16} color="#22C55E" strokeWidth={2.5} />}
                    {(usernameStatus === "taken" || usernameStatus === "invalid") && (
                      <X size={16} color="#EF4444" strokeWidth={2.5} />
                    )}
                  </div>
                </div>
                {usernameMsg && (
                  <span style={{
                    fontSize: "12px", marginTop: "5px", display: "block",
                    color: usernameStatus === "available" ? "#22C55E" : "#EF4444",
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {usernameMsg}
                  </span>
                )}
                {suggestions.length > 0 && (
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>Try:</span>
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setUsernameInput(s); handleUsernameChange(s); }}
                        style={{
                          padding: "3px 10px", borderRadius: "20px", border: "1px solid #2A2A3D",
                          backgroundColor: "#1C1C2E", color: "#8B5CF6", fontSize: "12px",
                          fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.15)";
                          e.currentTarget.style.borderColor = "#8B5CF6";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#1C1C2E";
                          e.currentTarget.style.borderColor = "#2A2A3D";
                        }}
                      >
                        @{s}
                      </button>
                    ))}
                  </div>
                )}
                <span style={{
                  fontSize: "11px", color: "#6B6B8A", marginTop: "5px",
                  display: "block", fontStyle: "italic",
                }}>
                  Changing your username will update your profile URL.
                </span>
              </div>

              {/* Bio */}
              <div>
                <label style={labelStyle}>Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => set("bio", e.target.value)}
                  placeholder="Tell people about yourself..."
                  maxLength={200}
                  rows={3}
                  style={{ ...inputBase, resize: "none", lineHeight: 1.6 }}
                  onFocus={focusBorder}
                  onBlur={blurReset}
                />
                <span style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "4px", display: "block", textAlign: "right" }}>
                  {form.bio.length}/200
                </span>
              </div>

              {/* Date of Birth */}
              <div>
                <label style={labelStyle}>Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  max={`${new Date().getFullYear() - 13}-12-31`}
                  min="1900-01-01"
                  onChange={(e) => set("date_of_birth", e.target.value)}
                  style={{ ...inputBase, colorScheme: "dark" }}
                  onFocus={focusBorder}
                  onBlur={blurReset}
                />
                <span style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "5px", display: "block", fontStyle: "italic" }}>
                  Not shown publicly — used for age verification
                </span>
              </div>
            </div>

            {/* ── Location ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "28px 0 14px" }}>
              <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
              <span style={dividerLabel}>Location</span>
              <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>City</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="e.g. Lagos"
                  style={inputBase}
                  onFocus={focusDeep}
                  onBlur={blurReset}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Country</label>
                <select
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                  style={{ ...inputBase, cursor: "pointer", colorScheme: "dark" }}
                  onFocus={focusBorder}
                  onBlur={blurReset}
                >
                  <option value="">Select country…</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>
                      {getFlag(c.code)} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Social Links ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "28px 0 14px" }}>
              <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
              <span style={dividerLabel}>Social Links</span>
              <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { label: "Website URL",     key: "website_url",   placeholder: "https://yoursite.com" },
                { label: "Twitter / X URL", key: "twitter_url",   placeholder: "https://x.com/yourhandle" },
                { label: "Instagram URL",   key: "instagram_url", placeholder: "https://instagram.com/yourhandle" },
                { label: "Telegram URL",    key: "telegram_url",  placeholder: "https://t.me/yourhandle" },
                { label: "Facebook URL",    key: "facebook_url",  placeholder: "https://facebook.com/yourhandle" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    type="url"
                    value={form[key as keyof ProfileForm]}
                    onChange={(e) => set(key as keyof ProfileForm, e.target.value)}
                    placeholder={placeholder}
                    style={inputBase}
                    onFocus={focusDeep}
                    onBlur={blurReset}
                  />
                </div>
              ))}
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                backgroundColor: "rgba(239,68,68,0.08)",
                border: "1.5px solid rgba(239,68,68,0.2)",
                borderRadius: "10px", padding: "12px 14px", marginTop: "24px",
              }}>
                <AlertCircle size={14} color="#EF4444" />
                <span style={{ fontSize: "13px", color: "#EF4444" }}>{errorMsg}</span>
              </div>
            )}

            {/* Save button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "28px" }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "11px 24px", borderRadius: "8px", fontSize: "14px",
                  fontWeight: 600, border: "none", cursor: canSave ? "pointer" : "not-allowed",
                  backgroundColor: saveState === "saved" ? "#059669" : "#8B5CF6",
                  color: "#FFFFFF", boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
                  fontFamily: "'Inter', sans-serif", transition: "background-color 0.2s",
                  opacity: canSave ? 1 : 0.5,
                }}
              >
                {saveState === "saving" && (
                  <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} />
                )}
                {saveState === "saved" && <Check size={14} />}
                {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}