import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;
  const convId = parseInt(conversationId, 10);
  if (isNaN(convId)) return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });

  // Get all user's list IDs
  const { data: lists } = await supabase
    .from("favourite_chat_lists")
    .select("id")
    .eq("user_id", user.id);

  if (!lists || lists.length === 0) return NextResponse.json({ success: true });

  const listIds = lists.map((l) => l.id);

  // Remove conversation from all user's lists
  const { error } = await supabase
    .from("favourite_chat_list_items")
    .delete()
    .eq("conversation_id", convId)
    .in("list_id", listIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}