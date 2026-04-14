import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";
import type { StripCreator } from "@/components/explore/CreatorCard";
import type { VideoTileData } from "@/components/explore/VideoTile";
import type { IdentityCardData } from "@/components/explore/IdentityCard";

type FilterId = "all" | "trending" | "new" | "toprated" | "nigerian" | "photos" | "videos" | "most_subscribed";
type GridItem  = VideoTileData | IdentityCardData;

// ── Types ─────────────────────────────────────────────────────────────────────

interface CreatorProfile {
  id:               string;
  username:         string;
  display_name:     string | null;
  avatar_url:       string | null;
  banner_url:       string | null;
  subscriber_count: number;
  likes_count:      number;
  post_count:       number;
  categories:       string[];
  created_at:       string;
  country:          string | null;
  is_featured:      boolean;
}

interface UnwatchedVideo {
  post_id:          number;
  like_count:       number;
  comment_count:    number;
  thumbnail_url:    string | null;
  bunny_video_id:   string | null;
  duration_seconds: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function weightScore(c: CreatorProfile): number {
  return (
    (c.subscriber_count ?? 0) * 0.5 +
    (c.likes_count      ?? 0) * 0.3 +
    (c.post_count       ?? 0) * 0.2
  );
}

/** Deterministic Fisher-Yates shuffle using a numeric seed */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.abs(Math.floor(seed * (i + 1) * 1.6180339887)) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function weightedBucketShuffle(creators: CreatorProfile[], seed: number): CreatorProfile[] {
  const HIGH = creators.filter(c => weightScore(c) >= 50);
  const MED  = creators.filter(c => weightScore(c) >= 10 && weightScore(c) < 50);
  const LOW  = creators.filter(c => weightScore(c) < 10);
  return [
    ...seededShuffle(HIGH, seed),
    ...seededShuffle(MED,  seed + 1),
    ...seededShuffle(LOW,  seed + 2),
  ];
}

const PAGE_SIZE = 20;

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset)).toString("base64url");
}

function decodeCursor(cursor: string): number {
  try {
    return parseInt(Buffer.from(cursor, "base64url").toString("utf8"), 10) || 0;
  } catch {
    return 0;
  }
}

// ── GET /api/discover ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { user, error: authErr } = await getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter    = (searchParams.get("filter")  ?? "all") as FilterId;
    const search    = (searchParams.get("search")  ?? "").trim();
    const cursorRaw =  searchParams.get("cursor");
    const offset    = cursorRaw ? decodeCursor(cursorRaw) : 0;
    const isFirstPage = !cursorRaw;

    const service = createServiceSupabaseClient();

    // ── 1. Get subscribed creator IDs ─────────────────────────────────────────
    const { data: subs } = await service
      .from("subscriptions")
      .select("creator_id")
      .eq("fan_id", user.id)
      .eq("status", "active");

    const subscribedSet = new Set(
      (subs ?? []).map((s: { creator_id: string }) => s.creator_id)
    );

    // ── 2. Get viewed post IDs for this user ──────────────────────────────────
    const { data: viewedData } = await service
      .from("viewed_content")
      .select("post_id")
      .eq("user_id", user.id);

    const viewedPostIds = new Set(
      (viewedData ?? []).map((v: { post_id: number }) => Number(v.post_id))
    );

    // ── 3. Fetch all creators ─────────────────────────────────────────────────
    const { data: allCreators, error: creatorsErr } = await service
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, banner_url, subscriber_count, likes_count, post_count, categories, created_at, country, is_featured"
      )
      .eq("role", "creator")
      .eq("is_active", true)
      .eq("is_suspended", false)
      .limit(500);

    if (creatorsErr) {
      console.error("[Discover] creators fetch error:", creatorsErr.message);
      return NextResponse.json({ error: "Failed to fetch creators" }, { status: 500 });
    }

    // Exclude self + subscribed
    let eligible = (allCreators ?? [] as CreatorProfile[]).filter(
      (c: CreatorProfile) => c.id !== user.id && !subscribedSet.has(c.id)
    );

    // Apply text search
    if (search) {
      const q = search.toLowerCase();
      eligible = eligible.filter(
        (c: CreatorProfile) =>
          c.username?.toLowerCase().includes(q) ||
          c.display_name?.toLowerCase().includes(q)
      );
    }

    // Nigerian filter
    if (filter === "nigerian") {
      eligible = eligible.filter((c: CreatorProfile) =>
        c.country?.toLowerCase().includes("nigeria")
      );
    }

    // ── 4. Fetch all public posts for eligible creators ───────────────────────
    const eligibleIds = eligible.map((c: CreatorProfile) => c.id);

    const unwatchedVideoByCreator = new Map<string, UnwatchedVideo>();
    const creatorHasPublicVideo   = new Set<string>();
    const creatorHasPublicImage   = new Set<string>();

    if (eligibleIds.length > 0) {
      const { data: publicPosts } = await service
        .from("posts")
        .select(
          "id, creator_id, like_count, comment_count, published_at, media (media_type, thumbnail_url, duration_seconds, bunny_video_id, display_order)"
        )
        .in("creator_id", eligibleIds)
        .eq("is_published", true)
        .eq("is_deleted", false)
        .eq("audience", "everyone")
        .eq("is_ppv", false)
        .order("published_at", { ascending: false })
        .limit(2000);

      for (const post of publicPosts ?? []) {
        const postId = Number(post.id);
        const media  = (post.media ?? []) as Array<{
          media_type:       string;
          thumbnail_url:    string | null;
          duration_seconds: number | null;
          bunny_video_id:   string | null;
        }>;

        const videoM = media.find(m => m.media_type === "video");
        const imageM = media.find(m => m.media_type === "image");

        if (videoM) creatorHasPublicVideo.add(post.creator_id);
        if (imageM) creatorHasPublicImage.add(post.creator_id);

        if (!viewedPostIds.has(postId) && videoM && !unwatchedVideoByCreator.has(post.creator_id)) {
          unwatchedVideoByCreator.set(post.creator_id, {
            post_id:          postId,
            like_count:       post.like_count       ?? 0,
            comment_count:    post.comment_count    ?? 0,
            thumbnail_url:    videoM.thumbnail_url,
            bunny_video_id:   videoM.bunny_video_id,
            duration_seconds: videoM.duration_seconds,
          });
        }
      }
    }

    if (filter === "videos") eligible = eligible.filter(c => creatorHasPublicVideo.has(c.id));
    if (filter === "photos") eligible = eligible.filter(c => creatorHasPublicImage.has(c.id));

    // ── 5. Trending: fetch 7-day engagement ───────────────────────────────────
    const engagementMap = new Map<string, number>();
    if (filter === "trending") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentPosts } = await service
        .from("posts")
        .select("creator_id, like_count, comment_count")
        .gte("published_at", sevenDaysAgo)
        .eq("is_published", true)
        .eq("is_deleted", false);

      for (const p of recentPosts ?? []) {
        const curr = engagementMap.get(p.creator_id) ?? 0;
        engagementMap.set(p.creator_id, curr + (p.like_count ?? 0) + (p.comment_count ?? 0));
      }
    }

    // ── 6. Sort eligible creators ─────────────────────────────────────────────
    const fourHourSeed = Math.floor(Date.now() / (4 * 60 * 60 * 1000));

    switch (filter) {
      case "trending":
        eligible.sort((a, b) =>
          (engagementMap.get(b.id) ?? 0) - (engagementMap.get(a.id) ?? 0)
        );
        break;
      case "toprated":
        eligible.sort((a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0));
        break;
      case "new":
        eligible.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "most_subscribed":
        eligible.sort((a, b) => (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0));
        break;
      case "nigerian":
      case "all":
      case "photos":
      case "videos":
      default:
        eligible = weightedBucketShuffle(eligible, fourHourSeed);
        break;
    }

    // ── 7. Build GridItems ────────────────────────────────────────────────────
    const allGridItems: GridItem[] = eligible.map((creator: CreatorProfile) => {
      const unwatched = unwatchedVideoByCreator.get(creator.id);

      if (unwatched) {
        return {
          type:             "video"    as const,
          post_id:          unwatched.post_id,
          creator_id:       creator.id,
          username:         creator.username,
          display_name:     creator.display_name,
          avatar_url:       creator.avatar_url,
          thumbnail_url:    unwatched.thumbnail_url,
          bunny_video_id:   unwatched.bunny_video_id,
          like_count:       unwatched.like_count,
          comment_count:    unwatched.comment_count,
          duration_seconds: unwatched.duration_seconds,
        } satisfies VideoTileData;
      }

      return {
        type:             "identity" as const,
        creator_id:       creator.id,
        username:         creator.username,
        display_name:     creator.display_name,
        avatar_url:       creator.avatar_url,
        banner_url:       creator.banner_url,
        subscriber_count: creator.subscriber_count ?? 0,
        likes_count:      creator.likes_count      ?? 0,
        categories:       creator.categories       ?? [],
      } satisfies IdentityCardData;
    });

    // ── 8. Pagination ─────────────────────────────────────────────────────────
    const pageSlice  = allGridItems.slice(offset, offset + PAGE_SIZE);
    const nextOffset = offset + PAGE_SIZE;
    const nextCursor = nextOffset < allGridItems.length ? encodeCursor(nextOffset) : null;

    // ── 9. Build Featured Strip (first page only) ─────────────────────────────
    let strip: StripCreator[] | undefined;

    if (isFirstPage) {
      const daySeed = Math.floor(Date.now() / 86_400_000);

      let featuredPool = (allCreators as CreatorProfile[]).filter(
        c => c.is_featured && c.id !== user.id && !subscribedSet.has(c.id)
      );
      if (filter === "nigerian") {
        featuredPool = featuredPool.filter(c => c.country?.toLowerCase().includes("nigeria"));
      }

      const featured9    = seededShuffle(featuredPool, daySeed).slice(0, 9);
      const featured9Ids = new Set(featured9.map(c => c.id));

      let newestPool = (allCreators as CreatorProfile[])
        .filter(
          c =>
            !c.is_featured &&
            c.id !== user.id &&
            !subscribedSet.has(c.id) &&
            !featured9Ids.has(c.id)
        )
        .sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      if (filter === "nigerian") {
        newestPool = newestPool.filter(c => c.country?.toLowerCase().includes("nigeria"));
      }

      const newest3 = newestPool.slice(0, 3);

      strip = [
        ...featured9.map(c => ({
          creator_id:       c.id,
          username:         c.username,
          display_name:     c.display_name,
          avatar_url:       c.avatar_url,
          banner_url:       c.banner_url,
          subscriber_count: c.subscriber_count ?? 0,
          likes_count:      c.likes_count      ?? 0,
          is_featured:      true,
          is_new:           false,
        })),
        ...newest3.map(c => ({
          creator_id:       c.id,
          username:         c.username,
          display_name:     c.display_name,
          avatar_url:       c.avatar_url,
          banner_url:       c.banner_url,
          subscriber_count: c.subscriber_count ?? 0,
          likes_count:      c.likes_count      ?? 0,
          is_featured:      false,
          is_new:           true,
        })),
      ];
    }

    return NextResponse.json({
      ...(isFirstPage ? { strip } : {}),
      grid:       pageSlice,
      nextCursor,
    });
  } catch (err) {
    console.error("[Discover] unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}