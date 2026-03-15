"use client";

import { MessageCircle, Plus } from "lucide-react";

export function EmptyState() {
  return (
    <div
      style={{
        flex:            1,
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        justifyContent:  "center",
        backgroundColor: "#0A0A0F",
        gap:             "16px",
        fontFamily:      "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width:           "64px",
          height:          "64px",
          borderRadius:    "50%",
          backgroundColor: "#1C1C2E",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
        }}
      >
        <MessageCircle size={28} color="#4A4A6A" strokeWidth={1.5} />
      </div>

      <div style={{ textAlign: "center", maxWidth: "280px" }}>
        <p
          style={{
            fontSize:     "18px",
            fontWeight:   600,
            color:        "#FFFFFF",
            margin:       "0 0 8px",
            lineHeight:   1.3,
          }}
        >
          Select a conversation
        </p>
        <p
          style={{
            fontSize:  "14px",
            color:     "#4A4A6A",
            margin:    0,
            lineHeight: 1.5,
          }}
        >
          Choose from your existing conversations or start a new one
        </p>
      </div>

      <button
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            "8px",
          padding:        "12px 24px",
          borderRadius:   "24px",
          border:         "none",
          cursor:         "pointer",
          background:     "linear-gradient(to right, #8B5CF6, #EC4899)",
          color:          "#FFFFFF",
          fontSize:       "14px",
          fontWeight:     600,
          fontFamily:     "'Inter', sans-serif",
          transition:     "opacity 0.15s ease",
          marginTop:      "8px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        <Plus size={16} strokeWidth={2.2} />
        New Message
      </button>
    </div>
  );
}