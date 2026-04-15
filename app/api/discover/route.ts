import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";
import type { StripCreator } from "@/components/explore/CreatorCard";
import type { VideoTileData } from "@/components/explore/VideoTile";
import type { IdentityCardData } from "@/components/explore/IdentityCard";

type FilterId =
  | "all"
  | "trending"
  | "new"
  | "toprated"
  | "nigerian"
  | "photos"
  | "videos"
  | "most_subscribed";

type GridItem = VideoTileData | IdentityCardData;

// ── Types ─────────────────────────────────────────────────────────────────────

interface CreatorProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  subscriber_count: number;
  likes_count: number;
  post_count: number;
  categories: string[];
  created_at: string;
  country: string | null;
}

interface CreatorVideo {
  post_id: number;
  like_count: number;
  comment_count: number;
  thumbnail_url: string | null;
  bunny_video_id: string | null;
  duration_seconds: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Deterministic Fisher-Yates shuffle using a numeric seed */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j =
      Math.abs(Math.floor(seed * (i + 1) * 1.6180339887)) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset)).toString("base64url");
}

function decodeCursor(cursor: string): number {
  try {
    return (
      parseInt(Buffer.from(cursor, "base64url").toString("utf8"), 10) || 0
    );
  } catch {
    return 0;
  }
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ── GET /api/discover ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { user, error: authErr } = await getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = (searchParams.get("filter") ?? "all") as FilterId;
    const search = (searchParams.get("search") ?? "").trim();
    const cursorRaw = searchParams.get("cursor");
    const offset = cursorRaw ? decodeCursor(cursorRaw) : 0;

    const service = createServiceSupabaseClient();

    // ── 1. Subscribed creator IDs ───────────────────────────────────────────
    const { data: subs } = await service
      .from("subscriptions")
      .select("creator_id")
      .eq("fan_id", user.id)
      .eq("status", "active");

    const subscribedSet = new Set(
      (subs ?? []).map((s: { creator_id: string }) => s.creator_id)
    );

    // ── 2. Fetch all creators ───────────────────────────────────────────────
    const { data: allCreators, error: creatorsErr } = await service
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, banner_url, subscriber_count, likes_count, post_count, categories, created_at, country"
      )
      .eq("role", "creator")
      .eq("is_active", true)
      .eq("is_suspended", false)
      .limit(500);

    if (creatorsErr) {
      console.error("[Discover] creators fetch error:", creatorsErr.message);
      return NextResponse.json(
        { error: "Failed to fetch creators" },
        { status: 500 }
      );
    }

    // Exclude self + subscribed
    let eligible = ((allCreators ?? []) as CreatorProfile[]).filter(
      (c) => c.id !== user.id && !subscribedSet.has(c.id)
    );

    // Text search
    if (search) {
      const q = search.toLowerCase();
      eligible = eligible.filter(
        (c) =>
          c.username?.toLowerCase().includes(q) ||
          c.display_name?.toLowerCase().includes(q)
      );
    }

    // Nigerian filter
    if (filter === "nigerian") {
      eligible = eligible.filter((c) =>
        c.country?.toLowerCase().includes("nigeria")
      );
    }

    // ── 3. Fetch latest public video per eligible creator ───────────────────
    const eligibleIds = eligible.map((c) => c.id);

    const latestVideoByCreator = new Map<string, CreatorVideo>();
    const creatorHasPublicVideo = new Set<string>();
    const creatorHasPublicImage = new Set<string>();

    if (eligibleIds.length > 0) {
      const { data: publicPosts } = await service
        .from("posts")
        .select(
          "id, creator_id, like_count, comment_count, published_at, media (media_type, thumbnail_url, duration_seconds, bunny_video_id)"
        )
        .in("creator_id", eligibleIds)
        .eq("is_published", true)
        .eq("is_deleted", false)
        .eq("audience", "everyone")
        .eq("is_ppv", false)
        .order("published_at", { ascending: false })
        .limit(2000);

      for (const post of publicPosts ?? []) {
        const media = (post.media ?? []) as Array<{
          media_type: string;
          thumbnail_url: string | null;
          duration_seconds: number | null;
          bunny_video_id: string | null;
        }>;

        const videoM = media.find((m) => m.media_type === "video");
        const imageM = media.find(
          (m) => m.media_type === "photo" || m.media_type === "image"
        );

        if (videoM) creatorHasPublicVideo.add(post.creator_id);
        if (imageM) creatorHasPublicImage.add(post.creator_id);

        // Store the FIRST (most recent) video per creator — not filtered by viewed
        if (videoM && !latestVideoByCreator.has(post.creator_id)) {
          latestVideoByCreator.set(post.creator_id, {
            post_id: Number(post.id),
            like_count: post.like_count ?? 0,
            comment_count: post.comment_count ?? 0,
            thumbnail_url: videoM.thumbnail_url,
            bunny_video_id: videoM.bunny_video_id,
            duration_seconds: videoM.duration_seconds,
          });
        }
      }
    }

    // Media-type filters
    if (filter === "videos")
      eligible = eligible.filter((c) => creatorHasPublicVideo.has(c.id));
    if (filter === "photos")
      eligible = eligible.filter((c) => creatorHasPublicImage.has(c.id));

    // ── 4. Trending: 7-day engagement (scoped to eligible only) ─────────────
    const engagementMap = new Map<string, number>();

    if (filter === "trending") {
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data: recentPosts } = await service
        .from("posts")
        .select("creator_id, like_count, comment_count")
        .in("creator_id", eligibleIds)
        .gte("published_at", sevenDaysAgo)
        .eq("is_published", true)
        .eq("is_deleted", false);

      for (const p of recentPosts ?? []) {
        const curr = engagementMap.get(p.creator_id) ?? 0;
        engagementMap.set(
          p.creator_id,
          curr + (p.like_count ?? 0) + (p.comment_count ?? 0)
        );
      }

      // Fallback: if no 7-day engagement data, use all-time likes
      if (engagementMap.size === 0) {
        for (const c of eligible) {
          engagementMap.set(c.id, (c.likes_count ?? 0) + (c.post_count ?? 0));
        }
      }
    }

    // ── 5. Sort eligible creators ───────────────────────────────────────────
    const oneHourSeed = Math.floor(Date.now() / (60 * 60 * 1000));
    const now = Date.now();

    switch (filter) {
      case "trending":
        eligible.sort(
          (a, b) =>
            (engagementMap.get(b.id) ?? 0) - (engagementMap.get(a.id) ?? 0)
        );
        break;

      case "toprated":
        eligible.sort(
          (a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0)
        );
        break;

      case "new":
        eligible.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
        break;

      case "most_subscribed":
        eligible.sort(
          (a, b) =>
            (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0)
        );
        break;

      // all, nigerian, photos, videos — new creators first, rest shuffled
      default: {
        const fresh = eligible.filter(
          (c) => now - new Date(c.created_at).getTime() < THIRTY_DAYS_MS
        );
        const rest = eligible.filter(
          (c) => now - new Date(c.created_at).getTime() >= THIRTY_DAYS_MS
        );
        eligible = [
          ...seededShuffle(fresh, oneHourSeed),
          ...seededShuffle(rest, oneHourSeed + 1),
        ];
        break;
      }
    }

    // ── 6. Build grid items ─────────────────────────────────────────────────
    // Consistent type: creator has ANY public video → VideoTile, else IdentityCard
    const allGridItems: GridItem[] = eligible.map((creator) => {
      const video = latestVideoByCreator.get(creator.id);

      if (video) {
        return {
          type: "video" as const,
          post_id: video.post_id,
          creator_id: creator.id,
          username: creator.username,
          display_name: creator.display_name,
          avatar_url: creator.avatar_url,
          thumbnail_url: video.bunny_video_id ? `https://vz-8bc100f4-3c0.b-cdn.net/${video.bunny_video_id}/thumbnail.jpg` : video.thumbnail_url,
          bunny_video_id: video.bunny_video_id,
          like_count: video.like_count,
          comment_count: video.comment_count,
          duration_seconds: video.duration_seconds,
          subscriber_count: creator.subscriber_count ?? 0,
          likes_count: creator.likes_count ?? 0,
        } satisfies VideoTileData;
      }

      return {
        type: "identity" as const,
        creator_id: creator.id,
        username: creator.username,
        display_name: creator.display_name,
        avatar_url: creator.avatar_url,
        banner_url: creator.banner_url,
        subscriber_count: creator.subscriber_count ?? 0,
        likes_count: creator.likes_count ?? 0,
        categories: creator.categories ?? [],
      } satisfies IdentityCardData;
    });

    // ── 7. Pagination (dynamic page size) ───────────────────────────────────
    const pageSize = Math.min(20, Math.max(allGridItems.length, 6));
    const pageSlice = allGridItems.slice(offset, offset + pageSize);
    const nextOffset = offset + pageSize;
    const nextCursor =
      nextOffset < allGridItems.length ? encodeCursor(nextOffset) : null;

    // ── 8. Featured strip (always returned) ──────────────────────────────────

    console.log("[Discover] sample grid:", JSON.stringify(pageSlice.slice(0, 3), null, 2));
    // All eligible creators, shuffled daily, up to 12
    const daySeed = Math.floor(Date.now() / 86_400_000);

    let stripPool = ((allCreators ?? []) as CreatorProfile[]).filter(
      (c) => c.id !== user.id && !subscribedSet.has(c.id)
    );

    if (filter === "nigerian") {
      stripPool = stripPool.filter((c) =>
        c.country?.toLowerCase().includes("nigeria")
      );
    }

    if (search) {
      const q = search.toLowerCase();
      stripPool = stripPool.filter(
        (c) =>
          c.username?.toLowerCase().includes(q) ||
          c.display_name?.toLowerCase().includes(q)
      );
    }

    const shuffled = seededShuffle(stripPool, daySeed).slice(0, 12);

    const strip: StripCreator[] = shuffled.map((c) => {
      const isNew = now - new Date(c.created_at).getTime() < THIRTY_DAYS_MS;
      const video = latestVideoByCreator.get(c.id);

      return {
        creator_id: c.id,
        username: c.username,
        display_name: c.display_name,
        avatar_url: c.avatar_url,
        banner_url: c.banner_url,
        subscriber_count: c.subscriber_count ?? 0,
        likes_count: c.likes_count ?? 0,
        is_featured: false,
        is_new: isNew,
      };
    });

    return NextResponse.json({
      strip,
      grid: pageSlice,
      nextCursor,
    });
  } catch (err) {
    console.error("[Discover] unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}