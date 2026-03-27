import { getBrowserClient } from "@/lib/supabase/browserClient";
import type { RealtimeChannel }  from "@supabase/supabase-js";
import type { NotificationItem, NotificationType, NotificationRole } from "@/lib/types/notifications";
import { incrementUnreadCount } from "@/lib/notifications/store";

export type NewNotificationHandler = (notification: NotificationItem) => void;

let notificationsChannel: RealtimeChannel | null = null;

function dbRowToNotificationItem(row: Record<string, unknown>): NotificationItem {
  return {
    id:          row.id          as string,
    type:        row.type        as NotificationType,
    role:        row.role        as NotificationRole,
    actorName:   (row.actor_name   as string) ?? "",
    actorAvatar: (row.actor_avatar as string) ?? null,
    actorHandle: (row.actor_handle as string) ?? "",
    bodyText:    row.body_text   as string,
    subText:     (row.sub_text   as string) ?? "",
    createdAt:   row.created_at  as string,
    isUnread:    !(row.is_read   as boolean),
    referenceId: (row.reference_id as string) ?? null,
  };
}

export function subscribeToNotifications(
  userId: string,
  onNew: NewNotificationHandler
): () => void {
  // tear down any existing channel first
  if (notificationsChannel) {
    getBrowserClient().removeChannel(notificationsChannel);
    notificationsChannel = null;
  }

  const supabase = getBrowserClient();

  notificationsChannel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event:  "INSERT",
        schema: "public",
        table:  "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload: { new: Record<string, unknown> }) => {
        const notification = dbRowToNotificationItem(
          payload.new as Record<string, unknown>
        );
        incrementUnreadCount();
        onNew(notification);
      }
    )
    .subscribe();

  // return cleanup function
  return () => {
    if (notificationsChannel) {
      supabase.removeChannel(notificationsChannel);
      notificationsChannel = null;
    }
  };
}