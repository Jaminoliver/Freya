"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter }                         from "next/navigation";
import { NotificationsHeader }               from "@/components/notifications/NotificationsHeader";
import { NotificationFilterTabs }            from "@/components/notifications/NotificationFilterTabs";
import { NotificationsList }                 from "@/components/notifications/NotificationsList";
import { subscribeToNotifications }          from "@/lib/notifications/realtime";
import { getAuthenticatedBrowserClient }     from "@/lib/supabase/browserClient";
import type { NotificationItem, NotificationFilterTab } from "@/lib/types/notifications";

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();

  const [filter,        setFilter]        = useState<NotificationFilterTab>("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [userId,        setUserId]        = useState<string | null>(null);

  // ── Fetch notifications from API ─────────────────────────────────────────
  const fetchNotifications = useCallback(async (tab: NotificationFilterTab) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/notifications?tab=${tab}`);
      const data = await res.json();
      if (res.ok) {
        const items: NotificationItem[] = (data.notifications ?? []).map(
          (n: NotificationItem) => ({ ...n, createdAt: timeAgo(n.createdAt) })
        );
        setNotifications(items);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initial load + re-fetch on tab change ────────────────────────────────
  useEffect(() => {
    fetchNotifications(filter);
  }, [filter, fetchNotifications]);

  // ── Get userId for Realtime ───────────────────────────────────────────────
  useEffect(() => {
    getAuthenticatedBrowserClient().then((supabase) => {
      supabase.auth.getSession().then(({ data }: { data: { session: { user: { id: string } } | null } }) => {
        if (data.session?.user.id) setUserId(data.session.user.id);
      });
    });
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToNotifications(userId, (newNotif) => {
      setNotifications((prev) => [{ ...newNotif, createdAt: "Just now" }, ...prev]);
    });
    return unsub;
  }, [userId]);

  // ── Mark single read ──────────────────────────────────────────────────────
  const handleSelect = useCallback(async (item: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isUnread: false } : n))
    );
    await fetch(`/api/notifications/${item.id}/read`, { method: "PATCH" });

    if (item.type === "message" && item.referenceId) {
      router.push(`/messages/${item.referenceId}`);
    }
  }, [router]);

  // ── Mark all read ─────────────────────────────────────────────────────────
  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    await fetch("/api/notifications/read-all", { method: "PATCH" });
  }, []);

  // ── Refresh ───────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    await fetchNotifications(filter);
  }, [filter, fetchNotifications]);

  return (
    <>
      <style>{`
        .notif-desktop-header { display: flex; }
        @keyframes spin { to { transform: rotate(360deg); } }
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
        <NotificationsHeader onMarkAllRead={handleMarkAllRead} />

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

        <NotificationFilterTabs active={filter} onChange={setFilter} />

        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "28px", height: "28px", border: "3px solid #2A2A3D", borderTopColor: "#8B5CF6", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          </div>
        ) : (
          <NotificationsList
            notifications={notifications}
            filter={filter}
            onRefresh={handleRefresh}
            onSelect={handleSelect}
          />
        )}
      </div>
    </>
  );
}