"use client";

import type { NotificationFilterTab } from "@/lib/types/notifications";

interface Props {
  active:   NotificationFilterTab;
  onChange: (tab: NotificationFilterTab) => void;
}

const TABS: { label: string; value: NotificationFilterTab }[] = [
  { label: "All",           value: "all"           },
  { label: "Activity",      value: "activity"      },
  { label: "Messages",      value: "messages"      },
  { label: "Subscriptions", value: "subscriptions" },
  { label: "Earnings",      value: "earnings"      },
];

export function NotificationFilterTabs({ active, onChange }: Props) {
  return (
    <div style={{ flexShrink: 0 }}>
      <style>{`
        .notif-filter-tab {
          white-space: nowrap;
          cursor: pointer;
          border: 1px solid #2A2A3D;
          border-radius: 20px;
          padding: 7px 16px;
          font-size: 13px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          background: none;
          transition: all 0.15s ease;
        }
      `}</style>

      <div
        style={{
          display:         "flex",
          alignItems:      "center",
          gap:             "8px",
          padding:         "12px 16px",
          borderBottom:    "1px solid #1E1E2E",
          overflowX:       "auto",
          flexShrink:      0,
          scrollbarWidth:  "none",
          backgroundColor: "#0D0D1A",
        }}
      >
        {TABS.map((tab) => {
          const isActive = active === tab.value;
          return (
            <button
              key={tab.value}
              className="notif-filter-tab"
              onClick={() => onChange(tab.value)}
              style={{
                backgroundColor: isActive ? "#FFFFFF" : "transparent",
                color:           isActive ? "#0A0A0F" : "#A3A3C2",
                borderColor:     isActive ? "#FFFFFF" : "#2A2A3D",
                fontWeight:      isActive ? 600 : 500,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "#8B5CF6";
                  e.currentTarget.style.color       = "#FFFFFF";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "#2A2A3D";
                  e.currentTarget.style.color       = "#A3A3C2";
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