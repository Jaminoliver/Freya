"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  onNavigate: (screen: number) => void;
  onClose:    () => void;
  onSuccess:  () => void;
}

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

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "spin 0.75s linear infinite", flexShrink: 0 }}>
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function timeout<T>(ms: number): Promise<T> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

export function AuthModalSignUpForm({ onNavigate, onClose, onSuccess }: Props) {
  const [month, setMonth]             = useState("");
  const [day, setDay]                 = useState("");
  const [year, setYear]               = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [code, setCode]               = useState("");
  const [newsletter, setNewsletter]   = useState(false);
  const [showPw, setShowPw]           = useState(false);
  const [showConf, setShowConf]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [slowNetwork, setSlowNetwork] = useState(false);
  const [success, setSuccess]         = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent]       = useState(false);
  const [locked, setLocked]           = useState(false);
  const [countdown, setCountdown]     = useState(0);
  const [banner, setBanner]           = useState<Banner>(null);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const timerRef                      = useRef<ReturnType<typeof setInterval> | null>(null);
  const slowTimerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const days  = Array.from({ length: 31 }, (_, i) => i + 1);
  const curY  = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => curY - 18 - i);

  useEffect(() => () => {
    if (timerRef.current)   clearInterval(timerRef.current);
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
  }, []);

  const startSlowTimer = () => {
    slowTimerRef.current = setTimeout(() => setSlowNetwork(true), 6000);
  };
  const clearSlowTimer = () => {
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    setSlowNetwork(false);
  };

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
    if (!validateAge()) newErrors.dob = "You must be 18 or older to join Fréya";
    if (Object.values(newErrors).some(Boolean)) { setErrors((p) => ({ ...p, ...newErrors })); return; }

    if (!navigator.onLine) {
      setBanner({ type: "error", message: "You're offline. Connect to the internet and try again." });
      return;
    }

    setSendingCode(true);
    try {
      const res  = await Promise.race([
        fetch("/api/check-email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        }),
        timeout<never>(10000),
      ]) as Response;
      const data = await res.json();
      if (data.exists) {
        setBanner({ type: "info", message: "An account with this email exists. Try logging in instead." });
        setSendingCode(false);
        return;
      }
    } catch {}

    const supabase = createClient();
    try {
      const { error: otpError } = await Promise.race([
        supabase.auth.signUp({
          email: email.trim(),
          password: Math.random().toString(36),
          options: { emailRedirectTo: undefined },
        }),
        timeout<never>(10000),
      ]) as any;

      setSendingCode(false);
      if (otpError && !otpError.message.includes("already registered")) {
        setBanner({ type: "error", message: otpError.message });
        return;
      }
      setCodeSent(true);
      setBanner({ type: "success", message: "Code sent! Check your inbox." });
      startLockout();
    } catch {
      setSendingCode(false);
      setBanner({ type: "error", message: "Connection timed out. Check your internet and try again." });
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) return;
    const supabase = createClient();
    try {
      const { error } = await Promise.race([
        supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "signup" }),
        timeout<never>(10000),
      ]) as any;
      if (error) { setBanner({ type: "error", message: "Invalid or expired code." }); }
      else        { setBanner({ type: "success", message: "Email verified! Click Create Account to finish." }); }
    } catch {
      setBanner({ type: "error", message: "Connection timed out. Check your internet and try again." });
    }
  };

  const handleSubmit = async () => {
    setBanner(null);
    const newErrors: Record<string, string> = {};
    if (!month || !day || !year)  newErrors.dob       = "Please select your date of birth";
    if (!validateAge())            newErrors.dob       = "You must be 18 or older to join Fréya";
    if (!email.trim())             newErrors.email     = "Please enter your email";
    if (!password)                 newErrors.password  = "Please enter a password";
    if (password.length < 8)      newErrors.password  = "Password must be at least 8 characters";
    if (password !== confirmPw)   newErrors.confirmPw = "Passwords do not match";
    if (!code.trim())              newErrors.code      = "Please enter the verification code";
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    if (!navigator.onLine) {
      setBanner({ type: "error", message: "You're offline. Connect to the internet and try again." });
      return;
    }

    setLoading(true);
    startSlowTimer();

    const supabase = createClient();

    try {
      // Verify OTP
      const { error: verifyError } = await Promise.race([
        supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "signup" }),
        timeout<never>(10000),
      ]) as any;

      if (verifyError) {
        clearSlowTimer();
        setBanner({ type: "error", message: "Invalid or expired code. Please request a new one." });
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await Promise.race([
        supabase.auth.updateUser({ password, data: { account_type: "fan" } }),
        timeout<never>(10000),
      ]) as any;

      if (updateError) {
        clearSlowTimer();
        setBanner({ type: "error", message: updateError.message });
        setLoading(false);
        return;
      }

      // Save DOB
      const dobString = `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, "0")}-${String(parseInt(day)).padStart(2, "0")}`;
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase.from("profiles").update({
          date_of_birth:   dobString,
          is_age_verified: true,
          age_verified_at: new Date().toISOString(),
        }).eq("id", currentUser.id);
      }

      clearSlowTimer();
      setLoading(false);
      setSuccess(true);
      onSuccess();

    } catch {
      clearSlowTimer();
      // Check if session exists despite timeout
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSuccess(true);
        onSuccess();
        return;
      }
      setBanner({ type: "error", message: "Connection timed out. Check your internet and try again." });
      setLoading(false);
    }
  };

  const selStyle = (hasError?: boolean): React.CSSProperties => ({
    ...styles.dobSel,
    borderColor: hasError ? "#EF4444" : "#1F1F2A",
  });

  return (
    <>
      <style>{`
        @keyframes sendPulse { 0%{transform:scale(1)} 50%{transform:scale(0.94)} 100%{transform:scale(1)} }
        @keyframes spin { to { transform: rotate(360deg) } }
        .send-btn-pulse:active { animation: sendPulse 0.2s ease; }
      `}</style>

      {/* Header */}
      <div style={styles.modalTop}>
        <button style={styles.iconBtn} onClick={() => onNavigate(3)} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <img src="/freya_logo.png" alt="Fréya" style={{ height: "48px", width: "auto" }} />
        <button style={styles.iconBtn} onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {success && <SuccessOverlay message="Account created!" />}

      {/* Body */}
      <div style={styles.modalBody}>
        <div>
          <p style={styles.heading}>Create account.</p>
          <p style={styles.subtext}>You must be 18 or older to join Fréya.</p>
        </div>

        {banner && (
          <div style={{
            ...styles.banner,
            background:  banner.type === "error" ? "rgba(239,68,68,0.1)" : banner.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(139,92,246,0.1)",
            borderColor: banner.type === "error" ? "#EF4444"             : banner.type === "success" ? "#10B981"              : "#8B5CF6",
          }}>
            <span style={{ color: banner.type === "error" ? "#EF4444" : banner.type === "success" ? "#10B981" : "#A78BFA", fontSize: "13px" }}>
              {banner.message}
            </span>
          </div>
        )}

        <div style={styles.formStack}>
          {/* DOB */}
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
              type="email" placeholder="Enter your email address"
              value={email}
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
                type={showPw ? "text" : "password"} placeholder="Create a password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
              />
              <button style={styles.eyeBtn} onClick={() => setShowPw(!showPw)} aria-label="Toggle"><EyeIcon show={showPw} /></button>
            </div>
            {errors.password && <p style={styles.fieldError}>{errors.password}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <div style={styles.fieldLabel}><span>Confirm password</span></div>
            <div style={styles.inpWrap}>
              <input
                style={{ ...styles.inp, paddingRight: "46px", borderColor: errors.confirmPw ? "#EF4444" : "#1F1F2A" }}
                type={showConf ? "text" : "password"} placeholder="Re-enter your password"
                value={confirmPw}
                onChange={(e) => { setConfirmPw(e.target.value); setErrors((p) => ({ ...p, confirmPw: "" })); }}
              />
              <button style={styles.eyeBtn} onClick={() => setShowConf(!showConf)} aria-label="Toggle"><EyeIcon show={showConf} /></button>
            </div>
            {errors.confirmPw && <p style={styles.fieldError}>{errors.confirmPw}</p>}
          </div>

          {/* Verify email */}
          <div>
            <div style={styles.fieldLabel}><span>Verify email</span></div>
            <div style={styles.codeRow}>
              <input
                style={{ ...styles.inp, flex: 1, borderColor: errors.code ? "#EF4444" : "#1F1F2A" }}
                type="text" placeholder="Enter 8-digit code"
                value={code} maxLength={8}
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
              type="checkbox" id="modal-nl" checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              style={{ marginTop: "3px", accentColor: "#8B5CF6", width: "14px", height: "14px", flexShrink: 0 }}
            />
            <label htmlFor="modal-nl" style={{ fontSize: "12px", color: "#A3A3C2", lineHeight: 1.5, cursor: "pointer" }}>
              Send me creator updates, promotions, and account alerts
            </label>
          </div>

          <button
            style={{ ...styles.btnPrimary, opacity: loading ? 0.75 : 1 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <Spinner /> Creating account…
              </span>
            ) : "Create Account"}
          </button>

          {slowNetwork && (
            <p style={{ textAlign: "center", fontSize: "12px", color: "#6B6B8A", margin: "-4px 0 0" }}>
              Taking longer than usual… Check your connection
            </p>
          )}

          <p style={styles.terms}>
            By signing up you agree to our <span style={styles.termsLink}>Terms of Service</span> and <span style={styles.termsLink}>Privacy Policy</span>.
          </p>
        </div>

        <div style={styles.footerLinks}>
          <span style={{ fontSize: "13px", color: "#A3A3C2" }}>Already have an account?</span>
          <button style={styles.lnk} onClick={() => onNavigate(1)}>Log in</button>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  modalTop: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 0" },
  iconBtn:  { background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: "4px", borderRadius: "8px" },
  modalBody: { padding: "12px 20px 24px", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "80vh", overflowY: "auto" },
  heading: {
    fontSize: "17px", fontWeight: 600, lineHeight: 1.25,
    background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
  },
  subtext:    { fontSize: "13px", color: "#A3A3C2", lineHeight: 1.5, marginTop: "4px" },
  banner:     { padding: "10px 14px", borderRadius: "10px", border: "1.5px solid" },
  formStack:  { display: "flex", flexDirection: "column", gap: "12px" },
  fieldLabel: { fontSize: "12px", fontWeight: 500, color: "#A3A3C2", marginBottom: "6px" },
  inp: {
    width: "100%", padding: "11px 14px", background: "#141420",
    border: "1.5px solid #1F1F2A", borderRadius: "10px", color: "#F1F5F9",
    fontSize: "16px", outline: "none", fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.15s", boxSizing: "border-box",
  },
  inpWrap: { position: "relative" },
  eyeBtn:  { position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" },
  dobRow:  { display: "flex", gap: "8px" },
  dobSel: {
    flex: 1, padding: "11px 8px", background: "#141420", border: "1.5px solid #1F1F2A",
    borderRadius: "10px", color: "#F1F5F9", fontSize: "13px", outline: "none",
    appearance: "none" as const, textAlign: "center" as const, cursor: "pointer",
    fontFamily: "'Inter', sans-serif", transition: "border-color 0.15s",
  },
  dobHint:    { fontSize: "11px", color: "#6B6B8A", marginTop: "5px" },
  codeRow:    { display: "flex", gap: "8px" },
  sendBtn: {
    flexShrink: 0, padding: "0 14px", background: "#141420", border: "1.5px solid #1F1F2A",
    borderRadius: "10px", color: "#8B5CF6", fontSize: "13px", fontWeight: 600,
    cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Inter', sans-serif", transition: "opacity 0.15s",
  },
  checkRow:   { display: "flex", alignItems: "flex-start", gap: "10px" },
  fieldError: { margin: "5px 2px 0", fontSize: "12px", color: "#EF4444", lineHeight: 1.4 },
  btnPrimary: {
    width: "100%", padding: "11px 24px", background: "#8B5CF6", border: "none",
    borderRadius: "10px", color: "#fff", fontSize: "14px", fontWeight: 600,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
    boxShadow: "0 4px 20px rgba(139,92,246,0.35)", transition: "opacity 0.15s",
  },
  footerLinks: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  lnk:  { color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontFamily: "'Inter', sans-serif", fontWeight: 500 },
  terms:    { fontSize: "11px", color: "#6B6B8A", textAlign: "center", lineHeight: 1.6 },
  termsLink: { color: "#8B5CF6", cursor: "pointer" },
};

function SuccessOverlay({ message }: { message: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 10,
      background: "#0D0D14", borderRadius: "inherit",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "48px 24px", gap: "16px",
    }}>
      <style>{`
        @keyframes successCheck { 0%{transform:scale(0);opacity:0} 50%{transform:scale(1.2);opacity:1} 100%{transform:scale(1);opacity:1} }
        @keyframes successFade  { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
      <div style={{
        width: "60px", height: "60px", borderRadius: "50%",
        background: "linear-gradient(135deg, #22C55E, #16A34A)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "successCheck 0.45s ease-out forwards",
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <p style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#FFFFFF", animation: "successFade 0.4s ease-out 0.3s forwards", opacity: 0 }}>{message}</p>
    </div>
  );
}