"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
    <path d="M19.8055 10.2292C19.8055 9.52422 19.7493 8.81576 19.6299 8.12109H10.2002V12.0879H15.6014C15.3768 13.3266 14.6508 14.4057 13.6106 15.0873V17.5865H16.8251C18.7173 15.8445 19.8055 13.2723 19.8055 10.2292Z" fill="#4285F4"/>
    <path d="M10.2002 20.0006C12.9516 20.0006 15.2719 19.1048 16.8286 17.5865L13.6141 15.0873C12.7322 15.6977 11.5719 16.0427 10.2037 16.0427C7.5479 16.0427 5.29461 14.2831 4.52135 11.9092H1.2207V14.4833C2.81587 17.6535 6.34655 20.0006 10.2002 20.0006Z" fill="#34A853"/>
    <path d="M4.51789 11.909C4.06107 10.6703 4.06107 9.33348 4.51789 8.09473V5.52063H1.22067C-0.192965 8.33598 -0.192965 11.6677 1.22067 14.483L4.51789 11.909Z" fill="#FBBC04"/>
    <path d="M10.2002 3.95817C11.6465 3.93567 13.0404 4.47379 14.0876 5.46098L16.9373 2.61129C15.1859 0.990234 12.7358 0.0979004 10.2002 0.124651C6.34655 0.124651 2.81587 2.47176 1.2207 5.64536L4.51792 8.21946C5.28771 5.84207 7.54447 3.95817 10.2002 3.95817Z" fill="#EA4335"/>
  </svg>
);

async function resolveEmail(identifier: string): Promise<string | null> {
  if (identifier.includes("@")) return identifier.trim();
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_email_by_username", {
    p_username: identifier.trim().toLowerCase().replace(/^@/, ""),
  });
  if (error || !data) return null;
  return data as string;
}

interface Props {
  onNavigate: (screen: number) => void;
  onClose: () => void;
  onSuccess: () => void;
}

type Banner = { type: "error" | "info"; message: string } | null;

export function AuthModalLogin({ onNavigate, onClose, onSuccess }: Props) {
  const [identifier, setIdentifier]     = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [banner, setBanner]             = useState<Banner>(null);
  const [errors, setErrors]             = useState<{ identifier?: string; password?: string }>({});
  const identifierRef                   = useRef<HTMLInputElement>(null);
  const passwordRef                     = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    setBanner(null);
    const newErrors: typeof errors = {};
    if (!identifier.trim()) newErrors.identifier = "Please enter your email or username";
    if (!password) newErrors.password = "Please enter your password";
    setErrors(newErrors);
    if (newErrors.identifier) { identifierRef.current?.focus(); return; }
    if (newErrors.password)   { passwordRef.current?.focus(); return; }

    setLoading(true);
    const email = await resolveEmail(identifier);
    if (!email) {
      setBanner({ type: "error", message: "No account found with that username." });
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      const msg = loginError.message.toLowerCase();
      if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
        setBanner({ type: "error", message: "The email/username or password you entered is incorrect." });
      } else if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        setBanner({ type: "error", message: "Please verify your email before logging in." });
      } else if (msg.includes("rate limit") || msg.includes("too many")) {
        setBanner({ type: "error", message: "Too many login attempts. Please wait a few minutes." });
      } else {
        setBanner({ type: "error", message: "Something went wrong. Please try again." });
      }
      setLoading(false);
      return;
    }

    onSuccess();
  };

  const handleGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <>
      {/* Header */}
      <div style={styles.modalTop}>
        <button style={styles.iconBtn} onClick={() => onNavigate(0)} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <img src="/freya_logo.png" alt="Fréya" style={{ height: "70px", width: "auto" }} />
        <button style={styles.iconBtn} onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={styles.modalBody}>
        <div>
          <p style={styles.heading}>Welcome back.</p>
          <p style={styles.subtext}>Log in to continue on Fréya.</p>
        </div>

        {banner && (
          <div style={{ ...styles.banner, background: banner.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(139,92,246,0.1)", borderColor: banner.type === "error" ? "#EF4444" : "#8B5CF6" }}>
            <span style={{ color: banner.type === "error" ? "#EF4444" : "#A78BFA", fontSize: "13px" }}>{banner.message}</span>
          </div>
        )}

        <div style={styles.formStack}>
          {/* Identifier */}
          <div>
            <input
              ref={identifierRef}
              style={{ ...styles.inp, borderColor: errors.identifier ? "#EF4444" : "#1F1F2A" }}
              type="text"
              placeholder="Email or username"
              autoComplete="username"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setErrors((p) => ({ ...p, identifier: undefined })); }}
              onKeyDown={(e) => e.key === "Enter" && passwordRef.current?.focus()}
            />
            {errors.identifier && <p style={styles.fieldError}>{errors.identifier}</p>}
          </div>

          {/* Password */}
          <div>
            <div style={styles.fieldLabel}>
              <span>Password</span>
              <button style={styles.lnkSmall} onClick={() => onNavigate(2)}>Forgot password?</button>
            </div>
            <div style={styles.inpWrap}>
              <input
                ref={passwordRef}
                style={{ ...styles.inp, paddingRight: "46px", borderColor: errors.password ? "#EF4444" : "#1F1F2A" }}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <button style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password">
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A3A3C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A3A3C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <p style={styles.fieldError}>{errors.password}</p>}
          </div>

          <button
            style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Logging in…" : "Log In"}
          </button>

          <p style={styles.terms}>
            By logging in you agree to our <span style={styles.termsLink}>Terms</span> and confirm you are at least 18 years old.
          </p>

          <div style={styles.dividerRow}>
            <div style={styles.dividerLine}/><span style={styles.dividerLabel}>or</span><div style={styles.dividerLine}/>
          </div>

          <button style={styles.btnSecondary} onClick={handleGoogle}>
            <GoogleIcon />
            Sign in with Google
          </button>
        </div>

        <div style={styles.footerLinks}>
          <button style={styles.lnkMuted} onClick={() => onNavigate(3)}>Sign up for Fréya</button>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  modalTop: {
    display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 0",
  },
  brand: {
    fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px",
    background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
  },
  iconBtn: {
    background: "none", border: "none", cursor: "pointer", color: "#A3A3C2",
    display: "flex", alignItems: "center", padding: "4px", borderRadius: "8px",
  },
  modalBody: { padding: "12px 24px 28px", display: "flex", flexDirection: "column", gap: "16px" },
  heading: {
    fontSize: "18px", fontWeight: 600, lineHeight: 1.25,
    background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
  },
  subtext: { fontSize: "13px", color: "#A3A3C2", lineHeight: 1.5, marginTop: "6px" },
  banner: { padding: "12px 14px", borderRadius: "10px", border: "1.5px solid", display: "flex", alignItems: "center" },
  formStack: { display: "flex", flexDirection: "column", gap: "14px" },
  fieldLabel: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: "12px", fontWeight: 500, color: "#A3A3C2", marginBottom: "7px",
  },
  inp: {
    width: "100%", padding: "12px 14px", background: "#141420",
    border: "1.5px solid #1F1F2A", borderRadius: "10px", color: "#F1F5F9",
    fontSize: "14px", outline: "none", fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.15s", boxSizing: "border-box",
  },
  inpWrap: { position: "relative" },
  eyeBtn: {
    position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer", color: "#A3A3C2",
    display: "flex", alignItems: "center",
  },
  fieldError: { margin: "6px 2px 0", fontSize: "12px", color: "#EF4444", lineHeight: 1.4 },
  btnPrimary: {
    width: "100%", padding: "11px 24px", background: "#8B5CF6", border: "none",
    borderRadius: "10px", color: "#fff", fontSize: "14px", fontWeight: 600,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
    boxShadow: "0 4px 24px rgba(139,92,246,0.35)", transition: "background 0.15s", marginTop: "4px",
  },
  dividerRow: { display: "flex", alignItems: "center", gap: "12px" },
  dividerLine: { flex: 1, height: "1px", background: "#1F1F2A" },
  dividerLabel: { fontSize: "12px", color: "#6B6B8A" },
  btnSecondary: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
    gap: "10px", padding: "12px 16px", background: "#141420",
    border: "1.5px solid #1F1F2A", borderRadius: "10px", color: "#F1F5F9",
    fontSize: "14px", fontWeight: 500, cursor: "pointer",
    fontFamily: "'Inter', sans-serif", transition: "border-color 0.15s",
  },
  footerLinks: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  lnkSmall: {
    color: "#8B5CF6", background: "none", border: "none", cursor: "pointer",
    fontSize: "12px", fontFamily: "'Inter', sans-serif", fontWeight: 500,
  },
  lnkMuted: {
    color: "#A3A3C2", background: "none", border: "none", cursor: "pointer",
    fontSize: "13px", fontFamily: "'Inter', sans-serif",
  },
  terms: { fontSize: "11px", color: "#6B6B8A", textAlign: "center", lineHeight: 1.6 },
  termsLink: { color: "#8B5CF6", cursor: "pointer" },
};