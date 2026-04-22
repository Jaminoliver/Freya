// components/auth/LoginForm.tsx
"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2, Check } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FieldErrors = {
  identifier?: string;
  password?: string;
};

type BannerState =
  | { type: "error"; message: string; action?: { label: string; href: string } }
  | { type: "info"; message: string }
  | null;

async function resolveEmail(identifier: string): Promise<string | null> {
  // If it looks like an email, return as-is
  if (identifier.includes("@")) return identifier.trim();

  // Otherwise treat as username — look up email via RPC
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_email_by_username", {
    p_username: identifier.trim().toLowerCase().replace(/^@/, ""),
  });
  if (error || !data) return null;
  return data as string;
}

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [banner, setBanner] = useState<BannerState>(null);

  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prefillEmail = searchParams.get("email");
    const reason = searchParams.get("reason");
    const error  = searchParams.get("error");

    if (prefillEmail) {
      setFormData((prev) => ({ ...prev, identifier: prefillEmail }));
      setTimeout(() => passwordRef.current?.focus(), 100);
    } else {
      setTimeout(() => identifierRef.current?.focus(), 100);
    }

    if (reason === "account_exists") {
      setBanner({ type: "info", message: "Looks like you already have an account. Log in below to continue." });
    } else if (error === "oauth_failed") {
      setBanner({ type: "error", message: "Google sign-in didn't complete. Please try again." });
    } else if (error === "session_expired") {
      setBanner({ type: "info", message: "Your session has expired. Please log in again." });
    }
  }, [searchParams]);

  const validateIdentifier = (v: string): string | undefined => {
    const trimmed = v.trim();
    if (!trimmed) return "Please enter your email or username";
    return undefined;
  };

  const validatePassword = (v: string): string | undefined => {
    if (!v) return "Please enter your password";
    return undefined;
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (banner?.type === "error") setBanner(null);
  };

  const handleBlur = (field: keyof typeof formData) => {
    if (!formData[field]) return;
    setTouched((prev) => ({ ...prev, [field]: true }));
    let error: string | undefined;
    if (field === "identifier") error = validateIdentifier(formData.identifier);
    else if (field === "password") error = validatePassword(formData.password);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);

    const errors: FieldErrors = {
      identifier: validateIdentifier(formData.identifier),
      password:   validatePassword(formData.password),
    };
    setTouched({ identifier: true, password: true });
    setFieldErrors(errors);
    if (errors.identifier) { identifierRef.current?.focus(); return; }
    if (errors.password)   { passwordRef.current?.focus(); return; }

    setLoading(true);

    // Resolve username → email if needed
    const email = await resolveEmail(formData.identifier);
    if (!email) {
      setBanner({ type: "error", message: "No account found with that username." });
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: formData.password,
    });

    if (loginError) {
      const msg = loginError.message.toLowerCase();
      if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
        setBanner({
          type: "error",
          message: "The email/username or password you entered is incorrect.",
          action: { label: "Forgot password?", href: "/forgot-password" },
        });
      } else if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        setBanner({
          type: "error",
          message: "Please verify your email before logging in.",
          action: { label: "Resend verification code", href: `/verify-otp?email=${encodeURIComponent(email)}` },
        });
      } else if (msg.includes("rate limit") || msg.includes("too many")) {
        setBanner({ type: "error", message: "Too many login attempts. Please wait a few minutes and try again." });
      } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
        setBanner({ type: "error", message: "Connection error. Please check your internet and try again." });
      } else {
        setBanner({ type: "error", message: "Something went wrong. Please try again." });
      }
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  const handleGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const getInputStyle = (field: keyof FieldErrors): React.CSSProperties => {
    const hasError = !!fieldErrors[field];
    let borderColor = "#1F1F2A";
    if (hasError) borderColor = "#EF4444";
    return {
      width: "100%", borderRadius: "10px", padding: "15px 16px",
      fontSize: "16px", outline: "none", backgroundColor: "#141420",
      border: `1.5px solid ${borderColor}`, color: "#F1F5F9",
      boxSizing: "border-box", transition: "border-color 0.15s ease",
    };
  };

  const fieldErrorStyle: React.CSSProperties = {
    margin: "6px 2px 0", fontSize: "12px", color: "#EF4444",
    display: "flex", alignItems: "center", gap: "4px", lineHeight: 1.4,
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

        {banner && (
          <div role="alert" style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 14px", borderRadius: "10px", backgroundColor: banner.type === "error" ? "rgba(239, 68, 68, 0.08)" : "rgba(139, 92, 246, 0.08)", border: `1px solid ${banner.type === "error" ? "rgba(239, 68, 68, 0.3)" : "rgba(139, 92, 246, 0.3)"}` }}>
            {banner.type === "error"
              ? <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: "1px" }} />
              : <CheckCircle2 size={18} color="#8B5CF6" style={{ flexShrink: 0, marginTop: "1px" }} />
            }
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "13px", color: banner.type === "error" ? "#FCA5A5" : "#C4B5FD", lineHeight: 1.5 }}>
                {banner.message}
              </p>
              {banner.type === "error" && banner.action && (
                <Link href={banner.action.href} style={{ display: "inline-block", marginTop: "6px", fontSize: "13px", fontWeight: 600, color: "#FCA5A5", textDecoration: "underline" }}>
                  {banner.action.label}
                </Link>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Email or Username */}
          <div>
            <div style={{ position: "relative" }}>
              <input
                ref={identifierRef}
                type="text"
                placeholder="Email or username"
                value={formData.identifier}
                onChange={(e) => updateField("identifier", e.target.value)}
                onBlur={() => handleBlur("identifier")}
                style={getInputStyle("identifier")}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            {fieldErrors.identifier && (
              <p style={fieldErrorStyle}><AlertCircle size={12} /> {fieldErrors.identifier}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div style={{ position: "relative" }}>
              <input
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                style={{ ...getInputStyle("password"), paddingRight: "48px" }}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: 0 }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p style={fieldErrorStyle}><AlertCircle size={12} /> {fieldErrors.password}</p>
            )}
          </div>

          <button type="submit" disabled={loading} style={{ width: "100%", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", backgroundColor: loading ? "#6d44c4" : "#8B5CF6", color: "#FFFFFF", boxShadow: "0 4px 24px rgba(139,92,246,0.35)", marginTop: "4px" }}>
            {loading ? "Logging in..." : "Log In"}
          </button>

          <p style={{ textAlign: "center", fontSize: "11px", color: "#6B6B8A", margin: "4px 0 0", lineHeight: 1.5 }}>
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
            <p style={{ textAlign: "center", fontSize: "11px", color: "#6B6B8A", margin: "2px 0 0", lineHeight: 1.5 }}>
              By continuing with Google, you agree to our{" "}
              <Link href="/terms" style={{ color: "#8B5CF6", textDecoration: "none" }}>Terms</Link>{" "}and confirm you're 18+.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<div style={{ width: "390px", minHeight: "100vh", backgroundColor: "#0A0A0F" }} />}>
      <LoginFormInner />
    </Suspense>
  );
}