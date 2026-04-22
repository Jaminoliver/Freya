"use client";

import { useState, useRef } from "react";
import { MoreVertical } from "lucide-react";
import { NotificationsSettingsModal } from "@/components/notifications/NotificationsSettingsModal";

interface Props {
  onMarkAllRead: () => void;
  onDeleteAll:   () => void;
}

export function NotificationsHeader({ onMarkAllRead, onDeleteAll }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos,  setDropdownPos]  = useState({ x: 0, y: 0 });
  const dotsBtnRef = useRef<HTMLButtonElement>(null);

  const handleOpenDropdown = () => {
    if (dotsBtnRef.current) {
      const rect = dotsBtnRef.current.getBoundingClientRect();
      setDropdownPos({ x: rect.right, y: rect.bottom + 6 });
    }
    setDropdownOpen(true);
  };

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .notif-header-fixed { display: none !important; }
        }
        .nh-icon-btn {
          background: none; border: none; cursor: pointer;
          color: #A3A3C2; display: flex; align-items: center;
          padding: 8px; border-radius: 8px; transition: all 0.15s ease;
        }
        .nh-icon-btn:hover { color: #FFFFFF; background-color: #1C1C2E; }
        .nh-icon-btn--active { color: #8B5CF6 !important; background-color: rgba(139,92,246,0.1) !important; }
      `}</style>

      {dropdownOpen && (
        <NotificationsSettingsModal
          onClose={() => setDropdownOpen(false)}
          onMarkAllRead={onMarkAllRead}
          onDeleteAll={onDeleteAll}
          x={dropdownPos.x}
          y={dropdownPos.y}
        />
      )}

      <div
        className="notif-header-fixed"
        style={{
          position:        "relative",
          height:          "56px",
          flexShrink:      0,
          backgroundColor: "var(--background)",
          zIndex:          100,
          fontFamily:      "'Inter', sans-serif",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "space-between",
          padding:         "0 16px",
        }}
      >
        <span style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>
          Notifications
        </span>

        <button
          ref={dotsBtnRef}
          className={`nh-icon-btn${dropdownOpen ? " nh-icon-btn--active" : ""}`}
          onClick={handleOpenDropdown}
        >
          <MoreVertical size={22} strokeWidth={1.8} />
        </button>
      </div>
    </>
  );
}