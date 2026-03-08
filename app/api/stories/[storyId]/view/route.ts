import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/stories/[storyId]/view
// Records that the current user viewed this story.
// Skips silently if story is still processing.
// Upserts view record — safe to call multiple times (duplicate views ignored).
// Increments view_count only when the view is genuinely new (no existing row).
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

    // Check story exists and is not still processing
    const { data: story } = await supabase
      .from("stories")
      .select("id, is_processing")
      .eq("id", storyId)
      .single();

    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

    // Silent skip — story is still being processed by Bunny
    if (story.is_processing) return NextResponse.json({ success: true });

    // Check if this user has already viewed this story BEFORE upserting
    const { data: existingView } = await supabase
      .from("story_views")
      .select("id")
      .eq("story_id", storyId)
      .eq("user_id", user.id)
      .maybeSingle();

    const isNewView = !existingView;

    // Upsert view record — safe to call multiple times
    await supabase
      .from("story_views")
      .upsert(
        { story_id: storyId, user_id: user.id, viewed_at: new Date().toISOString() },
        { onConflict: "story_id,user_id", ignoreDuplicates: true }
      );

    // Only increment view_count for genuinely new views
    if (isNewView) {
      await supabase.rpc("increment_story_view_count", { story_id: storyId });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[POST /api/stories/view] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}