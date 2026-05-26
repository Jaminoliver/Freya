import { AuthBrandingPanel } from "@/components/auth/AuthBrandingPanel";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div style={{ display: "flex", backgroundColor: "#0A0A0F", height: "100vh", overflow: "hidden" }}>
      <AuthBrandingPanel heading="Welcome Back." subtext="Your account is waiting for you." gradient={false} />
      <div className="w-full md:w-1/2" style={{ display: "flex", flexDirection: "column", overflowY: "auto", height: "100vh" }}>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
