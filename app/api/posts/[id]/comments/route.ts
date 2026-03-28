import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    if (isNaN(postId)) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const service = createServiceSupabaseClient();

    const { data: comments, error } = await service
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
      .eq("is_deleted", false)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Comments GET] Error:", error.message);
      return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
    }

    const commentIds = (comments ?? []).map((c) => c.id);
    let replyCountMap: Record<number, number> = {};

    if (commentIds.length > 0) {
      const { data: replyCounts, error: replyCountError } = await service
        .from("comments")
        .select("parent_comment_id")
        .in("parent_comment_id", commentIds)
        .eq("is_deleted", false);

      if (replyCountError) {
        console.error("[Comments GET] Reply count error:", replyCountError.message);
      } else {
        (replyCounts ?? []).forEach((r) => {
          const pid = r.parent_comment_id;
          replyCountMap[pid] = (replyCountMap[pid] ?? 0) + 1;
        });
      }
    }

    let likedCommentIds = new Set<number>();
    if (user && commentIds.length > 0) {
      const { data: likes } = await service
        .from("comment_likes")
        .select("comment_id")
        .eq("user_id", user.id)
        .in("comment_id", commentIds);
      if (likes) likedCommentIds = new Set(likes.map((l) => l.comment_id));
    }

    const enriched = (comments ?? []).map((c) => ({
      ...c,
      viewer_has_liked: likedCommentIds.has(c.id),
      reply_count: replyCountMap[c.id] ?? 0,
    }));

    return NextResponse.json({ comments: enriched });

  } catch (err) {
    console.error("[Comments GET] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

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

    const { content, gif_url, parent_comment_id, reply_to_username, reply_to_id } = await req.json();

    console.log(`[Comments POST] postId=${postId} parent=${parent_comment_id ?? "null"} reply_to_username=${reply_to_username ?? "null"}`);

    const hasText = content && content.trim().length > 0;
    const hasGif  = gif_url && gif_url.trim().length > 0;

    if (!hasText && !hasGif)
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    if (hasText && content.length > 1000)
      return NextResponse.json({ error: "Comment too long (max 1000 characters)" }, { status: 400 });

    const service = createServiceSupabaseClient();

    const { data: comment, error } = await service
      .from("comments")
      .insert({
        user_id:            user.id,
        post_id:            postId,
        content:            hasText ? content.trim() : "",
        gif_url:            hasGif ? gif_url.trim() : null,
        parent_comment_id:  parent_comment_id ?? null,
        reply_to_username:  reply_to_username ?? null,
        reply_to_id:        reply_to_id ?? null,
      })
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
      .single();

    if (error) {
      console.error("[Comments POST] Insert error:", error.message, error.details);
      return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
    }

    console.log(`[Comments POST] Inserted id=${comment.id} parent=${comment.parent_comment_id ?? "null"}`);

    await service.rpc("increment_comment_count", { post_id: postId });

    // ── Notifications ─────────────────────────────────────────────────────
    try {
      const { data: commenter } = await service
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", user.id)
        .single();

      const commenterName   = commenter?.display_name ?? commenter?.username ?? "Someone";
      const commenterHandle = commenter?.username ?? "";
      const commenterAvatar = commenter?.avatar_url ?? null;
      const preview         = hasText ? content.trim().slice(0, 80) : "sent a GIF";

      if (parent_comment_id) {
        // ── Reply — notify parent comment author ──────────────────────
        const { data: parentComment } = await service
          .from("comments")
          .select("user_id")
          .eq("id", parent_comment_id)
          .single();

        const parentAuthorId = parentComment?.user_id;

        if (parentAuthorId && parentAuthorId !== user.id) {
          await service.from("notifications").insert({
            user_id:      parentAuthorId,
            type:         "comment",
            role:         "creator",
            actor_id:     user.id,
            actor_name:   commenterName,
            actor_handle: commenterHandle,
            actor_avatar: commenterAvatar,
            body_text:    "replied to your comment",
            sub_text:     `"${preview}"`,
            reference_id: postId.toString(),
            is_read:      false,
          });
          console.log("[Comments] Reply notification inserted for:", parentAuthorId);
        }
      } else {
        // ── Top-level comment — notify post creator ───────────────────
        const { data: post } = await service
          .from("posts")
          .select("creator_id")
          .eq("id", postId)
          .single();

        const creatorId = post?.creator_id;

        if (creatorId && creatorId !== user.id) {
          await service.from("notifications").insert({
            user_id:      creatorId,
            type:         "comment",
            role:         "creator",
            actor_id:     user.id,
            actor_name:   commenterName,
            actor_handle: commenterHandle,
            actor_avatar: commenterAvatar,
            body_text:    "commented on your post",
            sub_text:     `"${preview}"`,
            reference_id: postId.toString(),
            is_read:      false,
          });
          console.log("[Comments] Comment notification inserted for creator:", creatorId);
        }
      }
    } catch (notifErr) {
      console.error("[Comments] Notification error:", notifErr);
    }

    return NextResponse.json({ comment: { ...comment, viewer_has_liked: false } });

  } catch (err) {
    console.error("[Comments POST] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}