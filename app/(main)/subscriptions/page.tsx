"use client";

import { useState } from "react";
import { SubscriptionList } from "@/components/subscription/SubscriptionCard";
import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";

type ContentTab = "following" | "posts";

export default function SubscriptionsPage() {
  const [contentTab, setContentTab] = useState<ContentTab>("following");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "28px 28px 0", borderBottom: "1px solid #1F1F2A" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#F1F5F9", margin: "0 0 3px" }}>
          Subscriptions
        </h1>
        <p style={{ fontSize: "13px", color: "#6B6B8A", margin: "0 0 18px" }}>
          Manage your active and expired subscriptions
        </p>

        {/* Content Tabs */}
        <div style={{ display: "flex" }}>
          {(["following", "posts"] as ContentTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setContentTab(tab)}
              style={{
                padding: "8px 16px", background: "none", border: "none",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                fontSize: "14px", fontWeight: contentTab === tab ? 600 : 400,
                color: contentTab === tab ? "#F1F5F9" : "#6B6B8A",
                borderBottom: contentTab === tab ? "2px solid #8B5CF6" : "2px solid transparent",
                marginBottom: "-1px", transition: "all 0.15s ease",
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Icons row */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", padding: "14px 28px" }}>
        {[Search, SlidersHorizontal, ArrowUpDown].map((Icon, i) => (
          <button
            key={i}
            style={{
              width: "32px", height: "32px", borderRadius: "8px",
              border: "1px solid #2A2A3D", backgroundColor: "transparent",
              color: "#6B6B8A", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.color = "#8B5CF6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3D"; e.currentTarget.style.color = "#6B6B8A"; }}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "0 28px 28px" }}>
        {contentTab === "following" && <SubscriptionList />}
        {contentTab === "posts" && (
          <div style={{ backgroundColor: "#1C1C2E", border: "1.5px dashed #2A2A3D", borderRadius: "10px", padding: "32px 16px", textAlign: "center" }}>
            <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0 }}>Posts feed coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}