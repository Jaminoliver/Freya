"use client";

// ─────────────────────────────────────────────
//  FeedSkeleton — Instagram-style shimmer cards
//  Mirrors PostCard layout exactly:
//  avatar · name · media block · action bar
// ─────────────────────────────────────────────

const SHIMMER_KEYFRAMES = `
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
`;

const shimmerStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, #0F0F1A 0px, #1A1A2E 80px, #0F0F1A 160px)",
  backgroundSize: "600px 100%",
  animation: "shimmer 1.6s infinite linear",
  borderRadius: "6px",
};

function SkeletonBlock({
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
        ...shimmerStyle,
        width: width ?? "100%",
        height: height ?? "14px",
        borderRadius: "6px",
        ...style,
      }}
    />
  );
}

function FeedSkeletonCard() {
  return (
    <div
      style={{
        borderBottom: "1px solid #1A1A2E",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header — mirrors PostCard header */}
      <div
        style={{
          padding: "16px 16px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Avatar + name/username */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <SkeletonBlock
            width={40}
            height={40}
            style={{ borderRadius: "50%", flexShrink: 0 }}
          />
          <div
            style={{ display: "flex", flexDirection: "column", gap: "6px" }}
          >
            <SkeletonBlock width={110} height={13} />
            <SkeletonBlock width={72} height={11} />
          </div>
        </div>
        {/* Timestamp placeholder */}
        <SkeletonBlock width={40} height={11} />
      </div>

      {/* Caption line */}
      <div style={{ padding: "0 16px 10px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <SkeletonBlock width="90%" height={12} />
        <SkeletonBlock width="60%" height={12} />
      </div>

      {/* Media block — square aspect ratio like PostCard */}
      <SkeletonBlock
        width="100%"
        height={undefined}
        style={{
          aspectRatio: "1 / 1",
          borderRadius: "0",
          height: undefined,
        }}
      />

      {/* Action bar — like · comment · tip · bookmark */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <SkeletonBlock width={52} height={28} style={{ borderRadius: "20px" }} />
        <SkeletonBlock width={52} height={28} style={{ borderRadius: "20px" }} />
        <SkeletonBlock width={52} height={28} style={{ borderRadius: "20px" }} />
        <div style={{ marginLeft: "auto" }}>
          <SkeletonBlock width={28} height={28} style={{ borderRadius: "20px" }} />
        </div>
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      {Array.from({ length: count }).map((_, i) => (
        <FeedSkeletonCard key={i} />
      ))}
    </>
  );
}