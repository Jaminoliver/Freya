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
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#F1F5F9", margin: "0 0 2px" }}>
            Become a Creator
          </h1>
          <p style={{ fontSize: "13px", color: "#A3A3C2", margin: 0 }}>
            Set up your creator profile in 3 simple steps
          </p>
        </div>
      </div>

      <CreatorOnboarding onBack={() => router.back()} />
    </div>
  );
}