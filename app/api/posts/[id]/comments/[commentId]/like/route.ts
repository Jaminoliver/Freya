import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;
    const postId        = Number(id);
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

      const { data: comment } = await service
        .from("comments")
        .select("like_count")
        .eq("id", commentIdNum)
        .single();

      const newCount = Math.max((comment?.like_count ?? 1) - 1, 0);
      await service.from("comments").update({ like_count: newCount }).eq("id", commentIdNum);

      return NextResponse.json({ liked: false, like_count: newCount });
    } else {
      await service.from("comment_likes").insert({ comment_id: commentIdNum, user_id: user.id });

      const { data: comment } = await service
        .from("comments")
        .select("like_count, user_id, content")
        .eq("id", commentIdNum)
        .single();

      const newCount       = (comment?.like_count ?? 0) + 1;
      const commentAuthorId = comment?.user_id;
      const commentPreview  = (comment?.content ?? "").slice(0, 60);

      await service.from("comments").update({ like_count: newCount }).eq("id", commentIdNum);

      // ── Notify comment author — batched ────────────────────────────────
      if (commentAuthorId && commentAuthorId !== user.id) {
        try {
          const { data: liker } = await service
            .from("profiles")
            .select("display_name, username, avatar_url")
            .eq("id", user.id)
            .single();

          const likerName = liker?.display_name ?? liker?.username ?? "Someone";

          // Check for existing unread comment_liked notification for this comment
          const { data: existingNotif } = await service
            .from("notifications")
            .select("id, sub_text")
            .eq("user_id", commentAuthorId)
            .eq("type", "comment_liked")
            .eq("reference_id", postId.toString())
            .eq("is_read", false)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingNotif) {
            const match     = existingNotif.sub_text?.match(/and (\d+) others/);
            const prevCount = match ? parseInt(match[1]) : 0;
            const newBatch  = prevCount + 1;

            await service
              .from("notifications")
              .update({
                actor_name:   likerName,
                actor_handle: liker?.username ?? "",
                actor_avatar: liker?.avatar_url ?? null,
                sub_text:     `and ${newBatch} others liked your comment`,
                is_read:      false,
              })
              .eq("id", existingNotif.id);

            console.log("[CommentLike] Updated batched notification:", existingNotif.id);
          } else {
            await service.from("notifications").insert({
              user_id:      commentAuthorId,
              type:         "comment_liked",
              role:         "creator",
              actor_id:     user.id,
              actor_name:   likerName,
              actor_handle: liker?.username ?? "",
              actor_avatar: liker?.avatar_url ?? null,
              body_text:    "liked your comment",
              sub_text:     `"${commentPreview}"`,
              reference_id: postId.toString(),
              is_read:      false,
            });

            console.log("[CommentLike] Inserted new comment_liked notification");
          }
        } catch (notifErr) {
          console.error("[CommentLike] Notification error:", notifErr);
        }
      }

      return NextResponse.json({ liked: true, like_count: newCount });
    }
  } catch (err) {
    console.error("[Comment Like] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}