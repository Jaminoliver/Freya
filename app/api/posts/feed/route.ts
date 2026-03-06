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

    const subscribedCreatorIds = (subs ?? []).map((s: { creator_id: string }) => s.creator_id);
    const subscribedSet = new Set<string>(subscribedCreatorIds);

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
          bunny_video_id,
          blur_hash
        )
      `)
      .eq("is_published", true)
      .eq("is_deleted", false)
      .order("published_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (subscribedCreatorIds.length > 0) {
      query = query.or(
        `creator_id.in.(${subscribedCreatorIds.join(",")}),is_free.eq.true`
      );
    } else {
      query = query.eq("is_free", true);
    }

    query = query.neq("creator_id", user.id);

    if (cursor) {
      query = query.lt("published_at", cursor);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error("[Feed] Query error:", error.message);
      return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
    }

    const postIds = (posts ?? []).map((p: { id: number }) => Number(p.id));

    const likesPromise = postIds.length > 0
      ? service
          .from("likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds)
      : Promise.resolve({ data: [] });

    const pollPostIds = (posts ?? [])
      .filter((p: Record<string, unknown>) => p.content_type === "poll")
      .map((p: Record<string, unknown>) => Number(p.id));

    const pollsPromise = pollPostIds.length > 0
      ? service
          .from("polls")
          .select("id, post_id, question, total_votes, ends_at")
          .in("post_id", pollPostIds)
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

    const [{ data: userLikes }, { data: pollsRaw }] = await Promise.all([
      likesPromise,
      pollsPromise,
    ]);

    const likedSet = new Set(
      (userLikes ?? []).map((l: { post_id: number | string }) => Number(l.post_id))
    );

    const pollIds = (pollsRaw ?? []).map((p: { id: number }) => p.id);

    const [{ data: pollOptionsRaw }, { data: userVotesRaw }] = await Promise.all([
      pollIds.length > 0
        ? service
            .from("poll_options")
            .select("id, poll_id, option_text, vote_count, display_order")
            .in("poll_id", pollIds)
            .order("display_order")
        : Promise.resolve({ data: [] }),
      pollIds.length > 0
        ? service
            .from("poll_votes")
            .select("poll_id, poll_option_id")
            .eq("user_id", user.id)
            .in("poll_id", pollIds)
        : Promise.resolve({ data: [] }),
    ]);

    type PollOption = { id: number; option_text: string; vote_count: number; display_order: number };
    type PollData   = {
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
          id:            o.id,
          option_text:   o.option_text,
          vote_count:    o.vote_count,
          display_order: o.display_order,
        }));

      const userVote = (userVotesRaw ?? []).find(
        (v: { poll_id: number }) => v.poll_id === poll.id
      ) as { poll_id: number; poll_option_id: number } | undefined;

      pollByPostId.set(poll.post_id, {
        id:                   poll.id,
        question:             poll.question,
        total_votes:          poll.total_votes ?? 0,
        ends_at:              poll.ends_at ?? null,
        options,
        user_voted_option_id: userVote?.poll_option_id ?? null,
      });
    }

    const processed = filteredPosts.map((post: Record<string, unknown>) => {
      const isPpv        = post.is_ppv as boolean;
      const isFree       = post.is_free as boolean;
      const isSubscribed = subscribedSet.has(post.creator_id as string);
      const canAccess    = isFree || (isSubscribed && !isPpv);

      const mediaItems = (post.media as Record<string, unknown>[] ?? [])
        .sort((a, b) => (a.display_order as number) - (b.display_order as number))
        .map((m: Record<string, unknown>) => {
          const rawUrl   = m.file_url as string | null;
          const path     = extractBunnyPath(rawUrl);
          const freshUrl = canAccess && path ? signBunnyUrl(path) : null;

          const { bunnyVideoId, derivedThumb } = resolveVideoMedia(m);

          let freshThumb: string | null = null;
          if (m.media_type === "video") {
  const customThumb = m.thumbnail_url as string | null;
  const customPath  = extractBunnyPath(customThumb);
  freshThumb = customPath ? signBunnyUrl(customPath) : derivedThumb;
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
        is_free:    isFree,
        media:      mediaItems,
        liked:      likedSet.has(Number(post.id)),
        can_access: canAccess,
        locked:     !canAccess,
        poll:       pollByPostId.get(Number(post.id)) ?? null,
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