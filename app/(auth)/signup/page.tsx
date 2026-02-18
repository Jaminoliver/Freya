import { AuthBrandingPanel } from "@/components/auth/AuthBrandingPanel";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <div style={{ display: "flex", backgroundColor: "#0A0A0F" }}>
      <AuthBrandingPanel
        heading="Own Your Content. Own Your Bag."
        subtext="Join 10,000+ African creators already earning on Freya."
      />
      <div className="w-full md:w-1/2" style={{ display: "flex", justifyContent: "center", padding: "32px 24px" }}>
        <SignUpForm />
      </div>
    </div>
  );
}