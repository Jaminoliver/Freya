"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { User, Shield, CreditCard, Lock, Bell, ChevronRight, TrendingUp, Wallet } from "lucide-react";
import ProfileSettings from "@/components/settings/sections/ProfileSettings";
import AccountSettings from "@/components/settings/sections/AccountSettings";
import PricingSettings from "@/components/settings/sections/pricing/PricingSettings";
import PrivacySettings from "@/components/settings/sections/PrivacySettings";
import NotificationsSettings from "@/components/settings/sections/NotificationsSettings";
import EarningsSettings from "@/components/settings/sections/EarningsSettings";
import PayoutsSettings from "@/components/settings/sections/PayoutsSettings";

type SettingsTab = "profile" | "account" | "pricing" | "privacy" | "notifications" | "earnings" | "payouts";

const tabs: { id: SettingsTab; label: string; icon: React.ElementType; description: string }[] = [
  { id: "profile",       label: "Profile",       icon: User,       description: "Name, bio, links"           },
  { id: "account",       label: "Account",       icon: Shield,     description: "Email, password, phone"     },
  { id: "pricing",       label: "Pricing",       icon: CreditCard, description: "Subscription & bundles"     },
  { id: "earnings",      label: "Earnings",      icon: TrendingUp, description: "Revenue & breakdown"        },
  { id: "payouts",       label: "Payouts",       icon: Wallet,     description: "Bank account & withdrawals" },
  { id: "privacy",       label: "Privacy",       icon: Lock,       description: "Visibility & blocking"      },
  { id: "notifications", label: "Notifications", icon: Bell,       description: "Alerts & preferences"       },
];

export function SettingsLayout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [mobileView, setMobileView] = useState<"menu" | "content">("menu");

  // When ?panel=menu is present, reset to menu and clear the param
  useEffect(() => {
    if (searchParams.get("panel") === "menu") {
      setMobileView("menu");
      router.replace("/settings");
    }
  }, [searchParams, router]);

  const activeSection = tabs.find((t) => t.id === activeTab)!;

  const handleTabSelect = (id: SettingsTab) => {
    setActiveTab(id);
    setMobileView("content");
  };

  const handleBack = () => setMobileView("menu");

  const renderSection = () => {
    switch (activeTab) {
      case "profile":       return <ProfileSettings onBack={handleBack} />;
      case "account":       return <AccountSettings onBack={handleBack} />;
      case "pricing":       return <PricingSettings onBack={handleBack} />;
      case "privacy":       return <PrivacySettings onBack={handleBack} />;
      case "notifications": return <NotificationsSettings onBack={handleBack} />;
      case "earnings":      return <EarningsSettings onBack={handleBack} />;
      case "payouts":       return <PayoutsSettings onBack={handleBack} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInLeft  { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @media (min-width: 768px) {
          .settings-sidebar-panel  { display: flex !important; width: 260px !important; flex-shrink: 0 !important; }
          .settings-content-panel  { display: flex !important; }
          .settings-mobile-back    { display: none !important; }
          .settings-content-inner  { padding: 32px 28px 60px !important; }
        }
        @media (min-width: 768px) {
          .settings-mobile-chevron { display: none !important; }
        }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div
        className="settings-sidebar-panel"
        style={{
          display: mobileView === "menu" ? "flex" : "none",
          width: "100%", flexDirection: "column",
          borderRight: "1px solid #1F1F2A",
          padding: "24px 0",
          position: "sticky", top: 0, height: "100vh",
          overflowY: "auto", scrollbarWidth: "none",
          backgroundColor: "#0A0A0F", flexShrink: 0,
          animation: "slideInLeft 0.2s ease forwards",
        }}
      >
        <div style={{ padding: "0 16px 20px", borderBottom: "1px solid #1F1F2A" }}>
          <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#F1F5F9", margin: 0 }}>Settings</h1>
        </div>

        <nav style={{ padding: "12px 12px", display: "flex", flexDirection: "column", gap: "1px" }}>
          {tabs.map(({ id, label, icon: Icon, description }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleTabSelect(id)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "10px 12px", borderRadius: "10px", border: "none",
                  cursor: "pointer", width: "100%", textAlign: "left",
                  backgroundColor: active ? "rgba(139,92,246,0.08)" : "transparent",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <Icon size={16} color={active ? "#8B5CF6" : "#6B6B8A"} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: active ? 600 : 400, color: active ? "#F1F5F9" : "#A3A3C2", lineHeight: 1.3 }}>
                    {label}
                  </p>
                  <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A", marginTop: "1px" }}>
                    {description}
                  </p>
                </div>
                <ChevronRight size={13} color="#6B6B8A" className="settings-mobile-chevron" style={{ flexShrink: 0 }} />
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── CONTENT ── */}
      <div
        className="settings-content-panel"
        style={{
          display: mobileView === "content" ? "flex" : "none",
          flex: 1, minWidth: 0, flexDirection: "column",
          overflowY: "auto", scrollbarWidth: "none",
          height: "100vh", width: "100%",
          animation: "slideInRight 0.2s ease forwards",
        }}
      >
        <div className="settings-content-inner" style={{ padding: "20px 16px 100px", maxWidth: "640px", width: "100%" }}>
          {renderSection()}
        </div>
      </div>
    </div>
  );
}