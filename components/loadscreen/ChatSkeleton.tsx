"use client";
// NOTE for ChatPanel.tsx — add this import:
// import { ChatSkeleton } from "@/components/loadscreen/ChatSkeleton";

// ─────────────────────────────────────────────
//  ChatSkeleton — shimmer screen mirroring
//  ChatPanel layout exactly:
//  header · message bubbles · input bar
// ─────────────────────────────────────────────

const SHIMMER_KEYFRAMES = `
@keyframes chatShimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
`;

const shimmerStyle: React.CSSProperties = {
  backgroundImage: "linear-gradient(90deg, #0F0F1A 0px, #1A1A2E 80px, #0F0F1A 160px)",
  backgroundSize:  "600px 100%",
  animation:       "chatShimmer 1.6s infinite linear",
  borderRadius:    "6px",
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
        width:        width  ?? "100%",
        height:       height ?? "14px",
        borderRadius: "6px",
        flexShrink:   0,
        ...style,
      }}
    />
  );
}

// ── Individual bubble row ─────────────────────────────────────────────────────
function BubbleRow({
  isOwn,
  width,
  delay,
  showAvatar,
}: {
  isOwn:       boolean;
  width:       number;
  delay:       string;
  showAvatar?: boolean;
}) {
  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "flex-end",
        gap:            "8px",
        justifyContent: isOwn ? "flex-end" : "flex-start",
      }}
    >
      {/* Avatar placeholder (received side only) */}
      {!isOwn && (
        showAvatar
          ? <SkeletonBlock width={36} height={36} style={{ borderRadius: "50%", animationDelay: delay }} />
          : <div style={{ width: 36, flexShrink: 0 }} />
      )}

      <SkeletonBlock
        width={width}
        height={40}
        style={{
          borderRadius:   isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          animationDelay: delay,
        }}
      />
    </div>
  );
}

// ── Header skeleton ───────────────────────────────────────────────────────────
function HeaderSkeleton() {
  return (
    <div
      style={{
        height:          "56px",
        backgroundColor: "#0D0D1A",
        borderBottom:    "1px solid #1E1E2E",
        display:         "flex",
        alignItems:      "center",
        gap:             "12px",
        padding:         "0 16px",
        flexShrink:      0,
      }}
    >
      {/* Back arrow */}
      <SkeletonBlock width={20} height={20} style={{ borderRadius: "4px" }} />

      {/* Avatar */}
      <SkeletonBlock width={40} height={40} style={{ borderRadius: "50%" }} />

      {/* Name + status */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1 }}>
        <SkeletonBlock width={110} height={13} />
        <SkeletonBlock width={65}  height={10} />
      </div>

      {/* Icon buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        <SkeletonBlock width={20} height={20} style={{ borderRadius: "4px" }} />
        <SkeletonBlock width={20} height={20} style={{ borderRadius: "4px" }} />
      </div>
    </div>
  );
}

// ── Input bar skeleton ────────────────────────────────────────────────────────
function InputBarSkeleton() {
  return (
    <div
      style={{
        height:          "64px",
        backgroundColor: "#0D0D1A",
        borderTop:       "1px solid #1E1E2E",
        display:         "flex",
        alignItems:      "center",
        gap:             "10px",
        padding:         "0 12px",
        flexShrink:      0,
      }}
    >
      <SkeletonBlock width={32} height={32} style={{ borderRadius: "50%" }} />
      <SkeletonBlock height={40} style={{ flex: 1, borderRadius: "20px" }} />
      <SkeletonBlock width={32} height={32} style={{ borderRadius: "50%" }} />
    </div>
  );
}

// ── Rows config ───────────────────────────────────────────────────────────────
const ROWS: { isOwn: boolean; width: number; showAvatar?: boolean }[] = [
  { isOwn: false, width: 170, showAvatar: true  },
  { isOwn: true,  width: 120                    },
  { isOwn: false, width: 220, showAvatar: true  },
  { isOwn: true,  width:  90                    },
  { isOwn: true,  width: 155                    },
  { isOwn: false, width: 190, showAvatar: true  },
  { isOwn: true,  width: 110                    },
  { isOwn: false, width: 140, showAvatar: false },
  { isOwn: true,  width: 200                    },
  { isOwn: false, width: 100, showAvatar: true  },
];

// ── Main export ───────────────────────────────────────────────────────────────
export function ChatSkeleton() {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>

      <div
        style={{
          display:         "flex",
          flexDirection:   "column",
          height:          "100%",
          backgroundColor: "#0D0D18",
          overflow:        "hidden",
          fontFamily:      "'Inter', sans-serif",
        }}
      >
        <HeaderSkeleton />

        {/* Messages wall */}
        <div
          style={{
            flex:      1,
            minHeight: 0,
            overflowY: "hidden",
            padding:   "16px",
            display:   "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap:       "12px",
            backgroundColor: "#0D0D18",
          }}
        >
          {ROWS.map((row, i) => (
            <BubbleRow
              key={i}
              isOwn={row.isOwn}
              width={row.width}
              showAvatar={row.showAvatar}
              delay={`${i * 0.06}s`}
            />
          ))}
        </div>

        <InputBarSkeleton />
      </div>
    </>
  );
}