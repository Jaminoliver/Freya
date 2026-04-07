"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter }                         from "next/navigation";
import { MoreVertical }                      from "lucide-react";
import { NotificationsHeader }               from "@/components/notifications/NotificationsHeader";
import { NotificationFilterTabs }            from "@/components/notifications/NotificationFilterTabs";
import { NotificationsList }                 from "@/components/notifications/NotificationsList";
import { NotificationsSettingsModal }        from "@/components/notifications/NotificationsSettingsModal";
import { NotificationsSkeleton }             from "@/components/loadscreen/NotificationsSkeleton";
import { subscribeToNotifications }          from "@/lib/notifications/realtime";
import { getAuthenticatedBrowserClient }     from "@/lib/supabase/browserClient";
import { decrementUnreadCount, resetUnreadCount, initNotificationStore } from "@/lib/notifications/store";
import { useAppStore }                       from "@/lib/store/appStore";
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

function parseReferenceId(raw?: string | null): Record<string, string> | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { viewer } = useAppStore();

  const [filter,        setFilter]        = useState<NotificationFilterTab>("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [userId,        setUserId]        = useState<string | null>(null);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [dropdownPos,   setDropdownPos]   = useState({ x: 0, y: 0 });
  const dotsBtnRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => { initNotificationStore(); }, []);
  useEffect(() => { fetchNotifications(filter); }, [filter, fetchNotifications]);

  useEffect(() => {
    getAuthenticatedBrowserClient().then((supabase) => {
      supabase.auth.getSession().then(({ data }: { data: { session: { user: { id: string } } | null } }) => {
        if (data.session?.user.id) setUserId(data.session.user.id);
      });
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToNotifications(userId, (newNotif) => {
      setNotifications((prev) => [{ ...newNotif, createdAt: "Just now" }, ...prev]);
    });
    return unsub;
  }, [userId]);

  const handleSelect = useCallback(async (item: NotificationItem) => {
    if (item.isUnread) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isUnread: false } : n))
      );
      decrementUnreadCount();
      await fetch(`/api/notifications/${item.id}/read`, { method: "PATCH" });
    }

    if (item.type === "message" && item.referenceId) {
      router.push(`/messages/${item.referenceId}`);
    } else if (
      (item.type === "subscription" || item.type === "resubscription") && item.actorHandle
    ) {
      router.push(`/${item.actorHandle}`);
    } else if (item.type === "renewal_failed") {
      router.push("/wallet");
    } else if (
      (item.type === "renewal_success" || item.type === "subscription_charged" ||
       item.type === "subscription_activated" || item.type === "subscription_cancelled") &&
      item.actorHandle
    ) {
      router.push(`/${item.actorHandle}`);
    } else if (
      (item.type === "like" || item.type === "comment" || item.type === "comment_liked" ||
       item.type === "ppv_unlocked" || item.type === "ppv_purchased" ||
       item.type === "tip_received" || item.type === "tip_sent") &&
      item.referenceId
    ) {
      const parsed = parseReferenceId(item.referenceId as string);

      if (parsed?.kind === "story" && item.actorHandle) {
        router.push(`/${item.actorHandle}?story=${parsed.id}`);
      } else if (parsed?.kind === "post" && parsed?.id) {
        router.push(`/posts/${parsed.id}`);
      } else if (item.type !== "tip_received" && item.type !== "tip_sent") {
        router.push(`/posts/${item.referenceId}`);
      }
    }
  }, [router]);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    resetUnreadCount();
    await fetch("/api/notifications/read-all", { method: "PATCH" });
  }, []);

  const handleDeleteAll = useCallback(async () => {
    setNotifications([]);
    resetUnreadCount();
    await fetch("/api/notifications/delete-all", { method: "DELETE" });
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchNotifications(filter);
  }, [filter, fetchNotifications]);

  const handleOpenDropdown = () => {
    if (dotsBtnRef.current) {
      const rect = dotsBtnRef.current.getBoundingClientRect();
      setDropdownPos({ x: rect.right, y: rect.bottom + 6 });
    }
    setDropdownOpen(true);
  };

  return (
    <>
      <style>{`
        .notif-desktop-header { display: flex; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 767px) {
          .notif-desktop-header { display: none !important; }
          .notif-outer { padding-top: 56px; }
        }
        .nh-icon-btn {
          background: none; border: none; cursor: pointer;
          color: #A3A3C2; display: flex; align-items: center;
          padding: 8px; border-radius: 8px; transition: all 0.15s ease;
        }
        .nh-icon-btn:hover { color: #FFFFFF; background-color: #1C1C2E; }
        .nh-icon-btn--active { color: #8B5CF6 !important; background-color: rgba(139,92,246,0.1) !important; }
      `}</style>

      {dropdownOpen && (
        <NotificationsSettingsModal
          onClose={() => setDropdownOpen(false)}
          onMarkAllRead={handleMarkAllRead}
          onDeleteAll={handleDeleteAll}
          x={dropdownPos.x}
          y={dropdownPos.y}
        />
      )}

      <div
        className="notif-outer"
        style={{
          width: "100%", height: "100vh",
          backgroundColor: "#0A0A0F",
          display: "flex", flexDirection: "column",
          fontFamily: "'Inter', sans-serif",
          boxSizing: "border-box",
        }}
      >
        <NotificationsHeader onMarkAllRead={handleMarkAllRead} onDeleteAll={handleDeleteAll} />

        <div
          className="notif-desktop-header"
          style={{
            alignItems: "center", justifyContent: "space-between",
            padding: "0 16px", height: "56px", flexShrink: 0,
            backgroundColor: "#0D0D1A", borderBottom: "1px solid #1E1E2E",
          }}
        >
          <span style={{ fontSize: "18px", fontWeight: 700, color: "#FFFFFF", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "'Inter', sans-serif" }}>
            Notifications
          </span>

          <button
            ref={dotsBtnRef}
            className={`nh-icon-btn${dropdownOpen ? " nh-icon-btn--active" : ""}`}
            onClick={handleOpenDropdown}
          >
            <MoreVertical size={22} strokeWidth={1.8} />
          </button>
        </div>

        <NotificationFilterTabs
          active={filter}
          onChange={setFilter}
          role={viewer?.role as "fan" | "creator" | undefined}
        />

        <div style={{
          flex: 1, overflowY: "auto",
          WebkitOverflowScrolling: "touch" as any,
          minHeight: 0,
        }}>
          {loading ? (
            <NotificationsSkeleton count={10} />
          ) : (
            <NotificationsList
              notifications={notifications}
              filter={filter}
              onRefresh={handleRefresh}
              onSelect={handleSelect}
            />
          )}
        </div>
      </div>
    </>
  );
}