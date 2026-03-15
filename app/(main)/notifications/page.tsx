"use client";

import { useState } from "react";
import { NotificationsHeader }    from "@/components/notifications/NotificationsHeader";
import { NotificationFilterTabs } from "@/components/notifications/NotificationFilterTabs";
import { NotificationsList }      from "@/components/notifications/NotificationsList";
import type { NotificationItem, NotificationFilterTab } from "@/lib/types/notifications";
export const DUMMY_NOTIFICATIONS: NotificationItem[] = [
  {
    id:          "n1",
    type:        "tip",
    actorName:   "Sasha",
    actorAvatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80",
    actorHandle: "sasha_v",
    bodyText:    "tipped you ₦2,000",
    subText:     "on your post · Photo set",
    createdAt:   "2m ago",
    isUnread:    true,
  },
  {
    id:          "n2",
    type:        "subscription",
    actorName:   "Kemi",
    actorAvatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&q=80",
    actorHandle: "kemi_official",
    bodyText:    "just subscribed to your page",
    subText:     "@kemi_official · New subscriber",
    createdAt:   "15m ago",
    isUnread:    true,
  },
  {
    id:          "n3",
    type:        "message",
    actorName:   "lily",
    actorAvatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&q=80",
    actorHandle: "lilyrose",
    bodyText:    "sent you a message",
    subText:     "am i too much to handle?? 🙈",
    createdAt:   "1h ago",
    isUnread:    true,
  },
  {
    id:          "n4",
    type:        "like",
    actorName:   "Wren",
    actorAvatar: "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=100&q=80",
    actorHandle: "chemwithwren",
    bodyText:    "liked your post",
    subText:     "Photo set · 4 likes total",
    createdAt:   "3h ago",
    isUnread:    false,
  },
  {
    id:          "n5",
    type:        "ppv_unlock",
    actorName:   "Sandra",
    actorAvatar: "https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=100&q=80",
    actorHandle: "sandra_official",
    bodyText:    "unlocked your PPV message",
    subText:     "₦5,000 · Night shoot video",
    createdAt:   "5h ago",
    isUnread:    false,
  },
  {
    id:          "n6",
    type:        "comment",
    actorName:   "Karina",
    actorAvatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80",
    actorHandle: "karina_official",
    bodyText:    "commented on your post",
    subText:     "\"This is absolutely stunning 🔥\"",
    createdAt:   "Yesterday",
    isUnread:    false,
  },
  {
    id:          "n7",
    type:        "tip",
    actorName:   "Wren",
    actorAvatar: "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=100&q=80",
    actorHandle: "chemwithwren",
    bodyText:    "tipped you ₦10,000",
    subText:     "on your post · Video",
    createdAt:   "Yesterday",
    isUnread:    false,
  },
  {
    id:          "n8",
    type:        "subscription",
    actorName:   "Amara",
    actorAvatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&q=80",
    actorHandle: "amara_x",
    bodyText:    "resubscribed to your page",
    subText:     "@amara_x · Renewal",
    createdAt:   "Yesterday",
    isUnread:    false,
  },
];

export default function NotificationsPage() {
  const [filter,        setFilter]        = useState<NotificationFilterTab>("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>(DUMMY_NOTIFICATIONS);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
  };

  const handleRefresh = async () => {
    await new Promise((res) => setTimeout(res, 1000));
    // TODO: re-fetch from Supabase here
  };

  return (
    <>
      <style>{`
        .notif-desktop-header { display: flex; }
        @media (max-width: 767px) {
          .notif-desktop-header { display: none !important; }
          .notif-outer { padding-top: 56px; }
        }
      `}</style>

      <div
        className="notif-outer"
        style={{
          width:           "100%",
          height:          "100vh",
          backgroundColor: "#0A0A0F",
          display:         "flex",
          flexDirection:   "column",
          overflow:        "hidden",
          fontFamily:      "'Inter', sans-serif",
          boxSizing:       "border-box",
        }}
      >
        {/* Mobile: fixed header — hidden on desktop */}
        <NotificationsHeader onMarkAllRead={handleMarkAllRead} />

        {/* Desktop inline header */}
        <div
          className="notif-desktop-header"
          style={{
            alignItems:      "center",
            justifyContent:  "space-between",
            padding:         "0 16px",
            height:          "56px",
            flexShrink:      0,
            backgroundColor: "#0D0D1A",
            borderBottom:    "1px solid #1E1E2E",
          }}
        >
          <span style={{ fontSize: "18px", fontWeight: 700, color: "#FFFFFF", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "'Inter', sans-serif" }}>
            Notifications
          </span>
          <button
            onClick={handleMarkAllRead}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#8B5CF6", fontSize: "14px", fontWeight: 600, fontFamily: "'Inter', sans-serif", padding: "6px 10px", borderRadius: "8px" }}
          >
            Mark all read
          </button>
        </div>

        {/* Filter tabs */}
        <NotificationFilterTabs active={filter} onChange={setFilter} />

        {/* List — owns its own scroll */}
        <NotificationsList notifications={notifications} filter={filter} onRefresh={handleRefresh} />
      </div>
    </>
  );
}