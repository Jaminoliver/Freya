import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all user's list IDs
  const { data: lists, error: listsError } = await supabase
    .from("favourite_chat_lists")
    .select("id")
    .eq("user_id", user.id);

  if (listsError) return NextResponse.json({ error: listsError.message }, { status: 500 });
  if (!lists || lists.length === 0) return NextResponse.json({ conversationIds: [] });

  const listIds = lists.map((l) => l.id);

  // Get all unique conversation IDs across all lists
  const { data: items, error: itemsError } = await supabase
    .from("favourite_chat_list_items")
    .select("conversation_id")
    .in("list_id", listIds);

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  const conversationIds = [...new Set((items ?? []).map((i) => i.conversation_id))];

  return NextResponse.json({ conversationIds });
}