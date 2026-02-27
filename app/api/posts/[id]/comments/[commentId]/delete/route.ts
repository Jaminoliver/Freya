import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const commentIdNum  = Number(commentId);
    if (isNaN(commentIdNum)) return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceSupabaseClient();

    const { data: comment } = await service
      .from("comments")
      .select("id, user_id, post_id")
      .eq("id", commentIdNum)
      .maybeSingle();

    if (!comment || comment.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await service
      .from("comments")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", commentIdNum);

    await service.rpc("decrement_comment_count", { post_id: comment.post_id });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Delete Comment] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}