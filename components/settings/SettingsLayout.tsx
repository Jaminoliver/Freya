"use client";

import { useState } from "react";
import { User, Shield, CreditCard, Lock, Bell, ChevronRight, ArrowLeft } from "lucide-react";
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
  const [mobileView, setMobileView] = useState<"menu" | "content">("menu");

  const activeSection = tabs.find((t) => t.id === activeTab)!;

  const handleTabSelect = (id: SettingsTab) => {
    setActiveTab(id);
    setMobileView("content");
  };

  const handleBack = () => setMobileView("menu");

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

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(30px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-30px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }

        /* Desktop overrides — always show both panels */
        @media (min-width: 768px) {
          .settings-sidebar-panel {
            display: flex !important;
            width: 260px !important;
            flex-shrink: 0 !important;
          }
          .settings-content-panel {
            display: flex !important;
          }
          .settings-mobile-back {
            display: none !important;
          }
          .settings-mobile-chevron {
            display: none !important;
          }
          .settings-content-inner {
            padding: 32px 28px 60px !important;
          }
        }
      `}</style>

      {/* ── SETTINGS SIDEBAR ── */}
      <div
        className="settings-sidebar-panel"
        style={{
          display: mobileView === "menu" ? "flex" : "none",
          width: "100%",
          flexDirection: "column",
          borderRight: "1px solid #1F1F2A",
          padding: "32px 0",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          scrollbarWidth: "none",
          backgroundColor: "#0A0A0F",
          flexShrink: 0,
          animation: "slideInLeft 0.22s ease forwards",
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
                onClick={() => handleTabSelect(id)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "14px 16px", borderRadius: "10px",
                  border: "none",
                  borderLeft: active ? "2px solid #8B5CF6" : "2px solid transparent",
                  cursor: "pointer", width: "100%", textAlign: "left",
                  backgroundColor: active ? "rgba(139,92,246,0.1)" : "transparent",
                  transition: "all 0.15s ease",
                  minHeight: "56px",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
              >
                <div style={{
                  width: "36px", height: "36px", borderRadius: "8px", flexShrink: 0,
                  backgroundColor: active ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background-color 0.15s",
                }}>
                  <Icon size={17} color={active ? "#8B5CF6" : "#6B6B8A"} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "15px", fontWeight: active ? 600 : 400, color: active ? "#F1F5F9" : "#A3A3C2", lineHeight: 1.3 }}>{label}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#6B6B8A", marginTop: "2px" }}>{description}</p>
                </div>
                <div className="settings-mobile-chevron" style={{ display: "flex" }}>
                  <ChevronRight size={16} color="#6B6B8A" />
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── CONTENT AREA ── */}
      <div
        className="settings-content-panel"
        style={{
          display: mobileView === "content" ? "flex" : "none",
          flex: 1,
          minWidth: 0,
          flexDirection: "column",
          overflowY: "auto",
          scrollbarWidth: "none",
          height: "100vh",
          width: "100%",
          animation: "slideInRight 0.22s ease forwards",
        }}
      >
        {/* Mobile top bar */}
        <div
          className="settings-mobile-back"
          style={{
            display: "flex",
            padding: "0 16px",
            height: "56px",
            borderBottom: "1px solid #1F1F2A",
            alignItems: "center",
            gap: "12px",
            backgroundColor: "#0A0A0F",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <button
            onClick={handleBack}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "36px", height: "36px", borderRadius: "8px",
              background: "rgba(255,255,255,0.05)", border: "none",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} color="#A3A3C2" />
          </button>
          <span style={{ fontSize: "16px", fontWeight: 600, color: "#F1F5F9" }}>
            {activeSection.label}
          </span>
        </div>

        {/* Section content */}
        <div
          className="settings-content-inner"
          style={{ padding: "24px 16px 100px", maxWidth: "640px", width: "100%" }}
        >
          {renderSection()}
        </div>
      </div>

    </div>
  );
}