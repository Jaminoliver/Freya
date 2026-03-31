"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";

interface Props {
  onBack: () => void;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width:           "44px",
        height:          "24px",
        borderRadius:    "12px",
        backgroundColor: value ? "#8B5CF6" : "#2A2A3D",
        border:          "none",
        cursor:          "pointer",
        position:        "relative",
        transition:      "background-color 0.2s ease",
        flexShrink:      0,
      }}
    >
      <div style={{
        position:        "absolute",
        top:             "2px",
        left:            value ? "22px" : "2px",
        width:           "20px",
        height:          "20px",
        borderRadius:    "50%",
        backgroundColor: "#FFFFFF",
        transition:      "left 0.2s ease",
        boxShadow:       "0 1px 4px rgba(0,0,0,0.3)",
      }} />
    </button>
  );
}

function ToggleRow({ label, description, value, onChange }: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "16px 0", borderBottom: "1px solid #1E1E2E" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "15px", color: "#F1F5F9", fontWeight: 400, fontFamily: "'Inter', sans-serif" }}>{label}</p>
        {description && <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>{description}</p>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p style={{ margin: "24px 0 0", fontSize: "13px", fontWeight: 700, color: "#6B6B8A", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'Inter', sans-serif" }}>
      {label}
    </p>
  );
}

export function PushNotificationsSettings({ onBack }: Props) {
  const [pushEnabled, setPushEnabled] = useState(true);

  const [prefs, setPrefs] = useState({
    new_subscriber:     true,
    new_message:        true,
    new_comment:        true,
    new_like:           true,
    tip_received:       true,
    ppv_purchase:       true,
    renewal_success:    true,
    renewal_failed:     true,
    payout_completed:   true,
    payout_failed:      true,
  });

  const set = (key: keyof typeof prefs) => (v: boolean) =>
    setPrefs((p) => ({ ...p, [key]: v }));

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <button
        onClick={onBack}
        style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", padding: "0 0 20px", fontSize: "14px" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
      >
        <ArrowLeft size={16} strokeWidth={1.8} />
        Push Notifications
      </button>

      <ToggleRow
        label="Push notifications"
        description="Get push notifications to find out what's going on when you're not on Fréya. You can turn them off anytime."
        value={pushEnabled}
        onChange={setPushEnabled}
      />

      {pushEnabled && (
        <>
          <SectionHeader label="Related to your posts" />
          <ToggleRow label="New subscriber"      value={prefs.new_subscriber}   onChange={set("new_subscriber")}   />
          <ToggleRow label="New comment"         value={prefs.new_comment}      onChange={set("new_comment")}      />
          <ToggleRow label="New like"            value={prefs.new_like}         onChange={set("new_like")}         />
          <ToggleRow label="Tip received"        value={prefs.tip_received}     onChange={set("tip_received")}     />
          <ToggleRow label="PPV purchase"        value={prefs.ppv_purchase}     onChange={set("ppv_purchase")}     />

          <SectionHeader label="Messages" />
          <ToggleRow label="New message"         value={prefs.new_message}      onChange={set("new_message")}      />

          <SectionHeader label="Payments" />
          <ToggleRow label="Renewal successful"  value={prefs.renewal_success}  onChange={set("renewal_success")}  />
          <ToggleRow label="Renewal failed"      value={prefs.renewal_failed}   onChange={set("renewal_failed")}   />
          <ToggleRow label="Payout completed"    value={prefs.payout_completed} onChange={set("payout_completed")} />
          <ToggleRow label="Payout failed"       value={prefs.payout_failed}    onChange={set("payout_failed")}    />
        </>
      )}
    </div>
  );
}