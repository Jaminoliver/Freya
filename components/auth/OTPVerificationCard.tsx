"use client";

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface OTPVerificationCardProps {
  email: string;
}

export function OTPVerificationCard({ email }: OTPVerificationCardProps) {
  const router = useRouter();
  const [otp, setOtp] = useState<string[]>(new Array(8).fill(""));
  const [status, setStatus] = useState<"pending" | "loading" | "success" | "error">("pending");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Auto-focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (newOtp.every((digit) => digit !== "") && index === 7) {
      verifyOTP(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 8).split("");
    
    if (pastedData.every((char) => /^\d$/.test(char))) {
      const newOtp = [...otp];
      pastedData.forEach((char, i) => {
        if (i < 8) newOtp[i] = char;
      });
      setOtp(newOtp);
      
      // Focus last filled input or trigger verification
      if (pastedData.length === 8) {
        verifyOTP(newOtp.join(""));
      } else {
        inputRefs.current[pastedData.length]?.focus();
      }
    }
  };

  const verifyOTP = async (code: string) => {
    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email,
      token: code,
      type: "email",
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message || "Invalid or expired code");
      setOtp(new Array(8).fill(""));
      inputRefs.current[0]?.focus();
    } else {
      setStatus("success");
      setTimeout(() => router.push("/dashboard"), 2000);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    setResendLoading(false);

    if (error) {
      setResendMessage({ type: "error", text: error.message });
    } else {
      setResendMessage({ type: "success", text: "New code sent! Check your inbox." });
    }
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
        <p style={{ color: "#A3A3C2", fontSize: "15px", margin: 0 }}>Verifying your code...</p>
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
          Your email has been confirmed. Taking you to your dashboard...
        </p>
      </div>
    );
  }

  // Pending state - OTP input
  return (
    <div style={{ width: "390px", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <div style={{ padding: "20px 24px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "18px", backgroundColor: "#141420", border: "1.5px solid #1F1F2A", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 600, background: "linear-gradient(90deg, #8B5CF6, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.25 }}>
          Enter Verification Code
        </h1>
        <p style={{ color: "#A3A3C2", fontSize: "14px", margin: "0 0 4px", lineHeight: 1.5 }}>We've sent an 8-digit code to</p>
        <p style={{ color: "#F1F5F9", fontSize: "15px", fontWeight: 700, margin: "0 0 24px" }}>{email}</p>

        {/* OTP Input */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              style={{
                width: "40px",
                height: "52px",
                borderRadius: "10px",
                border: `2px solid ${status === "error" && errorMessage ? "#EF4444" : digit ? "#8B5CF6" : "#1F1F2A"}`,
                backgroundColor: "#141420",
                color: "#F1F5F9",
                fontSize: "20px",
                fontWeight: 700,
                textAlign: "center",
                outline: "none",
                transition: "border-color 0.2s",
              }}
            />
          ))}
        </div>

        {/* Error Message */}
        {status === "error" && errorMessage && (
          <p style={{ color: "#EF4444", fontSize: "13px", margin: "0 0 16px" }}>{errorMessage}</p>
        )}

        {/* Resend Message */}
        {resendMessage && (
          <div style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "12px",
            backgroundColor: resendMessage.type === "success" ? "#10B98114" : "#EF444414",
            border: `1px solid ${resendMessage.type === "success" ? "#10B981" : "#EF4444"}`,
          }}>
            <p style={{
              margin: 0,
              fontSize: "13px",
              color: resendMessage.type === "success" ? "#10B981" : "#EF4444",
            }}>
              {resendMessage.text}
            </p>
          </div>
        )}

        <div style={{ width: "100%", height: "1px", backgroundColor: "#1F1F2A", marginBottom: "20px" }} />

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
          <button 
            type="button" 
            onClick={handleResend}
            disabled={resendLoading}
            style={{ 
              width: "100%", 
              borderRadius: "12px", 
              padding: "16px", 
              fontSize: "16px", 
              fontWeight: 700, 
              border: "none", 
              cursor: resendLoading ? "not-allowed" : "pointer", 
              backgroundColor: "#8B5CF6", 
              color: "#FFFFFF", 
              boxShadow: "0 4px 24px rgba(139, 92, 246, 0.35)",
              opacity: resendLoading ? 0.6 : 1,
            }}
          >
            {resendLoading ? "Sending..." : "Resend Code"}
          </button>
          <Link href="/login" style={{ display: "block", width: "100%", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: 600, textAlign: "center", textDecoration: "none", backgroundColor: "#141420", border: "1.5px solid #1F1F2A", color: "#A3A3C2", boxSizing: "border-box" }}>
            Back to Log In
          </Link>
        </div>
        <p style={{ color: "#3A3A50", fontSize: "12px", margin: "20px 0 0" }}>Didn't receive the code? Check your spam folder.</p>
      </div>
    </div>
  );
}