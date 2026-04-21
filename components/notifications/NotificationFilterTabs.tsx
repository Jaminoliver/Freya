"use client";

import type { NotificationFilterTab } from "@/lib/types/notifications";

interface Props {
  active:   NotificationFilterTab;
  onChange: (tab: NotificationFilterTab) => void;
  role?:    "fan" | "creator";
}

const ALL_TABS: { label: string; value: NotificationFilterTab; creatorOnly?: boolean }[] = [
  { label: "All",           value: "all"           },
  { label: "Activity",      value: "activity"      },
  { label: "Messages",      value: "messages"      },
  { label: "Subscriptions", value: "subscriptions" },
  { label: "Earnings",      value: "earnings",      creatorOnly: true },
];

export function NotificationFilterTabs({ active, onChange, role }: Props) {
  const tabs = ALL_TABS.filter((t) => !t.creatorOnly || role === "creator");

  return (
    <div style={{
      padding:         "12px 16px",
      backgroundColor: "var(--background)",
      flexShrink:      0,
      position:        "sticky",
      top:             0,
      zIndex:          10,
    }}>
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   "10px",
      }}>
        <span style={{
          fontSize:      "11px",
          fontWeight:    600,
          color:         "#4A4A6A",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontFamily:    "'Inter', sans-serif",
        }}>
          LATEST FIRST
        </span>
      </div>

      <div style={{
        display:        "flex",
        alignItems:     "center",
        gap:            "8px",
        overflowX:      "auto",
        scrollbarWidth: "none",
        flexWrap:       "nowrap",
      }}>
        {tabs.map((tab) => {
          const isActive = active === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              style={{
                padding:         "6px 14px",
                borderRadius:    "20px",
                border:          "none",
                cursor:          "pointer",
                fontSize:        "13px",
                fontWeight:      isActive ? 600 : 400,
                backgroundColor: isActive ? "#FFFFFF" : "#1C1C2E",
                color:           isActive ? "#0A0A0F" : "#A3A3C2",
                transition:      "all 0.15s ease",
                fontFamily:      "'Inter', sans-serif",
                whiteSpace:      "nowrap",
                flexShrink:      0,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "#2A2A3D";
                  e.currentTarget.style.color = "#FFFFFF";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "#1C1C2E";
                  e.currentTarget.style.color = "#A3A3C2";
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}