// components/auth/SignUpForm.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
};

type BannerState =
  | { type: "error"; message: string }
  | { type: "info"; message: string }
  | null;

type PasswordStrength = {
  score: 0 | 1 | 2 | 3;
  label: string;
  color: string;
};

export function SignUpForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [banner, setBanner] = useState<BannerState>(null);

  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Auto-focus name on mount
  useEffect(() => {
    fullNameRef.current?.focus();
  }, []);

  // ───── Validation ─────
  const validateFullName = (v: string): string | undefined => {
    const trimmed = v.trim();
    if (!trimmed) return "Please enter your name";
    if (trimmed.length < 2) return "Name must be at least 2 characters";
    if (!/^[A-Za-zÀ-ÿ\s'-]+$/.test(trimmed)) return "Name can only contain letters, spaces, hyphens, and apostrophes";
    return undefined;
  };

  const validateEmail = (v: string): string | undefined => {
    const trimmed = v.trim();
    if (!trimmed) return "Please enter your email";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Please enter a valid email (e.g. name@example.com)";
    return undefined;
  };

  const validatePassword = (v: string): string | undefined => {
    if (!v) return "Please enter a password";
    if (v.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Za-z]/.test(v)) return "Password must contain at least one letter";
    if (!/[0-9]/.test(v)) return "Password must contain at least one number";
    return undefined;
  };

  // ───── Password strength meter ─────
  const getPasswordStrength = (pw: string): PasswordStrength => {
    if (!pw) return { score: 0, label: "", color: "#1F1F2A" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;

    if (score <= 1) return { score: 1, label: "Weak", color: "#EF4444" };
    if (score === 2) return { score: 2, label: "Fair", color: "#F59E0B" };
    return { score: 3, label: "Strong", color: "#10B981" };
  };

  const pwStrength = getPasswordStrength(formData.password);

  // ───── Input handlers ─────
  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error while typing (re-validates on blur)
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (banner?.type === "error") setBanner(null);
  };

  const handleBlur = (field: keyof typeof formData) => {
    // Don't validate empty fields on blur — only validate if user typed something
    // This prevents errors when clicking links/buttons outside the form
    if (!formData[field]) return;

    setTouched((prev) => ({ ...prev, [field]: true }));
    let error: string | undefined;
    if (field === "fullName") error = validateFullName(formData.fullName);
    else if (field === "email") error = validateEmail(formData.email);
    else if (field === "password") error = validatePassword(formData.password);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  };

  // Success indicators (field valid AND user has interacted)
  const isFieldValid = (field: keyof typeof formData): boolean => {
    if (!touched[field]) return false;
    if (fieldErrors[field]) return false;
    if (field === "fullName") return !validateFullName(formData.fullName);
    if (field === "email") return !validateEmail(formData.email);
    if (field === "password") return !validatePassword(formData.password);
    return false;
  };

  // ───── Submit ─────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);

    const errors: FieldErrors = {
      fullName: validateFullName(formData.fullName),
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
    };
    setTouched({ fullName: true, email: true, password: true });
    setFieldErrors(errors);

    // Auto-focus first errored field
    if (errors.fullName) { fullNameRef.current?.focus(); return; }
    if (errors.email) { emailRef.current?.focus(); return; }
    if (errors.password) { passwordRef.current?.focus(); return; }

    setLoading(true);
    console.log("🚀 SIGNUP STARTED", { email: formData.email });

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email.trim(),
      password: formData.password,
      options: {
        data: { full_name: formData.fullName.trim(), account_type: "fan" },
      },
    });

    console.log("📦 SUPABASE RESPONSE", { data, error: signUpError });

    // ───── Handle Supabase errors ─────
    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      console.log("❌ SIGNUP ERROR", signUpError.message);

      if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already")) {
        handleExistingAccount();
        return;
      }
      if (msg.includes("rate limit") || msg.includes("too many")) {
        setBanner({ type: "error", message: "Too many signup attempts. Please wait a few minutes and try again." });
      } else if (msg.includes("invalid email")) {
        setFieldErrors({ email: "Please enter a valid email address" });
        emailRef.current?.focus();
      } else if (msg.includes("password")) {
        setFieldErrors({ password: signUpError.message });
        passwordRef.current?.focus();
      } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
        setBanner({ type: "error", message: "Connection error. Please check your internet and try again." });
      } else {
        setBanner({ type: "error", message: "Something went wrong. Please try again." });
      }
      setLoading(false);
      return;
    }

    // Detect repeated signup (Supabase returns success with empty identities)
    if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
      console.log("⚠️ EMAIL ALREADY EXISTS — redirecting to login");
      handleExistingAccount();
      return;
    }

    // ───── Success ─────
    const redirectUrl = `/verify-otp?email=${encodeURIComponent(formData.email.trim())}`;
    console.log("✅ SIGNUP SUCCESS - REDIRECTING TO:", redirectUrl);
    router.push(redirectUrl);
  };

  const handleExistingAccount = () => {
    setBanner({
      type: "info",
      message: "An account with this email already exists. Redirecting you to log in…",
    });
    setLoading(false);
    setTimeout(() => {
      router.push(`/login?email=${encodeURIComponent(formData.email.trim())}&reason=account_exists`);
    }, 2000);
  };

  const handleGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  // ───── Styles ─────
  const getInputStyle = (field: keyof typeof formData): React.CSSProperties => {
    const hasError = !!fieldErrors[field];
    const isValid = isFieldValid(field);
    let borderColor = "#1F1F2A";
    if (hasError) borderColor = "#EF4444";
    else if (isValid) borderColor = "#10B981";

    return {
      width: "100%",
      borderRadius: "10px",
      padding: "15px 16px",
      fontSize: "16px",
      outline: "none",
      backgroundColor: "#141420",
      border: `1.5px solid ${borderColor}`,
      color: "#F1F5F9",
      boxSizing: "border-box",
      transition: "border-color 0.15s ease",
    };
  };

  const fieldErrorStyle: React.CSSProperties = {
    margin: "6px 2px 0",
    fontSize: "12px",
    color: "#EF4444",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    lineHeight: 1.4,
  };

  const successIconStyle: React.CSSProperties = {
    position: "absolute",
    right: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#10B981",
    pointerEvents: "none",
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
          Own Your Content.<br />Own Your Bag.
        </h1>
        <p style={{ color: "#A3A3C2", fontSize: "14px", margin: 0, lineHeight: 1.5 }}>Join 10,000+ African creators already earning on Freya.</p>
      </div>

      <div style={{ padding: "32px 24px 120px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <h2 style={{ color: "#F1F5F9", fontSize: "18px", fontWeight: 500, margin: 0 }}>Create Account</h2>

        {/* ───── Banner ───── */}
        {banner && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "12px 14px",
              borderRadius: "10px",
              backgroundColor: banner.type === "error" ? "rgba(239, 68, 68, 0.08)" : "rgba(139, 92, 246, 0.08)",
              border: `1px solid ${banner.type === "error" ? "rgba(239, 68, 68, 0.3)" : "rgba(139, 92, 246, 0.3)"}`,
            }}
          >
            {banner.type === "error" ? (
              <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: "1px" }} />
            ) : (
              <CheckCircle2 size={18} color="#8B5CF6" style={{ flexShrink: 0, marginTop: "1px" }} />
            )}
            <p style={{ margin: 0, fontSize: "13px", color: banner.type === "error" ? "#FCA5A5" : "#C4B5FD", lineHeight: 1.5 }}>
              {banner.message}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Full Name */}
          <div>
            <div style={{ position: "relative" }}>
              <input
                ref={fullNameRef}
                type="text"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                onBlur={() => handleBlur("fullName")}
                style={{ ...getInputStyle("fullName"), paddingRight: isFieldValid("fullName") ? "42px" : "16px" }}
                aria-invalid={!!fieldErrors.fullName}
                aria-describedby={fieldErrors.fullName ? "fullname-error" : undefined}
                autoComplete="name"
              />
              {isFieldValid("fullName") && <Check size={18} style={successIconStyle} />}
            </div>
            {fieldErrors.fullName && (
              <p id="fullname-error" style={fieldErrorStyle}>
                <AlertCircle size={12} /> {fieldErrors.fullName}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <div style={{ position: "relative" }}>
              <input
                ref={emailRef}
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                style={{ ...getInputStyle("email"), paddingRight: isFieldValid("email") ? "42px" : "16px" }}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                autoComplete="email"
              />
              {isFieldValid("email") && <Check size={18} style={successIconStyle} />}
            </div>
            {fieldErrors.email && (
              <p id="email-error" style={fieldErrorStyle}>
                <AlertCircle size={12} /> {fieldErrors.email}
              </p>
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
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? "password-error" : "password-hint"}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: 0 }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password strength meter */}
            {formData.password && !fieldErrors.password && (
              <div style={{ marginTop: "8px" }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: "3px",
                        borderRadius: "2px",
                        backgroundColor: pwStrength.score >= i ? pwStrength.color : "#1F1F2A",
                        transition: "background-color 0.2s ease",
                      }}
                    />
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: "11px", color: pwStrength.color, fontWeight: 500 }}>
                  {pwStrength.label} password
                </p>
              </div>
            )}

            {fieldErrors.password ? (
              <p id="password-error" style={fieldErrorStyle}>
                <AlertCircle size={12} /> {fieldErrors.password}
              </p>
            ) : !formData.password ? (
              <p id="password-hint" style={{ margin: "6px 2px 0", fontSize: "11px", color: "#6B6B8A", lineHeight: 1.4 }}>
                At least 8 characters, with a letter and a number
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              borderRadius: "12px",
              padding: "16px",
              fontSize: "16px",
              fontWeight: 700,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              backgroundColor: loading ? "#cc5555" : "#FF6B6B",
              color: "#FFFFFF",
              boxShadow: "0 4px 24px rgba(255,107,107,0.35)",
              marginTop: "4px",
            }}
          >
            {loading ? "Creating account..." : "Create my account"}
          </button>

          <p style={{ textAlign: "center", fontSize: "11px", color: "#6B6B8A", margin: "4px 0 0", lineHeight: 1.5 }}>
            By signing up, you agree to our{" "}
            <Link href="/terms" style={{ color: "#8B5CF6", textDecoration: "none" }}>Terms of Service</Link>{" "}and{" "}
            <Link href="/privacy" style={{ color: "#8B5CF6", textDecoration: "none" }}>Privacy Policy</Link>, and confirm you are at least 18 years old.
          </p>
          <p style={{ textAlign: "center", fontSize: "13px", color: "#A3A3C2", margin: 0 }}>
            Already have an account?{" "}<Link href="/login" style={{ color: "#8B5CF6", fontWeight: 600, textDecoration: "none" }}>Log in</Link>
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#1F1F2A" }} />
            <span style={{ color: "#6B6B8A", fontSize: "12px" }}>or</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#1F1F2A" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button type="button" onClick={handleGoogle} style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "center", gap: "10px", borderRadius: "10px", padding: "14px 16px", fontSize: "14px", fontWeight: 500, cursor: "pointer", backgroundColor: "#141420", border: "1.5px solid #1F1F2A", color: "#FFFFFF", boxSizing: "border-box" }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M19.8055 10.2292C19.8055 9.52422 19.7493 8.81576 19.6299 8.12109H10.2002V12.0879H15.6014C15.3768 13.3266 14.6508 14.4057 13.6106 15.0873V17.5865H16.8251C18.7173 15.8445 19.8055 13.2723 19.8055 10.2292Z" fill="#4285F4" /><path d="M10.2002 20.0006C12.9516 20.0006 15.2719 19.1048 16.8286 17.5865L13.6141 15.0873C12.7322 15.6977 11.5719 16.0427 10.2037 16.0427C7.5479 16.0427 5.29461 14.2831 4.52135 11.9092H1.2207V14.4833C2.81587 17.6535 6.34655 20.0006 10.2002 20.0006Z" fill="#34A853" /><path d="M4.51789 11.909C4.06107 10.6703 4.06107 9.33348 4.51789 8.09473V5.52063H1.22067C-0.192965 8.33598 -0.192965 11.6677 1.22067 14.483L4.51789 11.909Z" fill="#FBBC04" /><path d="M10.2002 3.95817C11.6465 3.93567 13.0404 4.47379 14.0876 5.46098L16.9373 2.61129C15.1859 0.990234 12.7358 0.0979004 10.2002 0.124651C6.34655 0.124651 2.81587 2.47176 1.2207 5.64536L4.51792 8.21946C5.28771 5.84207 7.54447 3.95817 10.2002 3.95817Z" fill="#EA4335" /></svg>
              Sign up with Google
            </button>
            <button type="button" disabled style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "center", gap: "10px", borderRadius: "10px", padding: "14px 16px", fontSize: "14px", fontWeight: 500, cursor: "not-allowed", opacity: 0.4, backgroundColor: "#141420", border: "1.5px solid #1F1F2A", color: "#FFFFFF", boxSizing: "border-box" }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M11.8992 8.40503L19.3934 0H17.6094L11.1172 7.29695L5.95699 0H0L7.84458 11.1196L0 20H1.78407L8.62637 12.3216L14.043 20H20L11.8988 8.40503H11.8992ZM9.5241 11.2817L8.74638 10.1456L2.40243 1.34219H5.10938L10.2752 8.5118L11.0529 9.6479L17.6103 18.7284H14.9033L9.5241 11.2821V11.2817Z" /></svg>
              Sign up with X
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