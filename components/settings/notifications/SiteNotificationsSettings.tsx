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

export function SiteNotificationsSettings({ onBack }: Props) {
  const [prefs, setPrefs] = useState({
    // posts
    new_like:             true,
    comment_liked:        true,
    new_comment:          true,
    comment_reply:        true,
    // subscriptions
    new_subscriber:       true,
    resubscription:       true,
    subscription_activated: true,
    subscription_cancelled: true,
    renewal_failed:       true,
    renewal_success:      true,
    // messages
    new_message:          true,
    // earnings
    tip_received:         true,
    ppv_unlocked:         true,
    ppv_purchased:        true,
    payout_completed:     true,
    payout_failed:        true,
    // payments (fan)
    wallet_topup:         true,
    subscription_charged: true,
    tip_sent:             true,
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
        Site Notifications
      </button>

      <SectionHeader label="Related to your posts" />
      <ToggleRow label="New like"                  value={prefs.new_like}               onChange={set("new_like")}               />
      <ToggleRow label="Comment liked"             value={prefs.comment_liked}          onChange={set("comment_liked")}          />
      <ToggleRow label="New comment"               value={prefs.new_comment}            onChange={set("new_comment")}            />
      <ToggleRow label="Comment reply"             value={prefs.comment_reply}          onChange={set("comment_reply")}          />

      <SectionHeader label="Subscriptions" />
      <ToggleRow label="New subscriber"            value={prefs.new_subscriber}         onChange={set("new_subscriber")}         />
      <ToggleRow label="Resubscription"            value={prefs.resubscription}         onChange={set("resubscription")}         />
      <ToggleRow label="Subscription activated"    value={prefs.subscription_activated} onChange={set("subscription_activated")} />
      <ToggleRow label="Subscription cancelled"    value={prefs.subscription_cancelled} onChange={set("subscription_cancelled")} />
      <ToggleRow label="Renewal failed"            value={prefs.renewal_failed}         onChange={set("renewal_failed")}         />
      <ToggleRow label="Renewal successful"        value={prefs.renewal_success}        onChange={set("renewal_success")}        />

      <SectionHeader label="Messages" />
      <ToggleRow label="New message"               value={prefs.new_message}            onChange={set("new_message")}            />

      <SectionHeader label="Earnings" />
      <ToggleRow label="Tip received"              value={prefs.tip_received}           onChange={set("tip_received")}           />
      <ToggleRow label="PPV unlocked"              value={prefs.ppv_unlocked}           onChange={set("ppv_unlocked")}           />
      <ToggleRow label="PPV purchased"             value={prefs.ppv_purchased}          onChange={set("ppv_purchased")}          />
      <ToggleRow label="Payout completed"          value={prefs.payout_completed}       onChange={set("payout_completed")}       />
      <ToggleRow label="Payout failed"             value={prefs.payout_failed}          onChange={set("payout_failed")}          />

      <SectionHeader label="Payments" />
      <ToggleRow label="Wallet top-up"             value={prefs.wallet_topup}           onChange={set("wallet_topup")}           />
      <ToggleRow label="Subscription charged"      value={prefs.subscription_charged}   onChange={set("subscription_charged")}   />
      <ToggleRow label="Tip sent"                  value={prefs.tip_sent}               onChange={set("tip_sent")}               />
    </div>
  );
}