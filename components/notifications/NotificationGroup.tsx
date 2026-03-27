"use client";

import { NotificationItem as NotificationItemComponent } from "@/components/notifications/NotificationItem";
import type { NotificationItem, NotificationGroup as NotificationGroupType } from "@/lib/types/notifications";

interface Props {
  group:     NotificationGroupType;
  onSelect?: (item: NotificationItem) => void;
}

export function NotificationGroup({ group, onSelect }: Props) {
  return (
    <div>
      <div style={{
        padding:         "10px 20px 8px",
        fontSize:        "11px",
        fontWeight:      700,
        color:           "#4A4A6A",
        textTransform:   "uppercase",
        letterSpacing:   "0.08em",
        fontFamily:      "'Inter', sans-serif",
        backgroundColor: "#0A0A0F",
        borderBottom:    "1px solid #1A1A2A",
      }}>
        {group.label}
      </div>

      {group.items.map((item) => (
        <NotificationItemComponent
          key={item.id}
          notification={item}
          onClick={() => onSelect?.(item)}
        />
      ))}
    </div>
  );
}