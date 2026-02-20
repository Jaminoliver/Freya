"use client";

import { useState } from "react";
import { Search, BadgeCheck } from "lucide-react";
import { usePathname } from "next/navigation";

const suggested = [
  { name: "Luna Rose",   username: "lunarose"   },
  { name: "Stella Moon", username: "stellamoon" },
  { name: "Nova Star",   username: "novastar"   },
];

const topCreators = [
  { rank: 1, name: "Zara Johnson",   username: "zarajohnson",   subscribers: "45.2K" },
  { rank: 2, name: "Maya Williams",  username: "mayawilliams",  subscribers: "38.7K" },
  { rank: 3, name: "Luna Rodriguez", username: "lunarodriguez", subscribers: "32.1K" },
  { rank: 4, name: "Aria Martinez",  username: "ariamartinez",  subscribers: "28.5K" },
  { rank: 5, name: "Jade Thompson",  username: "jadethompson",  subscribers: "24.3K" },
];

const rankColors: Record<number, string> = {
  1: "#F59E0B",
  2: "#9CA3AF",
  3: "#B45309",
  4: "#8B5CF6",
  5: "#8B5CF6",
};

const categories = ["Lifestyle", "Gaming", "Fitness", "Art", "Music", "Fashion", "Comedy"];

export function RightPanel() {
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const isExplore = pathname === "/explore";

  return (
    <div style={{
      width: "300px",
      flexShrink: 0,
      minHeight: "100vh",
      backgroundColor: "#13131F",
      borderLeft: "1px solid #1F1F2A",
      padding: "24px 20px",
      display: "flex",
      flexDirection: "column",
      gap: "24px",
      position: "sticky",
      top: 0,
      height: "100vh",
      overflowY: "hidden",
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

      {isExplore ? (
        <>
          {/* Top Creators */}
          <div>
            <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#F1F5F9" }}>
              Top Creators 👑
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {topCreators.map(({ rank, name, username, subscribers }) => (
                <div key={username} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {/* Rank */}
                  <span style={{ fontSize: "14px", fontWeight: 700, color: rankColors[rank], width: "14px", flexShrink: 0 }}>
                    {rank}
                  </span>
                  {/* Avatar */}
                  <div style={{
                    width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "14px", fontWeight: 700, color: "#fff",
                  }}>
                    {name.charAt(0)}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#F1F5F9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {name}
                      </p>
                      <BadgeCheck size={13} color="#8B5CF6" />
                    </div>
                    <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A" }}>{subscribers} subscribers</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "#F1F5F9" }}>Categories</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  style={{
                    padding: "6px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: 500,
                    border: "1.5px solid #2A2A3D", backgroundColor: "transparent",
                    color: "#A3A3C2", cursor: "pointer", fontFamily: "'Inter', sans-serif",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(139,92,246,0.1)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#8B5CF6";
                    (e.currentTarget as HTMLButtonElement).style.color = "#8B5CF6";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#2A2A3D";
                    (e.currentTarget as HTMLButtonElement).style.color = "#A3A3C2";
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Suggested Creators — all other pages */
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
      )}
    </div>
  );
}