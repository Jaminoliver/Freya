"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";

interface Props {
  onMarkAllRead?:  () => void;
  onDeleteAll?:    () => void;
}

export function NotificationsHeader({ onMarkAllRead, onDeleteAll }: Props) {
  const router = useRouter();

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .notif-header-fixed { display: none !important; }
        }
      `}</style>

      <div
        className="notif-header-fixed"
        style={{
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "space-between",
          padding:         "0 16px",
          height:          "56px",
          flexShrink:      0,
          backgroundColor: "#0D0D1A",
          borderBottom:    "1px solid #1E1E2E",
          position:        "fixed",
          top:             0,
          left:            0,
          right:           0,
          zIndex:          100,
          fontFamily:      "'Inter', sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: "4px", borderRadius: "6px", transition: "color 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
          >
            <ArrowLeft size={20} strokeWidth={1.8} />
          </button>
          <span style={{ fontSize: "18px", fontWeight: 700, color: "#FFFFFF", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Notifications
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={onMarkAllRead}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#8B5CF6", fontSize: "14px", fontWeight: 600, fontFamily: "'Inter', sans-serif", padding: "6px 10px", borderRadius: "8px", transition: "opacity 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Mark all read
          </button>
          <button
            onClick={onDeleteAll}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: "14px", fontWeight: 600, fontFamily: "'Inter', sans-serif", padding: "6px 10px", borderRadius: "8px", transition: "opacity 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Delete all
          </button>
          <button
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: "6px", borderRadius: "8px", transition: "all 0.15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "#1C1C2E"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#A3A3C2"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Settings size={20} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </>
  );
}