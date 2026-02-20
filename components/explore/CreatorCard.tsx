"use client";

import Link from "next/link";
import { BadgeCheck } from "lucide-react";

interface CreatorCardProps {
  username: string;
  name: string;
  avatar: string;
  coverImage: string;
  subscribers: string;
  trending?: boolean;
  large?: boolean;
}

export function CreatorCard({
  username,
  name,
  avatar,
  coverImage,
  subscribers,
  trending = false,
  large = false,
}: CreatorCardProps) {
  return (
    <Link
      href={`/${username}`}
      style={{
        position: "relative",
        display: "block",
        borderRadius: "14px",
        overflow: "hidden",
        textDecoration: "none",
        height: large ? "380px" : "220px",
        flexShrink: 0,
        width: "100%",
        cursor: "pointer",
      }}
    >
      {/* Background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverImage}
        alt={name}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s ease" }}
      />

      {/* Dark gradient overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)",
      }} />

      {/* Trending badge */}
      {trending && (
        <div style={{
          position: "absolute", top: "12px", left: "12px",
          backgroundColor: "#EF4444",
          color: "#fff", fontSize: "10px", fontWeight: 700,
          padding: "3px 8px", borderRadius: "4px",
          letterSpacing: "0.5px", textTransform: "uppercase",
          fontFamily: "'Inter', sans-serif",
        }}>
          Trending
        </div>
      )}

      {/* Bottom info */}
      <div style={{
        position: "absolute", bottom: "12px", left: "12px", right: "12px",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        {/* Avatar */}
        <div style={{
          width: large ? "44px" : "34px",
          height: large ? "44px" : "34px",
          borderRadius: "50%",
          border: "2px solid #8B5CF6",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>

        {/* Name + subs */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <p style={{
              margin: 0,
              fontSize: large ? "15px" : "13px",
              fontWeight: 700,
              color: "#fff",
              fontFamily: "'Inter', sans-serif",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {name}
            </p>
            <BadgeCheck size={large ? 15 : 13} color="#8B5CF6" fill="#8B5CF6" strokeWidth={0} />
          </div>
          <p style={{
            margin: 0,
            fontSize: large ? "12px" : "11px",
            color: "rgba(255,255,255,0.75)",
            fontFamily: "'Inter', sans-serif",
          }}>
            {subscribers} subscribers
          </p>
        </div>
      </div>
    </Link>
  );
}