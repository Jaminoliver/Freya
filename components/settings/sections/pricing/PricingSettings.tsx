"use client";

import { useState } from "react";
import PricingTabs from "./PricingTabs";
import SubscriptionTiersTab from "./SubscriptionTiersTab";
import PromotionsTab from "./PromotionsTab";
import BundlesTab from "./BundlesTab";
import PPVSettingsTab from "./PPVSettingsTab";

export type PricingTab = "tiers" | "promotions" | "bundles" | "ppv";

export default function PricingSettings({ onBack, username }: { onBack?: () => void; username: string }) {
  const [activeTab, setActiveTab] = useState<PricingTab>("tiers");

  return (
    <div style={{ display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 10, backgroundColor: "var(--background)", paddingBottom: "4px" }}>
        <div style={{ marginBottom: "8px" }}>
          <p style={{ fontSize: "13px", color: "#A3A3C2", margin: 0 }}>Manage subscriptions & bundles</p>
        </div>
        <PricingTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>
      <div style={{ marginTop: "20px" }}>
        {activeTab === "tiers"      && <SubscriptionTiersTab username={username} />}
        {activeTab === "promotions" && <PromotionsTab />}
        {activeTab === "bundles"    && <BundlesTab />}
        {activeTab === "ppv"        && <PPVSettingsTab />}
      </div>
    </div>
  );
}