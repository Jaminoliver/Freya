"use client";

// ─────────────────────────────────────────────────────────────
//  SubscriptionsSkeleton — shimmer cards mirroring
//  SubscriptionCard layout exactly:
//  banner cover → avatar + name → body buttons + status row
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

function SubscriptionCardSkeleton() {
  return (
    <div
      style={{
        borderRadius: "12px",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Banner cover — 160px tall like real card */}
      <div style={{ position: "relative", height: "160px" }}>
        <Bone style={{ width: "100%", height: "160px", borderRadius: "0" }} />

        {/* Avatar + name overlay at bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 2,
          }}
        >
          <Bone
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              flexShrink: 0,
              border: "3px solid rgba(255,255,255,0.1)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Bone width={100} height={13} />
            <Bone width={70}  height={11} />
          </div>
        </div>

        {/* Star + message icons overlay at bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            right: "12px",
            display: "flex",
            gap: "8px",
            zIndex: 2,
          }}
        >
          <Bone style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
          <Bone style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", backgroundColor: "#1E1E2E", margin: "0 4px" }} />

      {/* Body */}
      <div
        style={{
          padding: "10px 4px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {/* Action buttons row */}
        <div style={{ display: "flex", gap: "6px" }}>
          <Bone style={{ flex: 1, height: "34px", borderRadius: "7px" }} />
          <Bone style={{ flex: 1, height: "34px", borderRadius: "7px" }} />
        </div>

        {/* Status + expiry row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Bone width={48} height={11} />
          <Bone width={110} height={11} />
        </div>
      </div>
    </div>
  );
}

export function SubscriptionsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "12px",
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <SubscriptionCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}