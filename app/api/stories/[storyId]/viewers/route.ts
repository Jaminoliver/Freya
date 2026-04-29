import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/stories/[storyId]/viewers
// Only accessible by the story's creator.
// Returns viewers with profile info and whether each viewer liked the story.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { user, error: authErr } = await getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceSupabaseClient();
    const { storyId: storyIdParam } = await params;
    const storyId = Number(storyIdParam);

    if (!storyId || isNaN(storyId)) {
      return NextResponse.json({ error: "Invalid story ID" }, { status: 400 });
    }

    // Confirm story exists and requesting user is the creator
    const { data: story } = await supabase
      .from("stories")
      .select("id, creator_id, view_count")
      .eq("id", storyId)
      .single();

    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
    if (story.creator_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch views (with profile join) and likes in parallel
    const [{ data: views }, { data: likes }] = await Promise.all([
      supabase
        .from("story_views")
        .select("user_id, viewed_at, profiles(id, display_name, username, avatar_url)")
        .eq("story_id", storyId)
        .order("viewed_at", { ascending: false }),
      supabase
        .from("story_likes")
        .select("user_id")
        .eq("story_id", storyId),
    ]);

    const likedSet = new Set((likes ?? []).map((l: any) => l.user_id));

    const viewers = (views ?? []).map((v: any) => {
      // Supabase returns joined rows as object or array — handle both
      const profile = Array.isArray(v.profiles) ? v.profiles[0] : (v.profiles ?? {});
      return {
        userId:      v.user_id,
        displayName: profile.display_name ?? profile.username ?? "Unknown",
        avatarUrl:   profile.avatar_url   ?? null,
        liked:       likedSet.has(v.user_id),
        viewedAt:    v.viewed_at,
      };
    });

    return NextResponse.json({
      viewers,
      totalCount: story.view_count ?? viewers.length,
      likeCount:  likes?.length ?? 0,
    });

  } catch (err) {
    console.error("[GET /api/stories/viewers] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}