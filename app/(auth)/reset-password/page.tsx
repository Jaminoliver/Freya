import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0A0A0F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
      <img src="/freya_logo.png" alt="Fréya" style={{ height: "85px", width: "auto", marginBottom: "20px" }} />
      <ResetPasswordForm />
    </div>
  );
}