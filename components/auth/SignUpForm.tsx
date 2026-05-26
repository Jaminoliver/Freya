"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Banner = { type: "error" | "success" | "info"; message: string } | null;

const LOCKOUT_SECS = 59;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A3A3C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A3A3C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function SuccessOverlay({ message }: { message: string }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "#0A0A0F",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "48px 24px", gap: "16px",
    }}>
      <style>{`
        @keyframes successCheck { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes successFade  { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{
        width: "64px", height: "64px", borderRadius: "50%",
        background: "linear-gradient(135deg, #22C55E, #16A34A)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "successCheck 0.5s ease-out forwards",
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <p style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#FFFFFF", animation: "successFade 0.4s ease-out 0.3s forwards", opacity: 0 }}>
        {message}
      </p>
    </div>
  );
}

export function SignUpForm() {
  const router = useRouter();

  const [month, setMonth]           = useState("");
  const [day, setDay]               = useState("");
  const [year, setYear]             = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [code, setCode]             = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [showPw, setShowPw]         = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent]     = useState(false);
  const [locked, setLocked]         = useState(false);
  const [countdown, setCountdown]   = useState(0);
  const [banner, setBanner]         = useState<Banner>(null);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const timerRef                    = useRef<ReturnType<typeof setInterval> | null>(null);

  const days  = Array.from({ length: 31 }, (_, i) => i + 1);
  const curY  = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => curY - 18 - i);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startLockout = () => {
    setLocked(true);
    setCountdown(LOCKOUT_SECS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); setLocked(false); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const validateAge = (): boolean => {
    if (!month || !day || !year) return false;
    const dob = new Date(parseInt(year), MONTHS.indexOf(month), parseInt(day));
    const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 18;
  };

  const handleSendCode = async () => {
    if (locked || sendingCode) return;
    const newErrors: Record<string, string> = {};
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!validateAge()) {
      newErrors.dob = "You must be 18 or older to join Fréya";
    }
    if (Object.values(newErrors).some(Boolean)) { setErrors((p) => ({ ...p, ...newErrors })); return; }

    setSendingCode(true);
    try {
      const res  = await fetch("/api/check-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.exists) {
        setBanner({ type: "info", message: "An account with this email already exists. Try logging in instead." });
        setSendingCode(false);
        return;
      }
    } catch {}

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: Math.random().toString(36),
      options: { emailRedirectTo: undefined },
    });

    setSendingCode(false);
    if (otpError && !otpError.message.includes("already registered")) {
      setBanner({ type: "error", message: otpError.message });
      return;
    }
    setCodeSent(true);
    setBanner({ type: "success", message: "Code sent! Check your inbox." });
    startLockout();
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "signup" });
    if (error) { setBanner({ type: "error", message: "Invalid or expired code." }); }
    else { setBanner({ type: "success", message: "Email verified! Click Create Account to finish." }); }
  };

  const handleSubmit = async () => {
    setBanner(null);
    const newErrors: Record<string, string> = {};
    if (!month || !day || !year)         newErrors.dob       = "Please select your date of birth";
    if (!validateAge())                  newErrors.dob       = "You must be 18 or older to join Fréya";
    if (!email.trim())                   newErrors.email     = "Please enter your email";
    if (!password)                       newErrors.password  = "Please enter a password";
    if (password.length < 8)            newErrors.password  = "Password must be at least 8 characters";
    if (password !== confirmPw)         newErrors.confirmPw = "Passwords do not match";
    if (!code.trim())                    newErrors.code      = "Please enter the verification code";
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    setLoading(true);
    const supabase = createClient();

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(), token: code.trim(), type: "signup",
    });
    if (verifyError) {
      setBanner({ type: "error", message: "Invalid or expired code. Please request a new one." });
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { account_type: "fan" },
    });
    if (updateError) {
      setBanner({ type: "error", message: updateError.message });
      setLoading(false);
      return;
    }

    const dobString = `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, "0")}-${String(parseInt(day)).padStart(2, "0")}`;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await supabase.from("profiles").update({
        date_of_birth: dobString,
        is_age_verified: true,
        age_verified_at: new Date().toISOString(),
      }).eq("id", currentUser.id);
    }

    setLoading(false);
    setSuccess(true);
    setTimeout(() => window.location.reload(), 1800);
  };

  const handleGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
    });
  };

  const selStyle = (hasError?: boolean): React.CSSProperties => ({
    ...styles.dobSel,
    borderColor: hasError ? "#EF4444" : "#1F1F2A",
  });

  if (success) return <SuccessOverlay message="Account created!" />;

  return (
    <>
      <style>{`
        @keyframes sendPulse { 0%{transform:scale(1)} 50%{transform:scale(0.94)} 100%{transform:scale(1)} }
        .send-btn-pulse:active { animation: sendPulse 0.2s ease; }
      `}</style>

      <div style={styles.page}>
        {/* Header */}
        <div style={styles.header}>
          <img src="/freya_logo.png" alt="Fréya" style={{ height: "90px", width: "auto", marginLeft: "-20px" }} />
          <button style={styles.iconBtn} onClick={() => router.back()} aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          <div>
            <p style={styles.heading}>Own Your Content.<br />Own Your Bag.</p>
            <p style={styles.subtext}>Join 10,000+ African creators already earning on Fréya. You must be 18 or older.</p>
          </div>

          {banner && (
            <div style={{
              ...styles.banner,
              background: banner.type === "error" ? "rgba(239,68,68,0.1)" : banner.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(139,92,246,0.1)",
              borderColor: banner.type === "error" ? "#EF4444" : banner.type === "success" ? "#10B981" : "#8B5CF6",
            }}>
              <span style={{ color: banner.type === "error" ? "#EF4444" : banner.type === "success" ? "#10B981" : "#A78BFA", fontSize: "13px" }}>
                {banner.message}
              </span>
            </div>
          )}

          {/* OAuth - top */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button style={styles.oauthBtn} onClick={handleGoogle}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M19.8055 10.2292C19.8055 9.52422 19.7493 8.81576 19.6299 8.12109H10.2002V12.0879H15.6014C15.3768 13.3266 14.6508 14.4057 13.6106 15.0873V17.5865H16.8251C18.7173 15.8445 19.8055 13.2723 19.8055 10.2292Z" fill="#4285F4"/>
                <path d="M10.2002 20.0006C12.9516 20.0006 15.2719 19.1048 16.8286 17.5865L13.6141 15.0873C12.7322 15.6977 11.5719 16.0427 10.2037 16.0427C7.5479 16.0427 5.29461 14.2831 4.52135 11.9092H1.2207V14.4833C2.81587 17.6535 6.34655 20.0006 10.2002 20.0006Z" fill="#34A853"/>
                <path d="M4.51789 11.909C4.06107 10.6703 4.06107 9.33348 4.51789 8.09473V5.52063H1.22067C-0.192965 8.33598 -0.192965 11.6677 1.22067 14.483L4.51789 11.909Z" fill="#FBBC04"/>
                <path d="M10.2002 3.95817C11.6465 3.93567 13.0404 4.47379 14.0876 5.46098L16.9373 2.61129C15.1859 0.990234 12.7358 0.0979004 10.2002 0.124651C6.34655 0.124651 2.81587 2.47176 1.2207 5.64536L4.51792 8.21946C5.28771 5.84207 7.54447 3.95817 10.2002 3.95817Z" fill="#EA4335"/>
              </svg>
              Sign up with Google
            </button>
            <p style={{ textAlign: "center", fontSize: "11px", color: "#6B6B8A", margin: "2px 0 0", lineHeight: 1.5 }}>
              By continuing with Google, you agree to our{" "}
              <span style={styles.termsLink} onClick={() => router.push("/terms")}>Terms</span>{" "}and confirm you're 18+.
            </p>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#1F1F2A" }} />
            <span style={{ color: "#6B6B8A", fontSize: "12px" }}>or sign up with email</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#1F1F2A" }} />
          </div>

          <div style={styles.formStack}>
            {/* Date of birth */}
            <div>
              <div style={styles.fieldLabel}><span>Date of birth</span></div>
              <div style={styles.dobRow}>
                <select style={selStyle(!!errors.dob)} value={month} onChange={(e) => { setMonth(e.target.value); setErrors((p) => ({ ...p, dob: "" })); }}>
                  <option value="">Month</option>
                  {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select style={selStyle(!!errors.dob)} value={day} onChange={(e) => { setDay(e.target.value); setErrors((p) => ({ ...p, dob: "" })); }}>
                  <option value="">Day</option>
                  {days.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select style={selStyle(!!errors.dob)} value={year} onChange={(e) => { setYear(e.target.value); setErrors((p) => ({ ...p, dob: "" })); }}>
                  <option value="">Year</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {errors.dob
                ? <p style={styles.fieldError}>{errors.dob}</p>
                : <p style={styles.dobHint}>Your birthday won't be shown publicly.</p>
              }
            </div>

            {/* Email */}
            <div>
              <div style={styles.fieldLabel}><span>Email address</span></div>
              <input
                style={{ ...styles.inp, borderColor: errors.email ? "#EF4444" : "#1F1F2A" }}
                type="email"
                placeholder="Enter your email address"
                value={email}
                autoComplete="email"
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
              />
              {errors.email && <p style={styles.fieldError}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div style={styles.fieldLabel}><span>Password</span></div>
              <div style={styles.inpWrap}>
                <input
                  style={{ ...styles.inp, paddingRight: "46px", borderColor: errors.password ? "#EF4444" : "#1F1F2A" }}
                  type={showPw ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
                />
                <button style={styles.eyeBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => setShowPw(!showPw)} aria-label="Toggle">
                  <EyeIcon show={showPw} />
                </button>
              </div>
              {errors.password && <p style={styles.fieldError}>{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <div style={styles.fieldLabel}><span>Confirm password</span></div>
              <div style={styles.inpWrap}>
                <input
                  style={{ ...styles.inp, paddingRight: "46px", borderColor: errors.confirmPw ? "#EF4444" : "#1F1F2A" }}
                  type={showConf ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPw}
                  autoComplete="new-password"
                  onChange={(e) => { setConfirmPw(e.target.value); setErrors((p) => ({ ...p, confirmPw: "" })); }}
                />
                <button style={styles.eyeBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => setShowConf(!showConf)} aria-label="Toggle">
                  <EyeIcon show={showConf} />
                </button>
              </div>
              {errors.confirmPw && <p style={styles.fieldError}>{errors.confirmPw}</p>}
            </div>

            {/* Verify email */}
            <div>
              <div style={styles.fieldLabel}><span>Verify email</span></div>
              <div style={styles.codeRow}>
                <input
                  style={{ ...styles.inp, flex: 1, borderColor: errors.code ? "#EF4444" : "#1F1F2A" }}
                  type="text"
                  placeholder="Enter 8-digit code"
                  value={code}
                  maxLength={8}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCode(val);
                    setErrors((p) => ({ ...p, code: "" }));
                    if (val.length === 8) handleVerifyCode();
                  }}
                />
                <button
                  className="send-btn-pulse"
                  style={{ ...styles.sendBtn, opacity: locked || sendingCode || !email.trim() || !validateAge() ? 0.6 : 1 }}
                  onClick={handleSendCode}
                  disabled={locked || sendingCode || !email.trim() || !validateAge()}
                >
                  {sendingCode ? "Sending…" : locked ? `${countdown}s` : codeSent ? "Resend" : "Send code"}
                </button>
              </div>
              {errors.code && <p style={styles.fieldError}>{errors.code}</p>}
            </div>

            {/* Newsletter */}
            <div style={styles.checkRow}>
              <input
                type="checkbox"
                id="page-nl"
                checked={newsletter}
                onChange={(e) => setNewsletter(e.target.checked)}
                style={{ marginTop: "3px", accentColor: "#8B5CF6", width: "14px", height: "14px", flexShrink: 0 }}
              />
              <label htmlFor="page-nl" style={{ fontSize: "12px", color: "#A3A3C2", lineHeight: 1.5, cursor: "pointer" }}>
                Send me creator updates, promotions, and account alerts
              </label>
            </div>

            <button
              style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>

            <p style={styles.terms}>
              By signing up you agree to our{" "}
              <span style={styles.termsLink} onClick={() => router.push("/terms")}>Terms of Service</span>{" "}and{" "}
              <span style={styles.termsLink} onClick={() => router.push("/privacy")}>Privacy Policy</span>.
            </p>
          </div>

          <div style={styles.footerLinks}>
            <span style={{ fontSize: "13px", color: "#A3A3C2" }}>Already have an account?</span>
            <button style={styles.lnk} onClick={() => router.push("/login")}>Log in</button>
          </div>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: "100%", minHeight: "100vh",
    backgroundColor: "#0A0A0F",
    fontFamily: "'Inter', sans-serif",
    display: "flex", flexDirection: "column",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 24px 0",
  },
  iconBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#A3A3C2", display: "flex", alignItems: "center",
    padding: "4px", borderRadius: "8px",
  },
  body: {
    padding: "12px 24px 48px",
    display: "flex", flexDirection: "column", gap: "16px",
  },
  heading: {
    fontSize: "18px", fontWeight: 600, lineHeight: 1.25,
    background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
    margin: 0,
  },
  subtext: { fontSize: "13px", color: "#A3A3C2", lineHeight: 1.5, marginTop: "6px", marginBottom: 0 },
  banner: { padding: "12px 14px", borderRadius: "10px", border: "1.5px solid" },
  formStack: { display: "flex", flexDirection: "column", gap: "14px" },
  fieldLabel: { fontSize: "12px", fontWeight: 500, color: "#A3A3C2", marginBottom: "7px" },
  inp: {
    width: "100%", padding: "12px 14px", background: "#141420", border: "1.5px solid #1F1F2A",
    borderRadius: "10px", color: "#F1F5F9", fontSize: "14px", outline: "none",
    fontFamily: "'Inter', sans-serif", transition: "border-color 0.15s", boxSizing: "border-box",
  },
  inpWrap: { position: "relative" },
  eyeBtn: {
    position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center",
  },
  dobRow: { display: "flex", gap: "8px" },
  dobSel: {
    flex: 1, padding: "12px 8px", background: "#141420", border: "1.5px solid #1F1F2A",
    borderRadius: "10px", color: "#F1F5F9", fontSize: "13px", outline: "none",
    appearance: "none" as const, textAlign: "center" as const, cursor: "pointer",
    fontFamily: "'Inter', sans-serif", transition: "border-color 0.15s",
  },
  dobHint: { fontSize: "11px", color: "#6B6B8A", marginTop: "5px" },
  codeRow: { display: "flex", gap: "8px" },
  sendBtn: {
    flexShrink: 0, padding: "0 16px", background: "#141420", border: "1.5px solid #1F1F2A",
    borderRadius: "10px", color: "#8B5CF6", fontSize: "13px", fontWeight: 600,
    cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Inter', sans-serif",
    transition: "all 0.15s",
  },
  checkRow: { display: "flex", alignItems: "flex-start", gap: "10px" },
  fieldError: { margin: "6px 2px 0", fontSize: "12px", color: "#EF4444", lineHeight: 1.4 },
  btnPrimary: {
    width: "100%", padding: "11px 24px", background: "#8B5CF6", border: "none",
    borderRadius: "10px", color: "#fff", fontSize: "14px", fontWeight: 600,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
    boxShadow: "0 4px 24px rgba(139,92,246,0.35)", transition: "background 0.15s",
  },
  oauthBtn: {
    display: "flex", width: "100%", alignItems: "center", justifyContent: "center",
    gap: "10px", borderRadius: "10px", padding: "12px 16px", fontSize: "14px",
    fontWeight: 500, cursor: "pointer", backgroundColor: "#141420",
    border: "1.5px solid #1F1F2A", color: "#FFFFFF", boxSizing: "border-box" as const,
    fontFamily: "'Inter', sans-serif",
  },
  footerLinks: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  lnk: {
    color: "#8B5CF6", background: "none", border: "none", cursor: "pointer",
    fontSize: "13px", fontFamily: "'Inter', sans-serif", fontWeight: 500,
  },
  terms: { fontSize: "11px", color: "#6B6B8A", textAlign: "center", lineHeight: 1.6, margin: 0 },
  termsLink: { color: "#8B5CF6", cursor: "pointer" },
};