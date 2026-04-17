// app/api/posts/feed/route.ts
// Unified feed: hot_score ordering (view) + fresh/hot split + per-creator cap + reserved fresh slots
import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";
import { signBunnyUrl } from "@/lib/utils/bunny";

const PAGE_SIZE          = 20;
const SUB_FETCH_SIZE     = 12;
const FRESH_FETCH_SIZE   = 8;
const HOT_FETCH_SIZE     = 14;
const RENEWAL_FETCH_SIZE = 8;
const STREAM_CDN_HOST    = process.env.BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net";

const LAPSED_STATUSES = ["expired", "cancelled", "renewal_failed"];

// Slot pattern per 10 slots: 4 sub + 2 fresh + 2 hot + 2 renewal
// Sub at 0,3,6,9 | Fresh at 1,7 | Hot at 2,5 | Renewal at 4,8
const SUB_SLOTS     = new Set([0, 3, 6, 9]);
const FRESH_SLOTS   = new Set([1, 7]);
const RENEWAL_SLOTS = new Set([4, 8]);

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
 * Deterministic interleave with per-creator cap (max 2 per creator per page).
 * Pattern per 10 slots: 4 sub + 2 fresh + 2 hot + 2 renewal.
 * Fallback order when primary pool is empty:
 *   sub slots    → hot > fresh
 *   fresh slots  → hot > sub
 *   renewal slots→ hot > sub
 *   hot slots    → fresh > sub
 */
function deterministicInterleave(
  subPosts: Record<string, unknown>[],
  freshPosts: Record<string, unknown>[],
  hotPosts: Record<string, unknown>[],
  renewalPosts: Record<string, unknown>[],
  limit: number
): {
  posts: Record<string, unknown>[];
  subConsumed: number;
  freshConsumed: number;
  hotConsumed: number;
  renewalConsumed: number;
} {
  const result: Record<string, unknown>[] = [];
  const creatorCounts = new Map<string, number>();
  const indices = { sub: 0, fresh: 0, hot: 0, renewal: 0 };

  const tryAdd = (
    pool: Record<string, unknown>[],
    key: "sub" | "fresh" | "hot" | "renewal"
  ): boolean => {
    while (indices[key] < pool.length) {
      const post = pool[indices[key]];
      const creatorId = post.creator_id as string;
      const count = creatorCounts.get(creatorId) ?? 0;
      if (count < 2) {
        result.push(post);
        creatorCounts.set(creatorId, count + 1);
        indices[key]++;
        return true;
      }
      indices[key]++;
    }
    return false;
  };

  let slot = 0;
  while (result.length < limit) {
    const slotType = slot % 10;
    let added = false;

    if (SUB_SLOTS.has(slotType)) {
      added = tryAdd(subPosts, "sub") || tryAdd(hotPosts, "hot") || tryAdd(freshPosts, "fresh");
    } else if (FRESH_SLOTS.has(slotType)) {
      added = tryAdd(freshPosts, "fresh") || tryAdd(hotPosts, "hot") || tryAdd(subPosts, "sub");
    } else if (RENEWAL_SLOTS.has(slotType)) {
      added = tryAdd(renewalPosts, "renewal") || tryAdd(hotPosts, "hot") || tryAdd(subPosts, "sub");
    } else {
      // hot slot
      added = tryAdd(hotPosts, "hot") || tryAdd(freshPosts, "fresh") || tryAdd(subPosts, "sub");
    }

    if (!added) break;
    slot++;
  }

  return {
    posts: result,
    subConsumed: indices.sub,
    freshConsumed: indices.fresh,
    hotConsumed: indices.hot,
    renewalConsumed: indices.renewal,
  };
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
    const subOffset     = Math.max(0, parseInt(searchParams.get("subOffset")     ?? "0"));
    const freshOffset   = Math.max(0, parseInt(searchParams.get("freshOffset")   ?? "0"));
    const hotOffset     = Math.max(0, parseInt(searchParams.get("hotOffset")     ?? "0"));
    const renewalOffset = Math.max(0, parseInt(searchParams.get("renewalOffset") ?? "0"));
    const service       = createServiceSupabaseClient();

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

    // ── Time boundaries ──────────────────────────────────────────────────
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // ── Sub pool: chronological from posts table ─────────────────────────
    const subPostsPromise = subscribedIds.length > 0
      ? service.from("posts").select(POST_SELECT)
          .eq("is_published", true).eq("is_deleted", false)
          .in("creator_id", subscribedIds)
          .neq("creator_id", user.id)
          .order("published_at", { ascending: false })
          .range(subOffset, subOffset + SUB_FETCH_SIZE - 1)
      : Promise.resolve({ data: [] });

    // ── Fresh pool: unsub posts < 24h, ordered by hot_score from view ────
    let freshQuery = service.from("posts_ranked").select(POST_SELECT)
      .eq("is_published", true).eq("is_deleted", false)
      .eq("audience", "everyone")
      .neq("creator_id", user.id)
      .gt("published_at", twentyFourHoursAgo)
      .order("hot_score", { ascending: false })
      .range(freshOffset, freshOffset + FRESH_FETCH_SIZE - 1);

    if (subscribedIds.length > 0)
      freshQuery = freshQuery.not("creator_id", "in", `(${subscribedIds.join(",")})`);
    if (lapsedIds.length > 0)
      freshQuery = freshQuery.not("creator_id", "in", `(${lapsedIds.join(",")})`);

    // ── Hot pool: unsub posts >= 24h, ordered by hot_score from view ─────
    let hotQuery = service.from("posts_ranked").select(POST_SELECT)
      .eq("is_published", true).eq("is_deleted", false)
      .eq("audience", "everyone")
      .neq("creator_id", user.id)
      .lte("published_at", twentyFourHoursAgo)
      .order("hot_score", { ascending: false })
      .range(hotOffset, hotOffset + HOT_FETCH_SIZE - 1);

    if (subscribedIds.length > 0)
      hotQuery = hotQuery.not("creator_id", "in", `(${subscribedIds.join(",")})`);
    if (lapsedIds.length > 0)
      hotQuery = hotQuery.not("creator_id", "in", `(${lapsedIds.join(",")})`);

    // ── Renewal pool: lapsed creator posts, ordered by hot_score ─────────
    const renewalPostsPromise = lapsedIds.length > 0
      ? service.from("posts_ranked").select(POST_SELECT)
          .eq("is_published", true).eq("is_deleted", false)
          .eq("audience", "everyone")
          .in("creator_id", lapsedIds)
          .order("hot_score", { ascending: false })
          .range(renewalOffset, renewalOffset + RENEWAL_FETCH_SIZE - 1)
      : Promise.resolve({ data: [] });

    const [
      { data: rawSubPosts },
      { data: rawFreshPosts },
      { data: rawHotPosts },
      { data: rawRenewalPosts },
    ] = await Promise.all([subPostsPromise, freshQuery, hotQuery, renewalPostsPromise]);

    const rawSubArr     = (rawSubPosts     ?? []) as Record<string, unknown>[];
    const rawFreshArr   = (rawFreshPosts   ?? []) as Record<string, unknown>[];
    const rawHotArr     = (rawHotPosts     ?? []) as Record<string, unknown>[];
    const rawRenewalArr = (rawRenewalPosts ?? []) as Record<string, unknown>[];

    // ── Boost new-creator (<48h old account) posts to front of hot pool ──
    const newCreatorHot = rawHotArr.filter((p) => {
      const profile = p.profiles as Record<string, unknown> | null;
      return profile && (profile.created_at as string) > fortyEightHoursAgo;
    });
    const regularHot = rawHotArr.filter((p) => {
      const profile = p.profiles as Record<string, unknown> | null;
      return !profile || (profile.created_at as string) <= fortyEightHoursAgo;
    });
    const sortedHotRaw = [...newCreatorHot, ...regularHot];

    // ── Filter unready videos ────────────────────────────────────────────
    const subReady     = filterReady(rawSubArr);
    const freshReady   = filterReady(rawFreshArr);
    const hotReady     = filterReady(sortedHotRaw);
    const renewalReady = filterReady(rawRenewalArr);

    // ── Interleave: 4 sub + 2 fresh + 2 hot + 2 renewal per 10 slots ────
    const { posts: merged, subConsumed, freshConsumed, hotConsumed, renewalConsumed } =
      deterministicInterleave(subReady, freshReady, hotReady, renewalReady, PAGE_SIZE);

    // ── Pagination cursors: advance by consumed (not fetched) ────────────
    const nextSubOffset     = subOffset     + subConsumed;
    const nextFreshOffset   = freshOffset   + freshConsumed;
    const nextHotOffset     = hotOffset     + hotConsumed;
    const nextRenewalOffset = renewalOffset + renewalConsumed;

    const subHasMore     = rawSubArr.length     === SUB_FETCH_SIZE;
    const freshHasMore   = rawFreshArr.length   === FRESH_FETCH_SIZE;
    const hotHasMore     = rawHotArr.length     === HOT_FETCH_SIZE;
    const renewalHasMore = rawRenewalArr.length === RENEWAL_FETCH_SIZE;
    const hasMore        = (subHasMore || freshHasMore || hotHasMore || renewalHasMore) && merged.length > 0;

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
      posts:             processed,
      nextSubOffset,
      nextFreshOffset,
      nextHotOffset,
      nextRenewalOffset,
      hasMore,
    });
    res.headers.set("Cache-Control", "private, s-maxage=30, stale-while-revalidate=60");
    return res;

  } catch (err) {
    console.error("[Feed:ERROR]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}