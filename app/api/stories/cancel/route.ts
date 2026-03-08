import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { deleteBunnyStoryVideo } from "@/lib/utils/bunny";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/stories/cancel
// Body: { storyId: number }
// Deletes the story row and the Bunny video if it exists.
export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const supabase   = createServiceSupabaseClient();

    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { storyId } = await req.json();
    if (!storyId) return NextResponse.json({ error: "Missing storyId" }, { status: 400 });

    // Fetch the story to get the bunny_video_id, and verify ownership
    const { data: story, error: fetchErr } = await supabase
      .from("stories")
      .select("id, creator_id, bunny_video_id")
      .eq("id", storyId)
      .single();

    if (fetchErr || !story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.creator_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete Bunny video if it exists (best-effort, don't fail if it errors)
    if (story.bunny_video_id) {
      try {
        await deleteBunnyStoryVideo(story.bunny_video_id);
      } catch (bunnyErr) {
        console.warn("[POST /api/stories/cancel] Bunny delete failed (non-fatal):", bunnyErr);
      }
    }

    // Delete the story row
    const { error: deleteErr } = await supabase
      .from("stories")
      .delete()
      .eq("id", storyId);

    if (deleteErr) {
      console.error("[POST /api/stories/cancel] delete error:", deleteErr);
      return NextResponse.json({ error: "Failed to cancel story" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[POST /api/stories/cancel] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}