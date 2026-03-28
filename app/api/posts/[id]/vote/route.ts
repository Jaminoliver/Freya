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

    const { option_id } = await req.json();
    if (!option_id) return NextResponse.json({ error: "option_id is required" }, { status: 400 });

    const service = createServiceSupabaseClient();

    // Get the poll for this post
    const { data: poll, error: pollError } = await service
      .from("polls")
      .select("id, ends_at")
      .eq("post_id", postId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    // Check if poll has ended
    if (poll.ends_at && new Date(poll.ends_at) < new Date()) {
      return NextResponse.json({ error: "This poll has ended" }, { status: 400 });
    }

    // Check if user already voted
    const { data: existingVote } = await service
      .from("poll_votes")
      .select("id")
      .eq("poll_id", poll.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json({ error: "You have already voted on this poll" }, { status: 400 });
    }

    // Cast vote via RPC
    const { data: options, error: voteError } = await service.rpc("cast_poll_vote", {
      p_poll_id:   poll.id,
      p_option_id: option_id,
      p_user_id:   user.id,
    });

    if (voteError) {
      if (voteError.code === "23505") {
        return NextResponse.json({ error: "You have already voted on this poll" }, { status: 400 });
      }
      console.error("[Vote] RPC error:", voteError.message);
      return NextResponse.json({ error: "Failed to cast vote" }, { status: 500 });
    }

    // ── Notify creator — batched ──────────────────────────────────────────
    try {
      const { data: post } = await service
        .from("posts")
        .select("creator_id")
        .eq("id", postId)
        .single();

      const creatorId = post?.creator_id;

      if (creatorId && creatorId !== user.id) {
        const { data: voter } = await service
          .from("profiles")
          .select("display_name, username, avatar_url")
          .eq("id", user.id)
          .single();

        const voterName = voter?.display_name ?? voter?.username ?? "Someone";

        // Check for existing unread poll notification for this post
        const { data: existingNotif } = await service
          .from("notifications")
          .select("id, sub_text")
          .eq("user_id", creatorId)
          .eq("type", "comment")
          .eq("reference_id", postId.toString())
          .eq("is_read", false)
          .like("body_text", "%voted on your poll%")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingNotif) {
          const match     = existingNotif.sub_text?.match(/and (\d+) others/);
          const prevCount = match ? parseInt(match[1]) : 0;
          const newCount  = prevCount + 1;

          await service
            .from("notifications")
            .update({
              actor_name:   voterName,
              actor_handle: voter?.username ?? "",
              actor_avatar: voter?.avatar_url ?? null,
              sub_text:     `and ${newCount} others voted on your poll`,
              is_read:      false,
            })
            .eq("id", existingNotif.id);

          console.log("[Vote] Updated batched notification:", existingNotif.id);
        } else {
          await service.from("notifications").insert({
            user_id:      creatorId,
            type:         "comment",
            role:         "creator",
            actor_id:     user.id,
            actor_name:   voterName,
            actor_handle: voter?.username ?? "",
            actor_avatar: voter?.avatar_url ?? null,
            body_text:    "voted on your poll",
            sub_text:     "",
            reference_id: postId.toString(),
            is_read:      false,
          });

          console.log("[Vote] Inserted new poll vote notification");
        }
      }
    } catch (notifErr) {
      console.error("[Vote] Notification error:", notifErr);
    }

    return NextResponse.json({
      success:  true,
      voted:    true,
      option_id,
      options,
    });

  } catch (err) {
    console.error("[Vote] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}