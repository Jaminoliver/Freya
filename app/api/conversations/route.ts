import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("conversations")
    .select(`
      id,
      creator_id,
      fan_id,
      last_message_at,
      last_message_preview,
      unread_count_creator,
      unread_count_fan,
      deleted_for_creator,
      deleted_for_fan,
      deleted_before_creator,
      deleted_before_fan,
      creator:profiles!conversations_creator_id_fkey (
        id, username, display_name, avatar_url, is_verified, role
      ),
      fan:profiles!conversations_fan_id_fkey (
        id, username, display_name, avatar_url, is_verified, role
      )
    `)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .eq("is_blocked", false)
    .eq("is_restricted", false)
    .order("last_message_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const conversations = (data ?? [])
    .filter((row: any) => {
      const isCreator = row.creator_id === user.id;
      if (isCreator && row.deleted_for_creator) return false;
      if (!isCreator && row.deleted_for_fan)    return false;
      return true;
    })
    .map((row: any) => {
      const isCreator   = row.creator_id === user.id;
      const participant = isCreator ? row.fan : row.creator;
      const unreadCount = isCreator ? row.unread_count_creator : row.unread_count_fan;

      return {
        id:          row.id,
        participant: {
          id:         participant.id,
          name:       participant.display_name ?? participant.username,
          username:   participant.username,
          avatarUrl:  participant.avatar_url ?? null,
          isVerified: participant.is_verified ?? false,
          isOnline:   false,
          role:       participant.role ?? "fan",
        },
        lastMessage:   row.last_message_preview ?? "",
        lastMessageAt: row.last_message_at ?? "",
        unreadCount:   unreadCount ?? 0,
        hasMedia:      false,
      };
    });

  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { targetUserId } = body;

  if (!targetUserId) {
    return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
  }

  if (targetUserId === user.id) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, role")
    .in("id", [user.id, targetUserId]);

  if (profilesError || !profiles || profiles.length < 2) {
    return NextResponse.json({ error: "Could not resolve user roles" }, { status: 500 });
  }

  const currentUserProfile = profiles.find((p) => p.id === user.id);
  const targetUserProfile  = profiles.find((p) => p.id === targetUserId);

  if (!currentUserProfile || !targetUserProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let creatorId: string;
  let fanId:     string;

  if (currentUserProfile.role === "creator" && targetUserProfile.role === "fan") {
    creatorId = user.id;
    fanId     = targetUserId;
  } else if (currentUserProfile.role === "fan" && targetUserProfile.role === "creator") {
    creatorId = targetUserId;
    fanId     = user.id;
  } else if (currentUserProfile.role === "creator" && targetUserProfile.role === "creator") {
    creatorId = user.id < targetUserId ? user.id : targetUserId;
    fanId     = user.id < targetUserId ? targetUserId : user.id;
  } else {
    creatorId = user.id < targetUserId ? user.id : targetUserId;
    fanId     = user.id < targetUserId ? targetUserId : user.id;
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("creator_id", creatorId)
    .eq("fan_id", fanId)
    .maybeSingle();

  if (existing) {
    const isCreator = creatorId === user.id;
    const field     = isCreator ? "deleted_for_creator" : "deleted_for_fan";
    await supabase
      .from("conversations")
      .update({ [field]: false, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    return NextResponse.json({ conversationId: existing.id });
  }

  const { data: created, error: createError } = await supabase
    .from("conversations")
    .insert({ creator_id: creatorId, fan_id: fanId })
    .select("id")
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json({ conversationId: created.id }, { status: 201 });
}