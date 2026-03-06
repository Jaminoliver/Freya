"use client";

import * as React from "react";

// ─────────────────────────────────────────────────────────────
//  ContentFeedSkeleton — matches ProfileSkeleton shimmer style
//  Shows: TabBar → toolbar → post cards or media grid
// ─────────────────────────────────────────────────────────────

const SHIMMER_KEYFRAMES = `
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
`;

const shimmerBase: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, #0F0F1A 0px, #1A1A2E 80px, #0F0F1A 160px)",
  backgroundSize: "600px 100%",
  animation: "shimmer 1.6s infinite linear",
  borderRadius: "6px",
};

function Bone({
  width,
  height,
  style,
}: {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        ...shimmerBase,
        width:  width  ?? "100%",
        height: height ?? "14px",
        ...style,
      }}
    />
  );
}

// ── Tab bar skeleton ──────────────────────────────────────────
function TabBarSkeleton() {
  return (
    <div style={{
      display: "flex",
      width: "100%",
      borderBottom: "1px solid #1E1E2E",
      backgroundColor: "#0A0A0F",
    }}>
      {[0, 1].map((i) => (
        <div key={i} style={{ flex: 1, padding: "14px 8px", display: "flex", justifyContent: "center" }}>
          <Bone width={80} height={13} style={{ borderRadius: "6px" }} />
        </div>
      ))}
    </div>
  );
}

// ── Toolbar skeleton (search + grid toggle) ───────────────────
function ToolbarSkeleton() {
  return (
    <div style={{ padding: "12px 16px 4px", display: "flex", gap: "6px" }}>
      <Bone width={32} height={32} style={{ borderRadius: "8px", flexShrink: 0 }} />
      <Bone width={32} height={32} style={{ borderRadius: "8px", flexShrink: 0 }} />
    </div>
  );
}

// ── Post card skeleton — mirrors PostSkeletonCard in ProfileSkeleton ──
function PostSkeletonCard() {
  return (
    <div style={{ borderBottom: "1px solid #1A1A2E" }}>
      {/* Header */}
      <div style={{
        padding: "16px 16px 10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Bone style={{ width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Bone width={110} height={13} />
            <Bone width={72}  height={11} />
          </div>
        </div>
        <Bone width={40} height={11} />
      </div>
      {/* Caption */}
      <div style={{ padding: "0 16px 10px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <Bone width="85%" height={12} />
        <Bone width="55%" height={12} />
      </div>
      {/* Media */}
      <Bone style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "0" }} />
      {/* Action bar */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "16px" }}>
        <Bone width={52} height={28} style={{ borderRadius: "20px" }} />
        <Bone width={52} height={28} style={{ borderRadius: "20px" }} />
        <Bone width={52} height={28} style={{ borderRadius: "20px" }} />
        <div style={{ marginLeft: "auto" }}>
          <Bone width={28} height={28} style={{ borderRadius: "20px" }} />
        </div>
      </div>
    </div>
  );
}

// ── Media grid skeleton ───────────────────────────────────────
function MediaGridSkeleton() {
  return (
    <>
      {/* Media filter pills */}
      <div style={{ padding: "12px 16px 0", display: "flex", gap: "6px", marginBottom: "8px" }}>
        {[60, 72, 68].map((w, i) => (
          <Bone key={i} width={w} height={28} style={{ borderRadius: "20px", flexShrink: 0 }} />
        ))}
      </div>
      {/* Toolbar */}
      <div style={{ padding: "0 16px 10px", display: "flex", gap: "6px" }}>
        <Bone width={32} height={32} style={{ borderRadius: "8px", flexShrink: 0 }} />
        <Bone width={32} height={32} style={{ borderRadius: "8px", flexShrink: 0 }} />
      </div>
      {/* 3-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", padding: "0 16px" }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <Bone key={i} style={{ aspectRatio: "1", borderRadius: "4px" }} />
        ))}
      </div>
    </>
  );
}

// ── Public export ─────────────────────────────────────────────

export type ContentFeedSkeletonTab = "posts" | "media";

export function ContentFeedSkeleton({
  tab = "posts",
}: {
  tab?: ContentFeedSkeletonTab;
}) {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <TabBarSkeleton />
      {tab === "posts" ? (
        <>
          <ToolbarSkeleton />
          {Array.from({ length: 3 }).map((_, i) => (
            <PostSkeletonCard key={i} />
          ))}
        </>
      ) : (
        <MediaGridSkeleton />
      )}
    </>
  );
}