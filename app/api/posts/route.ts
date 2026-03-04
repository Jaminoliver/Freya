import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

function parseDuration(duration: string | null | undefined): string | null {
  if (!duration) return null;
  const map: Record<string, number> = {
    "1 day":   1,
    "3 days":  3,
    "7 days":  7,
    "14 days": 14,
  };
  const days = map[duration];
  if (!days) return null;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "creator") {
      return NextResponse.json({ error: "Only creators can post" }, { status: 403 });
    }

    const body = await req.json();
    const {
      content_type,
      caption,
      is_free,
      is_ppv,
      ppv_price,
      media_ids,
      scheduled_for,
      poll_options,
      poll_duration,
    } = body;

    if (!content_type) {
      return NextResponse.json({ error: "content_type is required" }, { status: 400 });
    }

    if (content_type !== "text" && content_type !== "poll" && (!media_ids || media_ids.length === 0)) {
      return NextResponse.json({ error: "Media is required for non-text posts" }, { status: 400 });
    }

    if (content_type === "poll") {
      if (!poll_options || !Array.isArray(poll_options) || poll_options.length < 2) {
        return NextResponse.json({ error: "Poll requires at least 2 options" }, { status: 400 });
      }
      if (poll_options.some((o: string) => !o || o.trim().length === 0)) {
        return NextResponse.json({ error: "All poll options must have text" }, { status: 400 });
      }
    }

    if (is_ppv && (!ppv_price || ppv_price < 100)) {
      return NextResponse.json({ error: "PPV price must be at least ₦100" }, { status: 400 });
    }

    const isScheduled = !!scheduled_for;
    const isPublished = !isScheduled;
    const publishedAt = isPublished ? new Date().toISOString() : null;

    const service = createServiceSupabaseClient();

    // ── Insert post ─────────────────────────────────────────────────────────
    const { data: post, error: postError } = await service
      .from("posts")
      .insert({
        creator_id:    user.id,
        content_type,
        caption:       caption ?? null,
        is_free:       is_ppv ? false : (is_free ?? true),
        is_ppv:        is_ppv ?? false,
        ppv_price:     is_ppv ? ppv_price : null,
        is_scheduled:  isScheduled,
        scheduled_for: scheduled_for ?? null,
        is_published:  isPublished,
        published_at:  publishedAt,
      })
      .select("id")
      .single();

    if (postError || !post) {
      console.error("[Create Post] Insert error:", postError?.message);
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }

    // ── Link media ───────────────────────────────────────────────────────────
    if (media_ids && media_ids.length > 0) {
      for (let i = 0; i < media_ids.length; i++) {
        const { error: mediaError } = await service
          .from("media")
          .update({ post_id: post.id, display_order: i })
          .eq("id", media_ids[i])
          .eq("creator_id", user.id);

        if (mediaError) {
          console.error("[Create Post] Media link error:", mediaError.message);
        }
      }
    }

    // ── Create poll ──────────────────────────────────────────────────────────
    if (content_type === "poll" && poll_options?.length >= 2) {
      const endsAt = parseDuration(poll_duration);

      const { data: poll, error: pollError } = await service
        .from("polls")
        .insert({
          post_id:    post.id,
          creator_id: user.id,
          question:   caption ?? "",
          ends_at:    endsAt,
        })
        .select("id")
        .single();

      if (pollError || !poll) {
        console.error("[Create Post] Poll insert error:", pollError?.message);
        return NextResponse.json({ error: "Failed to create poll" }, { status: 500 });
      }

      const optionRows = (poll_options as string[]).map((text, index) => ({
        poll_id:       poll.id,
        option_text:   text.trim(),
        display_order: index,
      }));

      const { error: optionsError } = await service
        .from("poll_options")
        .insert(optionRows);

      if (optionsError) {
        console.error("[Create Post] Poll options insert error:", optionsError.message);
        return NextResponse.json({ error: "Failed to save poll options" }, { status: 500 });
      }
    }

    // ── Increment post_count ─────────────────────────────────────────────────
    await service.rpc("increment_post_count", { user_id: user.id });

    return NextResponse.json({ success: true, postId: post.id });

  } catch (err) {
    console.error("[Create Post] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}