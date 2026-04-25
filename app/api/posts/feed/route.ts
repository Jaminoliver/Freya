// app/api/posts/feed/route.ts
// Unified feed: hot_score (view) + fresh/hot split + weighted shuffle + scattered slots
// + per-creator cap + leftover queue (no posts lost)
import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";
import { signBunnyUrl } from "@/lib/utils/bunny";

const PAGE_SIZE        = 20;
const SUB_FETCH_SIZE   = 40;
const FRESH_FETCH_SIZE = 30;
const HOT_FETCH_SIZE   = 50;
const GRAVITY          = 1.2;   // Must match posts_ranked view definition
const STREAM_CDN_HOST  = process.env.BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net";

const LAPSED_STATUSES = ["expired", "cancelled", "renewal_failed"];

// Slot template per 10 slots: 4 sub + 2 fresh + 4 hot (positions randomized per user)
type SlotType = "sub" | "fresh" | "hot";
const SLOT_TEMPLATE: SlotType[] = ["sub","sub","sub","sub","fresh","fresh","hot","hot","hot","hot"];

// ── Deterministic PRNG helpers ──────────────────────────────────────────
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A-Res weighted reservoir sampling. Higher-weight items tend to come first
 * but lower-weight items still get a real chance. Same seed = same order per user.
 * sqrt-softened so scores don't produce near-deterministic ordering.
 */
function weightedShuffle<T>(items: T[], weightFn: (t: T) => number, rng: () => number): T[] {
  return items
    .map((item) => {
      const w   = Math.max(weightFn(item), 1e-9);
      const key = Math.pow(rng(), 1 / Math.sqrt(w));
      return { item, key };
    })
    .sort((a, b) => b.key - a.key)
    .map((x) => x.item);
}

function computeHotScore(p: Record<string, unknown>): number {
  const likes       = Number(p.like_count    ?? 0);
  const comments    = Number(p.comment_count ?? 0);
  const publishedMs = new Date(p.published_at as string).getTime();
  const ageHours    = Math.max(0, (Date.now() - publishedMs) / 3600000);
  return Math.log(1 + likes + 2 * comments) / Math.pow(ageHours + 2, GRAVITY);
}

// ── Bunny helpers ───────────────────────────────────────────────────────
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
 * Interleave with scattered slot positions + per-creator cap (max 2 per PAGE_SIZE slots).
 * Posts that exceed the cap are collected into a leftover queue and appended after.
 * Per 10-slot cycle: 4 sub + 2 fresh + 4 hot, but slot POSITIONS are shuffled per cycle.
 * When a slot's primary pool is empty, falls back to other pools.
 * NO posts are ever lost — all appear either in the interleaved section or the leftover queue.
 */
function deterministicInterleave(
  subPosts: Record<string, unknown>[],
  freshPosts: Record<string, unknown>[],
  hotPosts: Record<string, unknown>[],
  limit: number,
  rng: () => number
): {
  posts: Record<string, unknown>[];
  subConsumed: number;
  freshConsumed: number;
  hotConsumed: number;
} {
  // Build randomized slot assignments per 10-slot cycle (scatter)
  const cyclesNeeded = Math.ceil(limit / 10);
  const slotTypes: SlotType[] = [];
  for (let c = 0; c < cyclesNeeded; c++) {
    slotTypes.push(...seededShuffle(SLOT_TEMPLATE, rng));
  }

  const result: Record<string, unknown>[] = [];
  const leftovers: Record<string, unknown>[] = [];
  const creatorCounts = new Map<string, number>();
  const used = new Set<unknown>();

  const indices = { sub: 0, fresh: 0, hot: 0 };
  const pools   = { sub: subPosts, fresh: freshPosts, hot: hotPosts };

  const tryAdd = (key: SlotType): boolean => {
    const pool = pools[key];
    while (indices[key] < pool.length) {
      const post   = pool[indices[key]];
      const postId = post.id;
      indices[key]++;
      if (used.has(postId)) continue;
      used.add(postId);
      const creatorId = post.creator_id as string;
      const count     = creatorCounts.get(creatorId) ?? 0;
      if (count < 2) {
        result.push(post);
        creatorCounts.set(creatorId, count + 1);
        return true;
      } else {
        // Creator capped — queue for leftovers, don't lose the post
        leftovers.push(post);
      }
    }
    return false;
  };

  for (let i = 0; i < limit; i++) {
    const primary = slotTypes[i];
    let added = false;

    if (primary === "sub") {
      added = tryAdd("sub") || tryAdd("hot") || tryAdd("fresh");
    } else if (primary === "fresh") {
      added = tryAdd("fresh") || tryAdd("hot") || tryAdd("sub");
    } else {
      // hot slot
      added = tryAdd("hot") || tryAdd("fresh") || tryAdd("sub");
    }

    if (!added) break;
  }

  // Drain remaining unvisited posts from all pools into leftovers
  for (; indices.sub < subPosts.length; indices.sub++) {
    const post = subPosts[indices.sub];
    if (!used.has(post.id)) { used.add(post.id); leftovers.push(post); }
  }
  for (; indices.fresh < freshPosts.length; indices.fresh++) {
    const post = freshPosts[indices.fresh];
    if (!used.has(post.id)) { used.add(post.id); leftovers.push(post); }
  }
  for (; indices.hot < hotPosts.length; indices.hot++) {
    const post = hotPosts[indices.hot];
    if (!used.has(post.id)) { used.add(post.id); leftovers.push(post); }
  }

  // Append leftovers after the interleaved page
  const allPosts = [...result, ...leftovers];

  return {
    posts: allPosts,
    subConsumed:   indices.sub,
    freshConsumed: indices.fresh,
    hotConsumed:   indices.hot,
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
    const subOffset   = Math.max(0, parseInt(searchParams.get("subOffset")   ?? "0"));
    const freshOffset = Math.max(0, parseInt(searchParams.get("freshOffset") ?? "0"));
    const hotOffset   = Math.max(0, parseInt(searchParams.get("hotOffset")   ?? "0"));
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

    const [
      { data: rawSubPosts },
      { data: rawFreshPosts },
      { data: rawHotPosts },
    ] = await Promise.all([subPostsPromise, freshQuery, hotQuery]);

    const rawSubArr   = (rawSubPosts   ?? []) as Record<string, unknown>[];
    const rawFreshArr = (rawFreshPosts ?? []) as Record<string, unknown>[];
    const rawHotArr   = (rawHotPosts   ?? []) as Record<string, unknown>[];

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
    const subReady   = filterReady(rawSubArr);
    const freshReady = filterReady(rawFreshArr);
    const hotReady   = filterReady(sortedHotRaw);

    // ── Seed PRNG from user.id; weighted-shuffle fresh + hot pools ───────
    // Sub pool stays chronological (subscription promise intact)
    const rng = mulberry32(hashString(user.id));
    const freshShuffled = weightedShuffle(freshReady, computeHotScore, rng);
    const hotShuffled   = weightedShuffle(hotReady,   computeHotScore, rng);

    // ── Interleave with scattered slot positions + creator cap + leftover ─
    const { posts: merged, subConsumed, freshConsumed, hotConsumed } =
      deterministicInterleave(subReady, freshShuffled, hotShuffled, PAGE_SIZE, rng);

    // ── Pagination cursors: advance by rows actually consumed ────────────
    const nextSubOffset   = subOffset   + subConsumed;
    const nextFreshOffset = freshOffset + freshConsumed;
    const nextHotOffset   = hotOffset   + hotConsumed;

    const subHasMore   = rawSubArr.length   === SUB_FETCH_SIZE;
    const freshHasMore = rawFreshArr.length === FRESH_FETCH_SIZE;
    const hotHasMore   = rawHotArr.length   === HOT_FETCH_SIZE;
    const hasMore      = (subHasMore || freshHasMore || hotHasMore) && merged.length > 0;

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
            // Detect which CDN the stored thumbnail is on
            const stored = m.thumbnail_url as string | null;
            if (stored) {
              try {
                const parsedHost = new URL(stored).host;
                if (parsedHost === STREAM_CDN_HOST) {
                  // Auto-generated by Bunny Stream — use as-is
                  freshThumb = stored;
                } else {
                  // Custom upload on regular CDN — re-sign for fresh token
                  const customPath = extractBunnyPath(stored);
                  freshThumb = customPath ? signBunnyUrl(customPath) : null;
                }
              } catch {
                const customPath = extractBunnyPath(stored);
                freshThumb = customPath ? signBunnyUrl(customPath) : null;
              }
            } else {
              freshThumb = derivedThumb;
            }
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
      nextFreshOffset,
      nextHotOffset,
      hasMore,
    });
    res.headers.set("Cache-Control", "private, s-maxage=30, stale-while-revalidate=60");
    return res;

  } catch (err) {
    console.error("[Feed:ERROR]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}