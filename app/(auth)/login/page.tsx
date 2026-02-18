import { AuthBrandingPanel } from "@/components/auth/AuthBrandingPanel";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div style={{ display: "flex", backgroundColor: "#0A0A0F" }}>
      <AuthBrandingPanel
        heading="Welcome Back."
        subtext="Your creators are waiting for you."
        gradient={false}
      />
      <div className="w-full md:w-1/2" style={{ display: "flex", justifyContent: "center", padding: "32px 24px" }}>
        <LoginForm />
      </div>
    </div>
  );
}