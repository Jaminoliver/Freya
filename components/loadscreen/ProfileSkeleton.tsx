"use client";

import * as React from "react";

// ─────────────────────────────────────────────────────────────
//  ProfileSkeleton — Instagram-style shimmer for all 5 profile
//  view contexts. Mirrors ProfilePage layout exactly:
//  banner → avatar + actions → info → content area
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

// ── Shared sub-sections ───────────────────────────────────────

function BannerSkeleton() {
  return (
    <Bone
      width="100%"
      style={{ height: "200px", borderRadius: "0" }}
    />
  );
}

function AvatarRowSkeleton({ showActions = true }: { showActions?: boolean }) {
  return (
    <div
      style={{
        padding: "0 16px",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginTop: "-36px",
      }}
    >
      {/* Avatar circle with border ring */}
      <div
        style={{
          width: "88px",
          height: "88px",
          borderRadius: "50%",
          padding: "3px",
          background: "#0A0A0F",
          flexShrink: 0,
        }}
      >
        <Bone style={{ width: "82px", height: "82px", borderRadius: "50%" }} />
      </div>

      {/* Action buttons placeholder */}
      {showActions && (
        <div
          style={{
            paddingBottom: "12px",
            display: "flex",
            gap: "8px",
          }}
        >
          <Bone width={80}  height={34} style={{ borderRadius: "20px" }} />
          <Bone width={34}  height={34} style={{ borderRadius: "50%" }} />
          <Bone width={34}  height={34} style={{ borderRadius: "50%" }} />
        </div>
      )}
    </div>
  );
}

function ProfileInfoSkeleton() {
  return (
    <div
      style={{
        padding: "12px 16px 0",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {/* Display name */}
      <Bone width={160} height={18} />
      {/* Username */}
      <Bone width={100} height={13} />
      {/* Bio lines */}
      <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <Bone width="80%" height={13} />
        <Bone width="55%" height={13} />
      </div>
      {/* Location / website */}
      <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
        <Bone width={90}  height={12} />
        <Bone width={110} height={12} />
      </div>
    </div>
  );
}

function PostSkeletonCard() {
  return (
    <div style={{ borderBottom: "1px solid #1A1A2E" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 16px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
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

// ── Context-specific skeletons ────────────────────────────────

/** Own creator profile — has PostComposer box before posts */
function OwnCreatorSkeleton() {
  return (
    <>
      <BannerSkeleton />
      <AvatarRowSkeleton />
      <ProfileInfoSkeleton />
      {/* PostComposer placeholder */}
      <div style={{ padding: "16px 16px 8px" }}>
        <Bone width="100%" height={56} style={{ borderRadius: "12px" }} />
      </div>
      {Array.from({ length: 3 }).map((_, i) => <PostSkeletonCard key={i} />)}
    </>
  );
}

/** Own fan profile — no PostComposer, no subscription card */
function OwnFanSkeleton() {
  return (
    <>
      <BannerSkeleton />
      <AvatarRowSkeleton />
      <ProfileInfoSkeleton />
      {Array.from({ length: 3 }).map((_, i) => <PostSkeletonCard key={i} />)}
    </>
  );
}

/** Creator viewing a fan — compact, no banner */
function CreatorViewingFanSkeleton() {
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Bone style={{ width: "64px", height: "64px", borderRadius: "50%" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Bone width={130} height={16} />
            <Bone width={85}  height={12} />
          </div>
        </div>
        <Bone width={90} height={34} style={{ borderRadius: "20px" }} />
      </div>
      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <Bone width="70%" height={13} />
        <Bone width="45%" height={13} />
      </div>
      {/* FanActivityCard placeholder */}
      <div style={{ marginTop: "24px" }}>
        <Bone width="100%" height={110} style={{ borderRadius: "12px" }} />
      </div>
    </div>
  );
}

/** Fan viewing subscribed creator — has SubscribedBanner before posts */
function SubscribedCreatorSkeleton() {
  return (
    <>
      <BannerSkeleton />
      <AvatarRowSkeleton />
      <ProfileInfoSkeleton />
      {/* SubscribedBanner placeholder */}
      <div style={{ padding: "16px" }}>
        <Bone width="100%" height={72} style={{ borderRadius: "12px" }} />
      </div>
      {Array.from({ length: 3 }).map((_, i) => <PostSkeletonCard key={i} />)}
    </>
  );
}

/** Fan viewing unsubscribed creator — has SubscriptionCard before posts */
function UnsubscribedCreatorSkeleton() {
  return (
    <>
      <BannerSkeleton />
      <AvatarRowSkeleton />
      <ProfileInfoSkeleton />
      {/* SubscriptionCard placeholder */}
      <div style={{ padding: "16px" }}>
        <Bone width="100%" height={140} style={{ borderRadius: "16px" }} />
      </div>
      {Array.from({ length: 3 }).map((_, i) => <PostSkeletonCard key={i} />)}
    </>
  );
}

// ── Public export ─────────────────────────────────────────────

export type ProfileSkeletonContext =
  | "ownCreator"
  | "ownFan"
  | "creatorViewingFan"
  | "subscribedCreator"
  | "unsubscribedCreator";

export function ProfileSkeleton({
  context = "unsubscribedCreator",
}: {
  context?: ProfileSkeletonContext;
}) {
  const inner = {
    ownCreator:           <OwnCreatorSkeleton />,
    ownFan:               <OwnFanSkeleton />,
    creatorViewingFan:    <CreatorViewingFanSkeleton />,
    subscribedCreator:    <SubscribedCreatorSkeleton />,
    unsubscribedCreator:  <UnsubscribedCreatorSkeleton />,
  }[context];

  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {inner}
      </div>
    </>
  );
}