import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { listId } = await params;

  // Verify ownership
  const { data: list } = await supabase
    .from("favourite_chat_lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  // Items cascade-delete via FK, just delete the list
  const { error } = await supabase
    .from("favourite_chat_lists")
    .delete()
    .eq("id", listId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}