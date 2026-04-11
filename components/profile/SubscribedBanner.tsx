"use client";

import { useState } from "react";

interface SubscribedBannerProps {
  renewalDate: string;
  creatorId: string;
  creatorName?: string;
  avatarUrl?: string;
  subscriptionId?: number;
  price?: number;
  planMonths?: number;
  memberSince?: string;
  onCancelled?: () => void;
}

export default function SubscribedBanner({
  renewalDate,
  creatorId,
  creatorName,
  avatarUrl,
  subscriptionId,
  price,
  planMonths = 1,
  memberSince,
  onCancelled,
}: SubscribedBannerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isFree = !price || price === 0;
  const planLabel = planMonths === 1 ? "1 Month" : planMonths === 3 ? "3 Months" : planMonths === 6 ? "6 Months" : `${planMonths} Months`;

  const handleCancel = async () => {
    if (!confirm("Cancel subscription? You'll keep access until the renewal date.")) return;
    setCancelling(true);
    try {
      let subId = subscriptionId;
      if (!subId) {
        const res = await fetch(`/api/subscriptions/mine`);
        const data = await res.json();
        const sub = (data.subscriptions ?? []).find(
          (s: { creatorId: string; status: string; id: number }) =>
            s.creatorId === creatorId && s.status === "active"
        );
        if (!sub) { alert("Subscription not found"); return; }
        subId = sub.id;
      }
      const cancelRes = await fetch(`/api/subscriptions/${subId}/cancel`, { method: "POST" });
      const cancelData = await cancelRes.json();
      if (cancelData.success) {
        setMenuOpen(false);
        onCancelled?.();
      } else {
        alert(cancelData.error ?? "Failed to cancel");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setCancelling(false);
    }
  };

  const accentBg     = "rgba(139,92,246,0.1)";
  const accentBorder = "rgba(139,92,246,0.25)";
  const borderColor  = "rgba(139,92,246,0.25)";
  const bgColor      = "#120E1E";
  const pillText     = isFree ? planLabel : `₦${price?.toLocaleString()} · ${planLabel}`;

  return (
    <div style={{
      background: bgColor,
      borderRadius: "16px",
      border: `1px solid ${borderColor}`,
      padding: "16px 18px",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>

        {/* Left: status + price pill + renewal */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
          <span style={{
            fontSize: "11px", fontWeight: 700, color: "#E2D9FF",
            background: "rgba(139,92,246,0.15)", padding: "2px 8px",
            borderRadius: "999px", border: "1px solid rgba(139,92,246,0.3)",
            alignSelf: "flex-start",
          }}>Subscribed</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{
              fontSize: "13px", fontWeight: 700, color: "#FFFFFF",
              background: accentBg, padding: "3px 10px",
              borderRadius: "999px", border: `1px solid ${accentBorder}`,
            }}>
              {pillText}
            </span>
            <span style={{ fontSize: "12px", color: "#CBD5E1", fontWeight: 500 }}>· Renews {renewalDate}</span>
          </div>
        </div>

        {/* Right: Active + Manage */}
        <div style={{ position: "relative", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#34D399" }}>● Active</span>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              fontSize: "13px", color: "#FFFFFF",
              background: accentBg,
              border: `1px solid ${accentBorder}`,
              padding: "6px 14px", borderRadius: "999px",
              cursor: "pointer", fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            Manage
          </button>

          {menuOpen && (
            <div style={{
              position: "absolute", bottom: "36px", right: 0,
              backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D",
              borderRadius: "10px", overflow: "hidden", minWidth: "160px",
              zIndex: 10, boxShadow: "0 -4px 16px rgba(0,0,0,0.5)",
            }}>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  width: "100%", padding: "10px 14px", backgroundColor: "transparent",
                  border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500,
                  color: "#EF4444", textAlign: "left", fontFamily: "'Inter', sans-serif",
                }}
              >
                {cancelling ? "Cancelling…" : "Cancel subscription"}
              </button>
              <button
                onClick={() => setMenuOpen(false)}
                style={{
                  width: "100%", padding: "10px 14px", backgroundColor: "transparent",
                  border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500,
                  color: "#F1F5F9", textAlign: "left", fontFamily: "'Inter', sans-serif",
                  borderTop: "1px solid #2A2A3D",
                }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}