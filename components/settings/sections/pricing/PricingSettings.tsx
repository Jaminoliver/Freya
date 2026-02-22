"use client";

import { useState } from "react";
import PricingTabs from "./PricingTabs";
import SubscriptionTiersTab from "./SubscriptionTiersTab";
import PromotionsTab from "./PromotionsTab";
import BundlesTab from "./BundlesTab";
import PPVSettingsTab from "./PPVSettingsTab";

export type PricingTab = "tiers" | "promotions" | "bundles" | "ppv";

export default function PricingSettings({ onBack }: { onBack?: () => void }) {
  const [activeTab, setActiveTab] = useState<PricingTab>("tiers");

  return (
    <div style={{ display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#F1F5F9", margin: "0 0 2px" }}>Pricing</h2>
          <p style={{ fontSize: "13px", color: "#A3A3C2", margin: 0 }}>Manage subscriptions, bundles & pay-per-view</p>
        </div>
      </div>

      <PricingTabs activeTab={activeTab} onChange={setActiveTab} />

      <div style={{ marginTop: "20px" }}>
        {activeTab === "tiers"      && <SubscriptionTiersTab />}
        {activeTab === "promotions" && <PromotionsTab />}
        {activeTab === "bundles"    && <BundlesTab />}
        {activeTab === "ppv"        && <PPVSettingsTab />}
      </div>
    </div>
  );
}