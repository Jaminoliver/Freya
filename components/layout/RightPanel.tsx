"use client";

import { useState } from "react";
import { Search } from "lucide-react";

const suggested = [
  { name: "Luna Rose", username: "lunarose" },
  { name: "Stella Moon", username: "stellamoon" },
  { name: "Nova Star", username: "novastar" },
];

export function RightPanel() {
  const [query, setQuery] = useState("");

  return (
    <div style={{
      width: "300px",
      flexShrink: 0,
      minHeight: "100vh",
      backgroundColor: "#13131F", // ✅ FIXED: matches card color
      borderLeft: "1px solid #1F1F2A",
      padding: "24px 20px",
      display: "flex",
      flexDirection: "column",
      gap: "24px",
      position: "sticky",
      top: 0,
      height: "100vh",
      overflowY: "hidden", // ✅ FIXED: no scroll
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Search */}
      <div style={{ position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#6B6B8A" }} />
        <input
          type="text"
          placeholder="Search Freya..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            borderRadius: "10px",
            padding: "12px 16px 12px 40px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: "#1E1E2E",
            border: "1.5px solid #1F1F2A",
            color: "#F1F5F9",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Suggested Creators */}
      <div>
        <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#F1F5F9" }}>Suggested Creators</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {suggested.map(({ name, username }) => (
            <div key={username} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "16px", fontWeight: 700, color: "#fff", flexShrink: 0,
                }}>
                  {name.charAt(0)}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#F1F5F9" }}>{name}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#6B6B8A" }}>@{username}</p>
                </div>
              </div>
              <button style={{
                padding: "6px 14px", borderRadius: "8px",
                backgroundColor: "#8B5CF6", border: "none",
                color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}>
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}