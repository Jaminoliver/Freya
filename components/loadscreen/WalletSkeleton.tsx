"use client";

// ─────────────────────────────────────────────────────────────
//  WalletSkeleton — shimmer for all 3 wallet tab contexts
//  wallet:  balance card + transaction rows
//  cards:   saved card rows
//  history: filter pills + transaction rows
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

// ── Transaction row skeleton ──────────────────────────────────
function TransactionRowSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 0",
        borderBottom: "1px solid #1A1A2E",
      }}
    >
      <Bone style={{ width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        <Bone width="55%" height={13} />
        <Bone width="35%" height={11} />
      </div>
      <Bone width={72} height={13} style={{ flexShrink: 0 }} />
    </div>
  );
}

// ── Wallet tab skeleton ───────────────────────────────────────
function WalletTabSkeleton() {
  return (
    <div style={{ padding: "24px 20px 0" }}>
      {/* Balance label */}
      <Bone width={90} height={11} style={{ marginBottom: "8px" }} />
      {/* Balance value + button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <Bone width={160} height={32} style={{ borderRadius: "8px" }} />
        <Bone width={96}  height={36} style={{ borderRadius: "8px" }} />
      </div>

      {/* AutoRecharge row */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", margin: "0 -20px 0",
          borderTop: "1px solid #1E1E2E", borderBottom: "1px solid #1E1E2E",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <Bone width={110} height={13} />
          <Bone width={160} height={11} />
        </div>
        <Bone width={40} height={22} style={{ borderRadius: "20px" }} />
      </div>

      {/* Transactions header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <Bone width={90} height={11} />
        <Bone width={80} height={28} style={{ borderRadius: "6px" }} />
      </div>

      {/* Transaction rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <TransactionRowSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Cards tab skeleton ────────────────────────────────────────
function CardsTabSkeleton() {
  return (
    <div style={{ padding: "24px 20px 0" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <Bone width={80} height={11} />
        <Bone width={90} height={34} style={{ borderRadius: "8px" }} />
      </div>

      {/* Card rows */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "12px 14px", marginBottom: "8px",
            borderRadius: "10px", border: "1.5px solid #1E1E2E",
          }}
        >
          <Bone style={{ width: "32px", height: "22px", borderRadius: "4px", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
            <Bone width="50%" height={13} />
            <Bone width="25%" height={11} />
          </div>
          <Bone width={24} height={24} style={{ borderRadius: "4px" }} />
        </div>
      ))}

      {/* Notice bar */}
      <Bone width="100%" height={38} style={{ borderRadius: "8px", marginTop: "8px" }} />
    </div>
  );
}

// ── History tab skeleton ──────────────────────────────────────
function HistoryTabSkeleton() {
  return (
    <div>
      {/* Filter pills */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", overflow: "hidden" }}>
        {[60, 56, 52, 80, 44, 44].map((w, i) => (
          <Bone key={i} width={w} height={32} style={{ borderRadius: "50px", flexShrink: 0 }} />
        ))}
      </div>

      {/* Transaction rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <TransactionRowSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────

export type WalletSkeletonTab = "wallet" | "cards" | "history";

export function WalletSkeleton({ tab = "wallet" }: { tab?: WalletSkeletonTab }) {
  const inner = {
    wallet:  <WalletTabSkeleton />,
    cards:   <CardsTabSkeleton />,
    history: <HistoryTabSkeleton />,
  }[tab];

  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      {inner}
    </>
  );
}