import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/stories/creator?creator_id=X
export async function GET(req: NextRequest) {
  try {
    const { user, error: authErr } = await getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const creatorId = req.nextUrl.searchParams.get("creator_id");
    if (!creatorId) return NextResponse.json({ error: "creator_id required" }, { status: 400 });

    const supabase = createServiceSupabaseClient();
    const now      = new Date().toISOString();

    const { data: stories, error: storiesErr } = await supabase
      .from("stories")
      .select("id, creator_id, media_type, media_url, thumbnail_url, caption, created_at, expires_at, is_processing")
      .eq("creator_id", creatorId)
      .eq("is_expired", false)
      .eq("is_processing", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: true });

    if (storiesErr) return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
    if (!stories || stories.length === 0) return NextResponse.json({ group: null });

    const storyIds = stories.map((s: any) => s.id);

    const [{ data: profile }, { data: views }] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, avatar_url").eq("id", creatorId).single(),
      supabase.from("story_views").select("story_id").eq("user_id", user.id).in("story_id", storyIds),
    ]);

    const viewedSet = new Set((views ?? []).map((v: any) => v.story_id));

    const items = stories.map((s: any) => ({
      id:           s.id,
      mediaUrl:     s.media_url,
      mediaType:    s.media_type,
      thumbnailUrl: s.thumbnail_url ?? null,
      caption:      s.caption ?? null,
      createdAt:    s.created_at,
      expiresAt:    s.expires_at,
      viewed:       viewedSet.has(s.id),
      isProcessing: false,
    }));

    const hasUnviewed     = items.some((s: any) => !s.viewed);
    const latestStory     = stories[stories.length - 1] as any;
    const latestThumbnail = latestStory.thumbnail_url ?? (latestStory.media_type === "photo" ? latestStory.media_url : null);

    const group = {
      creatorId,
      username:        (profile as any)?.username     ?? "unknown",
      displayName:     (profile as any)?.display_name ?? (profile as any)?.username ?? "unknown",
      avatarUrl:       (profile as any)?.avatar_url   ?? null,
      hasUnviewed,
      latestStoryAt:   latestStory.created_at,
      latestThumbnail: latestThumbnail ?? null,
      items,
    };

    return NextResponse.json({ group });
  } catch (err) {
    console.error("[GET /api/stories/creator] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}