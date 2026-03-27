import { useState, useEffect } from "react";
import { getAuthenticatedBrowserClient } from "@/lib/supabase/browserClient";

// ─── Module-level singleton ───────────────────────────────────────────────────
let unreadCount    = 0;
let initialized    = false;
let realtimeChannel: any = null;

const listeners = new Set<(count: number) => void>();

function notify() {
  listeners.forEach((fn) => fn(unreadCount));
}

// ─── Public mutators ──────────────────────────────────────────────────────────
export function incrementUnreadCount() {
  unreadCount += 1;
  notify();
}

export function decrementUnreadCount() {
  unreadCount = Math.max(0, unreadCount - 1);
  notify();
}

export function resetUnreadCount() {
  unreadCount = 0;
  notify();
}

export function setUnreadCount(count: number) {
  unreadCount = count;
  notify();
}

// ─── Bootstrap — fetch initial count + start Realtime ─────────────────────────
export async function initNotificationStore() {
  if (initialized) return;
  initialized = true;

  // Fetch initial unread count
  try {
    const res  = await fetch("/api/notifications/unread-count");
    const data = await res.json();
    if (res.ok) setUnreadCount(data.count ?? 0);
  } catch {}

  // Realtime — increment on new INSERT
  const supabase = await getAuthenticatedBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const userId = session.user.id;

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeChannel = supabase
    .channel(`notif-store:${userId}`)
    .on(
      "postgres_changes",
      {
        event:  "INSERT",
        schema: "public",
        table:  "notifications",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        incrementUnreadCount();
      }
    )
    .subscribe();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useUnreadNotificationCount() {
  const [count, setCount] = useState(unreadCount);

  useEffect(() => {
    listeners.add(setCount);
    initNotificationStore();
    return () => { listeners.delete(setCount); };
  }, []);

  return count;
}