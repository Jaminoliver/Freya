"use client";

import { NotificationGroup } from "@/components/notifications/NotificationGroup";
import type { NotificationItem, NotificationGroup as NotificationGroupType, NotificationFilterTab } from "@/lib/types/notifications";

interface Props {
  notifications: NotificationItem[];
  filter:        NotificationFilterTab;
  onRefresh?:    () => Promise<void>;
  onSelect?:     (item: NotificationItem) => void;
}

const TYPE_TO_FILTER: Record<NotificationItem["type"], NotificationFilterTab> = {
  // creator
  like:                 "likes",
  comment:              "comments",
  subscription:         "subscriptions",
  resubscription:       "subscriptions",
  tip_received:         "earnings",
  ppv_unlocked:         "earnings",
  ppv_purchased:        "earnings",
  payout_completed:     "earnings",
  payout_failed:        "earnings",
  // fan
  renewal_failed:       "subscriptions",
  renewal_success:      "payments",
  subscription_charged: "payments",
  tip_sent:             "payments",
  wallet_topup:         "payments",
  // both
  message:              "messages",
};

function groupByDate(items: NotificationItem[]): NotificationGroupType[] {
  const groups: Record<string, NotificationItem[]> = {};
  items.forEach((item) => {
    let label: string;
    const raw = item.createdAt.toLowerCase();
    if (raw.includes("m ago") || raw.includes("h ago") || raw === "just now") {
      label = "Today";
    } else if (raw === "yesterday") {
      label = "Yesterday";
    } else {
      label = "Earlier";
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  });
  const order = ["Today", "Yesterday", "Earlier"];
  return order
    .filter((label) => groups[label]?.length > 0)
    .map((label) => ({ label, items: groups[label] }));
}

export function NotificationsList({ notifications, filter, onSelect }: Props) {
  const filtered = filter === "all"
    ? notifications
    : notifications.filter((n) => TYPE_TO_FILTER[n.type] === filter);

  const groups = groupByDate(filtered);

  if (filtered.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", fontFamily: "'Inter', sans-serif", padding: "40px 20px" }}>
        <div style={{ fontSize: "40px" }}>🔔</div>
        <p style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#6B6B8A" }}>No notifications</p>
        <p style={{ margin: 0, fontSize: "14px", color: "#4A4A6A" }}>Nothing here yet for this filter</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: "80px" }}>
      {groups.map((group) => (
        <NotificationGroup key={group.label} group={group} onSelect={onSelect} />
      ))}
    </div>
  );
}