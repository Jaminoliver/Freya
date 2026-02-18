import { Suspense } from "react";
import { OTPVerificationCard } from "@/components/auth/OTPVerificationCard";
import { redirect } from "next/navigation";

export default async function VerifyOTPPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  
  // Redirect if no email provided
  if (!params.email) {
    redirect("/signup");
  }
  
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0A0A0F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
      <h1 style={{ color: "#8B5CF6", fontSize: "28px", fontWeight: 700, marginBottom: "20px", marginTop: 0 }}>Freya</h1>
      <Suspense fallback={<p style={{ color: "#A3A3C2" }}>Loading...</p>}>
        <OTPVerificationCard email={params.email} />
      </Suspense>
    </div>
  );
}