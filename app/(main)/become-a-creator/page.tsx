"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CreatorOnboarding } from "@/components/creator-onboarding/CreatorOnboarding";

export default function BecomeACreatorPage() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0A0A0F",
        color: "#F1F5F9",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "24px 32px 0" }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: 0, flexShrink: 0 }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px", margin: 0 }}>
          Become a Creator
        </h1>
      </div>

      <CreatorOnboarding onBack={() => router.back()} />
    </div>
  );
}