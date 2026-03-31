"use client";

import { Bell, Mail, Monitor, Zap, ChevronRight } from "lucide-react";

export type NotifPrefView = "menu" | "push" | "email" | "site" | "toast";

interface Props {
  onNavigate: (view: NotifPrefView) => void;
}

const ITEMS: { id: NotifPrefView; label: string; description: string; icon: React.ElementType }[] = [
  { id: "push",  label: "Push notifications",  description: "Alerts on your device when you're away", icon: Bell    },
  { id: "email", label: "Email notifications",  description: "Updates sent to your email address",    icon: Mail    },
  { id: "site",  label: "Site notifications",   description: "In-app alerts while you're on Fréya",   icon: Monitor },
  { id: "toast", label: "Toast notifications",  description: "Pop-up alerts within the platform",     icon: Zap     },
];

export function NotificationPreferencesMenu({ onNavigate }: Props) {
  return (
    <div>
      <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>
        Choose how and when you receive notifications from Fréya.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {ITEMS.map(({ id, label, description, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            style={{
              display:         "flex",
              alignItems:      "center",
              gap:             "14px",
              width:           "100%",
              padding:         "16px",
              backgroundColor: "transparent",
              border:          "none",
              borderBottom:    "1px solid #1E1E2E",
              cursor:          "pointer",
              textAlign:       "left",
              fontFamily:      "'Inter', sans-serif",
              transition:      "background-color 0.15s ease",
              borderRadius:    "0",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#13131F")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <div style={{
              width:           "40px",
              height:          "40px",
              borderRadius:    "10px",
              backgroundColor: "rgba(139,92,246,0.1)",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              flexShrink:      0,
            }}>
              <Icon size={18} color="#8B5CF6" strokeWidth={1.8} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#F1F5F9", lineHeight: 1.3 }}>
                {label}
              </p>
              <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#6B6B8A" }}>
                {description}
              </p>
            </div>

            <ChevronRight size={16} color="#4A4A6A" strokeWidth={1.8} />
          </button>
        ))}
      </div>
    </div>
  );
}