// app/api/posts/home/route.ts
// Unified feed: subbed + unsubbed posts, same PAGE_SIZE, same sorting logic
import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";
import { signBunnyUrl } from "@/lib/utils/bunny";

const PAGE_SIZE = 20;
const STREAM_CDN_HOST = process.env.BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net";

const LAPSED_STATUSES = ["expired", "cancelled", "renewal_failed"];

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

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Per 10 slots: 4 sub + 6 unsub, positions randomized per batch
function weightedShuffle(subPosts: Record<string, unknown>[], unsubPosts: Record<string, unknown>[]): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  let si = 0, ui = 0;

  while (si < subPosts.length || ui < unsubPosts.length) {
    const subTake   = Math.min(4, subPosts.length - si);
    const unsubTake = Math.min(6, unsubPosts.length - ui);
    const batch     = shuffle([
      ...subPosts.slice(si, si + subTake),
      ...unsubPosts.slice(ui, ui + unsubTake),
    ]);
    si += subTake;
    ui += unsubTake;
    result.push(...batch);
  }
  return result;
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
    const page   = parseInt(searchParams.get("page") ?? "1");
    const offset = (page - 1) * PAGE_SIZE;
    const service = createServiceSupabaseClient();

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

    // ── Fetch subscribed posts + public teasers in parallel ───────────────
    const subPostsPromise = subscribedIds.length > 0
      ? service.from("posts").select(POST_SELECT)
          .eq("is_published", true).eq("is_deleted", false)
          .in("creator_id", subscribedIds)
          .neq("creator_id", user.id)
          .order("published_at", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)
      : Promise.resolve({ data: [] });

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    let unsubQuery = service.from("posts").select(POST_SELECT)
      .eq("is_published", true).eq("is_deleted", false)
      .eq("audience", "everyone")
      .neq("creator_id", user.id)
      .order("like_count", { ascending: false })
      .order("published_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (subscribedIds.length > 0)
      unsubQuery = unsubQuery.not("creator_id", "in", `(${subscribedIds.join(",")})`);

    const [{ data: rawSubPosts }, { data: rawUnsubPosts }] = await Promise.all([
      subPostsPromise,
      unsubQuery,
    ]);

    // ── Boost new creators to front of unsub pool ─────────────────────────
    const newCreatorPosts = (rawUnsubPosts ?? []).filter((p: Record<string, unknown>) => {
      const profile = p.profiles as Record<string, unknown> | null;
      return profile && (profile.created_at as string) > fortyEightHoursAgo;
    });
    const regularPosts = (rawUnsubPosts ?? []).filter((p: Record<string, unknown>) => {
      const profile = p.profiles as Record<string, unknown> | null;
      return !profile || (profile.created_at as string) <= fortyEightHoursAgo;
    });
    const sortedUnsubPosts = [...newCreatorPosts, ...regularPosts] as Record<string, unknown>[];

    // ── Filter out unready videos ─────────────────────────────────────────
    const filterReady = (posts: Record<string, unknown>[]) =>
      posts.filter((post) => {
        const mediaItems = (post.media as Record<string, unknown>[]) ?? [];
        return !mediaItems.some(
          (m) => m.media_type === "video" && m.processing_status !== "completed" && m.processing_status !== null
        );
      });

    const subPosts   = filterReady((rawSubPosts ?? []) as Record<string, unknown>[]);
    const unsubPosts = filterReady(sortedUnsubPosts);

    // ── Weighted shuffle: 4 sub + 6 unsub per batch ───────────────────────
    const merged = weightedShuffle(subPosts, unsubPosts);

    // ✅ FIX: use raw counts (before filterReady) so unready videos don't kill pagination
    const hasMore  = (rawSubPosts ?? []).length === PAGE_SIZE || (rawUnsubPosts ?? []).length === PAGE_SIZE;
    const nextPage = hasMore ? page + 1 : null;

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

    const res = NextResponse.json({ posts: processed, nextPage });
    res.headers.set("Cache-Control", "private, s-maxage=30, stale-while-revalidate=60");
    return res;

  } catch (err) {
    console.error("[Home:ERROR]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}