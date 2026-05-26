import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div style={{ height: "100vh", backgroundColor: "#0A0A0F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", boxSizing: "border-box", overflow: "hidden" }}>
      <Link href="/"><img src="/freya_logo.png" alt="Fréya" style={{ height: "85px", width: "auto", marginBottom: "32px" }} /></Link>
      <ForgotPasswordForm />
    </div>
  );
}