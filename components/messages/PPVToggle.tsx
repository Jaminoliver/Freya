"use client";

import { Lock } from "lucide-react";

interface Props {
  enabled:       boolean;
  price:         number;
  onToggle:      (val: boolean) => void;
  onPriceChange: (val: number) => void;
}

export function PPVToggle({ enabled, price, onToggle, onPriceChange }: Props) {
  return (
    <div
      style={{
        display:         "flex",
        alignItems:      "center",
        gap:             "12px",
        padding:         "10px 16px",
        borderTop:       "1px solid #1E1E2E",
        backgroundColor: "#0D0D1A",
        fontFamily:      "'Inter', sans-serif",
      }}
    >
      {/* Lock icon + label */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <Lock
          size={15}
          color={enabled ? "#8B5CF6" : "#4A4A6A"}
          strokeWidth={1.8}
        />
        <span
          style={{
            fontSize:   "13px",
            fontWeight: enabled ? 600 : 400,
            color:      enabled ? "#FFFFFF" : "#A3A3C2",
          }}
        >
          PPV
        </span>
      </div>

      {/* Toggle pill */}
      <button
        onClick={() => onToggle(!enabled)}
        style={{
          position:        "relative",
          width:           "36px",
          height:          "20px",
          borderRadius:    "10px",
          border:          "none",
          cursor:          "pointer",
          backgroundColor: enabled ? "#8B5CF6" : "#2A2A3D",
          transition:      "background-color 0.2s ease",
          flexShrink:      0,
          padding:         0,
        }}
      >
        <div
          style={{
            position:        "absolute",
            top:             "2px",
            left:            enabled ? "18px" : "2px",
            width:           "16px",
            height:          "16px",
            borderRadius:    "50%",
            backgroundColor: enabled ? "#FFFFFF" : "#4A4A6A",
            transition:      "left 0.2s ease",
          }}
        />
      </button>

      {/* Price input — slides in when enabled */}
      {enabled && (
        <div
          style={{
            display:         "flex",
            alignItems:      "center",
            gap:             "6px",
            backgroundColor: "#1C1C2E",
            border:          "1px solid #8B5CF6",
            borderRadius:    "10px",
            padding:         "6px 12px",
            width:           "140px",
          }}
        >
          <span
            style={{
              fontSize:   "16px",
              fontWeight: 700,
              color:      "#F5A623",
              flexShrink: 0,
            }}
          >
            ₦
          </span>
          <input
            type="number"
            value={price || ""}
            onChange={(e) => onPriceChange(Number(e.target.value))}
            placeholder="0"
            min={0}
            style={{
              flex:            1,
              background:      "none",
              border:          "none",
              outline:         "none",
              fontSize:        "16px",
              fontWeight:      700,
              color:           "#FFFFFF",
              fontFamily:      "'Inter', sans-serif",
              width:           "60px",
            }}
          />
          <span style={{ fontSize: "12px", color: "#4A4A6A", flexShrink: 0 }}>
            NGN
          </span>
        </div>
      )}

      {/* Helper text */}
      {!enabled && (
        <span style={{ fontSize: "12px", color: "#4A4A6A" }}>
          Charge fans to unlock this media
        </span>
      )}
    </div>
  );
}