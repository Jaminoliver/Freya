import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }       = await params;
    const commentId    = Number(id);
    if (isNaN(commentId)) return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceSupabaseClient();

    // Verify ownership
    const { data: comment } = await service
      .from("comments")
      .select("id, user_id, post_id")
      .eq("id", commentId)
      .maybeSingle();

    if (!comment || comment.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Soft delete
    await service
      .from("comments")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", commentId);

    // Decrement comment_count on post
    await service.rpc("decrement_comment_count", { post_id: comment.post_id });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[Delete Comment] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}