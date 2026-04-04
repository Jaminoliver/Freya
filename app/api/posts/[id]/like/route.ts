import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }   = await params;
    const postId   = Number(id);
    if (isNaN(postId)) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceSupabaseClient();

    const { data: existing } = await service
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();

    const { data: post } = await service
      .from("posts")
      .select("like_count")
      .eq("id", postId)
      .single();

    const currentCount = post?.like_count ?? 0;

    if (existing) {
      await service.from("likes").delete().eq("id", existing.id);
      await service.from("posts").update({ like_count: Math.max(0, currentCount - 1) }).eq("id", postId);
    } else {
      await service.from("likes").insert({ user_id: user.id, post_id: postId });
      await service.from("posts").update({ like_count: currentCount + 1 }).eq("id", postId);
      // Notification handled by DB trigger: handle_post_like_notification
    }

    const { data: updated } = await service.from("posts").select("like_count").eq("id", postId).single();

    return NextResponse.json({
      liked:      !existing,
      like_count: updated?.like_count ?? 0,
    });

  } catch (err) {
    console.error("[Like Post] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}