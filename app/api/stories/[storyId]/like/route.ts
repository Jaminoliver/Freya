import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/stories/[storyId]/like
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { storyId: storyIdParam } = await params;
    const storyId = Number(storyIdParam);
    if (!storyId || isNaN(storyId)) {
      return NextResponse.json({ error: "Invalid story ID" }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();

    const { data: story } = await supabase
      .from("stories")
      .select("id")
      .eq("id", storyId)
      .single();

    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

    const { error } = await supabase
      .from("story_likes")
      .insert({ story_id: storyId, user_id: user.id });

    // Ignore duplicate like (unique constraint violation)
    if (error && error.code !== "23505") {
      console.error("[POST /api/stories/like] error:", error);
      return NextResponse.json({ error: "Failed to like story" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[POST /api/stories/like] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/stories/[storyId]/like
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { storyId: storyIdParam } = await params;
    const storyId = Number(storyIdParam);
    if (!storyId || isNaN(storyId)) {
      return NextResponse.json({ error: "Invalid story ID" }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();

    const { error } = await supabase
      .from("story_likes")
      .delete()
      .eq("story_id", storyId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[DELETE /api/stories/like] error:", error);
      return NextResponse.json({ error: "Failed to unlike story" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[DELETE /api/stories/like] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}