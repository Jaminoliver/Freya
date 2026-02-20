"use client";

import * as React from "react";
import { MapPin, Twitter, Instagram, Globe } from "lucide-react";

interface ProfileInfoProps {
  displayName: string | null;
  username: string;
  bio?: string | null;
  location?: string | null;
  twitterUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  isVerified?: boolean;
  isEditable?: boolean;
  mode?: "header" | "body" | "full";
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname !== "/" ? u.pathname : "";
    const full = host + path;
    return full.length > 22 ? full.slice(0, 22) + "…" : full;
  } catch {
    return url.length > 22 ? url.slice(0, 22) + "…" : url;
  }
}

export default function ProfileInfo({
  displayName,
  username,
  bio,
  location,
  twitterUrl,
  instagramUrl,
  websiteUrl,
  isVerified = false,
  isEditable = false,
  mode = "full",
}: ProfileInfoProps) {
  const [expanded, setExpanded] = React.useState(false);
  const showHeader = mode === "header" || mode === "full";
  const showBody = mode === "body" || mode === "full";

  const displayBio = bio || "Bringing you late-night gameplay, spicy energy, and behind the scenes fun 😏\nSubscribe for uncensored gaming moments & real connection 🔥🕹️";
  const displayLocation = location || "Lagos, Nigeria";
  const displayTwitter = twitterUrl || "https://twitter.com";
  const displayInstagram = instagramUrl || "https://instagram.com";

  const bioLines = displayBio.split("\n");
  const isLong = bioLines.length > 3;
  const collapsedBio = bioLines.slice(0, 3).join("\n");

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {showHeader && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#F1F5F9", margin: 0 }}>
              {displayName || username}
            </h1>
            {isVerified && (
              <div style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
          <span style={{ fontSize: "14px", color: "#A3A3C2", fontWeight: 400 }}>@{username}</span>
        </div>
      )}

      {showBody && (
        <div style={{ marginTop: "8px" }}>
          {/* Bio */}
          <div style={{ position: "relative" }}>
            <p
              style={{
                fontSize: "14px",
                lineHeight: "1.6",
                color: "#E2E8F0",
                margin: "0",
                whiteSpace: "pre-wrap",
                overflow: "hidden",
                maxHeight: expanded ? "none" : "calc(1.6em * 3)",
                position: "relative",
              }}
            >
              {expanded ? displayBio : collapsedBio}
            </p>

            {isLong && !expanded && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "28px",
                  background: "linear-gradient(to bottom, transparent, #0A0A0F)",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>

          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: "none",
                border: "none",
                color: "#8B5CF6",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                padding: "6px 0 0",
                fontFamily: "'Inter', sans-serif",
                display: "block",
              }}
            >
              {expanded ? "Less info" : "More info"}
            </button>
          )}

          {(expanded || !isLong) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>

              {/* Website */}
              {websiteUrl && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Globe size={15} color="#64748B" strokeWidth={1.8} />
                  <span style={{ fontSize: "13px", color: "#94A3B8" }}>Website: </span>
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "13px", color: "#8B5CF6", textDecoration: "none" }}
                    onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                  >
                    {shortenUrl(websiteUrl)}
                  </a>
                </div>
              )}

              {/* Location + socials */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <MapPin size={15} color="#64748B" strokeWidth={1.8} />
                  <span style={{ fontSize: "13px", color: "#94A3B8" }}>{displayLocation}</span>
                </div>
                <a href={displayTwitter} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", color: "#94A3B8", textDecoration: "none" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#8B5CF6"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; }}>
                  <Twitter size={16} strokeWidth={1.8} />
                </a>
                <a href={displayInstagram} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", color: "#94A3B8", textDecoration: "none" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#8B5CF6"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; }}>
                  <Instagram size={16} strokeWidth={1.8} />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}