import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div style={{ height: "100vh", backgroundColor: "#0A0A0F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", boxSizing: "border-box", overflow: "hidden" }}>
      <Link href="/" style={{ fontSize: "28px", fontWeight: 700, color: "#8B5CF6", textDecoration: "none", marginBottom: "32px" }}>
        Freya
      </Link>
      <ForgotPasswordForm />
    </div>
  );
}