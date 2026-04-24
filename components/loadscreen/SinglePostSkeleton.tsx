"use client";

const SHIMMER_KEYFRAMES = `
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
`;

const shimmerStyle: React.CSSProperties = {
  backgroundImage: "linear-gradient(90deg, #0F0F1A 0px, #1A1A2E 80px, #0F0F1A 160px)",
  backgroundSize:  "600px 100%",
  animation:       "shimmer 1.6s infinite linear",
  borderRadius:    "6px",
};

function SkeletonBlock({ width, height, style }: {
  width?:  string | number;
  height?: string | number;
  style?:  React.CSSProperties;
}) {
  return (
    <div style={{ ...shimmerStyle, width: width ?? "100%", height: height ?? "14px", borderRadius: "6px", ...style }} />
  );
}

export function SinglePostSkeleton() {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div style={{ width: "100%", fontFamily: "'Inter', sans-serif" }}>

        {/* Header bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: "56px", borderBottom: "1px solid #1E1E2E", backgroundColor: "#0A0A0F" }}>
          <SkeletonBlock width={28} height={28} style={{ borderRadius: "8px" }} />
          <SkeletonBlock width={48} height={16} />
          <SkeletonBlock width={28} height={28} style={{ borderRadius: "8px" }} />
        </div>

        {/* Post header — avatar + name + timestamp */}
        <div style={{ padding: "16px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <SkeletonBlock width={48} height={48} style={{ borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <SkeletonBlock width={120} height={13} />
              <SkeletonBlock width={80} height={11} />
            </div>
          </div>
          <SkeletonBlock width={28} height={28} style={{ borderRadius: "8px" }} />
        </div>

        {/* Caption */}
        <div style={{ padding: "0 16px 10px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <SkeletonBlock width="92%" height={13} />
          <SkeletonBlock width="65%" height={13} />
        </div>

        {/* Media block */}
        <SkeletonBlock width="100%" style={{ aspectRatio: "1 / 1", borderRadius: "0", height: undefined }} />

        {/* Actions */}
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "16px" }}>
          <SkeletonBlock width={52} height={28} style={{ borderRadius: "20px" }} />
          <SkeletonBlock width={52} height={28} style={{ borderRadius: "20px" }} />
          <SkeletonBlock width={52} height={28} style={{ borderRadius: "20px" }} />
          <div style={{ marginLeft: "auto" }}>
            <SkeletonBlock width={28} height={28} style={{ borderRadius: "20px" }} />
          </div>
        </div>

        {/* Comments header */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1E1E2E", display: "flex", flexDirection: "column", gap: "14px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: "flex", gap: "10px" }}>
              <SkeletonBlock width={36} height={36} style={{ borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", paddingTop: "2px" }}>
                <SkeletonBlock width={90} height={11} />
                <SkeletonBlock width="80%" height={12} />
                <SkeletonBlock width="50%" height={12} />
              </div>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}