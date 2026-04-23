import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversationId = parseInt(id, 10);
  if (isNaN(conversationId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  // Verify user is part of conversation
  const { data: convo } = await supabase
    .from("conversations")
    .select("id, creator_id, fan_id")
    .eq("id", conversationId)
    .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`)
    .single();

  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const isCreator = convo.creator_id === user.id;
  const now = new Date().toISOString();

  // Set deleted_before timestamp so messages before now are hidden
  // but do NOT set deleted_for flag — conversation stays in sidebar
  const beforeField = isCreator ? "deleted_before_creator" : "deleted_before_fan";

  const { error } = await supabase
    .from("conversations")
    .update({
      [beforeField]: now,
      updated_at: now,
    })
    .eq("id", conversationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, clearedAt: now });
}