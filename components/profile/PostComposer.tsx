"use client";

import * as React from "react";
import { ImagePlus, BarChart2, HelpCircle, Type } from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types/profile";

export interface PostComposerProps {
  user: User;
  onPost?: (content: string, media: File[], isLocked: boolean, price?: number) => void;
  onSchedule?: (content: string, media: File[], scheduledFor: Date) => void;
  maxCharacters?: number;
  className?: string;
}

export default function PostComposer({ user, className }: PostComposerProps) {
  const router = useRouter();

  const iconBtnStyle: React.CSSProperties = {
    width: "42px", height: "40px", borderRadius: "10px",
    background: "#1C1C2E", border: "1px solid #3A3A4D",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0, transition: "border-color 0.15s ease",
  };

  const handleHoverIn  = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = "#8B5CF6"; };
  const handleHoverOut = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = "#3A3A4D"; };

  const firstLetter = (user.display_name || user.username || "?").charAt(0).toUpperCase();

  return (
    <div
      style={{
        backgroundColor: "#0D0D18",
        borderRadius: "12px",
        border: "1px solid #1E1E2E",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontFamily: "'Inter', sans-serif",
      }}
      className={className}
    >
      {/* Avatar */}
      <div style={{
        width: "36px", height: "36px", borderRadius: "50%",
        background: user.avatar_url
          ? `url(${user.avatar_url}) center/cover no-repeat`
          : "linear-gradient(135deg, #8B5CF6, #EC4899)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "14px", fontWeight: 700, color: "#fff",
        flexShrink: 0,
      }}>
        {!user.avatar_url && firstLetter}
      </div>

      {/* Buttons row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>

        {/* Create post */}
        <button
          onClick={() => router.push("/create")}
          style={{
            flex: 1, background: "#1C1C2E", border: "1px solid #3A3A4D",
            borderRadius: "20px", padding: "10px 18px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "7px", transition: "border-color 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B5CF6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#3A3A4D"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E0E0F0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#E0E0F0" }}>Create post</span>
        </button>

        {/* Media */}
        <button
          onClick={() => router.push("/create")}
          style={iconBtnStyle}
          onMouseEnter={handleHoverIn}
          onMouseLeave={handleHoverOut}
          aria-label="Add photo or video"
        >
          <ImagePlus size={22} strokeWidth={1.6} color="#B0B0C8" />
        </button>

        {/* Poll */}
        <button
          onClick={() => router.push("/create?type=poll")}
          style={iconBtnStyle}
          onMouseEnter={handleHoverIn}
          onMouseLeave={handleHoverOut}
          aria-label="Create poll"
        >
          <BarChart2 size={22} strokeWidth={1.6} color="#B0B0C8" />
        </button>

        {/* Quiz */}
        <button
          onClick={() => router.push("/create?type=quiz")}
          style={iconBtnStyle}
          onMouseEnter={handleHoverIn}
          onMouseLeave={handleHoverOut}
          aria-label="Create quiz"
        >
          <HelpCircle size={22} strokeWidth={1.6} color="#B0B0C8" />
        </button>

        {/* Text */}
        <button
          onClick={() => router.push("/create?type=text")}
          style={iconBtnStyle}
          onMouseEnter={handleHoverIn}
          onMouseLeave={handleHoverOut}
          aria-label="Create text post"
        >
          <Type size={22} strokeWidth={1.6} color="#B0B0C8" />
        </button>

      </div>
    </div>
  );
}