"use client";

import { PricingTab } from "./PricingSettings";

const TABS: { key: PricingTab; label: string }[] = [
  { key: "tiers",      label: "Subscription Tiers" },
  { key: "promotions", label: "Promotions"          },
  { key: "bundles",    label: "Bundles"             },
  { key: "ppv",        label: "PPV Settings"        },
];

export default function PricingTabs({
  activeTab,
  onChange,
}: {
  activeTab: PricingTab;
  onChange: (tab: PricingTab) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        overflowX: "auto",
        scrollbarWidth: "none",
        padding: "0 0 12px",
        marginBottom: "24px",
      }}
    >
    
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            padding: "7px 16px",
            borderRadius: "20px",
            border: "none",
            backgroundColor: activeTab === tab.key ? "#FFFFFF" : "#1A1A2A",
            color: activeTab === tab.key ? "#0A0A0F" : "#94A3B8",
            fontSize: "12px",
            fontWeight: activeTab === tab.key ? 600 : 500,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            whiteSpace: "nowrap",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}