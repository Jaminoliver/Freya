import { Suspense } from "react";
import { EmailVerificationCard } from "@/components/auth/EmailVerificationCard";

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { email?: string; verified?: string; error?: string };
}) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0A0A0F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
      <h1 style={{ color: "#8B5CF6", fontSize: "28px", fontWeight: 700, marginBottom: "20px", marginTop: 0 }}>Freya</h1>
      <Suspense fallback={<p style={{ color: "#A3A3C2" }}>Loading...</p>}>
        <EmailVerificationCard email={searchParams.email ?? "your email"} />
      </Suspense>
    </div>
  );
}