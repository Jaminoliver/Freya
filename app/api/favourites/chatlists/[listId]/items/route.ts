import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { listId } = await params;

  // Verify list ownership
  const { data: list } = await supabase
    .from("favourite_chat_lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const conversationId = parseInt(body.conversationId, 10);
  if (isNaN(conversationId)) return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });

  // Verify user is part of the conversation
  const { data: convo } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .maybeSingle();

  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  // Insert (unique constraint handles duplicates)
  const { data, error } = await supabase
    .from("favourite_chat_list_items")
    .insert({ list_id: listId, conversation_id: conversationId })
    .select("id, list_id, conversation_id, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already in this list" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data }, { status: 201 });
}