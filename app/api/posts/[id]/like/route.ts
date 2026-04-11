import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    if (isNaN(postId)) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceSupabaseClient();

    // Get creator_id for this post
    const { data: post, error: postErr } = await service
      .from("posts")
      .select("creator_id")
      .eq("id", postId)
      .single();

    if (postErr || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check for existing like
    const { data: existing } = await service
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();

    if (existing) {
      // Unlike — delete row (trigger updates posts.like_count)
      await service.from("likes").delete().eq("id", existing.id);

      // Atomically decrement profiles.likes_count
      if (post.creator_id) {
        await service.rpc("decrement_profile_likes", { p_creator_id: post.creator_id });
      }
    } else {
      // Like — insert row (trigger updates posts.like_count, notification trigger fires)
      const { error: insertErr } = await service
        .from("likes")
        .insert({ user_id: user.id, post_id: postId });

      if (insertErr) {
        console.error("[Like Post] Insert error:", insertErr);
        return NextResponse.json({ error: "Failed to like" }, { status: 500 });
      }

      // Atomically increment profiles.likes_count
      if (post.creator_id) {
        await service.rpc("increment_profile_likes", { p_creator_id: post.creator_id });
      }
    }

    // Read like_count AFTER trigger has fired
    const { data: updated } = await service
      .from("posts")
      .select("like_count")
      .eq("id", postId)
      .single();

    return NextResponse.json({
      liked: !existing,
      like_count: updated?.like_count ?? 0,
    });
  } catch (err) {
    console.error("[Like Post] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}