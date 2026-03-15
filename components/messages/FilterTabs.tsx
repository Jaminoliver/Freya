"use client";

import { PenLine } from "lucide-react";
import type { FilterTab } from "@/lib/types/messages";

interface Props {
  active:        FilterTab;
  onChange:      (tab: FilterTab) => void;
  priorityCount: number;
  unreadCount:   number;
}

export function FilterTabs({ active, onChange, priorityCount, unreadCount }: Props) {
  return (
    <div
      style={{
        padding:         "12px 16px",
        borderBottom:    "1px solid #1E1E2E",
        backgroundColor: "#0D0D1A",
        flexShrink:      0,
        marginTop:       "56px",
      }}
    >
      {/* Sort label */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          marginBottom:   "10px",
        }}
      >
        <span
          style={{
            fontSize:      "11px",
            fontWeight:    600,
            color:         "#4A4A6A",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontFamily:    "'Inter', sans-serif",
          }}
        >
          NEWEST FIRST
        </span>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={() => onChange("all")}
          style={{
            padding:         "6px 14px",
            borderRadius:    "20px",
            border:          "none",
            cursor:          "pointer",
            fontSize:        "13px",
            fontWeight:      active === "all" ? 600 : 400,
            backgroundColor: active === "all" ? "#FFFFFF" : "#1C1C2E",
            color:           active === "all" ? "#0A0A0F" : "#A3A3C2",
            transition:      "all 0.15s ease",
            fontFamily:      "'Inter', sans-serif",
          }}
        >
          All
        </button>

        <button
          onClick={() => onChange("priority")}
          style={{
            display:         "flex",
            alignItems:      "center",
            gap:             "6px",
            padding:         "6px 14px",
            borderRadius:    "20px",
            border:          "none",
            cursor:          "pointer",
            fontSize:        "13px",
            fontWeight:      active === "priority" ? 600 : 400,
            backgroundColor: active === "priority" ? "#FFFFFF" : "#1C1C2E",
            color:           active === "priority" ? "#0A0A0F" : "#A3A3C2",
            transition:      "all 0.15s ease",
            fontFamily:      "'Inter', sans-serif",
          }}
        >
          Priority
          {priorityCount > 0 && (
            <span
              style={{
                backgroundColor: "#8B5CF6",
                color:           "#FFFFFF",
                fontSize:        "11px",
                fontWeight:      700,
                borderRadius:    "10px",
                padding:         "1px 6px",
                minWidth:        "18px",
                textAlign:       "center",
              }}
            >
              {priorityCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onChange("unread")}
          style={{
            display:         "flex",
            alignItems:      "center",
            gap:             "6px",
            padding:         "6px 14px",
            borderRadius:    "20px",
            border:          "none",
            cursor:          "pointer",
            fontSize:        "13px",
            fontWeight:      active === "unread" ? 600 : 400,
            backgroundColor: active === "unread" ? "#FFFFFF" : "#1C1C2E",
            color:           active === "unread" ? "#0A0A0F" : "#A3A3C2",
            transition:      "all 0.15s ease",
            fontFamily:      "'Inter', sans-serif",
          }}
        >
          Unread
          {unreadCount > 0 && (
            <span
              style={{
                backgroundColor: "#8B5CF6",
                color:           "#FFFFFF",
                fontSize:        "11px",
                fontWeight:      700,
                borderRadius:    "10px",
                padding:         "1px 6px",
                minWidth:        "18px",
                textAlign:       "center",
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        <button
          style={{
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            width:           "32px",
            height:          "32px",
            borderRadius:    "20px",
            border:          "none",
            cursor:          "pointer",
            backgroundColor: "#1C1C2E",
            color:           "#A3A3C2",
            transition:      "all 0.15s ease",
            marginLeft:      "auto",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#2A2A3D"; e.currentTarget.style.color = "#FFFFFF"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#1C1C2E"; e.currentTarget.style.color = "#A3A3C2"; }}
        >
          <PenLine size={14} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}