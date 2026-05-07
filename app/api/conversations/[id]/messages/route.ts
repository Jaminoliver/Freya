// app/api/conversations/[id]/messages/route.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient, getUser } from "@/lib/supabase/server";
import { signBunnyUrl } from "@/lib/utils/bunny";

function refreshBunnyUrl(storedUrl: string | null): string | null {
  if (!storedUrl) return null;
  try {
    const url  = new URL(storedUrl);
    const path = url.pathname;
    return signBunnyUrl(path);
  } catch {
    return storedUrl;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const conversationId = parseInt(id, 10);

  if (isNaN(conversationId)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, creator_id, fan_id, deleted_before_creator, deleted_before_fan, deleted_for_creator, deleted_for_fan")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit  = cursor ? 40 : 25;

  const isCreator   = convo.creator_id === user.id;
  const deleteField = isCreator ? "deleted_for_creator" : "deleted_for_fan";

  let query = supabase
    .from("messages")
    .select("id, conversation_id, sender_id, receiver_id, content, is_ppv, ppv_price, is_unlocked, is_tip, tip_id, gif_url, media_type, media_url, thumbnail_url, is_read, is_delivered, created_at, reply_to_id, reply_to_media_index, deleted_for_creator, deleted_for_fan, is_deleted_for_everyone, story_reply_story_id, story_reply_thumbnail_url, audio_url, audio_duration, audio_peaks")
    .eq("conversation_id", conversationId)
    .eq(deleteField, false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];

 const messageIds    = rows.map((r) => r.id);
  const ppvMessageIds = rows.filter((r) => r.is_ppv).map((r) => r.id);
  const tipIds        = rows.filter((r) => r.is_tip && r.tip_id).map((r) => r.tip_id as number);

  const [mediaResult, ppvResult, tipResult, reactionsResult] = await Promise.all([
    messageIds.length > 0
      ? supabase.from("message_media")
          .select("message_id, url, thumbnail_url, media_type, display_order")
          .in("message_id", messageIds)
          .order("display_order", { ascending: true })
      : Promise.resolve({ data: [] }),
    ppvMessageIds.length > 0
      ? supabase.from("ppv_message_unlocks")
          .select("message_id, fan_id")
          .in("message_id", ppvMessageIds)
      : Promise.resolve({ data: [] }),
    tipIds.length > 0
      ? supabase.from("tips")
          .select("id, amount")
          .in("id", tipIds)
      : Promise.resolve({ data: [] }),
    messageIds.length > 0
      ? supabase.from("message_reactions")
          .select("message_id, user_id, emoji")
          .in("message_id", messageIds)
      : Promise.resolve({ data: [] }),
  ]);

  const mediaByMessageId = new Map<number, { url: string; thumbnail_url: string | null; media_type: string }[]>();
  for (const m of mediaResult.data ?? []) {
    if (!mediaByMessageId.has(m.message_id)) mediaByMessageId.set(m.message_id, []);
    mediaByMessageId.get(m.message_id)!.push({
      ...m,
      url:           m.url.includes("b-cdn.net") && !m.url.includes("freya-media-cdn") ? m.url : (refreshBunnyUrl(m.url) ?? m.url),
      thumbnail_url: m.thumbnail_url?.includes("b-cdn.net") && !m.thumbnail_url.includes("freya-media-cdn") ? m.thumbnail_url : refreshBunnyUrl(m.thumbnail_url),
    });
  }

  const unlockedByCurrentUser  = new Set<number>();
  const unlockCountByMessageId = new Map<number, number>();
  for (const u of ppvResult.data ?? []) {
    if (u.fan_id === user.id) unlockedByCurrentUser.add(u.message_id);
    unlockCountByMessageId.set(u.message_id, (unlockCountByMessageId.get(u.message_id) ?? 0) + 1);
  }

  const tipById = new Map<number, { amount: number }>();
  for (const t of tipResult.data ?? []) {
    tipById.set(t.id, { amount: t.amount });
  }

  const reactionsByMessageId = new Map<number, { emoji: string; count: number; reactedByMe: boolean }[]>();
  for (const r of reactionsResult.data ?? []) {
    if (!reactionsByMessageId.has(r.message_id)) reactionsByMessageId.set(r.message_id, []);
    const arr = reactionsByMessageId.get(r.message_id)!;
    const hit = arr.find((x) => x.emoji === r.emoji);
    if (hit) { hit.count++; if (r.user_id === user.id) hit.reactedByMe = true; }
    else arr.push({ emoji: r.emoji, count: 1, reactedByMe: r.user_id === user.id });
  }

  const deletedBefore = isCreator ? (convo as any).deleted_before_creator : (convo as any).deleted_before_fan;

  const visibleRows = rows.filter((row) => {
    if (deletedBefore && new Date(row.created_at) <= new Date(deletedBefore)) return false;
    return true;
  });

  const messages = visibleRows.reverse().map((row) => {
    if (row.is_deleted_for_everyone) {
      return {
        id:             row.id,
        conversationId: row.conversation_id,
        senderId:       row.sender_id,
        createdAt:      row.created_at,
        isRead:         row.is_read ?? false,
        isDelivered:    row.is_delivered ?? false,
        replyToId:      null,
        type:           "text" as const,
        text:           "This message was deleted",
        isDeleted:      true,
      };
    }

    const base = {
      id:                     row.id,
      conversationId:         row.conversation_id,
      senderId:               row.sender_id,
      createdAt:              row.created_at,
      isRead:                 row.is_read      ?? false,
      isDelivered:            row.is_delivered ?? false,
      replyToId:              row.reply_to_id        ?? null,
      replyToMediaIndex:      row.reply_to_media_index ?? 0,
      storyReplyStoryId:      row.story_reply_story_id      ?? null,
      storyReplyThumbnailUrl: row.story_reply_thumbnail_url ?? null,
      reactions:              reactionsByMessageId.get(row.id) ?? [],
    };

    // ── Voice bubble ────────────────────────────────────────────────────────
    if (row.audio_url) {
      return {
        ...base,
        type:          "voice" as const,
        audioUrl:      row.audio_url,
        audioDuration: row.audio_duration ?? 0,
        audioPeaks:    row.audio_peaks    ?? [],
      };
    }

    // ── GIF bubble ─────────────────────────────────────────────────────────
    if (row.gif_url) {
      return { ...base, type: "gif" as const, gifUrl: row.gif_url };
    }

    // ── Tip bubble ─────────────────────────────────────────────────────────
    if (row.is_tip && row.tip_id) {
      const tip = tipById.get(row.tip_id);
      return {
        ...base,
        type: "tip" as const,
        tip: {
          amount: tip?.amount ?? 0,
          tipId:  row.tip_id,
        },
      };
    }

    const mediaRows = mediaByMessageId.get(row.id) ?? [];
    const mediaUrls = mediaRows.length > 0
      ? mediaRows.map((m) => m.url)
      : row.media_url ? [refreshBunnyUrl(row.media_url) ?? row.media_url] : [];

    const thumbUrl = mediaRows[0]?.thumbnail_url ?? refreshBunnyUrl(row.thumbnail_url) ?? null;

    if (row.is_ppv) {
      const isSender      = row.sender_id === user.id;
      const isUnlocked    = isSender || unlockedByCurrentUser.has(row.id);
      const unlockedCount = unlockCountByMessageId.get(row.id) ?? 0;
      return {
        ...base,
        type:         "ppv" as const,
        text:         row.content ?? undefined,
        mediaUrls:    isUnlocked ? mediaUrls : [],
        thumbnailUrl: thumbUrl,
        ppv: { price: row.ppv_price ?? 0, isUnlocked, unlockedCount },
      };
    }

    if (row.media_type || mediaUrls.length > 0) {
      return {
        ...base,
        type:         "media" as const,
        text:         row.content ?? undefined,
        mediaUrls,
        thumbnailUrl: thumbUrl,
      };
    }

    return {
      ...base,
      type: "text" as const,
      text: row.content ?? "",
    };
  });

  const nextCursor = rows.length === limit && visibleRows.length > 0 ? rows[rows.length - 1].created_at : null;
  return NextResponse.json({ messages, nextCursor });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const conversationId = parseInt(id, 10);

  if (isNaN(conversationId)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, creator_id, fan_id, is_blocked")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  if (convo.is_blocked) return NextResponse.json({ error: "Conversation is blocked" }, { status: 403 });

  const body = await request.json();
  const {
    content,
    reply_to_id,
    story_reply_story_id,
    story_reply_thumbnail_url,
    gif_url,
  } = body;

  const hasContent = typeof content === "string" && content.trim().length > 0;
  const hasGif     = typeof gif_url === "string" && gif_url.length > 0;

  if (!hasContent && !hasGif) {
    return NextResponse.json({ error: "Content or gif_url is required" }, { status: 400 });
  }

  const receiverId       = convo.creator_id === user.id ? convo.fan_id : convo.creator_id;
  const isCreatorSending = convo.creator_id === user.id;

  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id:           conversationId,
      sender_id:                 user.id,
      receiver_id:               receiverId,
      content:                   hasContent ? content.trim() : null,
      is_ppv:                    false,
      is_unlocked:               true,
      gif_url:                   hasGif ? gif_url : null,
      reply_to_id:               reply_to_id               ?? null,
      reply_to_media_index:      body.reply_to_media_index ?? 0,
      story_reply_story_id:      story_reply_story_id      ?? null,
      story_reply_thumbnail_url: story_reply_thumbnail_url ?? null,
    })
    .select("id, conversation_id, sender_id, content, gif_url, created_at, reply_to_id, reply_to_media_index, story_reply_story_id, story_reply_thumbnail_url")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const unreadField  = isCreatorSending ? "unread_count_fan"    : "unread_count_creator";
  const restoreField = isCreatorSending ? "deleted_for_fan"     : "deleted_for_creator";

  await supabase.from("conversations").update({ [restoreField]: false, updated_at: new Date().toISOString() }).eq("id", conversationId);
  await supabase.rpc("increment_unread_count", { p_conversation_id: conversationId, p_field: unreadField });
  await supabase.from("conversations").update({ last_message_preview: hasGif ? "🎞️ GIF" : content.trim().slice(0, 100), last_message_at: message.created_at, updated_at: new Date().toISOString() }).eq("id", conversationId);

  // Notification
  try {
    const { data: senderProfile, error: profileError } = await supabase.from("profiles").select("display_name, username, avatar_url").eq("id", user.id).single();
    if (profileError) console.error("[notifications] profile fetch failed:", profileError.message);
    const serviceSupabase = createServiceSupabaseClient();
    const receiverRole    = isCreatorSending ? "fan" : "creator";
    const { error: notifInsertError } = await serviceSupabase.from("notifications").insert({
      user_id:      receiverId,
      type:         "message",
      role:         receiverRole,
      actor_id:     user.id,
      actor_name:   senderProfile?.display_name ?? senderProfile?.username ?? "Someone",
      actor_handle: senderProfile?.username ?? "",
      actor_avatar: senderProfile?.avatar_url ?? null,
      body_text:    "sent you a message",
      sub_text:     hasGif ? "🎞️ GIF" : content.trim().slice(0, 80),
      reference_id: conversationId.toString(),
      is_read:      false,
    });
    if (notifInsertError) console.error("[notifications] insert failed:", notifInsertError.message);
  } catch (notifError) {
    console.error("[notifications] unexpected error:", notifError);
  }

  if (hasGif) {
    return NextResponse.json({
      message: {
        id:             message.id,
        conversationId: message.conversation_id,
        senderId:       message.sender_id,
        type:           "gif",
        gifUrl:         message.gif_url,
        createdAt:      message.created_at,
        replyToId:         message.reply_to_id          ?? null,
        replyToMediaIndex: message.reply_to_media_index ?? 0,
      },
    }, { status: 201 });
  }

  return NextResponse.json({
    message: {
      id:                     message.id,
      conversationId:         message.conversation_id,
      senderId:               message.sender_id,
      type:                   "text",
      text:                   message.content,
      createdAt:              message.created_at,
      replyToId:              message.reply_to_id              ?? null,
      replyToMediaIndex:      message.reply_to_media_index     ?? 0,
      storyReplyStoryId:      message.story_reply_story_id      ?? null,
      storyReplyThumbnailUrl: message.story_reply_thumbnail_url ?? null,
    },
  }, { status: 201 });
}