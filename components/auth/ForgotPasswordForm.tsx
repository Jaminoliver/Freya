"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordResetOTPCard } from "@/components/auth/PasswordResetOTPCard";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECS = 59;

function ForgotPasswordFormInner() {
  const searchParams = useSearchParams();
  const prefillEmail  = searchParams.get("email") ?? "";
  const isSettingsFlow = !!prefillEmail;

  const [email,    setEmail]    = useState(prefillEmail);
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const autoSent = useRef(false);


  // Rate limiting
  const [attempts,  setAttempts]  = useState(0);
  const [locked,    setLocked]    = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLockout = () => {
    setLocked(true);
    setCountdown(LOCKOUT_SECS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setLocked(false);
          setAttempts(0);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Settings flow: auto-send on mount
  useEffect(() => {
    if (!isSettingsFlow || autoSent.current) return;
autoSent.current = true;
    sendReset(prefillEmail);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendReset = async (target: string) => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(target.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setLoading(false);
    if (resetError) { setError(resetError.message); return; }
    setSent(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    setError(null);

    try {
      const res  = await fetch("/api/check-email", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!data.exists) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          startLockout();
          setError(`Too many failed attempts. Try again in ${LOCKOUT_SECS} seconds.`);
        } else {
          setError(`No account found with that email address. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts === 1 ? "" : "s"} remaining.`);
        }
        return;
      }
    } catch {
      setError("Could not verify email. Please try again.");
      return;
    }

    await sendReset(email);
  };

  if (sent) return <PasswordResetOTPCard email={email.trim()} />;

  // Settings flow loading
  if (isSettingsFlow && !sent) {
    return (
      <div style={{ width: "390px", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        {error ? (
          <>
            <p style={{ color: "#EF4444", fontSize: "14px", marginBottom: "16px" }}>{error}</p>
            <button onClick={() => sendReset(email)} style={{ padding: "12px 24px", borderRadius: "10px", backgroundColor: "#8B5CF6", color: "#fff", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
              Try Again
            </button>
          </>
        ) : (
          <>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", border: "3px solid #1F1F2A", borderTop: "3px solid #8B5CF6", animation: "spin 0.9s linear infinite", marginBottom: "20px" }} />
            <p style={{ color: "#A3A3C2", fontSize: "15px", margin: 0 }}>
              Sending reset code to <strong style={{ color: "#F1F5F9" }}>{email}</strong>...
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: "390px", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <div style={{ padding: "20px 24px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "18px", backgroundColor: "#141420", border: "1.5px solid #1F1F2A", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
          <Lock size={28} strokeWidth={1.8} style={{ color: "#8B5CF6" }} />
        </div>

        <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 600, background: "linear-gradient(90deg, #8B5CF6, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.25 }}>
          Forgot Password?
        </h1>
        <p style={{ color: "#A3A3C2", fontSize: "14px", margin: "0 0 6px", lineHeight: 1.6 }}>
          Enter the email registered with your account and we'll send you a reset code.
        </p>

        <div style={{ width: "100%", height: "1px", backgroundColor: "#1F1F2A", margin: "16px 0 20px" }} />

        {/* Lockout banner */}
        {locked && (
          <div style={{ width: "100%", padding: "14px 16px", borderRadius: "10px", backgroundColor: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.3)", marginBottom: "16px", textAlign: "center" }}>
            <p style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 700, color: "#EF4444" }}>Too many attempts</p>
            <p style={{ margin: 0, fontSize: "13px", color: "#FCA5A5" }}>
              Try again in{" "}
              <span style={{ fontWeight: 700, fontSize: "16px" }}>{countdown}s</span>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px", textAlign: "left" }}>
          <input
            type="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (!locked) setError(null); }}
            required
            disabled={locked}
            style={{ width: "100%", borderRadius: "10px", padding: "15px 16px", fontSize: "16px", outline: "none", backgroundColor: locked ? "#0F0F1A" : "#141420", border: `1.5px solid ${error && !locked ? "#EF4444" : "#1F1F2A"}`, color: locked ? "#6B6B8A" : "#F1F5F9", boxSizing: "border-box", fontFamily: "'Inter', sans-serif", transition: "border-color 0.2s", cursor: locked ? "not-allowed" : "text" }}
            onFocus={(e)  => { if (!error && !locked) e.currentTarget.style.borderColor = "#8B5CF6"; }}
            onBlur={(e)   => { if (!error) e.currentTarget.style.borderColor = "#1F1F2A"; }}
          />
          {error && !locked && (
            <p style={{ margin: 0, fontSize: "13px", color: "#EF4444", textAlign: "center" }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || locked}
            style={{ width: "100%", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: 700, border: "none", cursor: loading || locked ? "not-allowed" : "pointer", backgroundColor: locked ? "#2A2A3D" : loading ? "#6d44c4" : "#8B5CF6", color: locked ? "#6B6B8A" : "#FFFFFF", boxShadow: locked ? "none" : "0 4px 24px rgba(139,92,246,0.35)", fontFamily: "'Inter', sans-serif", transition: "all 0.2s" }}
          >
            {locked ? `Locked for ${countdown}s` : loading ? "Checking..." : "Send Reset Code"}
          </button>
        </form>

        <Link href="/login" style={{ color: "#8B5CF6", fontSize: "14px", textDecoration: "none", fontWeight: 500, marginTop: "16px" }}>
          Back to Log In
        </Link>
      </div>
    </div>
  );
}

export function ForgotPasswordForm() {
  return (
    <Suspense fallback={<div style={{ width: "390px", minHeight: "200px", backgroundColor: "#0A0A0F" }} />}>
      <ForgotPasswordFormInner />
    </Suspense>
  );
}