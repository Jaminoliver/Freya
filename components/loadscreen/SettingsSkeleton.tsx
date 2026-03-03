"use client";

// ─────────────────────────────────────────────────────────────
//  SettingsSkeleton — general shimmer for all settings sections
//  Mimics the wallet page layout: section title → field rows
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

// ── A single field row: label on top, input box below ────────
function FieldRowSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
      <Bone width={wide ? "40%" : "28%"} height={11} />
      <Bone width="100%" height={40} style={{ borderRadius: "8px" }} />
    </div>
  );
}

// ── A toggle row: label left, toggle right ───────────────────
function ToggleRowSkeleton() {
  return (
    <div
      style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 0",
        borderBottom: "1px solid #1A1A2E",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <Bone width={130} height={13} />
        <Bone width={190} height={11} />
      </div>
      <Bone width={40} height={22} style={{ borderRadius: "20px", flexShrink: 0 }} />
    </div>
  );
}

// ── Section block: heading + n field rows ────────────────────
function SectionBlock({
  fields = 3,
  toggles = 0,
  hasAvatar = false,
}: {
  fields?: number;
  toggles?: number;
  hasAvatar?: boolean;
}) {
  return (
    <div style={{ marginBottom: "32px" }}>
      {/* Back button + section title */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
        <Bone width={28} height={28} style={{ borderRadius: "8px", flexShrink: 0 }} />
        <Bone width={120} height={18} />
      </div>

      {/* Avatar row (profile section) */}
      {hasAvatar && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: "16px",
            padding: "16px", marginBottom: "24px",
            border: "1px solid #1E1E2E", borderRadius: "12px",
          }}
        >
          <Bone style={{ width: "72px", height: "72px", borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
            <Bone width="50%" height={13} />
            <Bone width="35%" height={11} />
            <Bone width={90} height={28} style={{ borderRadius: "8px" }} />
          </div>
        </div>
      )}

      {/* Field rows */}
      {Array.from({ length: fields }).map((_, i) => (
        <FieldRowSkeleton key={i} wide={i % 2 === 0} />
      ))}

      {/* Toggle rows */}
      {Array.from({ length: toggles }).map((_, i) => (
        <ToggleRowSkeleton key={i} />
      ))}

      {/* Save button */}
      <Bone width={120} height={38} style={{ borderRadius: "8px", marginTop: "8px" }} />
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <SectionBlock fields={4} hasAvatar={true} />
      <SectionBlock fields={2} toggles={2} hasAvatar={false} />
    </>
  );
}