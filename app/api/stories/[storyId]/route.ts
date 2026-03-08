import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { deleteBunnyPhoto, deleteBunnyStoryVideo } from "@/lib/utils/bunny";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/stories/[storyId]/view
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceSupabaseClient();
    const { storyId: storyIdParam } = await params;
    const storyId = Number(storyIdParam);

    if (!storyId || isNaN(storyId)) {
      return NextResponse.json({ error: "Invalid story ID" }, { status: 400 });
    }

    const { data: story } = await supabase
      .from("stories")
      .select("id, is_processing")
      .eq("id", storyId)
      .single();

    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
    if (story.is_processing) return NextResponse.json({ success: true });

    const { data: existingView } = await supabase
      .from("story_views")
      .select("id")
      .eq("story_id", storyId)
      .eq("user_id", user.id)
      .maybeSingle();

    const isNewView = !existingView;

    await supabase
      .from("story_views")
      .upsert(
        { story_id: storyId, user_id: user.id, viewed_at: new Date().toISOString() },
        { onConflict: "story_id,user_id", ignoreDuplicates: true }
      );

    if (isNewView) {
      await supabase.rpc("increment_story_view_count", { story_id: storyId });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[POST /api/stories/view] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/stories/[storyId]
// Deletes from Bunny (photo → storage, video → stories stream library)
// then removes the DB row.
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const authClient = await createServerSupabaseClient();
    const supabase   = createServiceSupabaseClient();
    const { storyId: storyIdParam } = await params;
    const storyId = Number(storyIdParam);

    if (!storyId || isNaN(storyId)) {
      return NextResponse.json({ error: "Invalid story ID" }, { status: 400 });
    }

    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: story, error: fetchErr } = await supabase
      .from("stories")
      .select("id, creator_id, media_type, media_url, bunny_video_id")
      .eq("id", storyId)
      .single();

    if (fetchErr || !story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
    if (story.creator_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Delete media from Bunny
    try {
      if (story.media_type === "video" && story.bunny_video_id) {
        // Delete from stories library (no watermark library)
        await deleteBunnyStoryVideo(story.bunny_video_id);
      } else if (story.media_type === "photo" && story.media_url) {
        // Extract storage path from signed CDN URL
        // e.g. https://freya-media-cdn.b-cdn.net/posts/userId/filename.jpg?token=...
        const url  = new URL(story.media_url);
        const path = url.pathname; // e.g. /posts/userId/filename.jpg
        await deleteBunnyPhoto(path);
      }
    } catch (bunnyErr) {
      // Log but don't block — still delete the DB row
      console.warn("[DELETE /api/stories] Bunny deletion failed:", bunnyErr);
    }

    const { error: deleteErr } = await supabase
      .from("stories")
      .delete()
      .eq("id", storyId);

    if (deleteErr) {
      console.error("[DELETE /api/stories] DB delete error:", deleteErr);
      return NextResponse.json({ error: "Failed to delete story" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[DELETE /api/stories] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}