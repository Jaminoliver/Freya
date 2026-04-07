"use client";

// ─────────────────────────────────────────────
//  MessagesSkeleton — shimmer rows mirroring
//  ConversationRow layout exactly:
//  avatar · name/username · preview · time/badge
// ─────────────────────────────────────────────

const SHIMMER_KEYFRAMES = `
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
`;

const shimmerStyle: React.CSSProperties = {
  backgroundImage:  "linear-gradient(90deg, #0F0F1A 0px, #1A1A2E 80px, #0F0F1A 160px)",
  backgroundSize:   "600px 100%",
  animation:        "shimmer 1.6s infinite linear",
  borderRadius:     "6px",
};

function SkeletonBlock({
  width,
  height,
  style,
}: {
  width?:  string | number;
  height?: string | number;
  style?:  React.CSSProperties;
}) {
  return (
    <div
      style={{
        ...shimmerStyle,
        width:        width ?? "100%",
        height:       height ?? "14px",
        borderRadius: "6px",
        ...style,
      }}
    />
  );
}

function ConversationRowSkeleton() {
  return (
    <div
      style={{
        display:         "flex",
        alignItems:      "center",
        gap:             "12px",
        padding:         "14px 20px",
        borderBottom:    "1px solid #1A1A2A",
        fontFamily:      "'Inter', sans-serif",
      }}
    >
      {/* Avatar */}
      <SkeletonBlock
        width={48}
        height={48}
        style={{ borderRadius: "50%", flexShrink: 0 }}
      />

      {/* Name + preview */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "7px" }}>
        {/* Name row */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <SkeletonBlock width={100} height={13} />
          <SkeletonBlock width={64}  height={11} />
        </div>
        {/* Preview text */}
        <SkeletonBlock width="65%" height={12} />
      </div>

      {/* Time + badge */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
        <SkeletonBlock width={32} height={11} />
        <SkeletonBlock width={18} height={18} style={{ borderRadius: "9px" }} />
      </div>
    </div>
  );
}

export function MessagesSkeleton({ count = 10 }: { count?: number }) {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      {Array.from({ length: count }).map((_, i) => (
        <ConversationRowSkeleton key={i} />
      ))}
    </>
  );
}