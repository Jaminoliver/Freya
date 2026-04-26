"use client";

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

function GridSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "2px",
        padding: "2px",
      }}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{
            ...shimmerStyle,
            aspectRatio: "1",
            borderRadius: "0",
          }}
        />
      ))}
    </div>
  );
}

export function SavedSkeleton({ tab }: { tab: "posts" | "creators" }) {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          height: "56px",
          borderBottom: "1px solid #1E1E2E",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <SkeletonBlock width={20} height={20} style={{ borderRadius: "4px" }} />
          <SkeletonBlock width={60} height={18} style={{ borderRadius: "6px" }} />
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <SkeletonBlock width={48} height={28} style={{ borderRadius: "8px" }} />
          <SkeletonBlock width={28} height={28} style={{ borderRadius: "8px" }} />
        </div>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          width: "100%",
          borderBottom: "1px solid #1E1E2E",
          padding: "0 16px",
          gap: "16px",
          height: "48px",
          alignItems: "center",
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock
            key={i}
            width={70}
            height={13}
            style={{ borderRadius: "6px" }}
          />
        ))}
      </div>

      {/* Content */}
      {tab === "creators" ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1px",
            paddingTop: "8px",
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
              }}
            >
              <SkeletonBlock
                width={48}
                height={48}
                style={{ borderRadius: "50%", flexShrink: 0 }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  flex: 1,
                }}
              >
                <SkeletonBlock width="40%" height={13} />
                <SkeletonBlock width="25%" height={11} />
              </div>
              <SkeletonBlock width={72} height={30} style={{ borderRadius: "20px" }} />
            </div>
          ))}
        </div>
      ) : (
        <GridSkeleton />
      )}
    </>
  );
}