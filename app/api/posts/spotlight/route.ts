// app/api/posts/spotlight/route.ts
// Discovery feed: "everyone" posts from creators the user is NOT subscribed to
import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";
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

function extractBunnyVideoId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/play\/\d+\/([a-f0-9-]{36})\/playlist\.m3u8/i);
  return match ? match[1] : null;
}

function resolveVideoMedia(m: Record<string, unknown>) {
  let bunnyVideoId = m.bunny_video_id as string | null;
  if (!bunnyVideoId && m.media_type === "video") {
    bunnyVideoId = extractBunnyVideoId(m.file_url as string | null);
  }
  const derivedThumb = bunnyVideoId
    ? `https://${STREAM_CDN_HOST}/${bunnyVideoId}/thumbnail.jpg`
    : null;
  return { bunnyVideoId, derivedThumb };
}

export async function GET(req: NextRequest) {
  try {
    const { user, error: authErr } = await getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const service = createServiceSupabaseClient();

    // Get subscribed creator IDs
    const { data: subs } = await service
      .from("subscriptions")
      .select("creator_id")
      .eq("fan_id", user.id)
      .eq("status", "active");

    const subscribedCreatorIds = (subs ?? []).map((s: { creator_id: string }) => s.creator_id);

    // Query: everyone posts from creators user is NOT subscribed to
    // Ordered by engagement (likes + comments) for discovery
    const page = parseInt(searchParams.get("page") ?? "1");
    const offset = (page - 1) * PAGE_SIZE;

    let query = service
      .from("posts")
      .select(`
        id,
        creator_id,
        content_type,
        caption,
        audience,
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
          bunny_video_id,
          blur_hash,
          raw_video_url,
          width,
          height,
          aspect_ratio
        )
      `)
      .eq("is_published", true)
      .eq("is_deleted", false)
      .eq("audience", "everyone")
      .neq("creator_id", user.id)
      .order("like_count", { ascending: false })
      .order("published_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    // Exclude subscribed creators — their "everyone" posts go to Feed
    if (subscribedCreatorIds.length > 0) {
      for (const id of subscribedCreatorIds) {
        query = query.neq("creator_id", id);
      }
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error("[Spotlight:ERROR] Query error:", error.message);
      return NextResponse.json({ error: "Failed to fetch spotlight" }, { status: 500 });
    }

    const rawCount = (posts ?? []).length;
    const nextPage = rawCount === PAGE_SIZE ? page + 1 : null;

    const postIds = (posts ?? []).map((p: { id: number }) => Number(p.id));

    // Fetch likes, PPV unlocks, polls in parallel
    const likesPromise = postIds.length > 0
      ? service.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds)
      : Promise.resolve({ data: [] });

    const ppvUnlocksPromise = postIds.length > 0
      ? service.from("ppv_unlocks").select("post_id").eq("fan_id", user.id).in("post_id", postIds)
      : Promise.resolve({ data: [] });

    const pollPostIds = (posts ?? [])
      .filter((p: Record<string, unknown>) => p.content_type === "poll")
      .map((p: Record<string, unknown>) => Number(p.id));

    const pollsPromise = pollPostIds.length > 0
      ? service.from("polls").select("id, post_id, question, total_votes, ends_at").in("post_id", pollPostIds)
      : Promise.resolve({ data: [] });

    // Filter out posts with processing videos
    const filteredPosts = (posts ?? []).filter((post: Record<string, unknown>) => {
      const mediaItems = post.media as Record<string, unknown>[] ?? [];
      const hasUnreadyVideo = mediaItems.some(
        (m) => m.media_type === "video" && m.processing_status !== "completed" && m.processing_status !== null
      );
      return !hasUnreadyVideo;
    });

    const [{ data: userLikes }, { data: ppvUnlocksRaw }, { data: pollsRaw }] = await Promise.all([
      likesPromise,
      ppvUnlocksPromise,
      pollsPromise,
    ]);

    const likedSet = new Set(
      (userLikes ?? []).map((l: { post_id: number | string }) => Number(l.post_id))
    );

    const ppvUnlockedSet = new Set(
      (ppvUnlocksRaw ?? []).map((u: { post_id: number | string }) => Number(u.post_id))
    );

    // Build poll data
    const pollIds = (pollsRaw ?? []).map((p: { id: number }) => p.id);

    const [{ data: pollOptionsRaw }, { data: userVotesRaw }] = await Promise.all([
      pollIds.length > 0
        ? service.from("poll_options").select("id, poll_id, option_text, vote_count, display_order").in("poll_id", pollIds).order("display_order")
        : Promise.resolve({ data: [] }),
      pollIds.length > 0
        ? service.from("poll_votes").select("poll_id, poll_option_id").eq("user_id", user.id).in("poll_id", pollIds)
        : Promise.resolve({ data: [] }),
    ]);

    type PollOption = { id: number; option_text: string; vote_count: number; display_order: number };
    type PollData = {
      id: number;
      question: string;
      total_votes: number;
      ends_at: string | null;
      options: PollOption[];
      user_voted_option_id: number | null;
    };

    const pollByPostId = new Map<number, PollData>();

    for (const poll of (pollsRaw ?? []) as { id: number; post_id: number; question: string; total_votes: number; ends_at: string | null }[]) {
      const options = (pollOptionsRaw ?? [])
        .filter((o: { poll_id: number }) => o.poll_id === poll.id)
        .map((o: { id: number; option_text: string; vote_count: number; display_order: number }) => ({
          id: o.id,
          option_text: o.option_text,
          vote_count: o.vote_count,
          display_order: o.display_order,
        }));

      const userVote = (userVotesRaw ?? []).find(
        (v: { poll_id: number }) => v.poll_id === poll.id
      ) as { poll_id: number; poll_option_id: number } | undefined;

      pollByPostId.set(poll.post_id, {
        id: poll.id,
        question: poll.question,
        total_votes: poll.total_votes ?? 0,
        ends_at: poll.ends_at ?? null,
        options,
        user_voted_option_id: userVote?.poll_option_id ?? null,
      });
    }

    // Process posts — sign URLs, determine access
    const processed = filteredPosts.map((post: Record<string, unknown>) => {
      const isPpv = post.is_ppv as boolean;
      const postId = Number(post.id);

      // Spotlight posts: user is NOT subscribed
      // Non-PPV "everyone" posts: accessible
      // PPV posts: only if unlocked
      const canAccess = isPpv ? ppvUnlockedSet.has(postId) : true;

      const mediaItems = (post.media as Record<string, unknown>[] ?? [])
        .sort((a, b) => (a.display_order as number) - (b.display_order as number))
        .map((m: Record<string, unknown>) => {
          const rawUrl = m.file_url as string | null;
          const path = extractBunnyPath(rawUrl);
          const freshUrl = canAccess && path ? signBunnyUrl(path) : null;

          const { bunnyVideoId, derivedThumb } = resolveVideoMedia(m);

          let freshThumb: string | null = null;
          if (m.media_type === "video") {
            const customThumb = m.thumbnail_url as string | null;
            const customPath = extractBunnyPath(customThumb);
            freshThumb = customPath ? signBunnyUrl(customPath) : derivedThumb;
          } else {
            const rawThumb = m.thumbnail_url as string | null;
            const thumbPath = extractBunnyPath(rawThumb);
            freshThumb = thumbPath ? signBunnyUrl(thumbPath) : null;
          }

          return {
            ...m,
            file_url: freshUrl,
            thumbnail_url: freshThumb,
            bunny_video_id: bunnyVideoId,
            locked: !canAccess,
          };
        });

      return {
        ...post,
        media: mediaItems,
        liked: likedSet.has(postId),
        can_access: canAccess,
        locked: !canAccess,
        poll: pollByPostId.get(postId) ?? null,
      };
    });

    return NextResponse.json({ posts: processed, nextPage });
  } catch (err) {
    console.error("[Spotlight:ERROR] Unhandled exception:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}