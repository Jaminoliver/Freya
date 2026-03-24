import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conversationId = Number(id);
  if (!conversationId) {
    return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user is part of this conversation
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, creator_id, fan_id")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .maybeSingle();

  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Check if settings row exists
  const { data: existing } = await supabase
    .from("conversation_user_settings")
    .select("id, is_muted")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("conversation_user_settings")
      .update({ is_muted: !existing.is_muted, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ isMuted: !existing.is_muted });
  }

  // Insert new row with is_muted = true
  const { error } = await supabase
    .from("conversation_user_settings")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      is_muted: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ isMuted: true });
}