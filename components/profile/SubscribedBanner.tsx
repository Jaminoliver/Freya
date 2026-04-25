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
  const [showSheet, setShowSheet] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isFree = !price || price === 0;
  const planLabel = planMonths === 1 ? "1 Month" : planMonths === 3 ? "3 Months" : planMonths === 6 ? "6 Months" : `${planMonths} Months`;

  const handleCancel = async () => {
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
        setShowSheet(false);
        onCancelled?.();
        window.location.reload();
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
            onClick={() => setShowSheet(true)}
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

          {showSheet && (
            <div style={{
              position: "absolute", bottom: "110%", right: 0, zIndex: 50,
              background: "#0A0A0F", border: "1px solid #2A2A3D",
              borderRadius: "12px", padding: "14px", minWidth: "200px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}>
              <p style={{ fontSize: "13px", color: "#CBD5E1", margin: "0 0 12px", fontWeight: 500 }}>Cancel subscription?</p>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  style={{
                    flex: 1, padding: "8px", borderRadius: "8px", border: "none",
                    background: "#EF4444", color: "#fff", fontSize: "13px",
                    fontWeight: 700, cursor: cancelling ? "not-allowed" : "pointer",
                    opacity: cancelling ? 0.7 : 1,
                  }}
                >
                  {cancelling ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "13px", height: "13px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                      Cancelling…
                    </span>
                  ) : "Yes, cancel"}
                </button>
                <button
                  onClick={() => setShowSheet(false)}
                  disabled={cancelling}
                  style={{
                    flex: 1, padding: "8px", borderRadius: "8px",
                    border: "1px solid #2A2A3D", background: "transparent",
                    color: "#CBD5E1", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  No
                </button>
              </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}