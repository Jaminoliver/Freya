// components/search/CreatorSearchRow.tsx
"use client";

import { BadgeCheck, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

export interface SearchRowCreator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  follower_count: number;
  likes_count: number;
}

interface CreatorSearchRowProps {
  creator: SearchRowCreator;
  query: string;
  highlighted?: boolean;
  onSelect: () => void;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const pattern = new RegExp(`(${escapeRegex(query.trim())})`, "ig");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <strong key={i} style={{ fontWeight: 800, color: "#FFFFFF" }}>
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function CreatorSearchRow({ creator, query, highlighted = false, onSelect }: CreatorSearchRowProps) {
  const name = creator.display_name || creator.username;

  return (
    <div
      role="option"
      aria-selected={highlighted}
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 12px",
        borderRadius: "10px",
        cursor: "pointer",
        backgroundColor: highlighted ? "#1E1E2E" : "transparent",
        borderLeft: highlighted ? "2px solid #8B5CF6" : "2px solid transparent",
        paddingLeft: highlighted ? "10px" : "12px",
        transition: "background-color 0.12s ease, border-color 0.12s ease",
        fontFamily: "'Inter', sans-serif",
      }}
      onMouseEnter={(e) => {
        if (!highlighted) e.currentTarget.style.backgroundColor = "#1A1A2A";
      }}
      onMouseLeave={(e) => {
        if (!highlighted) e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <Avatar src={creator.avatar_url ?? undefined} alt={name} size="sm" showRing />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top line: name + verified */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#E5E5F0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "180px",
            }}
          >
            <HighlightedText text={name} query={query} />
          </span>
          {creator.is_verified && <BadgeCheck size={13} color="#8B5CF6" style={{ flexShrink: 0 }} />}
        </div>

        {/* Bottom line: @username · followers · likes */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
          <span
            style={{
              fontSize: "12px",
              color: "#6B6B8A",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100px",
            }}
          >
            @<HighlightedText text={creator.username} query={query} />
          </span>

          <span style={{ fontSize: "11px", color: "#3A3A50" }}>·</span>

          {/* Followers */}
          <span style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0 }}>
            <UserPlus size={11} color="#60A5FA" strokeWidth={1.8} />
            <span style={{ fontSize: "11px", color: "#60A5FA", fontWeight: 700 }}>
              {formatCount(creator.follower_count)}
            </span>
          </span>

          <span style={{ fontSize: "11px", color: "#3A3A50" }}>·</span>

          {/* Likes */}
          <span style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0 }}>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="rgba(255,255,255,0.15)"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
              {formatCount(creator.likes_count)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

// Skeleton row — used while results load
export function CreatorSearchRowSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          backgroundColor: "#1A1A2E",
          flexShrink: 0,
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        <div
          style={{
            width: "60%",
            height: "12px",
            borderRadius: "4px",
            backgroundColor: "#1A1A2E",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            width: "40%",
            height: "10px",
            borderRadius: "4px",
            backgroundColor: "#1A1A2E",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}