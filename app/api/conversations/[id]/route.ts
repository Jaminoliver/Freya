import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const conversationId = parseInt(id, 10);

  if (isNaN(conversationId)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("conversations")
    .select(
      `
      id,
      creator_id,
      fan_id,
      last_message_at,
      last_message_preview,
      unread_count_creator,
      unread_count_fan,
      is_blocked,
      is_restricted,
      deleted_for_creator,
      deleted_for_fan,
      deleted_before_creator,
      deleted_before_fan,
      creator:profiles!conversations_creator_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        is_verified
      ),
      fan:profiles!conversations_fan_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        is_verified
      )
    `
    )
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const isCreator = row.creator_id === user.id;

  // Return 404 if deleted for current user
  if (isCreator && row.deleted_for_creator) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  if (!isCreator && row.deleted_for_fan) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const participant = isCreator ? (row.fan as any) : (row.creator as any);
  const unreadCount = isCreator ? row.unread_count_creator : row.unread_count_fan;

  // Mark messages as read
  await supabase
    .from("messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("receiver_id", user.id)
    .eq("is_read", false);

  // Reset unread count for current user
  const unreadField = isCreator ? "unread_count_creator" : "unread_count_fan";
  await supabase
    .from("conversations")
    .update({ [unreadField]: 0 })
    .eq("id", conversationId);

  return NextResponse.json({
    conversation: {
      id: row.id,
      participant: {
        id:         participant.id,
        name:       participant.display_name ?? participant.username,
        username:   participant.username,
        avatarUrl:  participant.avatar_url ?? null,
        isVerified: participant.is_verified ?? false,
        isOnline:   false,
      },
      lastMessage:    row.last_message_preview ?? "",
      lastMessageAt:  row.last_message_at ?? "",
      unreadCount:    unreadCount ?? 0,
      hasMedia:       false,
      isBlocked:      row.is_blocked,
      isRestricted:   row.is_restricted,
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversationId = parseInt(id, 10);
  if (isNaN(conversationId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, creator_id, fan_id")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body        = await request.json().catch(() => ({}));
  const forEveryone = body.forEveryone === true;
  const isCreator   = convo.creator_id === user.id;

  const now = new Date().toISOString();

  if (forEveryone) {
    await supabase
      .from("conversations")
      .update({
        deleted_for_creator:    true,
        deleted_for_fan:        true,
        deleted_before_creator: now,
        deleted_before_fan:     now,
        updated_at:             now,
      })
      .eq("id", conversationId);
  } else {
    const deletedField = isCreator ? "deleted_for_creator"    : "deleted_for_fan";
    const beforeField  = isCreator ? "deleted_before_creator" : "deleted_before_fan";
    await supabase
      .from("conversations")
      .update({ [deletedField]: true, [beforeField]: now, updated_at: now })
      .eq("id", conversationId);
  }

  return NextResponse.json({ success: true });
}