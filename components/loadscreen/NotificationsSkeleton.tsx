"use client";

// ─────────────────────────────────────────────
//  NotificationsSkeleton — shimmer rows mirroring
//  NotificationItem layout exactly:
//  avatar+icon · body text · subtext · time/dot
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

function NotificationItemSkeleton() {
  return (
    <div
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "14px",
        padding:      "14px 20px",
        borderBottom: "1px solid #1A1A2A",
        fontFamily:   "'Inter', sans-serif",
        position:     "relative",
      }}
    >
      {/* Avatar + type icon badge */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <SkeletonBlock
          width={48}
          height={48}
          style={{ borderRadius: "50%" }}
        />
        {/* Icon badge circle */}
        <div
          style={{
            ...shimmerStyle,
            position:     "absolute",
            bottom:       "-2px",
            right:        "-2px",
            width:        "22px",
            height:       "22px",
            borderRadius: "50%",
            border:       "2px solid #0A0A0F",
          }}
        />
      </div>

      {/* Body text + subtext */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "7px" }}>
        <SkeletonBlock width="80%" height={13} />
        <SkeletonBlock width="55%" height={12} />
      </div>

      {/* Time + unread dot */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
        <SkeletonBlock width={36} height={11} />
        <SkeletonBlock width={8} height={8} style={{ borderRadius: "50%" }} />
      </div>
    </div>
  );
}

export function NotificationsSkeleton({ count = 10 }: { count?: number }) {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      {Array.from({ length: count }).map((_, i) => (
        <NotificationItemSkeleton key={i} />
      ))}
    </>
  );
}