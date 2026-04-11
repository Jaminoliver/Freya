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

    // Check for existing like
    const { data: existing } = await service
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();

    // Get post (for like_count + creator_id)
    const { data: post } = await service
      .from("posts")
      .select("like_count, creator_id")
      .eq("id", postId)
      .single();

    const currentPostLikes = post?.like_count ?? 0;
    const creatorId        = post?.creator_id ?? null;

    // Get current profile likes_count
    let currentProfileLikes = 0;
    if (creatorId) {
      const { data: profile } = await service
        .from("profiles")
        .select("likes_count")
        .eq("id", creatorId)
        .single();
      currentProfileLikes = profile?.likes_count ?? 0;
    }

    if (existing) {
      // Unlike
      await service.from("likes").delete().eq("id", existing.id);
      await service.from("posts").update({ like_count: Math.max(0, currentPostLikes - 1) }).eq("id", postId);
      if (creatorId) {
        await service.from("profiles").update({ likes_count: Math.max(0, currentProfileLikes - 1) }).eq("id", creatorId);
      }
    } else {
      // Like
      await service.from("likes").insert({ user_id: user.id, post_id: postId });
      await service.from("posts").update({ like_count: currentPostLikes + 1 }).eq("id", postId);
      if (creatorId) {
        await service.from("profiles").update({ likes_count: currentProfileLikes + 1 }).eq("id", creatorId);
      }
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