import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

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

  // 25 on initial load (no cursor), 40 on subsequent load-more (has cursor)
  const limit = cursor ? 40 : 25;

  const isCreator   = convo.creator_id === user.id;
  const deleteField = isCreator ? "deleted_for_creator" : "deleted_for_fan";

  let query = supabase
    .from("messages")
    .select("id, conversation_id, sender_id, receiver_id, content, is_ppv, ppv_price, is_unlocked, media_type, media_url, thumbnail_url, is_read, is_delivered, created_at, reply_to_id, deleted_for_creator, deleted_for_fan, is_deleted_for_everyone")
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

  // Fetch message_media for multi-file support
  let mediaByMessageId = new Map<number, { url: string; thumbnail_url: string | null; media_type: string }[]>();
  if (rows.length > 0) {
    const messageIds = rows.map((r) => r.id);
    const { data: allMedia } = await supabase
      .from("message_media")
      .select("message_id, url, thumbnail_url, media_type, display_order")
      .in("message_id", messageIds)
      .order("display_order", { ascending: true });

    for (const m of allMedia ?? []) {
      if (!mediaByMessageId.has(m.message_id)) mediaByMessageId.set(m.message_id, []);
      mediaByMessageId.get(m.message_id)!.push(m);
    }
  }

  // Fetch ppv_unlocks for current user
  let unlockedByCurrentUser  = new Set<number>();
  let unlockCountByMessageId = new Map<number, number>();
  const ppvMessageIds = rows.filter((r) => r.is_ppv).map((r) => r.id);
  if (ppvMessageIds.length > 0) {
    const { data: unlocks } = await supabase
      .from("ppv_unlocks")
      .select("message_id, fan_id")
      .in("message_id", ppvMessageIds);

    for (const u of unlocks ?? []) {
      if (u.fan_id === user.id) unlockedByCurrentUser.add(u.message_id);
      unlockCountByMessageId.set(u.message_id, (unlockCountByMessageId.get(u.message_id) ?? 0) + 1);
    }
  }

  const deletedBefore = isCreator
    ? (convo as any).deleted_before_creator
    : (convo as any).deleted_before_fan;

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
      id:             row.id,
      conversationId: row.conversation_id,
      senderId:       row.sender_id,
      createdAt:      row.created_at,
      isRead:         row.is_read      ?? false,
      isDelivered:    row.is_delivered ?? false,
      replyToId:      row.reply_to_id  ?? null,
    };

    const mediaRows = mediaByMessageId.get(row.id) ?? [];
    const mediaUrls = mediaRows.length > 0
      ? mediaRows.map((m) => m.url)
      : row.media_url ? [row.media_url] : [];

    if (row.is_ppv) {
      const isSender      = row.sender_id === user.id;
      const isUnlocked    = isSender || unlockedByCurrentUser.has(row.id);
      const unlockedCount = unlockCountByMessageId.get(row.id) ?? 0;
      const thumbUrl      = row.thumbnail_url ?? (mediaUrls.length > 0 ? mediaUrls[0] : null);

      return {
        ...base,
        type:         "ppv" as const,
        text:         row.content ?? undefined,
        mediaUrls:    isUnlocked ? mediaUrls : [],
        thumbnailUrl: thumbUrl,
        ppv: {
          price:      row.ppv_price ?? 0,
          isUnlocked,
          unlockedCount,
        },
      };
    }

    if (row.media_type || mediaUrls.length > 0) {
      const thumbUrl = mediaRows[0]?.thumbnail_url ?? row.thumbnail_url ?? null;
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

  const nextCursor = rows.length === limit ? rows[rows.length - 1].created_at : null;

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

  if (!convo) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (convo.is_blocked) {
    return NextResponse.json({ error: "Conversation is blocked" }, { status: 403 });
  }

  const body = await request.json();
  const { content, reply_to_id } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const receiverId = convo.creator_id === user.id ? convo.fan_id : convo.creator_id;

  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id:       user.id,
      receiver_id:     receiverId,
      content:         content.trim(),
      is_ppv:          false,
      is_unlocked:     true,
      reply_to_id:     reply_to_id ?? null,
    })
    .select("id, conversation_id, sender_id, content, created_at, reply_to_id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const isCreatorSending = convo.creator_id === user.id;
  const unreadField      = isCreatorSending ? "unread_count_fan" : "unread_count_creator";

  const restoreField = isCreatorSending ? "deleted_for_fan" : "deleted_for_creator";
  await supabase
    .from("conversations")
    .update({ [restoreField]: false, updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  await supabase.rpc("increment_unread_count", {
    p_conversation_id: conversationId,
    p_field:           unreadField,
  });

  await supabase
    .from("conversations")
    .update({
      last_message_preview: content.trim().slice(0, 100),
      last_message_at:      message.created_at,
      updated_at:           new Date().toISOString(),
    })
    .eq("id", conversationId);

  return NextResponse.json({
    message: {
      id:             message.id,
      conversationId: message.conversation_id,
      senderId:       message.sender_id,
      type:           "text",
      text:           message.content,
      createdAt:      message.created_at,
      replyToId:      message.reply_to_id ?? null,
    },
  }, { status: 201 });
}