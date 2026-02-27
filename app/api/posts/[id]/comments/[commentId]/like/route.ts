import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(
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

    const { data: existing } = await service
      .from("comment_likes")
      .select("id")
      .eq("comment_id", commentIdNum)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await service.from("comment_likes").delete().eq("id", existing.id);
      const { data: comment } = await service.from("comments").select("like_count").eq("id", commentIdNum).single();
      await service.from("comments").update({ like_count: Math.max((comment?.like_count ?? 1) - 1, 0) }).eq("id", commentIdNum);
      return NextResponse.json({ liked: false });
    } else {
      await service.from("comment_likes").insert({ comment_id: commentIdNum, user_id: user.id });
      const { data: comment } = await service.from("comments").select("like_count").eq("id", commentIdNum).single();
      await service.from("comments").update({ like_count: (comment?.like_count ?? 0) + 1 }).eq("id", commentIdNum);
      return NextResponse.json({ liked: true });
    }
  } catch (err) {
    console.error("[Comment Like] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}