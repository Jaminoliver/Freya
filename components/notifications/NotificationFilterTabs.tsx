"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import type { NotificationFilterTab } from "@/lib/types/notifications";

interface Props {
  active:   NotificationFilterTab;
  onChange: (tab: NotificationFilterTab) => void;
}

const MAIN_TABS: { label: string; value: NotificationFilterTab }[] = [
  { label: "All",           value: "all"           },
  { label: "Messages",      value: "messages"      },
  { label: "Tips",          value: "tips"          },
  { label: "Subscriptions", value: "subscriptions" },
  { label: "Likes",         value: "likes"         },
  { label: "Comments",      value: "comments"      },
];

export function NotificationFilterTabs({ active, onChange }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // On mobile show fewer tabs, overflow into dropdown
  const visibleTabs  = MAIN_TABS.slice(0, 4);
  const overflowTabs = MAIN_TABS.slice(4);
  const overflowActive = overflowTabs.some((t) => t.value === active);

  return (
    <div style={{ flexShrink: 0 }}>
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .notif-filter-dropdown { animation: dropdownIn 0.15s ease forwards; }
        .notif-filter-tab {
          white-space: nowrap;
          cursor: pointer;
          border: 1px solid #2A2A3D;
          border-radius: 20px;
          padding: 7px 16px;
          font-size: 13px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          background: none;
          transition: all 0.15s ease;
        }
      `}</style>

      <div
        style={{
          display:         "flex",
          alignItems:      "center",
          gap:             "8px",
          padding:         "12px 16px",
          borderBottom:    "1px solid #1E1E2E",
          overflowX:       "auto",
          flexShrink:      0,
          scrollbarWidth:  "none",
          backgroundColor: "#0D0D1A",
        }}
      >
        {MAIN_TABS.map((tab) => {
          const isActive = active === tab.value;
          return (
            <button
              key={tab.value}
              className="notif-filter-tab"
              onClick={() => onChange(tab.value)}
              style={{
                backgroundColor: isActive ? "#FFFFFF" : "transparent",
                color:           isActive ? "#0A0A0F" : "#A3A3C2",
                borderColor:     isActive ? "#FFFFFF" : "#2A2A3D",
                fontWeight:      isActive ? 600 : 500,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "#8B5CF6";
                  e.currentTarget.style.color       = "#FFFFFF";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "#2A2A3D";
                  e.currentTarget.style.color       = "#A3A3C2";
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}

        {/* Overflow dropdown for extra tabs on smaller screens */}
        <div ref={dropdownRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            className="notif-filter-tab"
            onClick={() => setDropdownOpen((o) => !o)}
            style={{
              display:         "flex",
              alignItems:      "center",
              gap:             "4px",
              backgroundColor: overflowActive ? "#FFFFFF" : "transparent",
              color:           overflowActive ? "#0A0A0F" : "#A3A3C2",
              borderColor:     overflowActive || dropdownOpen ? "#8B5CF6" : "#2A2A3D",
            }}
          >
            <ChevronDown size={14} strokeWidth={2} />
          </button>

          {dropdownOpen && (
            <div
              className="notif-filter-dropdown"
              style={{
                position:        "absolute",
                top:             "calc(100% + 6px)",
                right:           0,
                backgroundColor: "#1C1C2E",
                border:          "1px solid #2A2A3D",
                borderRadius:    "12px",
                padding:         "6px",
                minWidth:        "160px",
                zIndex:          50,
                boxShadow:       "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              {overflowTabs.map((tab) => {
                const isActive = active === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => { onChange(tab.value); setDropdownOpen(false); }}
                    style={{
                      display:         "flex",
                      alignItems:      "center",
                      width:           "100%",
                      padding:         "10px 12px",
                      borderRadius:    "8px",
                      border:          "none",
                      cursor:          "pointer",
                      backgroundColor: isActive ? "rgba(139,92,246,0.15)" : "transparent",
                      color:           isActive ? "#8B5CF6" : "#FFFFFF",
                      fontSize:        "14px",
                      fontWeight:      isActive ? 600 : 400,
                      fontFamily:      "'Inter', sans-serif",
                      textAlign:       "left",
                      transition:      "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "#2A2A3D"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}