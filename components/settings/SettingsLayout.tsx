"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, Shield, CreditCard, Lock, Bell, ChevronRight, TrendingUp, Wallet, Users, ArrowLeft } from "lucide-react";
import ProfileSettings from "@/components/settings/profile/ProfileSettings";
import AccountSettings from "@/components/settings/sections/AccountSettings";
import PricingSettings from "@/components/settings/sections/pricing/PricingSettings";
import PrivacySettings from "@/components/settings/sections/PrivacySettings";
import NotificationsSettings from "@/components/settings/sections/NotificationsSettings";
import EarningsSettings from "@/components/settings/sections/EarningsSettings";
import PayoutsSettings from "@/components/settings/sections/PayoutsSettings";
import FansSettings from "@/components/settings/sections/FansSettings";
import { SettingsSkeleton } from "@/components/loadscreen/SettingsSkeleton";
import { Avatar } from "@/components/ui/Avatar";
import { useAppStore } from "@/lib/store/appStore";

type SettingsTab =
  | "profile"
  | "account"
  | "pricing"
  | "privacy"
  | "notifications"
  | "earnings"
  | "payouts"
  | "fans";

const allTabs: {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
  description: string;
  creatorOnly?: boolean;
}[] = [
  { id: "profile",       label: "Profile",       icon: User,       description: "Name, bio, links"            },
  { id: "account",       label: "Account",       icon: Shield,     description: "Email, password, phone"      },
  { id: "pricing",       label: "Pricing",       icon: CreditCard, description: "Subscription & bundles",     creatorOnly: true },
  { id: "earnings",      label: "Earnings",      icon: TrendingUp, description: "Revenue & breakdown",        creatorOnly: true },
  { id: "payouts",       label: "Payouts",       icon: Wallet,     description: "Bank account & withdrawals", creatorOnly: true },
  { id: "fans",          label: "Fans",          icon: Users,      description: "Subscribers & activity",     creatorOnly: true },
  { id: "privacy",       label: "Privacy",       icon: Lock,       description: "Visibility & blocking"       },
  { id: "notifications", label: "Notifications", icon: Bell,       description: "Alerts & preferences"        },
];

function panelToTab(p: string | null): SettingsTab {
  if (p === "fans")          return "fans";
  if (p === "pricing")       return "pricing";
  if (p === "subscriptions") return "account";
  return "profile";
}

function SettingsLayoutInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { viewer, settingsPanel, setSettingsPanel } = useAppStore();

  const [activeTab,  setActiveTab]  = useState<SettingsTab>(() => {
    const p = useAppStore.getState().settingsPanel;
    return panelToTab(p);
  });
  const [mobileView, setMobileView] = useState<"menu" | "content">(() => {
    const p = useAppStore.getState().settingsPanel;
    return p ? "content" : "menu";
  });
  const [username,   setUsername]   = useState<string>(viewer?.username ?? "");
  const [loading,    setLoading]    = useState(!viewer?.username);
  const [revealed,   setRevealed]   = useState(!!viewer?.username);

  const isCreator = viewer?.role === "creator";
  const tabs = allTabs.filter((t) => !t.creatorOnly || isCreator);

  useEffect(() => {
    if (!settingsPanel) return;
    setActiveTab(panelToTab(settingsPanel));
    setMobileView("content");
    setSettingsPanel(null);
  }, [settingsPanel, setSettingsPanel]);

  useEffect(() => {
    if (viewer?.username) {
      setUsername(viewer.username);
      setLoading(false);
      setRevealed(true);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (user) {
        supabase.from("profiles").select("username").eq("id", user.id).single()
          .then(({ data }: { data: { username?: string } | null }) => {
            if (data?.username) setUsername(data.username);
            setLoading(false);
            requestAnimationFrame(() => setRevealed(true));
          });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const panel = searchParams.get("panel");
    if (panel === "menu") {
      setMobileView("menu");
    } else if (panel === "fans") {
      setActiveTab("fans");
      setMobileView("content");
    } else if (panel === "pricing") {
      setActiveTab("pricing");
      setMobileView("content");
    } else if (panel === "subscriptions") {
      setActiveTab("account");
      setMobileView("content");
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabSelect = (id: SettingsTab) => {
    setActiveTab(id);
    setMobileView("content");
  };

  const handleBack     = () => setMobileView("menu");
  const handleWithdraw = () => { setActiveTab("payouts"); setMobileView("content"); };

  const renderSection = () => {
    switch (activeTab) {
      case "profile":       return <ProfileSettings onBack={handleBack} />;
      case "account":       return <AccountSettings onBack={handleBack} />;
      case "pricing":       return <PricingSettings onBack={handleBack} username={username} />;
      case "privacy":       return <PrivacySettings onBack={handleBack} />;
      case "notifications": return <NotificationsSettings onBack={handleBack} />;
      case "earnings":      return <EarningsSettings onBack={handleBack} onWithdraw={handleWithdraw} />;
      case "payouts":       return <PayoutsSettings onBack={handleBack} />;
      case "fans":          return <FansSettings onBack={handleBack} />;
    }
  };

  const activeTabData = tabs.find((t) => t.id === activeTab);

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      backgroundColor: "var(--background)",
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInLeft  { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse        { 0%,100%{opacity:1} 50%{opacity:0.4} }

        @media (min-width: 768px) {
          .settings-sidebar-panel  { display: flex !important; width: 280px !important; flex-shrink: 0 !important; }
          .settings-content-panel  { display: flex !important; }
          .settings-mobile-back    { display: none !important; }
          .settings-mobile-chevron { display: none !important; }
          .settings-content-inner  { padding: 32px 28px 60px !important; }
        }

        .settings-tab-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 13px 20px;
          border: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
          background-color: transparent;
          transition: background-color 0.15s ease;
          font-family: 'Inter', sans-serif;
        }
        .settings-tab-btn:hover { background-color: var(--surface); }
        .settings-tab-btn.active { background-color: rgba(167,139,250,0.08); }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div
        className="settings-sidebar-panel"
        style={{
          display: mobileView === "menu" ? "flex" : "none",
          width: "100%",
          flexDirection: "column",
          borderRight: "1px solid var(--border)",
          backgroundColor: "var(--background)",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          scrollbarWidth: "none",
          flexShrink: 0,
          animation: "slideInLeft 0.2s ease forwards",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "12px",
          
        }}>
          <button
            onClick={() => router.back()}
            className="settings-mobile-back"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", padding: "4px" }}
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px", margin: 0 }}>Settings</h1>
        </div>

        {/* Viewer info */}
        {viewer ? (
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
          }}>
            <Avatar src={viewer.avatar_url ?? undefined} alt={viewer.display_name || viewer.username} size="md" showRing />
            <div>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#F1F5F9" }}>
                {viewer.display_name || viewer.username}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#6B6B8A" }}>@{viewer.username}</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "var(--border)", animation: "pulse 1.5s ease-in-out infinite", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ width: "100px", height: "12px", borderRadius: "6px", backgroundColor: "var(--border)", animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ width: "70px",  height: "10px", borderRadius: "6px", backgroundColor: "var(--border)", animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav style={{ padding: "8px 0", display: "flex", flexDirection: "column" }}>
          {tabs.map(({ id, label, icon: Icon, description }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleTabSelect(id)}
                className={`settings-tab-btn${active ? " active" : ""}`}
              >
                <div style={{
                  width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
                  backgroundColor: active ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={18} color={active ? "#A78BFA" : "#A3A3C2"} strokeWidth={active ? 2.2 : 1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: active ? "#F1F5F9" : "#F1F5F9", lineHeight: 1.3 }}>
                    {label}
                  </p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#6B6B8A", marginTop: "2px" }}>
                    {description}
                  </p>
                </div>
                <ChevronRight size={16} color="#6B6B8A" className="settings-mobile-chevron" style={{ flexShrink: 0 }} />
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
          overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none",
          overscrollBehavior: "contain",
          height: "100vh", width: "100%",
          backgroundColor: "var(--background)",
          animation: "slideInRight 0.2s ease forwards",
        }}
      >
        {/* Mobile content header */}
        <div
          className="settings-mobile-back"
          style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--background)",
            position: "sticky", top: 0, zIndex: 10,
          }}
        >
          <button
            onClick={handleBack}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", padding: "4px" }}
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <span style={{ fontSize: "17px", fontWeight: 700, color: "#FFFFFF" }}>
            {activeTabData?.label ?? "Settings"}
          </span>
        </div>

        <div className="settings-content-inner" style={{ padding: "20px 16px 100px", maxWidth: "640px", width: "100%" }}>
          {loading
            ? <SettingsSkeleton />
            : (
              <div style={{ opacity: revealed ? 1 : 0, transition: "opacity 0.35s ease" }}>
                {renderSection()}
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

export function SettingsLayout() {
  return (
    <Suspense fallback={null}>
      <SettingsLayoutInner />
    </Suspense>
  );
}