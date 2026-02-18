"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface EmailVerificationCardProps {
  email?: string;
}

export function EmailVerificationCard({ email = "user@example.com" }: EmailVerificationCardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "loading" | "success" | "error">("pending");

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      setStatus("loading");
      const timer = setTimeout(() => setStatus("success"), 1800);
      return () => clearTimeout(timer);
    }
    if (searchParams.get("error") === "true") {
      setStatus("error");
    }
  }, [searchParams]);

  const handleResend = () => {
    console.log("Resend verification email to:", email);
  };

  // Loading state
  if (status === "loading") {
    return (
      <div style={{ width: "390px", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center" }}>
        <div style={{
          width: "64px", height: "64px", borderRadius: "50%",
          border: "3px solid #1F1F2A", borderTop: "3px solid #8B5CF6",
          animation: "spin 0.9s linear infinite", marginBottom: "24px",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#A3A3C2", fontSize: "15px", margin: 0 }}>Verifying your email...</p>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div style={{ width: "390px", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px", textAlign: "center" }}>
        <div style={{
          width: "72px", height: "72px", borderRadius: "50%",
          background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: "20px",
          animation: "pop 0.4s ease",
        }}>
          <style>{`@keyframes pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 700, background: "linear-gradient(90deg, #8B5CF6, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          You're verified!
        </h1>
        <p style={{ color: "#A3A3C2", fontSize: "14px", margin: "0 0 32px", lineHeight: 1.6 }}>
          Your email has been confirmed. Welcome to Freya.
        </p>
        <button
          onClick={() => router.push("/login")}
          style={{ width: "100%", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: "#8B5CF6", color: "#fff", boxShadow: "0 4px 24px rgba(139,92,246,0.35)" }}
        >
          Continue to Log In
        </button>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div style={{ width: "390px", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "#1F1F2A", border: "1.5px solid #EF4444", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 700, color: "#F1F5F9" }}>Link expired</h1>
        <p style={{ color: "#A3A3C2", fontSize: "14px", margin: "0 0 32px", lineHeight: 1.6 }}>
          This verification link is invalid or has expired. Request a new one below.
        </p>
        <button onClick={handleResend} style={{ width: "100%", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: "#8B5CF6", color: "#fff", boxShadow: "0 4px 24px rgba(139,92,246,0.35)", marginBottom: "12px" }}>
          Resend Verification Email
        </button>
        <Link href="/login" style={{ display: "block", width: "100%", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: 600, textAlign: "center", textDecoration: "none", backgroundColor: "#141420", border: "1.5px solid #1F1F2A", color: "#A3A3C2", boxSizing: "border-box" }}>
          Back to Log In
        </Link>
      </div>
    );
  }

  // Default: pending (check your inbox)
  return (
    <div style={{ width: "390px", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <div style={{ padding: "20px 24px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "18px", backgroundColor: "#141420", border: "1.5px solid #1F1F2A", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M2 7l10 7 10-7" />
          </svg>
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 600, background: "linear-gradient(90deg, #8B5CF6, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.25 }}>
          Check Your Email
        </h1>
        <p style={{ color: "#A3A3C2", fontSize: "14px", margin: "0 0 4px", lineHeight: 1.5 }}>We've sent a verification link to</p>
        <p style={{ color: "#F1F5F9", fontSize: "15px", fontWeight: 700, margin: "0 0 8px" }}>{email}</p>
        <p style={{ color: "#6B6B8A", fontSize: "14px", margin: "0 0 20px", lineHeight: 1.6 }}>Click the link in your email to verify your account and get started.</p>
        <div style={{ width: "100%", height: "1px", backgroundColor: "#1F1F2A", marginBottom: "20px" }} />
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
          <button type="button" onClick={handleResend} style={{ width: "100%", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: "#8B5CF6", color: "#FFFFFF", boxShadow: "0 4px 24px rgba(139, 92, 246, 0.35)" }}>
            Resend Verification Email
          </button>
          <Link href="/login" style={{ display: "block", width: "100%", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: 600, textAlign: "center", textDecoration: "none", backgroundColor: "#141420", border: "1.5px solid #1F1F2A", color: "#A3A3C2", boxSizing: "border-box" }}>
            Back to Log In
          </Link>
        </div>
        <p style={{ color: "#3A3A50", fontSize: "12px", margin: "20px 0 0" }}>Didn't receive the email? Check your spam folder.</p>
      </div>
    </div>
  );
}