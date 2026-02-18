"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    if (resetError) { setError(resetError.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ width: "390px", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <div style={{ padding: "20px 24px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "18px", backgroundColor: "#141420", border: "1.5px solid #1F1F2A", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
          <Lock size={28} strokeWidth={1.8} style={{ color: "#8B5CF6" }} />
        </div>

        <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 600, background: "linear-gradient(90deg, #8B5CF6, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.25 }}>
          Forgot Password?
        </h1>
        <p style={{ color: "#A3A3C2", fontSize: "14px", margin: "0 0 20px", lineHeight: 1.6 }}>
          No worries. Enter your email and we'll send you a reset link.
        </p>

        <div style={{ width: "100%", height: "1px", backgroundColor: "#1F1F2A", marginBottom: "20px" }} />

        {sent ? (
          <div style={{ width: "100%", padding: "16px", borderRadius: "12px", backgroundColor: "#141420", border: "1px solid #34D399", color: "#34D399", fontSize: "14px", marginBottom: "16px", boxSizing: "border-box" }}>
            Reset link sent! Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px", textAlign: "left" }}>
            <input
              type="email" placeholder="Enter your email" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              style={{ width: "100%", borderRadius: "10px", padding: "15px 16px", fontSize: "16px", outline: "none", backgroundColor: "#141420", border: "1.5px solid #1F1F2A", color: "#F1F5F9", boxSizing: "border-box" }}
            />
            {error && <p style={{ margin: 0, fontSize: "13px", color: "#EF4444", textAlign: "center" }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width: "100%", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", backgroundColor: loading ? "#cc5555" : "#FF6B6B", color: "#FFFFFF", boxShadow: "0 4px 24px rgba(255,107,107,0.35)" }}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <Link href="/login" style={{ color: "#8B5CF6", fontSize: "14px", textDecoration: "none", fontWeight: 500, marginTop: "16px" }}>
          Back to Log In
        </Link>
      </div>
    </div>
  );
}