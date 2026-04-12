import { NextResponse }               from "next/server";
import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";
import { signBunnyUrl, signBunnyStoryThumbnail, getBunnyStreamUrls } from "@/lib/utils/bunny";
import type { NotificationItem, NotificationType, NotificationRole } from "@/lib/types/notifications";

const TAB_TYPES: Record<string, NotificationType[]> = {
  messages:      ["message"],
  subscriptions: ["subscription", "resubscription", "renewal_failed", "renewal_success", "subscription_charged", "subscription_activated", "subscription_cancelled"],
  likes:         ["like"],
  comments:      ["comment"],
  earnings:      ["tip_received", "ppv_unlocked", "ppv_purchased", "payout_completed", "payout_failed"],
  payments:      ["tip_sent", "ppv_purchased", "wallet_topup", "renewal_success", "subscription_charged"],
};

function parseRef(raw: string | null): { kind: string; id: number; question?: string } | null {
  if (!raw) return null;
  if (raw.startsWith("{")) {
    try {
      const p = JSON.parse(raw);
      if (p.kind && p.id) return { kind: p.kind, id: Number(p.id), question: p.question ?? undefined };
    } catch {}
    return null;
  }
  const n = Number(raw);
  if (!isNaN(n) && n > 0) return { kind: "tip", id: n };
  return null;
}

function extractPath(url: string): string | null {
  try { return new URL(url).pathname; } catch { return null; }
}

export async function GET(req: Request) {
  const { user, error: authError } = await getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tab    = searchParams.get("tab") ?? "all";
  const cursor = searchParams.get("cursor");
  const limit  = 30;

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (tab !== "all" && TAB_TYPES[tab]) query = query.in("type", TAB_TYPES[tab]);
  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];

  // ── Collect IDs ───────────────────────────────────────────────────────────
  const postIds:  number[] = [];
  const storyIds: number[] = [];
  const tipIds:   number[] = [];

  for (const row of rows) {
    const ref = parseRef(row.reference_id);
    if (!ref) continue;
    if (ref.kind === "post" || ref.kind === "poll") postIds.push(ref.id);
    if (ref.kind === "story") storyIds.push(ref.id);
    if (ref.kind === "tip")   tipIds.push(ref.id);
  }

  // ── Resolve legacy tip IDs → post IDs ────────────────────────────────────
  const tipPostMap: Record<number, number | null> = {};

  if (tipIds.length > 0) {
    const { data: tipRows } = await supabase
      .from("tips")
      .select("id, post_id")
      .in("id", [...new Set(tipIds)]);

    for (const t of tipRows ?? []) {
      tipPostMap[t.id] = t.post_id ?? null;
      if (t.post_id) postIds.push(t.post_id);
    }
  }

  // ── Fresh signed thumbnails for posts ─────────────────────────────────────
  const postThumbMap: Record<number, string | null> = {};

  const postContentMap: Record<number, { content_type: string; text_background: string | null; caption: string | null }> = {};

  if (postIds.length > 0) {
    const { data: postRows } = await supabase
      .from("posts")
      .select("id, content_type, text_background, caption")
      .in("id", [...new Set(postIds)]);

    for (const p of postRows ?? []) {
      postContentMap[p.id] = {
        content_type:    p.content_type,
        text_background: p.text_background ?? null,
        caption:         p.caption ?? null,
      };
    }

    const { data: mediaRows } = await supabase
      .from("media")
      .select("post_id, media_type, file_url, thumbnail_url, bunny_video_id")
      .in("post_id", [...new Set(postIds)])
      .order("display_order", { ascending: true });

    for (const m of mediaRows ?? []) {
      if (m.post_id in postThumbMap) continue;
      if (m.media_type === "video" && m.bunny_video_id) {
        postThumbMap[m.post_id] = getBunnyStreamUrls(m.bunny_video_id).thumbnailUrl;
      } else {
        const rawUrl = m.thumbnail_url ?? m.file_url;
        const path   = rawUrl ? extractPath(rawUrl) : null;
        postThumbMap[m.post_id] = path ? signBunnyUrl(path) : null;
      }
    }
  }

  // ── Fresh signed thumbnails for stories ───────────────────────────────────
  const storyThumbMap: Record<number, string | null> = {};

  if (storyIds.length > 0) {
    const { data: storyRows } = await supabase
      .from("stories")
      .select("id, media_type, media_url, thumbnail_url, bunny_video_id")
      .in("id", [...new Set(storyIds)]);

    for (const s of storyRows ?? []) {
      if (s.media_type === "video" && s.bunny_video_id) {
        storyThumbMap[s.id] = signBunnyStoryThumbnail(s.bunny_video_id);
      } else {
        const rawUrl = s.thumbnail_url ?? s.media_url;
        const path   = rawUrl ? extractPath(rawUrl) : null;
        storyThumbMap[s.id] = path ? signBunnyUrl(path) : null;
      }
    }
  }

  // ── Build response ────────────────────────────────────────────────────────
  const notifications: NotificationItem[] = rows.map((row) => {
    let referenceId = row.reference_id ?? null;

    const ref = parseRef(row.reference_id);
    if (ref) {
      let postId: number | null = null;
      let thumbnail: string | null = null;

      if (ref.kind === "post") {
        postId    = ref.id;
        thumbnail = postThumbMap[postId] ?? null;
        const postMeta = postContentMap[postId] ?? null;
        referenceId = JSON.stringify({ kind: "post", id: postId, thumbnail, content_type: postMeta?.content_type ?? null, text_background: postMeta?.text_background ?? null, caption: postMeta?.caption ?? null });
      } else if (ref.kind === "poll") {
        postId    = ref.id;
        thumbnail = postThumbMap[postId] ?? null;
        referenceId = JSON.stringify({ kind: "poll", id: postId, question: ref.question ?? null, thumbnail });
      } else if (ref.kind === "story") {
        thumbnail = storyThumbMap[ref.id] ?? null;
        referenceId = JSON.stringify({ kind: "story", id: ref.id, thumbnail });
      } else if (ref.kind === "tip") {
        postId    = tipPostMap[ref.id] ?? null;
        thumbnail = postId ? (postThumbMap[postId] ?? null) : null;
        referenceId = JSON.stringify({ kind: "post", id: postId, thumbnail });
      }
    }

    return {
      id:          row.id,
      type:        row.type         as NotificationType,
      role:        row.role         as NotificationRole,
      actorName:   row.actor_name   ?? "",
      actorAvatar: row.actor_avatar ?? null,
      actorHandle: row.actor_handle ?? "",
      bodyText:    row.body_text,
      subText:     row.sub_text     ?? "",
      createdAt:   row.created_at,
      isUnread:    !row.is_read,
      referenceId,
    };
  });

  const nextCursor =
    notifications.length === limit
      ? notifications[notifications.length - 1].createdAt
      : null;

  return NextResponse.json({ notifications, nextCursor });
}