// app/api/posts/feed/route.ts
// Unified feed: subbed + unsubbed posts with deterministic interleave and cursor-based pagination
import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";
import { signBunnyUrl } from "@/lib/utils/bunny";

const PAGE_SIZE       = 20;
const SUB_FETCH_SIZE  = 12;   // Need ~8 per page (4/10 ratio), buffer for filterReady
const UNSUB_FETCH_SIZE = 16;  // Need ~12 per page (6/10 ratio), buffer for filterReady
const STREAM_CDN_HOST = process.env.BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net";

const LAPSED_STATUSES = ["expired", "cancelled", "renewal_failed"];

// Deterministic interleave pattern per 10 slots: 4 sub + 6 unsub
// Positions 0,3,6,9 = sub; 1,2,4,5,7,8 = unsub
const SUB_SLOTS = new Set([0, 3, 6, 9]);

function extractBunnyPath(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).pathname; }
  catch { return url.startsWith("/") ? url : `/${url}`; }
}

function extractBunnyVideoId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/play\/\d+\/([a-f0-9-]{36})\/playlist\.m3u8/i);
  return match ? match[1] : null;
}

function resolveVideoMedia(m: Record<string, unknown>) {
  let bunnyVideoId = m.bunny_video_id as string | null;
  if (!bunnyVideoId && m.media_type === "video")
    bunnyVideoId = extractBunnyVideoId(m.file_url as string | null);
  const derivedThumb = bunnyVideoId
    ? `https://${STREAM_CDN_HOST}/${bunnyVideoId}/thumbnail.jpg`
    : null;
  return { bunnyVideoId, derivedThumb };
}

function filterReady(posts: Record<string, unknown>[]) {
  return posts.filter((post) => {
    const mediaItems = (post.media as Record<string, unknown>[]) ?? [];
    return !mediaItems.some(
      (m) => m.media_type === "video" && m.processing_status !== "completed" && m.processing_status !== null
    );
  });
}

/**
 * Deterministic interleave: 4 sub + 6 unsub per 10 slots.
 * When one pool is exhausted, the other fills remaining slots.
 * Returns exactly `limit` posts (or fewer if both pools exhausted).
 */
function deterministicInterleave(
  subPosts: Record<string, unknown>[],
  unsubPosts: Record<string, unknown>[],
  limit: number
): { posts: Record<string, unknown>[]; subConsumed: number; unsubConsumed: number } {
  const result: Record<string, unknown>[] = [];
  let si = 0, ui = 0;
  let slot = 0;

  while (result.length < limit && (si < subPosts.length || ui < unsubPosts.length)) {
    const wantSub = SUB_SLOTS.has(slot % 10);

    if (wantSub) {
      if (si < subPosts.length)      result.push(subPosts[si++]);
      else if (ui < unsubPosts.length) result.push(unsubPosts[ui++]);
    } else {
      if (ui < unsubPosts.length)    result.push(unsubPosts[ui++]);
      else if (si < subPosts.length) result.push(subPosts[si++]);
    }
    slot++;
  }

  return { posts: result, subConsumed: si, unsubConsumed: ui };
}

const POST_SELECT = `
  id, creator_id, content_type, caption, text_background, audience,
  is_free, is_ppv, ppv_price, like_count, comment_count, view_count, published_at,
  profiles!creator_id (
    username, display_name, avatar_url, is_verified, subscription_price, created_at
  ),
  media (
    id, media_type, file_url, thumbnail_url, duration_seconds, display_order,
    processing_status, bunny_video_id, blur_hash, raw_video_url, width, height, aspect_ratio
  )
`;

export async function GET(req: NextRequest) {
  try {
    const { user, error: authErr } = await getUser();
    if (authErr || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const subOffset   = Math.max(0, parseInt(searchParams.get("subOffset")   ?? "0"));
    const unsubOffset = Math.max(0, parseInt(searchParams.get("unsubOffset") ?? "0"));
    const service     = createServiceSupabaseClient();

    // ── Fetch active subs + lapsed subs in parallel ──────────────────────
    const [{ data: activeSubs }, { data: lapsedSubs }] = await Promise.all([
      service.from("subscriptions").select("creator_id")
        .eq("fan_id", user.id).eq("status", "active"),
      service.from("subscriptions").select("creator_id")
        .eq("fan_id", user.id).in("status", LAPSED_STATUSES),
    ]);

    const subscribedIds = (activeSubs ?? []).map((s: { creator_id: string }) => s.creator_id);
    const lapsedIds     = (lapsedSubs ?? []).map((s: { creator_id: string }) => s.creator_id);
    const subscribedSet = new Set<string>(subscribedIds);
    const lapsedSet     = new Set<string>(lapsedIds);

    // ── Fetch subscribed posts + public posts in parallel ─────────────────
    const subPostsPromise = subscribedIds.length > 0
      ? service.from("posts").select(POST_SELECT)
          .eq("is_published", true).eq("is_deleted", false)
          .in("creator_id", subscribedIds)
          .neq("creator_id", user.id)
          .order("published_at", { ascending: false })
          .range(subOffset, subOffset + SUB_FETCH_SIZE - 1)
      : Promise.resolve({ data: [] });

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    let unsubQuery = service.from("posts").select(POST_SELECT)
      .eq("is_published", true).eq("is_deleted", false)
      .eq("audience", "everyone")
      .neq("creator_id", user.id)
      .order("like_count", { ascending: false })
      .order("published_at", { ascending: false })
      .range(unsubOffset, unsubOffset + UNSUB_FETCH_SIZE - 1);

    // Exclude only active subs from the unsub pool
    // Lapsed creators stay in discovery with "Resubscribe" banner
    if (subscribedIds.length > 0)
      unsubQuery = unsubQuery.not("creator_id", "in", `(${subscribedIds.join(",")})`);

    const [{ data: rawSubPosts }, { data: rawUnsubPosts }] = await Promise.all([
      subPostsPromise,
      unsubQuery,
    ]);

    const rawSubArr   = (rawSubPosts   ?? []) as Record<string, unknown>[];
    const rawUnsubArr = (rawUnsubPosts ?? []) as Record<string, unknown>[];

    // ── Boost new creators to front of unsub pool ─────────────────────────
    const newCreatorPosts = rawUnsubArr.filter((p) => {
      const profile = p.profiles as Record<string, unknown> | null;
      return profile && (profile.created_at as string) > fortyEightHoursAgo;
    });
    const regularPosts = rawUnsubArr.filter((p) => {
      const profile = p.profiles as Record<string, unknown> | null;
      return !profile || (profile.created_at as string) <= fortyEightHoursAgo;
    });
    const sortedUnsubRaw = [...newCreatorPosts, ...regularPosts];

    // ── Filter out unready videos ─────────────────────────────────────────
    const subReady   = filterReady(rawSubArr);
    const unsubReady = filterReady(sortedUnsubRaw);

    // ── Deterministic interleave: 4 sub + 6 unsub per 10 slots ───────────
    const { posts: merged } = deterministicInterleave(subReady, unsubReady, PAGE_SIZE);

    // ── Pagination cursors ────────────────────────────────────────────────
    // Advance offsets by the number of rows fetched from DB (not consumed)
    // This ensures no duplicates across pages
    const nextSubOffset   = subOffset   + rawSubArr.length;
    const nextUnsubOffset = unsubOffset + rawUnsubArr.length;

    const subHasMore   = rawSubArr.length   === SUB_FETCH_SIZE;
    const unsubHasMore = rawUnsubArr.length === UNSUB_FETCH_SIZE;
    const hasMore      = (subHasMore || unsubHasMore) && merged.length > 0;

    // ── Parallel lookups ──────────────────────────────────────────────────
    const postIds        = merged.map((p) => Number(p.id));
    const pageCreatorIds = [...new Set(merged.map((p) => p.creator_id as string))];

    const [
      { data: userLikes },
      { data: ppvUnlocksRaw },
      { data: savedPostsRaw },
      { data: savedCreatorsRaw },
      { data: pollsRaw },
    ] = await Promise.all([
      postIds.length > 0
        ? service.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds)
        : Promise.resolve({ data: [] }),
      postIds.length > 0
        ? service.from("ppv_unlocks").select("post_id").eq("fan_id", user.id).in("post_id", postIds)
        : Promise.resolve({ data: [] }),
      postIds.length > 0
        ? service.from("saved_posts").select("post_id").eq("user_id", user.id).in("post_id", postIds)
        : Promise.resolve({ data: [] }),
      pageCreatorIds.length > 0
        ? service.from("saved_creators").select("creator_id").eq("user_id", user.id).in("creator_id", pageCreatorIds)
        : Promise.resolve({ data: [] }),
      (() => {
        const pollPostIds = merged
          .filter((p) => p.content_type === "poll")
          .map((p) => Number(p.id));
        return pollPostIds.length > 0
          ? service.from("polls")
              .select("id, post_id, question, total_votes, ends_at, poll_options (id, option_text, vote_count, display_order)")
              .in("post_id", pollPostIds)
          : Promise.resolve({ data: [] });
      })(),
    ]);

    const likedSet        = new Set((userLikes     ?? []).map((l: { post_id: number | string }) => Number(l.post_id)));
    const ppvUnlockedSet  = new Set((ppvUnlocksRaw ?? []).map((u: { post_id: number | string }) => Number(u.post_id)));
    const savedPostSet    = new Set((savedPostsRaw ?? []).map((s: { post_id: number | string }) => Number(s.post_id)));
    const savedCreatorSet = new Set((savedCreatorsRaw ?? []).map((s: { creator_id: string }) => s.creator_id));

    // ── Poll votes ────────────────────────────────────────────────────────
    const pollIds = (pollsRaw ?? []).map((p: { id: number }) => p.id);
    const { data: userVotesRaw } = pollIds.length > 0
      ? await service.from("poll_votes").select("poll_id, poll_option_id")
          .eq("user_id", user.id).in("poll_id", pollIds)
      : { data: [] as { poll_id: number; poll_option_id: number }[] };

    type PollOption = { id: number; option_text: string; vote_count: number; display_order: number };
    type PollData   = { id: number; question: string; total_votes: number; ends_at: string | null; options: PollOption[]; user_voted_option_id: number | null };

    const pollByPostId = new Map<number, PollData>();
    for (const poll of (pollsRaw ?? []) as { id: number; post_id: number; question: string; total_votes: number; ends_at: string | null; poll_options: PollOption[] }[]) {
      const options  = (poll.poll_options ?? []).sort((a, b) => a.display_order - b.display_order);
      const userVote = (userVotesRaw ?? []).find((v: { poll_id: number }) => v.poll_id === poll.id) as { poll_id: number; poll_option_id: number } | undefined;
      pollByPostId.set(poll.post_id, {
        id: poll.id, question: poll.question,
        total_votes: poll.total_votes ?? 0, ends_at: poll.ends_at ?? null,
        options, user_voted_option_id: userVote?.poll_option_id ?? null,
      });
    }

    // ── Process posts ─────────────────────────────────────────────────────
    const processed = merged.map((post) => {
      const isPpv        = post.is_ppv as boolean;
      const postId       = Number(post.id);
      const creatorId    = post.creator_id as string;
      const isSubscribed = subscribedSet.has(creatorId);
      const isRenewal    = lapsedSet.has(creatorId) && !isSubscribed;
      const canAccess    = isPpv
        ? ppvUnlockedSet.has(postId)
        : (isSubscribed || (post.audience as string) === "everyone");

      const mediaItems = ((post.media as Record<string, unknown>[]) ?? [])
        .sort((a, b) => (a.display_order as number) - (b.display_order as number))
        .map((m: Record<string, unknown>) => {
          const path     = extractBunnyPath(m.file_url as string | null);
          const freshUrl = canAccess && path ? signBunnyUrl(path) : null;
          const { bunnyVideoId, derivedThumb } = resolveVideoMedia(m);
          let freshThumb: string | null = null;
          if (m.media_type === "video") {
            const customPath = extractBunnyPath(m.thumbnail_url as string | null);
            freshThumb = customPath ? signBunnyUrl(customPath) : derivedThumb;
          } else {
            const thumbPath = extractBunnyPath(m.thumbnail_url as string | null);
            freshThumb = thumbPath ? signBunnyUrl(thumbPath) : null;
          }
          return { ...m, file_url: freshUrl, thumbnail_url: freshThumb, bunny_video_id: bunnyVideoId, locked: !canAccess };
        });

      return {
        ...post,
        media:         mediaItems,
        liked:         likedSet.has(postId),
        can_access:    canAccess,
        locked:        !canAccess,
        poll:          pollByPostId.get(postId) ?? null,
        saved_post:    savedPostSet.has(postId),
        saved_creator: savedCreatorSet.has(creatorId),
        is_subscribed: isSubscribed,
        is_renewal:    isRenewal,
      };
    });

    const res = NextResponse.json({
      posts:           processed,
      nextSubOffset,
      nextUnsubOffset,
      hasMore,
    });
    res.headers.set("Cache-Control", "private, s-maxage=30, stale-while-revalidate=60");
    return res;

  } catch (err) {
    console.error("[Feed:ERROR]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}