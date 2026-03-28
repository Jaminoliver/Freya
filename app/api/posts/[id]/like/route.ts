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
    const { data: existing, error: existingError } = await service
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();
    if (existingError) console.error("[Like] Check existing error:", existingError);

    // Get current like_count + creator_id
    const { data: post, error: postError } = await service
      .from("posts")
      .select("like_count, creator_id")
      .eq("id", postId)
      .single();
    if (postError) console.error("[Like] Fetch post error:", postError);
    console.log("[Like] post data:", post, "postError:", postError?.message ?? null);

    const currentCount = post?.like_count ?? 0;
    const creatorId    = post?.creator_id;

    console.log("[Like] State:", { postId, userId: user.id, existing, currentCount });

    if (existing) {
      const { error: deleteError } = await service.from("likes").delete().eq("id", existing.id);
      if (deleteError) console.error("[Like] Delete error:", deleteError);

      const { error: updateError } = await service
        .from("posts")
        .update({ like_count: Math.max(0, currentCount - 1) })
        .eq("id", postId);
      if (updateError) console.error("[Like] Decrement update error:", updateError);
    } else {
      const { error: insertError } = await service
        .from("likes")
        .insert({ user_id: user.id, post_id: postId });
      if (insertError) console.error("[Like] Insert error:", insertError);

      const { error: updateError } = await service
        .from("posts")
        .update({ like_count: currentCount + 1 })
        .eq("id", postId);
      if (updateError) console.error("[Like] Increment update error:", updateError);

      // ── Notify creator — batched ──────────────────────────────────────
      if (creatorId && creatorId !== user.id) {
        try {
          const { data: liker } = await service
            .from("profiles")
            .select("display_name, username, avatar_url")
            .eq("id", user.id)
            .single();

          const likerName = liker?.display_name ?? liker?.username ?? "Someone";
          console.log("[Like] creatorId:", creatorId, "likerName:", likerName);

          const { data: existingNotif, error: existingNotifError } = await service
            .from("notifications")
            .select("id, sub_text")
            .eq("user_id", creatorId)
            .eq("type", "like")
            .eq("reference_id", postId.toString())
            .eq("is_read", false)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingNotifError) console.error("[Like] Existing notif fetch error:", existingNotifError.message);
          console.log("[Like] existingNotif:", existingNotif);

          if (existingNotif) {
            const match = existingNotif.sub_text?.match(/and (\d+) others/);
            const prevCount = match ? parseInt(match[1]) : 0;
            const newCount  = prevCount + 1;

            const { error: updateErr } = await service
              .from("notifications")
              .update({
                actor_name:   likerName,
                actor_handle: liker?.username ?? "",
                actor_avatar: liker?.avatar_url ?? null,
                sub_text:     `and ${newCount} others liked your post`,
                is_read:      false,
              })
              .eq("id", existingNotif.id);

            if (updateErr) console.error("[Like] Batch update error:", updateErr.message);
            else console.log("[Like] Updated batched notification:", existingNotif.id);
          } else {
            const { error: insertErr } = await service.from("notifications").insert({
              user_id:      creatorId,
              type:         "like",
              role:         "creator",
              actor_id:     user.id,
              actor_name:   likerName,
              actor_handle: liker?.username ?? "",
              actor_avatar: liker?.avatar_url ?? null,
              body_text:    "liked your post",
              sub_text:     "",
              reference_id: postId.toString(),
              is_read:      false,
            });

            if (insertErr) console.error("[Like] Insert notification error:", insertErr.message, insertErr.details);
            else console.log("[Like] Inserted new like notification");
          }
        } catch (notifErr) {
          console.error("[Like] Notification error:", notifErr);
        }
      } else {
        console.log("[Like] Skipping notification — creatorId:", creatorId, "userId:", user.id);
      }
    }

    // Fetch final count
    const { data: updated, error: finalError } = await service
      .from("posts")
      .select("like_count")
      .eq("id", postId)
      .single();
    if (finalError) console.error("[Like] Final fetch error:", finalError);

    console.log("[Like] Done:", { postId, liked: !existing, like_count: updated?.like_count });

    return NextResponse.json({
      liked:      !existing,
      like_count: updated?.like_count ?? 0,
    });

  } catch (err) {
    console.error("[Like Post] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}