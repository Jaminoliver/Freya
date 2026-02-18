"use client";

import { useState } from "react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });
    if (loginError) { setError(loginError.message); setLoading(false); return; }
    router.push("/dashboard");
  };

  const handleGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", borderRadius: "10px", padding: "15px 16px", fontSize: "16px",
    outline: "none", backgroundColor: "#141420", border: "1.5px solid #1F1F2A",
    color: "#F1F5F9", boxSizing: "border-box",
  };

  return (
    <div style={{ width: "390px", minHeight: "100vh", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", position: "relative", overflowX: "hidden" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 10, backgroundColor: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px" }}>
        <span style={{ color: "#8B5CF6", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>Freya</span>
        <button type="button" onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: 0 }}>
          <ArrowLeft size={20} />
        </button>
      </div>

      <div style={{ padding: "24px 24px 0" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "26px", fontWeight: 600, background: "linear-gradient(90deg, #8B5CF6, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.25 }}>
          Welcome Back.
        </h1>
        <p style={{ color: "#A3A3C2", fontSize: "14px", margin: 0, lineHeight: 1.5 }}>Log in to continue earning on Freya.</p>
      </div>

      <div style={{ padding: "32px 24px 120px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <h2 style={{ color: "#F1F5F9", fontSize: "18px", fontWeight: 500, margin: 0 }}>Log In</h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required style={inputStyle} />
          <div style={{ position: "relative" }}>
            <input type={showPassword ? "text" : "password"} placeholder="Password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required style={{ ...inputStyle, paddingRight: "48px" }} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: 0 }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && <p style={{ margin: 0, fontSize: "13px", color: "#EF4444", textAlign: "center" }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ width: "100%", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", backgroundColor: loading ? "#6d44c4" : "#8B5CF6", color: "#FFFFFF", boxShadow: "0 4px 24px rgba(139,92,246,0.35)" }}>
            {loading ? "Logging in..." : "Log In"}
          </button>

          <p style={{ textAlign: "center", fontSize: "11px", color: "#6B6B8A", margin: "4px 0 0" }}>
            By logging in, you agree to our{" "}
            <Link href="/terms" style={{ color: "#8B5CF6", textDecoration: "none" }}>Terms of Service</Link>{" "}and{" "}
            <Link href="/privacy" style={{ color: "#8B5CF6", textDecoration: "none" }}>Privacy Policy</Link>, and confirm you are at least 18 years old.
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", fontSize: "13px" }}>
            <Link href="/forgot-password" style={{ color: "#8B5CF6", textDecoration: "none" }}>Forgot password?</Link>
            <span style={{ color: "#3A3A50" }}>·</span>
            <Link href="/signup" style={{ color: "#A3A3C2", textDecoration: "none" }}>Sign up for Freya</Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#1F1F2A" }} />
            <span style={{ color: "#6B6B8A", fontSize: "12px" }}>or</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#1F1F2A" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button type="button" onClick={handleGoogle} style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "center", gap: "10px", borderRadius: "10px", padding: "14px 16px", fontSize: "14px", fontWeight: 500, cursor: "pointer", backgroundColor: "#141420", border: "1.5px solid #1F1F2A", color: "#FFFFFF", boxSizing: "border-box" }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M19.8055 10.2292C19.8055 9.52422 19.7493 8.81576 19.6299 8.12109H10.2002V12.0879H15.6014C15.3768 13.3266 14.6508 14.4057 13.6106 15.0873V17.5865H16.8251C18.7173 15.8445 19.8055 13.2723 19.8055 10.2292Z" fill="#4285F4" /><path d="M10.2002 20.0006C12.9516 20.0006 15.2719 19.1048 16.8286 17.5865L13.6141 15.0873C12.7322 15.6977 11.5719 16.0427 10.2037 16.0427C7.5479 16.0427 5.29461 14.2831 4.52135 11.9092H1.2207V14.4833C2.81587 17.6535 6.34655 20.0006 10.2002 20.0006Z" fill="#34A853" /><path d="M4.51789 11.909C4.06107 10.6703 4.06107 9.33348 4.51789 8.09473V5.52063H1.22067C-0.192965 8.33598 -0.192965 11.6677 1.22067 14.483L4.51789 11.909Z" fill="#FBBC04" /><path d="M10.2002 3.95817C11.6465 3.93567 13.0404 4.47379 14.0876 5.46098L16.9373 2.61129C15.1859 0.990234 12.7358 0.0979004 10.2002 0.124651C6.34655 0.124651 2.81587 2.47176 1.2207 5.64536L4.51792 8.21946C5.28771 5.84207 7.54447 3.95817 10.2002 3.95817Z" fill="#EA4335" /></svg>
              Sign in with Google
            </button>
            <button type="button" disabled style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "center", gap: "10px", borderRadius: "10px", padding: "14px 16px", fontSize: "14px", fontWeight: 500, cursor: "not-allowed", opacity: 0.4, backgroundColor: "#141420", border: "1.5px solid #1F1F2A", color: "#FFFFFF", boxSizing: "border-box" }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M11.8992 8.40503L19.3934 0H17.6094L11.1172 7.29695L5.95699 0H0L7.84458 11.1196L0 20H1.78407L8.62637 12.3216L14.043 20H20L11.8988 8.40503H11.8992ZM9.5241 11.2817L8.74638 10.1456L2.40243 1.34219H5.10938L10.2752 8.5118L11.0529 9.6479L17.6103 18.7284H14.9033L9.5241 11.2821V11.2817Z" /></svg>
              Sign in with X
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}