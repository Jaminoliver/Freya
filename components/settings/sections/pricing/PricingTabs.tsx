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
        borderBottom: "1px solid #1E1E2E",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            background: "none",
            border: "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            color: activeTab === tab.key ? "#8B5CF6" : "#64748B",
            borderBottom: activeTab === tab.key ? "2px solid #8B5CF6" : "2px solid transparent",
            marginBottom: "-1px",
            transition: "color 0.15s ease",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}