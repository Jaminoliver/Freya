"use client";

import * as React from "react";
import { MapPin, Twitter, Instagram, Globe, Facebook, Send } from "lucide-react";

interface ProfileInfoProps {
  displayName: string | null;
  username: string;
  bio?: string | null;
  location?: string | null;
  twitterUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  telegramUrl?: string | null;
  facebookUrl?: string | null;
  isVerified?: boolean;
  isEditable?: boolean;
  mode?: "header" | "body" | "full";
  badge?: { label: string; color: string; bg: string; border: string };
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

const LINE_HEIGHT_PX = 22;
const MAX_LINES = 3;

export default function ProfileInfo({
  displayName,
  username,
  bio,
  location,
  twitterUrl,
  instagramUrl,
  websiteUrl,
  telegramUrl,
  facebookUrl,
  isVerified = false,
  isEditable = false,
  mode = "full",
  badge,
}: ProfileInfoProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [isOverflowing, setIsOverflowing] = React.useState(false);
  const bioRef = React.useRef<HTMLParagraphElement>(null);

  const showHeader = mode === "header" || mode === "full";
  const showBody   = mode === "body"   || mode === "full";

  React.useEffect(() => {
    if (!bioRef.current) return;
    const el = bioRef.current;
    el.style.maxHeight = "none";
    el.style.overflow  = "visible";
    const full = el.scrollHeight;
    el.style.maxHeight = `${LINE_HEIGHT_PX * MAX_LINES}px`;
    el.style.overflow  = "hidden";
    setIsOverflowing(full > LINE_HEIGHT_PX * MAX_LINES + 2);
  }, [bio]);

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

          {/* Username row with optional inline badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", color: "#A3A3C2", fontWeight: 400 }}>@{username}</span>
            {badge && (
              <span style={{
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em",
                color: badge.color,
                background: badge.bg,
                border: `1px solid ${badge.border}`,
                borderRadius: "999px",
                padding: "2px 8px",
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.4,
              }}>
                {badge.label}
              </span>
            )}
          </div>
        </div>
      )}

      {showBody && (
        <div style={{ marginTop: "8px" }}>
          {bio && (
            <div style={{ position: "relative" }}>
              <p
                ref={bioRef}
                style={{
                  fontSize: "14px",
                  lineHeight: `${LINE_HEIGHT_PX}px`,
                  color: "#E2E8F0",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  overflow: "hidden",
                  maxHeight: expanded ? "none" : `${LINE_HEIGHT_PX * MAX_LINES}px`,
                  transition: "max-height 0.2s ease",
                }}
              >
                {bio}
              </p>
              {isOverflowing && !expanded && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "28px", background: "linear-gradient(to bottom, transparent, #0A0A0F)", pointerEvents: "none" }} />
              )}
            </div>
          )}

          {isOverflowing && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{ background: "none", border: "none", color: "#8B5CF6", fontSize: "13px", fontWeight: 500, cursor: "pointer", padding: "6px 0 0", fontFamily: "'Inter', sans-serif", display: "block" }}
            >
              {expanded ? "Less info" : "More info"}
            </button>
          )}

          {(expanded || !isOverflowing) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              {websiteUrl && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Globe size={15} color="#64748B" strokeWidth={1.8} />
                  <span style={{ fontSize: "13px", color: "#94A3B8" }}>Website: </span>
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: "13px", color: "#8B5CF6", textDecoration: "none" }}
                    onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                  >
                    {shortenUrl(websiteUrl)}
                  </a>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                {location && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <MapPin size={15} color="#64748B" strokeWidth={1.8} />
                    <span style={{ fontSize: "13px", color: "#94A3B8" }}>{location}</span>
                  </div>
                )}
                {twitterUrl && (
                  <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", color: "#94A3B8", textDecoration: "none" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#8B5CF6"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; }}>
                    <Twitter size={16} strokeWidth={1.8} />
                  </a>
                )}
                {instagramUrl && (
                  <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", color: "#94A3B8", textDecoration: "none" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#8B5CF6"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; }}>
                    <Instagram size={16} strokeWidth={1.8} />
                  </a>
                )}
                {facebookUrl && (
                  <a href={facebookUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", color: "#94A3B8", textDecoration: "none" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#8B5CF6"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; }}>
                    <Facebook size={16} strokeWidth={1.8} />
                  </a>
                )}
                {telegramUrl && (
                  <a href={telegramUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", color: "#94A3B8", textDecoration: "none" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#8B5CF6"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; }}>
                    <Send size={16} strokeWidth={1.8} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}