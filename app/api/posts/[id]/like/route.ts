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

    // Check if already liked
    const { data: existing } = await service
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();

    if (existing) {
      // Unlike
      await service.from("likes").delete().eq("id", existing.id);
      await service
        .from("posts")
        .update({ like_count: service.rpc("decrement", { x: 1 }) })
        .eq("id", postId);

      // Manually decrement since rpc chaining doesn't work inline
      await service.rpc("decrement_like_count", { post_id: postId });

      return NextResponse.json({ liked: false });
    } else {
      // Like
      await service.from("likes").insert({ user_id: user.id, post_id: postId });
      await service.rpc("increment_like_count", { post_id: postId });

      return NextResponse.json({ liked: true });
    }

  } catch (err) {
    console.error("[Like Post] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}