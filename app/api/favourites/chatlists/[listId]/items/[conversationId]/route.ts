import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ listId: string; conversationId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { listId, conversationId } = await params;
  const convId = parseInt(conversationId, 10);
  if (isNaN(convId)) return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });

  // Verify list ownership
  const { data: list } = await supabase
    .from("favourite_chat_lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  const { error } = await supabase
    .from("favourite_chat_list_items")
    .delete()
    .eq("list_id", listId)
    .eq("conversation_id", convId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}