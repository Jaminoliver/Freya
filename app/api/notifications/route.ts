import { NextResponse }               from "next/server";
import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";
import type { NotificationItem, NotificationType, NotificationRole } from "@/lib/types/notifications";

const TAB_TYPES: Record<string, NotificationType[]> = {
  messages:      ["message"],
  subscriptions: ["subscription", "resubscription", "renewal_failed", "renewal_success", "subscription_charged", "subscription_activated", "subscription_cancelled"],
  likes:         ["like"],
  comments:      ["comment"],
  earnings:      ["tip_received", "ppv_unlocked", "ppv_purchased", "payout_completed", "payout_failed"],
  payments:      ["tip_sent", "ppv_purchased", "wallet_topup", "renewal_success", "subscription_charged"],
};

export async function GET(req: Request) {
  const { user, error: authError } = await getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tab    = searchParams.get("tab") ?? "all";
  const cursor = searchParams.get("cursor");       // created_at for pagination
  const limit  = 30;

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  // filter by type when tab is not "all"
  if (tab !== "all" && TAB_TYPES[tab]) {
    query = query.in("type", TAB_TYPES[tab]);
  }

  // cursor-based pagination
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const notifications: NotificationItem[] = (data ?? []).map((row) => ({
    id:          row.id,
    type:        row.type        as NotificationType,
    role:        row.role        as NotificationRole,
    actorName:   row.actor_name  ?? "",
    actorAvatar: row.actor_avatar ?? null,
    actorHandle: row.actor_handle ?? "",
    bodyText:    row.body_text,
    subText:     row.sub_text    ?? "",
    createdAt:   row.created_at,
    isUnread:    !row.is_read,
    referenceId: row.reference_id ?? null,
  }));

  const nextCursor =
    notifications.length === limit
      ? notifications[notifications.length - 1].createdAt
      : null;

  return NextResponse.json({ notifications, nextCursor });
}