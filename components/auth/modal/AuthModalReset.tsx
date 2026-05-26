"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  onNavigate: (screen: number) => void;
  onClose: () => void;
}

type Banner = { type: "error" | "success" | "info"; message: string } | null;

const LOCKOUT_SECS = 59;

export function AuthModalReset({ onNavigate, onClose }: Props) {
  const [email, setEmail]               = useState("");
  const [newPassword, setNewPassword]   = useState("");
  const [confirmPw, setConfirmPw]       = useState("");
  const [code, setCode]                 = useState("");
  const [showNewPw, setShowNewPw]       = useState(false);
  const [showConfPw, setShowConfPw]     = useState(false);
  const [loading, setLoading]           = useState(false);
  const [sendingCode, setSendingCode]   = useState(false);
  const [codeSent, setCodeSent]         = useState(false);
  const [locked, setLocked]             = useState(false);
  const [countdown, setCountdown]       = useState(0);
  const [banner, setBanner]             = useState<Banner>(null);
  const [errors, setErrors]             = useState<Record<string, string>>({});
  const [codeVerified, setCodeVerified] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const timerRef                        = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startLockout = () => {
    setLocked(true);
    setCountdown(LOCKOUT_SECS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setLocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    if (locked || sendingCode) return;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrors((p) => ({ ...p, email: "Please enter a valid email address" }));
      return;
    }
    setErrors((p) => ({ ...p, email: "" }));
    setSendingCode(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setSendingCode(false);
    if (error) {
      setBanner({ type: "error", message: error.message });
    } else {
      setCodeSent(true);
      setBanner({ type: "success", message: "Code sent! Check your email." });
      startLockout();
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) { setErrors((p) => ({ ...p, code: "Please enter the code" })); return; }
    setVerifyingCode(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "recovery" });
    setVerifyingCode(false);
    if (error) { setBanner({ type: "error", message: "Invalid or expired code." }); }
    else { setCodeVerified(true); setBanner({ type: "success", message: "Verified! Set your new password." }); }
  };

  const handleSubmit = async () => {
    setBanner(null);
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = "Please enter your email";
    if (!newPassword) newErrors.newPassword = "Please enter a new password";
    if (newPassword.length < 8) newErrors.newPassword = "Password must be at least 8 characters";
    if (newPassword !== confirmPw) newErrors.confirmPw = "Passwords do not match";
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateError) {
      setBanner({ type: "error", message: updateError.message });
    } else {
      setBanner({ type: "success", message: "Password reset! You can now log in." });
      setTimeout(() => onNavigate(1), 1500);
    }
  };

  return (
    <>
      <style>{`
        @keyframes sendPulse { 0%{transform:scale(1)} 50%{transform:scale(0.94)} 100%{transform:scale(1)} }
        .send-btn-pulse:active { animation: sendPulse 0.2s ease; }
        @keyframes fadeSlideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .fade-slide-down { animation: fadeSlideDown 0.25s ease forwards; }
      `}</style>
      {/* Header */}
      <div style={styles.modalTop}>
        <button style={styles.iconBtn} onClick={() => onNavigate(1)} aria-label="Back">
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
          <p style={styles.heading}>Reset password.</p>
          <p style={styles.subtext}>We'll send a code to your email to get you back in.</p>
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

        <div style={styles.formStack}>
          {/* Email */}
          <div>
            <div style={styles.fieldLabel}><span>Email address</span></div>
            <input
              style={{ ...styles.inp, borderColor: errors.email ? "#EF4444" : "#1F1F2A" }}
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
            />
            {errors.email && <p style={styles.fieldError}>{errors.email}</p>}
          </div>

          {/* Code */}
          <div>
            <div style={styles.fieldLabel}><span>Verification code</span></div>
            <div style={styles.codeRow}>
              <input
                style={{ ...styles.inp, flex: 1, borderColor: errors.code ? "#EF4444" : "#1F1F2A" }}
                type="text"
                placeholder="8-digit code"
                value={code}
                maxLength={8}
                onChange={(e) => { setCode(e.target.value); setErrors((p) => ({ ...p, code: "" })); }}
              />
              <button
                className="send-btn-pulse"
                style={{ ...styles.sendBtn, opacity: locked || sendingCode || !email.trim() ? 0.6 : 1, transition: "all 0.15s" }}
                onClick={handleSendCode}
                disabled={locked || sendingCode || !email.trim()}
              >
                {sendingCode ? "Sending…" : locked ? `${countdown}s` : codeSent ? "Resend" : "Send code"}
              </button>
            </div>
            {errors.code && <p style={styles.fieldError}>{errors.code}</p>}
            {!codeVerified && codeSent && (
              <button
                style={{ ...styles.btnPrimary, marginTop: "8px", opacity: verifyingCode ? 0.7 : 1 }}
                onClick={handleVerifyCode}
                disabled={verifyingCode}
              >
                {verifyingCode ? "Verifying…" : "Verify Code"}
              </button>
            )}
          </div>

          {codeVerified && <div className="fade-slide-down" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* New password */}
          <div>
            <div style={styles.fieldLabel}><span>New password</span></div>
            <div style={styles.inpWrap}>
              <input
                style={{ ...styles.inp, paddingRight: "46px", borderColor: errors.newPassword ? "#EF4444" : "#1F1F2A" }}
                type={showNewPw ? "text" : "password"}
                placeholder="Create new password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setErrors((p) => ({ ...p, newPassword: "" })); }}
              />
              <button style={styles.eyeBtn} onClick={() => setShowNewPw(!showNewPw)} aria-label="Toggle">
                <EyeIcon show={showNewPw} />
              </button>
            </div>
            {errors.newPassword && <p style={styles.fieldError}>{errors.newPassword}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <div style={styles.fieldLabel}><span>Confirm password</span></div>
            <div style={styles.inpWrap}>
              <input
                style={{ ...styles.inp, paddingRight: "46px", borderColor: errors.confirmPw ? "#EF4444" : "#1F1F2A" }}
                type={showConfPw ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPw}
                onChange={(e) => { setConfirmPw(e.target.value); setErrors((p) => ({ ...p, confirmPw: "" })); }}
              />
              <button style={styles.eyeBtn} onClick={() => setShowConfPw(!showConfPw)} aria-label="Toggle">
                <EyeIcon show={showConfPw} />
              </button>
            </div>
            {errors.confirmPw && <p style={styles.fieldError}>{errors.confirmPw}</p>}
          </div>
          </div>}

          {codeVerified && (
            <button
              style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1, marginTop: "4px" }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Resetting…" : "Reset Password"}
            </button>
          )}
        </div>

        <div style={styles.footerLinks}>
          <span style={{ fontSize: "13px", color: "#A3A3C2" }}>No account?</span>
          <button style={styles.lnk} onClick={() => onNavigate(3)}>Sign up for Fréya</button>
        </div>
      </div>
    </>
  );
}

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

const styles: Record<string, React.CSSProperties> = {
  modalTop: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 0" },
  brand: {
    fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px",
    background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
  },
  iconBtn: { background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: "4px", borderRadius: "8px" },
  modalBody: { padding: "12px 24px 28px", display: "flex", flexDirection: "column", gap: "16px" },
  heading: {
    fontSize: "18px", fontWeight: 600, lineHeight: 1.25,
    background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
  },
  subtext: { fontSize: "13px", color: "#A3A3C2", lineHeight: 1.5, marginTop: "6px" },
  banner: { padding: "12px 14px", borderRadius: "10px", border: "1.5px solid" },
  formStack: { display: "flex", flexDirection: "column", gap: "14px" },
  fieldLabel: { fontSize: "12px", fontWeight: 500, color: "#A3A3C2", marginBottom: "7px" },
  inp: {
    width: "100%", padding: "12px 14px", background: "#141420", border: "1.5px solid #1F1F2A",
    borderRadius: "10px", color: "#F1F5F9", fontSize: "14px", outline: "none",
    fontFamily: "'Inter', sans-serif", transition: "border-color 0.15s", boxSizing: "border-box",
  },
  inpWrap: { position: "relative" },
  eyeBtn: { position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" },
  codeRow: { display: "flex", gap: "8px" },
  sendBtn: {
    flexShrink: 0, padding: "0 16px", background: "#141420", border: "1.5px solid #1F1F2A",
    borderRadius: "10px", color: "#8B5CF6", fontSize: "13px", fontWeight: 600,
    cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.15s",
  },
  fieldError: { margin: "6px 2px 0", fontSize: "12px", color: "#EF4444", lineHeight: 1.4 },
  btnPrimary: {
    width: "100%", padding: "11px 24px", background: "#8B5CF6", border: "none",
    borderRadius: "10px", color: "#fff", fontSize: "14px", fontWeight: 600,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
    boxShadow: "0 4px 24px rgba(139,92,246,0.35)", transition: "background 0.15s",
  },
  footerLinks: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  lnk: { color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontFamily: "'Inter', sans-serif", fontWeight: 500 },
};