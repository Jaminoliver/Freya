"use client";

import { SubscriptionCardCompact } from "./SubscriptionCardCompact";
import { SubscriptionCardDetailed } from "./SubscriptionCardDetailed";
import type { CardView, Subscription } from "@/lib/types/subscription";

interface Props {
  subscriptions:   Subscription[];
  view:            CardView;
  onRefresh?:      () => void;
  hideEmptyState?: boolean;
}

export function SubscriptionList({
  subscriptions,
  view,
  onRefresh,
  hideEmptyState = false,
}: Props) {
  if (subscriptions.length === 0) {
    if (hideEmptyState) return null;
    return (
      <div style={{
        backgroundColor: "#1C1C2E",
        border:          "1.5px dashed #2A2A3D",
        borderRadius:    "10px",
        padding:         "32px 16px",
        textAlign:       "center",
      }}>
        <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>
          No subscriptions to show
        </p>
      </div>
    );
  }

  const gridCols = view === "compact"
    ? "repeat(2, minmax(0, 1fr))"
    : "1fr";

  const gap = view === "compact" ? "10px" : "14px";

  return (
    <div style={{ display: "grid", gridTemplateColumns: gridCols, gap }}>
      {subscriptions.map((s) =>
        view === "compact"
          ? <SubscriptionCardCompact key={s.id} subscription={s} onRefresh={onRefresh} />
          : <SubscriptionCardDetailed key={s.id} subscription={s} onRefresh={onRefresh} />
      )}
    </div>
  );
}