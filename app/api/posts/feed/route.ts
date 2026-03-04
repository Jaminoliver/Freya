import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { signBunnyUrl } from "@/lib/utils/bunny";

const PAGE_SIZE = 20;

const STREAM_CDN_HOST = process.env.BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net";

function extractBunnyPath(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    return url.startsWith("/") ? url : `/${url}`;
  }
}

// Extract Bunny video ID from HLS playlist URL
// e.g. https://iframe.mediadelivery.net/play/607042/some-uuid/playlist.m3u8 → some-uuid
function extractBunnyVideoId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/play\/\d+\/([a-f0-9-]{36})\/playlist\.m3u8/i);
  return match ? match[1] : null;
}

function resolveVideoMedia(m: Record<string, unknown>) {
  let bunnyVideoId = m.bunny_video_id as string | null;

  // Recover video ID from HLS URL if missing in DB
  if (!bunnyVideoId && m.media_type === "video") {
    bunnyVideoId = extractBunnyVideoId(m.file_url as string | null);
  }

  // Derive correct thumbnail from video ID
  const derivedThumb = bunnyVideoId
    ? `https://${STREAM_CDN_HOST}/${bunnyVideoId}/thumbnail.jpg`
    : null;

  return { bunnyVideoId, derivedThumb };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cursor  = searchParams.get("cursor");
    const service = createServiceSupabaseClient();

    const { data: subs } = await service
      .from("subscriptions")
      .select("creator_id")
      .eq("fan_id", user.id)
      .eq("status", "active");

    const creatorIds = (subs ?? []).map((s: { creator_id: string }) => s.creator_id);

    if (creatorIds.length === 0) {
      return NextResponse.json({ posts: [], nextCursor: null });
    }

    const subscribedSet = new Set<string>(creatorIds);

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

    const postIds = (posts ?? []).map((p: { id: number }) => Number(p.id));

    // ── Fetch likes in parallel with post processing ──────────────────────
    const likesPromise = postIds.length > 0
      ? service
          .from("likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds)
      : Promise.resolve({ data: [] });

    const filteredPosts = (posts ?? []).filter((post: Record<string, unknown>) => {
        const mediaItems = post.media as Record<string, unknown>[] ?? [];
        const hasUnreadyVideo = mediaItems.some(
          (m) =>
            m.media_type === "video" &&
            m.processing_status !== "completed" &&
            m.processing_status !== null
        );
        return !hasUnreadyVideo;
      });

    // ── Await likes now that post filtering is done ───────────────────────
    const { data: userLikes } = await likesPromise;
    const likedSet = new Set((userLikes ?? []).map((l: { post_id: number | string }) => Number(l.post_id)));

    const processed = filteredPosts.map((post: Record<string, unknown>) => {
        const isPpv        = post.is_ppv as boolean;
        const isFree       = post.is_free as boolean;
        const isSubscribed = subscribedSet.has(post.creator_id as string);
        const canAccess    = isFree || (isSubscribed && !isPpv);

        const mediaItems = (post.media as Record<string, unknown>[] ?? [])
          .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
            (a.display_order as number) - (b.display_order as number)
          )
          .map((m: Record<string, unknown>) => {
            const rawUrl   = m.file_url as string | null;
            const path     = extractBunnyPath(rawUrl);
            const freshUrl = canAccess && path ? signBunnyUrl(path) : null;

            const { bunnyVideoId, derivedThumb } = resolveVideoMedia(m);

            // For videos use derived thumbnail (real image), for images sign the stored thumbnail
            let freshThumb: string | null = null;
            if (m.media_type === "video") {
              freshThumb = derivedThumb;
            } else {
              const rawThumb  = m.thumbnail_url as string | null;
              const thumbPath = extractBunnyPath(rawThumb);
              freshThumb = thumbPath ? signBunnyUrl(thumbPath) : null;
            }

            return {
              ...m,
              file_url:       freshUrl,
              thumbnail_url:  freshThumb,
              bunny_video_id: bunnyVideoId,
              locked:         !canAccess,
            };
          });

        return {
          ...post,
          media:      mediaItems,
          liked:      likedSet.has(Number(post.id)),
          can_access: canAccess,
          locked:     !canAccess,
        };
      });

    const lastPost   = processed[processed.length - 1] as Record<string, unknown> | undefined;
    const nextCursor = processed.length === PAGE_SIZE ? (lastPost?.published_at ?? null) : null;

    return NextResponse.json({ posts: processed, nextCursor });

  } catch (err) {
    console.error("[Feed] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}