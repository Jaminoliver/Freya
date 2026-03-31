"use client";

import { useState } from "react";
import { NotificationPreferencesMenu, type NotifPrefView } from "@/components/settings/notifications/NotificationPreferencesMenu";
import { PushNotificationsSettings }  from "@/components/settings/notifications/PushNotificationsSettings";
import { EmailNotificationsSettings } from "@/components/settings/notifications/EmailNotificationsSettings";
import { SiteNotificationsSettings }  from "@/components/settings/notifications/SiteNotificationsSettings";
import { ToastNotificationsSettings } from "@/components/settings/notifications/ToastNotificationsSettings";

const TITLES: Record<NotifPrefView, string> = {
  menu:  "Notifications",
  push:  "Push Notifications",
  email: "Email Notifications",
  site:  "Site Notifications",
  toast: "Toast Notifications",
};

export default function NotificationsSettings({ onBack }: { onBack?: () => void }) {
  const [view, setView] = useState<NotifPrefView>("menu");

  const handleBack = () => {
    if (view === "menu") {
      onBack?.();
    } else {
      setView("menu");
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        <button
          onClick={handleBack}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#F1F5F9", margin: 0 }}>
          {TITLES[view]}
        </h2>
      </div>

      {/* Content */}
      {view === "menu" && <NotificationPreferencesMenu onNavigate={setView} />}
      {view === "push"  && <PushNotificationsSettings  onBack={() => setView("menu")} />}
      {view === "email" && <EmailNotificationsSettings onBack={() => setView("menu")} />}
      {view === "site"  && <SiteNotificationsSettings  onBack={() => setView("menu")} />}
      {view === "toast" && <ToastNotificationsSettings onBack={() => setView("menu")} />}
    </div>
  );
}