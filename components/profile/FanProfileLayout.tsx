"use client";

import * as React from "react";
import FanActivityCard from "./FanActivityCard";
import type { User, Subscription } from "@/lib/types/profile";

export interface FanProfileLayoutProps {
  fan: User;
  subscription: Subscription;
  onMessage?: () => void;
}

export default function FanProfileLayout({ fan, subscription, onMessage }: FanProfileLayoutProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Fan Card */}
      <div style={{ backgroundColor: "#141420", border: "1.5px solid #2A2A3D", borderRadius: "12px", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "24px" }}>

          {/* Avatar */}
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%", flexShrink: 0,
            background: fan.avatar_url ? `url(${fan.avatar_url}) center/cover no-repeat` : "linear-gradient(135deg, #8B5CF6, #EC4899)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px", fontWeight: 700, color: "#fff",
          }}>
            {!fan.avatar_url && (fan.display_name || fan.username || "?").charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: "17px", fontWeight: 600, color: "#F1F5F9", margin: "0 0 2px", fontFamily: "'Inter', sans-serif" }}>
              {fan.display_name ?? fan.username}
            </h2>
            <p style={{ fontSize: "14px", color: "#64748B", margin: "0 0 12px", fontFamily: "'Inter', sans-serif" }}>
              @{fan.username}
            </p>

            {fan.bio && (
              <p style={{ fontSize: "14px", color: "#94A3B8", margin: "0 0 12px", lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
                {fan.bio}
              </p>
            )}

            {fan.location && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <svg width="14" height="14" fill="none" stroke="#64748B" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span style={{ fontSize: "13px", color: "#94A3B8", fontFamily: "'Inter', sans-serif" }}>{fan.location}</span>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="14" height="14" fill="none" stroke="#64748B" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span style={{ fontSize: "12px", color: "#64748B", fontFamily: "'Inter', sans-serif" }}>
                Joined {new Date(fan.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {/* Message Button */}
        <button
          onClick={onMessage}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            padding: "11px", borderRadius: "8px", border: "none",
            backgroundColor: "#8B5CF6", color: "#fff",
            fontSize: "14px", fontWeight: 600, fontFamily: "'Inter', sans-serif",
            cursor: "pointer", transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#7C3AED"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#8B5CF6"; }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Message
        </button>
      </div>

      {/* Fan Activity */}
      <FanActivityCard subscription={subscription} />
    </div>
  );
}