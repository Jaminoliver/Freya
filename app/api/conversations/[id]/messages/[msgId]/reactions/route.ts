import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, msgId } = await params;
  const conversationId = parseInt(id, 10);
  const messageId      = parseInt(msgId, 10);
  if (isNaN(conversationId) || isNaN(messageId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data: convo } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { emoji } = body;
  if (!emoji) return NextResponse.json({ error: "emoji required" }, { status: 400 });

  // Remove existing reaction from this user on this message first
  await supabase
    .from("message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", user.id);

  const { error } = await supabase
    .from("message_reactions")
    .insert({ message_id: messageId, user_id: user.id, emoji });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, msgId } = await params;
  const conversationId = parseInt(id, 10);
  const messageId      = parseInt(msgId, 10);
  if (isNaN(conversationId) || isNaN(messageId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data: convo } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase
    .from("message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}