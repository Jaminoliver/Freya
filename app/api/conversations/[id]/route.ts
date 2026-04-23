import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
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

  const { data: row, error } = await supabase
    .from("conversations")
    .select(
      `
      id,
      created_at,
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
      ),
      conversation_user_settings (
        user_id, is_pinned, is_archived, is_muted
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
  const deletedBefore = isCreator ? row.deleted_before_creator : row.deleted_before_fan;
  const settings    = ((row as any).conversation_user_settings ?? []).find(
    (s: any) => s.user_id === user.id
  );

  // Per-user view: if I cleared after the last message, hide the preview
  // and use my clear time as the sort key so the convo keeps its moved-up spot
  const lastAt = row.last_message_at ?? null;
  const clearedAfterLastMessage =
    deletedBefore && (!lastAt || new Date(deletedBefore) >= new Date(lastAt));

  const viewLastMessage   = clearedAfterLastMessage ? "" : (row.last_message_preview ?? "");
  const viewLastMessageAt = clearedAfterLastMessage ? deletedBefore : (lastAt ?? "");

  return NextResponse.json({
    conversation: {
      id: row.id,
      createdAt: (row as any).created_at,
      participant: {
        id:         participant.id,
        name:       participant.display_name ?? participant.username,
        username:   participant.username,
        avatarUrl:  participant.avatar_url ?? null,
        isVerified: participant.is_verified ?? false,
        isOnline:   false,
      },
      lastMessage:    viewLastMessage,
      lastMessageAt:  viewLastMessageAt,
      unreadCount:    unreadCount ?? 0,
      hasMedia:       false,
      isBlocked:      row.is_blocked,
      isRestricted:   row.is_restricted,
      isPinned:       settings?.is_pinned   ?? false,
      isArchived:     settings?.is_archived  ?? false,
      isMuted:        settings?.is_muted     ?? false,
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