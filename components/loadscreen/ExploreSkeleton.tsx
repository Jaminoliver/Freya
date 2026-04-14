"use client";

// ─────────────────────────────────────────────────────────────
//  ExploreSkeleton — shimmer loading screen for ExplorePage
//  Mirrors layout exactly:
//  FeaturedStrip (horizontal) → Discover header → 2-col grid
// ─────────────────────────────────────────────────────────────

const SHIMMER_KEYFRAMES = `
@keyframes exploreShimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
`;

const shimmerBase: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, #0F0F1A 0px, #1A1A2E 80px, #0F0F1A 160px)",
  backgroundSize: "600px 100%",
  animation: "exploreShimmer 1.6s infinite linear",
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
        width: width ?? "100%",
        height: height ?? "14px",
        borderRadius: "6px",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

// ── Featured strip card skeleton (matches CreatorCard: 200×270) ──────────────
function StripCardSkeleton({ delay }: { delay: number }) {
  return (
    <div
      style={{
        flexShrink: 0,
        width: "200px",
        height: "270px",
        borderRadius: "14px",
        overflow: "hidden",
        border: "1px solid #1A1A2E",
        position: "relative",
        scrollSnapAlign: "start",
        background: "#0F0F1A",
      }}
    >
      {/* Banner fill */}
      <div
        style={{
          ...shimmerBase,
          position: "absolute",
          inset: 0,
          borderRadius: 0,
          width: "100%",
          height: "100%",
          animationDelay: `${delay}s`,
        }}
      />

      {/* Avatar circle — centred, same position as CreatorCard */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -38%)",
          zIndex: 2,
        }}
      >
        <Bone
          width={72}
          height={72}
          style={{
            borderRadius: "50%",
            border: "2px solid #0A0A0F",
            animationDelay: `${delay + 0.1}s`,
          }}
        />
      </div>

      {/* Name */}
      <div
        style={{
          position: "absolute",
          bottom: "36px",
          left: 0,
          right: 0,
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
          padding: "0 20px",
        }}
      >
        <Bone width={100} height={12} style={{ animationDelay: `${delay + 0.15}s` }} />
        <Bone width={68} height={10} style={{ animationDelay: `${delay + 0.2}s` }} />
      </div>

      {/* Stats */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          left: 0,
          right: 0,
          zIndex: 2,
          display: "flex",
          justifyContent: "center",
          gap: "14px",
        }}
      >
        <Bone width={38} height={10} style={{ animationDelay: `${delay + 0.25}s` }} />
        <Bone width={38} height={10} style={{ animationDelay: `${delay + 0.3}s` }} />
      </div>
    </div>
  );
}

// ── Grid card skeleton (matches IdentityCard / VideoTile: 280px tall) ────────
function GridCardSkeleton({ delay }: { delay: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "280px",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid #1A1A2E",
        position: "relative",
        background: "#0F0F1A",
      }}
    >
      {/* Background fill */}
      <div
        style={{
          ...shimmerBase,
          position: "absolute",
          inset: 0,
          borderRadius: 0,
          width: "100%",
          height: "100%",
          animationDelay: `${delay}s`,
        }}
      />

      {/* Avatar */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -38%)",
          zIndex: 2,
        }}
      >
        <Bone
          width={72}
          height={72}
          style={{
            borderRadius: "50%",
            border: "2px solid #0A0A0F",
            animationDelay: `${delay + 0.1}s`,
          }}
        />
      </div>

      {/* Name lines */}
      <div
        style={{
          position: "absolute",
          bottom: "36px",
          left: 0,
          right: 0,
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
          padding: "0 20px",
        }}
      >
        <Bone width={100} height={12} style={{ animationDelay: `${delay + 0.15}s` }} />
        <Bone width={68} height={10} style={{ animationDelay: `${delay + 0.2}s` }} />
      </div>

      {/* Stats */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          left: 0,
          right: 0,
          zIndex: 2,
          display: "flex",
          justifyContent: "center",
          gap: "14px",
        }}
      >
        <Bone width={38} height={10} style={{ animationDelay: `${delay + 0.25}s` }} />
        <Bone width={38} height={10} style={{ animationDelay: `${delay + 0.3}s` }} />
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function ExploreSkeleton({ gridCount = 8 }: { gridCount?: number }) {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>

      <div
        style={{
          padding: "16px 12px 80px",
          fontFamily: "'Inter', sans-serif",
          backgroundColor: "#0A0A0F",
          minHeight: "100vh",
        }}
      >
        {/* ── Featured strip ───────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            overflowX: "hidden",
            marginBottom: "20px",
            scrollSnapType: "x mandatory",
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <StripCardSkeleton key={i} delay={i * 0.08} />
          ))}
        </div>

        {/* ── Discover header + sort button ────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <Bone width={80} height={16} style={{ borderRadius: "6px" }} />
          <Bone
            width={110}
            height={30}
            style={{ borderRadius: "8px", animationDelay: "0.1s" }}
          />
        </div>

        {/* ── 2-col grid ───────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            alignItems: "start",
          }}
        >
          {Array.from({ length: gridCount }).map((_, i) => (
            <GridCardSkeleton key={i} delay={i * 0.07} />
          ))}
        </div>
      </div>
    </>
  );
}