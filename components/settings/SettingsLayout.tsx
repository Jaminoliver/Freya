"use client";

import { useState } from "react";
import { User, Shield, CreditCard, Lock, Bell, ArrowLeft } from "lucide-react";
import Link from "next/link";
import ProfileSettings from "@/components/settings/sections/ProfileSettings";
import AccountSettings from "@/components/settings/sections/AccountSettings";
import PricingSettings from "@/components/settings/sections/PricingSettings";
import PrivacySettings from "@/components/settings/sections/PrivacySettings";
import NotificationsSettings from "@/components/settings/sections/NotificationsSettings";

type SettingsTab = "profile" | "account" | "pricing" | "privacy" | "notifications";

const tabs: { id: SettingsTab; label: string; icon: React.ElementType; description: string }[] = [
  { id: "profile",       label: "Profile",       icon: User,       description: "Name, bio, links"       },
  { id: "account",       label: "Account",       icon: Shield,     description: "Email, password, phone" },
  { id: "pricing",       label: "Pricing",       icon: CreditCard, description: "Subscription & bundles" },
  { id: "privacy",       label: "Privacy",       icon: Lock,       description: "Visibility & blocking"  },
  { id: "notifications", label: "Notifications", icon: Bell,       description: "Alerts & preferences"   },
];

export function SettingsLayout() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const renderSection = () => {
    switch (activeTab) {
      case "profile":       return <ProfileSettings />;
      case "account":       return <AccountSettings />;
      case "pricing":       return <PricingSettings />;
      case "privacy":       return <PrivacySettings />;
      case "notifications": return <NotificationsSettings />;
    }
  };

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      backgroundColor: "#0A0A0F",
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden",
    }}>

      {/* ── SETTINGS SIDEBAR ── */}
      <div
        style={{
          width: "260px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #1F1F2A",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          backgroundColor: "#0A0A0F",
        }}
      >
        {/* Header */}
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #1F1F2A" }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              fontSize: "12px", color: "#6B6B8A", textDecoration: "none",
              marginBottom: "16px", transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#A3A3C2")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B8A")}
          >
            <ArrowLeft size={12} />
            Back
          </Link>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#F1F5F9", margin: 0 }}>Settings</h1>
        </div>

        {/* Nav */}
        <nav style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {tabs.map(({ id, label, icon: Icon, description }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  padding: "12px 16px", borderRadius: "12px",
                  border: "none",
                  cursor: "pointer", width: "100%", textAlign: "left",
                  backgroundColor: active ? "#1E1E2E" : "transparent",
                  color: active ? "#8B5CF6" : "#A3A3C2",
                  fontSize: "16px", fontWeight: active ? 600 : 400,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
              >
                <Icon size={22} color={active ? "#8B5CF6" : "#A3A3C2"} strokeWidth={active ? 2.2 : 1.8} />
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <p style={{ margin: 0, fontSize: "15px", fontWeight: active ? 600 : 400, color: active ? "#8B5CF6" : "#A3A3C2", lineHeight: 1.3 }}>{label}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#6B6B8A", marginTop: "2px" }}>{description}</p>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── CONTENT AREA ── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          scrollbarWidth: "none",
          height: "100vh",
        }}
      >
        <div style={{ padding: "32px 28px 60px", maxWidth: "640px", width: "100%" }}>
          {renderSection()}
        </div>
      </div>

    </div>
  );
}