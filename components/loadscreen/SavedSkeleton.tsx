"use client";

const SHIMMER = `
@keyframes saved-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
`;

const shimmer: React.CSSProperties = {
  backgroundImage: "linear-gradient(90deg, #12121F 0px, #1E1E35 100px, #12121F 200px)",
  backgroundSize: "400px 100%",
  animation: "saved-shimmer 1.4s infinite linear",
};

import * as React from "react";

function Bone({ style }: { style?: React.CSSProperties }) {
  return <div style={{ borderRadius: 6, ...shimmer, ...style }} />;
}

// ── Posts tab skeleton ────────────────────────────────────────
function PostsGridSkeleton() {
  // Calculate how many cells needed to fill screen
  const CELL_COUNT = 18;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "2px",
      padding: "2px",
    }}>
      {Array.from({ length: CELL_COUNT }).map((_, i) => (
        <div key={i} style={{ aspectRatio: "1", ...shimmer, borderRadius: 0 }} />
      ))}
    </div>
  );
}

// ── Creators tab skeleton ─────────────────────────────────────
function CreatorsGridSkeleton() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "8px",
      padding: "8px",
    }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ borderRadius: 10, overflow: "hidden", height: 220, position: "relative", ...shimmer }}>
          {/* Avatar circle */}
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -60%)",
            width: 52, height: 52,
            borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.06)",
          }} />
          {/* Name */}
          <div style={{
            position: "absolute",
            bottom: 36, left: "50%",
            transform: "translateX(-50%)",
            width: 70, height: 10,
            borderRadius: 6,
            backgroundColor: "rgba(255,255,255,0.06)",
          }} />
          {/* Username */}
          <div style={{
            position: "absolute",
            bottom: 20, left: "50%",
            transform: "translateX(-50%)",
            width: 50, height: 8,
            borderRadius: 6,
            backgroundColor: "rgba(255,255,255,0.04)",
          }} />
        </div>
      ))}
    </div>
  );
}

// ── Header skeleton ───────────────────────────────────────────
function HeaderSkeleton({ tab }: { tab: "posts" | "creators" }) {
  return (
    <div style={{ flexShrink: 0, backgroundColor: "#0D0D18", borderBottom: "1px solid #1A1A2E" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 0" }}>
        <Bone style={{ width: 32, height: 32, borderRadius: 8 }} />
        <Bone style={{ width: 60, height: 18 }} />
      </div>
      <div style={{ display: "flex", marginTop: 12 }}>
        {(["posts", "creators"] as const).map((t) => (
          <div key={t} style={{
            flex: 1, padding: "10px", textAlign: "center",
            borderBottom: tab === t ? "2px solid #8B5CF6" : "2px solid transparent",
          }}>
            <Bone style={{ width: 50, height: 13, margin: "0 auto", borderRadius: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
export function SavedSkeleton({ tab = "posts" }: { tab?: "posts" | "creators" }) {
  return (
    <>
      <style>{SHIMMER}</style>
      <div style={{
        height: "100svh",
        overflow: "hidden",
        backgroundColor: "#0D0D18",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
      }}>
        <HeaderSkeleton tab={tab} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          {tab === "posts" ? <PostsGridSkeleton /> : <CreatorsGridSkeleton />}
        </div>
      </div>
    </>
  );
}