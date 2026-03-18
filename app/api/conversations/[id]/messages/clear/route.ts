import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

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

  const isCreator   = convo.creator_id === user.id;
  const now         = new Date().toISOString();
  const beforeField = isCreator ? "deleted_before_creator" : "deleted_before_fan";

  // Just record the cutoff timestamp — messages before this won't show for current user
  await supabase
    .from("conversations")
    .update({ [beforeField]: now, updated_at: now })
    .eq("id", conversationId);

  return NextResponse.json({ success: true });
}