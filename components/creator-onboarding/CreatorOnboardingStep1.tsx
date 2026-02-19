"use client";

import { useState } from "react";
import { ChevronDown, Calendar } from "lucide-react";

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

export function CreatorOnboardingStep1({
  onContinue,
  defaultValues = {},
}: CreatorOnboardingStep1Props) {
  const [form, setForm] = useState<Step1Data>({
    username: defaultValues.username ?? "",
    display_name: defaultValues.display_name ?? "",
    email: defaultValues.email ?? "",
    date_of_birth: defaultValues.date_of_birth ?? "",
    country: defaultValues.country ?? "Nigeria",
    state: defaultValues.state ?? "",
  });

  const [stateOpen, setStateOpen] = useState(false);

  const set = (key: keyof Step1Data, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const inputBase: React.CSSProperties = {
    width: "100%",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#141420",
    border: "1.5px solid #2A2A3D",
    color: "#F1F5F9",
    boxSizing: "border-box",
    fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    color: "#8B5CF6",
    marginBottom: "6px",
    display: "block",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#F1F5F9", margin: "0 0 3px" }}>
          Profile Info
        </h2>
        <p style={{ fontSize: "13px", color: "#A3A3C2", margin: 0 }}>
          Fill in your details below
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={labelStyle}>Username</label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            placeholder="@username"
            style={inputBase}
          />
        </div>

        <div>
          <label style={labelStyle}>Display Name</label>
          <input
            type="text"
            value={form.display_name}
            onChange={(e) => set("display_name", e.target.value)}
            placeholder="Your public name"
            style={inputBase}
          />
        </div>

        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@email.com"
            style={inputBase}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "2px 0" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
          <span style={{ fontSize: "11px", color: "#6B6B8A" }}>Complete your details</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#2A2A3D" }} />
        </div>

        <div>
          <label style={labelStyle}>Date of Birth</label>
          <div style={{ position: "relative" }}>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => set("date_of_birth", e.target.value)}
              style={{ ...inputBase, paddingRight: "40px", colorScheme: "dark" }}
            />
            <Calendar size={14} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "#6B6B8A", pointerEvents: "none" }} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Country</label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
            placeholder="Your country"
            style={inputBase}
          />
          <span style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "3px", display: "block", fontStyle: "italic" }}>
            Cannot be changed after setup
          </span>
        </div>

        <div>
          <label style={labelStyle}>State of Residence</label>
          <div style={{ position: "relative" }}>
            <div
              onClick={() => setStateOpen((p) => !p)}
              style={{
                ...inputBase,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: `1.5px solid ${stateOpen ? "#8B5CF6" : "#2A2A3D"}`,
                userSelect: "none",
              }}
            >
              <span style={{ color: form.state ? "#F1F5F9" : "#6B6B8A", fontSize: "14px" }}>
                {form.state || "Select your state"}
              </span>
              <ChevronDown size={14} style={{ color: "#6B6B8A", transform: stateOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }} />
            </div>

            {stateOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", zIndex: 50, maxHeight: "200px", overflowY: "auto", scrollbarWidth: "none" }}>
                {NIGERIAN_STATES.map((s) => (
                  <div
                    key={s}
                    onClick={() => { set("state", s); setStateOpen(false); }}
                    style={{ padding: "10px 14px", fontSize: "13px", color: form.state === s ? "#8B5CF6" : "#F1F5F9", backgroundColor: form.state === s ? "rgba(139,92,246,0.08)" : "transparent", cursor: "pointer", transition: "background-color 0.15s" }}
                    onMouseEnter={(e) => { if (form.state !== s) (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { if (form.state !== s) (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"; }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "28px" }}>
        <button
          type="button"
          onClick={() => onContinue(form)}
          style={{ padding: "11px 24px", borderRadius: "8px", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", backgroundColor: "#8B5CF6", color: "#FFFFFF", boxShadow: "0 4px 20px rgba(139,92,246,0.3)", fontFamily: "'Inter', sans-serif" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#7C3AED"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#8B5CF6"; }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}