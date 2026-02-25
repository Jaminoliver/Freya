"use client";

import { useState } from "react";
import { Check } from "lucide-react";

interface SubscribedBannerProps {
  renewalDate: string;
  creatorId: string;
  onCancelled?: () => void;
}

export default function SubscribedBanner({
  renewalDate,
  creatorId,
  onCancelled,
}: SubscribedBannerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Cancel subscription? You'll keep access until the renewal date.")) return;
    setCancelling(true);
    try {
      // Fetch the subscription id for this creator first
      const res = await fetch(`/api/subscriptions/mine`);
      const data = await res.json();
      const sub = (data.subscriptions ?? []).find(
        (s: { creatorId: string; status: string; id: number }) =>
          s.creatorId === creatorId && s.status === "active"
      );

      if (!sub) {
        alert("Subscription not found");
        return;
      }

      const cancelRes = await fetch(`/api/subscriptions/${sub.id}/cancel`, { method: "POST" });
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

  return (
    <div style={{
      backgroundColor: "#141420", borderRadius: "12px", padding: "16px 24px",
      border: "1px solid #1F1F2A", display: "flex", alignItems: "center",
      justifyContent: "space-between", fontFamily: "'Inter', sans-serif",
      position: "relative",
    }}>
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={14} color="#FFFFFF" strokeWidth={3} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#10B981" }}>Subscribed</span>
          <span style={{ fontSize: "14px", color: "#94A3B8" }}>Renews {renewalDate}</span>
        </div>
      </div>

      {/* Right: Manage button + dropdown */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            background: "none", border: "none", fontSize: "14px", fontWeight: 600,
            color: "#8B5CF6", cursor: "pointer", fontFamily: "'Inter', sans-serif",
            padding: "4px 8px", borderRadius: "6px", transition: "background-color 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          Manage
        </button>

        {menuOpen && (
          <div style={{
            position: "absolute", top: "34px", right: 0,
            backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D",
            borderRadius: "8px", overflow: "hidden", minWidth: "160px",
            zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
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
                color: "#94A3B8", textAlign: "left", fontFamily: "'Inter', sans-serif",
                borderTop: "1px solid #2A2A3D",
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}