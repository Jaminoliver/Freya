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
    .select("id, creator_id, fan_id")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = 40;

  let query = supabase
    .from("messages")
    // ✅ Added reply_to_id to select
    .select("id, conversation_id, sender_id, receiver_id, content, is_ppv, ppv_price, is_unlocked, media_type, media_url, thumbnail_url, is_read, created_at, reply_to_id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const messages = (data ?? []).reverse().map((row) => {
    const base = {
      id:             row.id,
      conversationId: row.conversation_id,
      senderId:       row.sender_id,
      createdAt:      row.created_at,
      isRead:         row.is_read ?? false,
      replyToId:      row.reply_to_id ?? null, // ✅ mapped
    };

    if (row.is_ppv) {
      return {
        ...base,
        type: "ppv" as const,
        text: row.content ?? undefined,
        mediaUrls: row.media_url ? [row.media_url] : [],
        thumbnailUrl: row.thumbnail_url ?? null,
        ppv: {
          price: row.ppv_price ?? 0,
          isUnlocked: row.is_unlocked ?? false,
          unlockedCount: 0,
        },
      };
    }

    if (row.media_type) {
      return {
        ...base,
        type: "media" as const,
        text: row.content ?? undefined,
        mediaUrls: row.media_url ? [row.media_url] : [],
        thumbnailUrl: row.thumbnail_url ?? null,
      };
    }

    return {
      ...base,
      type: "text" as const,
      text: row.content ?? "",
    };
  });

  const nextCursor =
    data && data.length === limit ? data[0].created_at : null;

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
  const { content, reply_to_id } = body; // ✅ extract reply_to_id

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const receiverId =
    convo.creator_id === user.id ? convo.fan_id : convo.creator_id;

  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id:       user.id,
      receiver_id:     receiverId,
      content:         content.trim(),
      is_ppv:          false,
      is_unlocked:     true,
      reply_to_id:     reply_to_id ?? null, // ✅ save reply_to_id
    })
    // ✅ Added reply_to_id to select
    .select("id, conversation_id, sender_id, content, created_at, reply_to_id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const isCreatorSending = convo.creator_id === user.id;
  const unreadField = isCreatorSending ? "unread_count_fan" : "unread_count_creator";

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
      replyToId:      message.reply_to_id ?? null, // ✅ return to client
    },
  }, { status: 201 });
}