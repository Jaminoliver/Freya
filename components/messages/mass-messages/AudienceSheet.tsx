"use client";

import { X, Check } from "lucide-react";
import { SmallToggle } from "./SmallToggle";

export type Segment =
  | "all_subscribers"
  | "active_subscribers"
  | "expired_subscribers"
  | "online_now"
  | "top_spenders"
  | "new_this_week"
  | "followers";

export const SEGMENT_LABEL: Record<Segment, string> = {
  all_subscribers:     "All subscribers",
  active_subscribers:  "Active subscribers",
  expired_subscribers: "Expired subscribers",
  online_now:          "Online now",
  top_spenders:        "Top spenders",
  new_this_week:       "New this week",
  followers:           "Followers",
};

const SEGMENTS: { id: Segment; label: string; sub: string }[] = [
  { id: "active_subscribers",  label: "Active subscribers",  sub: "Currently subscribed fans" },
  { id: "all_subscribers",     label: "All subscribers",     sub: "Active + grace period" },
  { id: "expired_subscribers", label: "Expired subscribers", sub: "Re-engage lapsed fans" },
  { id: "online_now",          label: "Online now",          sub: "Active in last 5 minutes" },
  { id: "top_spenders",        label: "Top spenders",        sub: "Fans who've spent ₦5,000+" },
  { id: "new_this_week",       label: "New this week",       sub: "Subscribed in last 7 days" },
  { id: "followers",           label: "Followers",           sub: "Free followers (coming soon)" },
];

interface AudienceSheetProps {
  value:                Segment;
  excludeActiveChatters: boolean;
  onChange:             (seg: Segment) => void;
  onToggleExclude:      () => void;
  onClose:              () => void;
}

export function AudienceSheet({
  value,
  excludeActiveChatters,
  onChange,
  onToggleExclude,
  onClose,
}: AudienceSheetProps) {
  return (
    <>
      <div onClick={onClose} className="mm-backdrop" />
      <div className="mm-sheet" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2A2A3D" }} />
        </div>

        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 16px 12px" }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>Audience</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", padding: "6px", display: "flex" }}
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        {/* Segment list */}
        <div style={{ overflowY: "auto", maxHeight: "60vh" }}>
          {SEGMENTS.map(({ id, label, sub }) => {
            const active = value === id;
            return (
              <button
                key={id}
                onClick={() => { onChange(id); onClose(); }}
                style={{
                  width:        "100%",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "12px",
                  padding:      "14px 16px",
                  background:   active ? "rgba(139,92,246,0.08)" : "transparent",
                  border:       "none",
                  borderBottom: "1px solid #1A1A2A",
                  cursor:       "pointer",
                  textAlign:    "left",
                  fontFamily:   "inherit",
                }}
              >
                <div style={{
                  width:           "20px",
                  height:          "20px",
                  borderRadius:    "50%",
                  border:          active ? "none" : "2px solid #2A2A3D",
                  backgroundColor: active ? "#8B5CF6" : "transparent",
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  flexShrink:      0,
                }}>
                  {active && <Check size={12} color="#FFF" strokeWidth={3} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", color: "#FFF", fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: "12px", color: "#6B6B8A", marginTop: "2px" }}>{sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Exclude toggle */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid #1A1A2A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "13px", color: "#FFF", fontWeight: 600 }}>Exclude active chatters</div>
            <div style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "2px" }}>Skip fans you've talked to in the last 2 hours</div>
          </div>
          <SmallToggle on={excludeActiveChatters} onToggle={onToggleExclude} />
        </div>
      </div>
    </>
  );
}