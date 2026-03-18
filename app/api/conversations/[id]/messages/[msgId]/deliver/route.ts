import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, msgId: msgIdParam } = await params;
  const conversationId = parseInt(id, 10);
  const msgId          = parseInt(msgIdParam, 10);

  if (isNaN(conversationId) || isNaN(msgId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Only the receiver can mark as delivered
  const { error } = await supabase
    .from("messages")
    .update({ is_delivered: true })
    .eq("id", msgId)
    .eq("conversation_id", conversationId)
    .eq("receiver_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}