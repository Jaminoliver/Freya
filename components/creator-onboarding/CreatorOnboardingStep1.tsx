"use client";

import * as React from "react";
import { ChevronDown, Calendar } from "lucide-react";
import { useAppStore } from "@/lib/store/appStore";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

interface Step1Data {
  username: string;
  display_name: string;
  email: string;
  date_of_birth: string;
  country: string;
  state: string;
}

interface CreatorOnboardingStep1Props {
  onContinue: (data: Step1Data) => void;
  defaultValues?: Partial<Step1Data>;
}

function getAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function CreatorOnboardingStep1({ onContinue, defaultValues = {} }: CreatorOnboardingStep1Props) {
  const [form, setForm] = React.useState<Step1Data>({
    username:      defaultValues.username      ?? "",
    display_name:  defaultValues.display_name  ?? "",
    email:         defaultValues.email         ?? "",
    date_of_birth: defaultValues.date_of_birth ?? "",
    country:       defaultValues.country       ?? "Nigeria",
    state:         defaultValues.state         ?? "",
  });

  React.useEffect(() => {
    if (defaultValues.email) {
      setForm((prev) => ({ ...prev, email: defaultValues.email! }));
    }
  }, [defaultValues.email]);

  const [errors,    setErrors]    = React.useState<Partial<Record<keyof Step1Data, string>>>({});
  const [stateOpen, setStateOpen] = React.useState(false);
  const stateRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (stateRef.current && !stateRef.current.contains(e.target as Node)) {
        setStateOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const set = (key: keyof Step1Data, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const focusBorder = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#8B5CF6";
  };
  const blurBorder = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#1E1E2E";
  };

  const isFormValid =
    form.username.trim().length > 0 &&
    /^[a-zA-Z0-9_]+$/.test(form.username) &&
    form.display_name.trim().length > 0 &&
    form.date_of_birth.length > 0 &&
    getAge(form.date_of_birth) >= 18 &&
    form.country.trim().length > 0 &&
    form.state.length > 0;

  const validate = (): boolean => {
    const e: Partial<Record<keyof Step1Data, string>> = {};
    if (!form.username.trim()) e.username = "Username is required";
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) e.username = "Only letters, numbers and underscores";
    if (!form.display_name.trim()) e.display_name = "Display name is required";
    if (!form.date_of_birth) e.date_of_birth = "Date of birth is required";
    else if (getAge(form.date_of_birth) < 18) e.date_of_birth = "You must be at least 18 years old";
    if (!form.country.trim()) e.country = "Country is required";
    if (!form.state) e.state = "Please select your state";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const inputBase: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #1E1E2E",
    background: "#0C0C1A",
    color: "#E8E8F8",
    fontSize: "14px",
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: "#A3A3C2",
    marginBottom: "6px",
    display: "block",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  };

  const errMsg = (key: keyof Step1Data) =>
    errors[key] ? (
      <span style={{ fontSize: "11px", color: "#EF4444", marginTop: "4px", display: "block" }}>
        {errors[key]}
      </span>
    ) : null;

  return (
    <>
      <style>{`
        .step1-input::placeholder { color: #303048; }
        .state-option:hover { background: rgba(139,92,246,0.08) !important; }
        @media (max-width: 480px) {
          .step1-row { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column" }}>

        {/* ── Section heading ── */}
        <div style={{ marginBottom: "22px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#F0F0FF", margin: "0 0 4px" }}>
            Profile Info
          </h2>
          <p style={{ fontSize: "13px", color: "#A3A3C2", margin: 0 }}>
            Fill in your details to get started
          </p>
        </div>

        {/* ── Fields ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Username + Display Name */}
          <div className="step1-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Username</label>
              <input
                className="step1-input"
                type="text"
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                placeholder="@username"
                style={{ ...inputBase, borderColor: errors.username ? "#EF4444" : "#1E1E2E" }}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
              {errMsg("username")}
            </div>
            <div>
              <label style={labelStyle}>Display Name</label>
              <input
                className="step1-input"
                type="text"
                value={form.display_name}
                onChange={(e) => set("display_name", e.target.value)}
                placeholder="Your public name"
                style={{ ...inputBase, borderColor: errors.display_name ? "#EF4444" : "#1E1E2E" }}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
              {errMsg("display_name")}
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email</label>
            <div style={{ position: "relative" }}>
              <input
                className="step1-input"
                type="email"
                value={form.email}
                disabled
                placeholder="you@email.com"
                style={{ ...inputBase, opacity: 0.45, cursor: "not-allowed", paddingRight: "90px" }}
              />
              <span style={{
                position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                fontSize: "10px", fontWeight: 600, color: "#8B5CF6",
                background: "rgba(139,92,246,0.12)", borderRadius: "5px",
                padding: "3px 8px", letterSpacing: "0.04em", textTransform: "uppercase",
              }}>
                Read only
              </span>
            </div>
            <span style={{ fontSize: "12px", color: "#A3A3C2", marginTop: "4px", display: "block" }}>
              Change your email in{" "}
              <span
                style={{ color: "#8B5CF6", cursor: "pointer" }}
                onClick={() => {
                  useAppStore.getState().setSettingsPanel("account");
                  window.location.href = "/settings?panel=account";
                }}
              >account settings</span>
            </span>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "2px 0" }}>
            <div style={{ flex: 1, height: "1px", background: "#1C1C2E" }} />
            <span style={{ fontSize: "11px", color: "#6B6B8A", whiteSpace: "nowrap", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Additional details
            </span>
            <div style={{ flex: 1, height: "1px", background: "#1C1C2E" }} />
          </div>

          {/* Date of Birth */}
          <div>
            <label style={labelStyle}>Date of Birth</label>
            <div style={{ position: "relative" }}>
              <input
                className="step1-input"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => set("date_of_birth", e.target.value)}
                style={{
                  ...inputBase,
                  paddingRight: "40px",
                  colorScheme: "dark",
                  borderColor: errors.date_of_birth ? "#EF4444" : "#1E1E2E",
                }}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
              <Calendar size={14} style={{
                position: "absolute", right: "14px", top: "50%",
                transform: "translateY(-50%)", color: "#4A4A6A", pointerEvents: "none",
              }} />
            </div>
            {errMsg("date_of_birth")}
          </div>

          {/* Country + State */}
          <div className="step1-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Country</label>
              <select
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                style={{
                  ...inputBase,
                  cursor: "pointer",
                  appearance: "none",
                  WebkitAppearance: "none",
                }}
              >
                <option value="Nigeria">Nigeria</option>
              </select>
              {errMsg("country")}
            </div>

            <div ref={stateRef}>
              <label style={labelStyle}>State</label>
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => setStateOpen((p) => !p)}
                  style={{
                    ...inputBase,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderColor: errors.state ? "#EF4444" : stateOpen ? "#8B5CF6" : "#1E1E2E",
                    userSelect: "none",
                  }}
                >
                  <span style={{ color: form.state ? "#E8E8F8" : "#303048", fontSize: "14px" }}>
                    {form.state || "Select state"}
                  </span>
                  <ChevronDown size={14} style={{
                    color: "#4A4A6A",
                    transform: stateOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    flexShrink: 0,
                  }} />
                </div>

                {stateOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                    background: "#0F0F1E", border: "1px solid #1E1E2E",
                    borderRadius: "10px", zIndex: 50,
                    maxHeight: "200px", overflowY: "auto", scrollbarWidth: "none",
                  }}>
                    {NIGERIAN_STATES.map((s) => (
                      <div
                        key={s}
                        className="state-option"
                        onClick={() => { set("state", s); setStateOpen(false); }}
                        style={{
                          padding: "10px 14px", fontSize: "13px",
                          color: form.state === s ? "#8B5CF6" : "#E8E8F8",
                          background: form.state === s ? "rgba(139,92,246,0.1)" : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errMsg("state")}
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div style={{
          display: "flex", justifyContent: "flex-end",
          marginTop: "28px", paddingTop: "20px",
          borderTop: "1px solid #1C1C2E",
        }}>
          <button
            type="button"
            onClick={() => { if (validate()) onContinue(form); }}
            disabled={!isFormValid}
            style={{
              padding: "11px 26px", borderRadius: "10px",
              fontSize: "14px", fontWeight: 600,
              border: "none", cursor: isFormValid ? "pointer" : "not-allowed",
              background: isFormValid ? "#8B5CF6" : "#2A2040",
              color: isFormValid ? "#FFFFFF" : "#4A3A70",
              boxShadow: isFormValid ? "0 4px 24px rgba(139,92,246,0.28)" : "none",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.2s",
            }}
          >
            Continue →
          </button>
        </div>

      </div>
    </>
  );
}