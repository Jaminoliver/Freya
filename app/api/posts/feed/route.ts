import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { signBunnyUrl } from "@/lib/utils/bunny";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cursor  = searchParams.get("cursor");   // last post published_at for pagination
    const service = createServiceSupabaseClient();

    // Get creator IDs the user is subscribed to (active subscriptions)
    const { data: subs } = await service
      .from("subscriptions")
      .select("creator_id")
      .eq("fan_id", user.id)
      .eq("status", "ACTIVE");

    const creatorIds = (subs ?? []).map((s: { creator_id: string }) => s.creator_id);

    if (creatorIds.length === 0) {
      return NextResponse.json({ posts: [], nextCursor: null });
    }

    // Fetch posts from subscribed creators
    let query = service
      .from("posts")
      .select(`
        id,
        creator_id,
        content_type,
        caption,
        is_free,
        is_ppv,
        ppv_price,
        like_count,
        comment_count,
        view_count,
        published_at,
        profiles!creator_id (
          username,
          display_name,
          avatar_url,
          is_verified
        ),
        media (
          id,
          media_type,
          file_url,
          thumbnail_url,
          duration_seconds,
          display_order,
          processing_status,
          bunny_video_id
        )
      `)
      .in("creator_id", creatorIds)
      .eq("is_published", true)
      .eq("is_deleted", false)
      .order("published_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (cursor) {
      query = query.lt("published_at", cursor);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error("[Feed] Query error:", error.message);
      return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
    }

    // Check which posts the user has liked
    const postIds = (posts ?? []).map((p: { id: number }) => p.id);
    const { data: userLikes } = await service
      .from("likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", postIds);

    const likedSet = new Set((userLikes ?? []).map((l: { post_id: number }) => l.post_id));

    // Process posts — apply paywall and re-sign CDN URLs
    const processed = (posts ?? []).map((post: Record<string, unknown>) => {
      const isSubscriber  = true; // they are in creatorIds so they're subscribed
      const isPpv         = post.is_ppv as boolean;
      const isFree        = post.is_free as boolean;
      const canAccess     = isFree || (isSubscriber && !isPpv);
      const mediaItems    = (post.media as Record<string, unknown>[] ?? [])
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
          (a.display_order as number) - (b.display_order as number)
        )
        .map((m: Record<string, unknown>) => {
          if (!canAccess) {
            // Return blurred/locked placeholder — no real URL
            return {
              ...m,
              file_url:      null,
              thumbnail_url: null,
              locked:        true,
            };
          }
          return {
            ...m,
            file_url:      m.file_url,
            thumbnail_url: m.thumbnail_url,
            locked:        false,
          };
        });

      return {
        ...post,
        media:      mediaItems,
        liked:      likedSet.has(post.id as number),
        can_access: canAccess,
        locked:     !canAccess,
      };
    });

    const lastPost    = processed[processed.length - 1] as Record<string, unknown> | undefined;
    const nextCursor  = processed.length === PAGE_SIZE ? (lastPost?.published_at ?? null) : null;

    return NextResponse.json({ posts: processed, nextCursor });

  } catch (err) {
    console.error("[Feed] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}