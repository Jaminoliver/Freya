import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;
    const postId   = Number(id);
    const parentId = Number(commentId);

    console.log(`[Replies GET] postId=${postId} parentId=${parentId}`);

    if (isNaN(postId) || isNaN(parentId)) {
      console.error(`[Replies GET] Invalid IDs — postId=${id} commentId=${commentId}`);
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const service = createServiceSupabaseClient();

    const { data: replies, error } = await service
      .from("comments")
      .select(`
        id,
        content,
        gif_url,
        created_at,
        like_count,
        parent_comment_id,
        reply_to_username,
        reply_to_id,
        user_id,
        profiles!user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .eq("parent_comment_id", parentId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Replies GET] Supabase error:", error.message, error.details);
      return NextResponse.json({ error: "Failed to fetch replies" }, { status: 500 });
    }

    console.log(`[Replies GET] Found ${replies?.length ?? 0} replies`);

    let likedIds = new Set<number>();
    if (user && replies && replies.length > 0) {
      const replyIds = replies.map((r) => r.id);
      const { data: likes, error: likesError } = await service
        .from("comment_likes")
        .select("comment_id")
        .eq("user_id", user.id)
        .in("comment_id", replyIds);

      if (likesError) console.error("[Replies GET] Likes error:", likesError.message);
      else likedIds = new Set(likes?.map((l) => l.comment_id) ?? []);
    }

    const enriched = (replies ?? []).map((r) => ({
      ...r,
      viewer_has_liked: likedIds.has(r.id),
    }));

    return NextResponse.json({ replies: enriched });

  } catch (err) {
    console.error("[Replies GET] Unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}