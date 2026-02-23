"use client";

import { useState } from "react";
import { Image, Video, BarChart2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";

const CURRENT_USER = {
  name: "Jamin Osamaaa",
  username: "jamspat",
  avatar_url: "https://i.pravatar.cc/150?img=47",
};

export function FeedCompose() {
  const router  = useRouter();
  const [focused, setFocused] = useState(false);

  const actions = [
    { icon: <Image size={19} />,     label: "Photo", color: "#8B5CF6" },
    { icon: <Video size={19} />,     label: "Video", color: "#EC4899" },
    { icon: <BarChart2 size={19} />, label: "Poll",  color: "#F59E0B" },
    { icon: <Lock size={19} />,      label: "PPV",   color: "#34D399" },
  ];

  return (
    <div style={{
      backgroundColor: "#0D0D18",
      border: `1.5px solid ${focused ? "#8B5CF6" : "#2A2A3D"}`,
      borderRadius: "10px",
      padding: "14px",
      marginBottom: "6px",
      transition: "border-color 0.2s",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <Avatar src={CURRENT_USER.avatar_url} alt={CURRENT_USER.name} size="md" showRing />
        <div
          onClick={() => router.push("/create")}
          onMouseEnter={() => setFocused(true)}
          onMouseLeave={() => setFocused(false)}
          style={{ flex: 1, cursor: "pointer", fontSize: "15px", color: "#6B6B8A", lineHeight: 1.5 }}
        >
          Compose new post...
        </div>
      </div>
      <div style={{ height: "1px", backgroundColor: "#3A3A4D", margin: "12px 0" }} />
      <div style={{ display: "flex", gap: "2px" }}>
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => router.push("/create")}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 12px", borderRadius: "6px", border: "none",
              backgroundColor: "transparent", color: "#94A3B8",
              fontSize: "13px", fontWeight: 500, cursor: "pointer",
              fontFamily: "'Inter', sans-serif", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.08)"; e.currentTarget.style.color = a.color; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}
          >
            <span style={{ display: "flex" }}>{a.icon}</span>
            <span className="hidden sm:inline">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}