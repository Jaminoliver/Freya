"use client";

import { createClient } from "@/lib/supabase/client";

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
    <path d="M19.8055 10.2292C19.8055 9.52422 19.7493 8.81576 19.6299 8.12109H10.2002V12.0879H15.6014C15.3768 13.3266 14.6508 14.4057 13.6106 15.0873V17.5865H16.8251C18.7173 15.8445 19.8055 13.2723 19.8055 10.2292Z" fill="#4285F4"/>
    <path d="M10.2002 20.0006C12.9516 20.0006 15.2719 19.1048 16.8286 17.5865L13.6141 15.0873C12.7322 15.6977 11.5719 16.0427 10.2037 16.0427C7.5479 16.0427 5.29461 14.2831 4.52135 11.9092H1.2207V14.4833C2.81587 17.6535 6.34655 20.0006 10.2002 20.0006Z" fill="#34A853"/>
    <path d="M4.51789 11.909C4.06107 10.6703 4.06107 9.33348 4.51789 8.09473V5.52063H1.22067C-0.192965 8.33598 -0.192965 11.6677 1.22067 14.483L4.51789 11.909Z" fill="#FBBC04"/>
    <path d="M10.2002 3.95817C11.6465 3.93567 13.0404 4.47379 14.0876 5.46098L16.9373 2.61129C15.1859 0.990234 12.7358 0.0979004 10.2002 0.124651C6.34655 0.124651 2.81587 2.47176 1.2207 5.64536L4.51792 8.21946C5.28771 5.84207 7.54447 3.95817 10.2002 3.95817Z" fill="#EA4335"/>
  </svg>
);

interface Props {
  onNavigate: (screen: number) => void;
  onClose: () => void;
}

export function AuthModalSignUp({ onNavigate, onClose }: Props) {
  const handleGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <>
      {/* Header */}
      <div style={styles.modalTop}>
        <span style={styles.brand}>Fréya</span>
        <button style={styles.iconBtn} onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={styles.modalBody}>
        <div>
          <p style={styles.heading}>Join Fréya.</p>
          <p style={styles.subtext}>Create an account and start connecting with creators.</p>
        </div>

        <div style={styles.formStack}>
          <button style={styles.btnSecondary} onClick={() => onNavigate(4)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A3A3C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            Continue with email
          </button>

          <div style={styles.dividerRow}>
            <div style={styles.dividerLine}/><span style={styles.dividerLabel}>or</span><div style={styles.dividerLine}/>
          </div>

          <button style={styles.btnSecondary} onClick={handleGoogle}>
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        <div style={styles.footerLinks}>
          <span style={{ fontSize: "13px", color: "#A3A3C2" }}>Already have an account?</span>
          <button style={styles.lnk} onClick={() => onNavigate(1)}>Log in</button>
        </div>

        <p style={styles.terms}>
          By continuing you agree to our <span style={styles.termsLink}>Terms</span> and confirm you're 18+.
        </p>
      </div>
    </>
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
  modalBody: { padding: "24px 24px 28px", display: "flex", flexDirection: "column", gap: "20px" },
  heading: {
    fontSize: "24px", fontWeight: 600, lineHeight: 1.25,
    background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
  },
  subtext: { fontSize: "13px", color: "#A3A3C2", lineHeight: 1.5, marginTop: "6px" },
  formStack: { display: "flex", flexDirection: "column", gap: "14px" },
  btnSecondary: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
    gap: "10px", padding: "14px 16px", background: "#141420",
    border: "1.5px solid #1F1F2A", borderRadius: "10px", color: "#F1F5F9",
    fontSize: "14px", fontWeight: 500, cursor: "pointer",
    fontFamily: "'Inter', sans-serif", transition: "border-color 0.15s",
  },
  dividerRow: { display: "flex", alignItems: "center", gap: "12px" },
  dividerLine: { flex: 1, height: "1px", background: "#1F1F2A" },
  dividerLabel: { fontSize: "12px", color: "#6B6B8A" },
  footerLinks: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  lnk: { color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", fontSize: "13px", fontFamily: "'Inter', sans-serif", fontWeight: 500 },
  terms: { fontSize: "11px", color: "#6B6B8A", textAlign: "center", lineHeight: 1.6 },
  termsLink: { color: "#8B5CF6", cursor: "pointer" },
};