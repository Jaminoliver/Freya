import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify user is a creator
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "creator") {
      return NextResponse.json({ error: "Only creators can post" }, { status: 403 });
    }

    const body         = await req.json();
    const {
      content_type,   // "text" | "photo" | "video" | "gif"
      caption,
      is_free,        // boolean
      is_ppv,         // boolean
      ppv_price,      // number in kobo
      media_ids,      // array of media table IDs already uploaded
      scheduled_for,  // ISO string or null
    } = body;

    if (!content_type) {
      return NextResponse.json({ error: "content_type is required" }, { status: 400 });
    }

    if (content_type !== "text" && (!media_ids || media_ids.length === 0)) {
      return NextResponse.json({ error: "Media is required for non-text posts" }, { status: 400 });
    }

    if (is_ppv && (!ppv_price || ppv_price < 100)) {
      return NextResponse.json({ error: "PPV price must be at least ₦100" }, { status: 400 });
    }

    const isScheduled  = !!scheduled_for;
    const isPublished  = !isScheduled;
    const publishedAt  = isPublished ? new Date().toISOString() : null;

    const service = createServiceSupabaseClient();

    // Insert post
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

    if (postError) {
      console.error("[Create Post] Insert error:", postError.message);
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }

    // Link media to post
    if (media_ids && media_ids.length > 0) {
      const updates = media_ids.map((id: number, index: number) => ({
        id,
        post_id:       post.id,
        display_order: index,
      }));

      for (const update of updates) {
        const { error: mediaError } = await service
          .from("media")
          .update({ post_id: update.post_id, display_order: update.display_order })
          .eq("id", update.id)
          .eq("creator_id", user.id); // security: only update own media

        if (mediaError) {
          console.error("[Create Post] Media link error:", mediaError.message);
        }
      }
    }

    // Increment post_count on profile
    await service.rpc("increment_post_count", { user_id: user.id });

    return NextResponse.json({ success: true, postId: post.id });

  } catch (err) {
    console.error("[Create Post] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}