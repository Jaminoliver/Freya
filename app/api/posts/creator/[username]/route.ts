// app/api/posts/creator/[username]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";
import { signBunnyUrl } from "@/lib/utils/bunny";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const { user } = await getUser();
    const service = createServiceSupabaseClient();

    const { data: creator } = await service
      .from("profiles")
      .select("id, role")
      .eq("username", username)
      .single();

    if (!creator || creator.role !== "creator") {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    const isOwnProfile = user?.id === creator.id;
    let isSubscribed   = false;

    if (user && !isOwnProfile) {
      const { data: sub } = await service
        .from("subscriptions")
        .select("id")
        .eq("fan_id", user.id)
        .eq("creator_id", creator.id)
        .eq("status", "active")
        .maybeSingle();
      isSubscribed = !!sub;
    }

    if (isOwnProfile) isSubscribed = true;

    const { data: posts, error } = await service
      .from("posts")
      .select(`
        id,
        creator_id,
        content_type,
        caption,
        text_background,
        audience,
        is_free,
        is_ppv,
        ppv_price,
        like_count,
        comment_count,
        view_count,
        published_at,
        profiles!creator_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified,
          subscription_price
        ),
        media (
          id,
          media_type,
          file_url,
          thumbnail_url,
          display_order,
          processing_status,
          bunny_video_id,
          raw_video_url,
          blur_hash,
          width,
          height,
          aspect_ratio
        )
      `)
      .eq("creator_id", creator.id)
      .eq("is_published", true)
      .eq("is_deleted", false)
      .order("published_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Creator Posts] Query error:", error.message);
      return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }

    const postIds = (posts ?? []).map((p: { id: number }) => p.id);

    // ── Parallel batch: likes, ppv, polls (nested), saved ────────────────
    const likesPromise = user && postIds.length > 0
      ? service.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds)
      : Promise.resolve({ data: [] });

    const ppvUnlocksPromise = user && postIds.length > 0
      ? service.from("ppv_unlocks").select("post_id").eq("fan_id", user.id).in("post_id", postIds)
      : Promise.resolve({ data: [] });

    const savedPostsPromise = user && postIds.length > 0 && !isOwnProfile
      ? service.from("saved_posts").select("post_id").eq("user_id", user.id).in("post_id", postIds)
      : Promise.resolve({ data: [] });

    const savedCreatorPromise = user && !isOwnProfile
      ? service.from("saved_creators").select("creator_id").eq("user_id", user.id).eq("creator_id", creator.id)
      : Promise.resolve({ data: [] });

    // ── Tip totals — fetched for own profile OR active subscribers ────────
    const tipTotalsPromise = (isOwnProfile || isSubscribed) && postIds.length > 0
      ? service
          .from("tips")
          .select("post_id, amount")
          .in("post_id", postIds)
      : Promise.resolve({ data: [] });

    const pollPostIds = (posts ?? [])
      .filter((p: Record<string, unknown>) => p.content_type === "poll")
      .map((p: Record<string, unknown>) => Number(p.id));

    const pollsPromise = pollPostIds.length > 0
      ? service.from("polls")
          .select("id, post_id, question, total_votes, ends_at, poll_options (id, option_text, vote_count, display_order)")
          .in("post_id", pollPostIds)
      : Promise.resolve({ data: [] });

    const filteredPosts = (posts ?? []).filter((post: Record<string, unknown>) => {
      const mediaItems = post.media as Record<string, unknown>[] ?? [];
      const hasUnreadyVideo = mediaItems.some(
        (m) => m.media_type === "video" && m.processing_status !== "completed" && m.processing_status !== null
      );
      return !hasUnreadyVideo;
    });

    const [
      { data: likes },
      { data: ppvUnlocks },
      { data: pollsRaw },
      { data: savedPostsRaw },
      { data: savedCreatorRaw },
      { data: tipRowsRaw },
    ] = await Promise.all([
      likesPromise,
      ppvUnlocksPromise,
      pollsPromise,
      savedPostsPromise,
      savedCreatorPromise,
      tipTotalsPromise,
    ]);

    const likedSet    = new Set((likes ?? []).map((l: { post_id: number }) => l.post_id));
    const unlockedSet = new Set((ppvUnlocks ?? []).map((u: { post_id: number }) => u.post_id));
    const savedPostSet = new Set((savedPostsRaw ?? []).map((s: { post_id: number | string }) => Number(s.post_id)));
    const isSavedCreator = (savedCreatorRaw ?? []).length > 0;

    // ── Build tip total map (kobo) per post_id ────────────────────────────
    const tipTotalMap = new Map<number, number>();
    for (const row of (tipRowsRaw ?? []) as { post_id: number; amount: number }[]) {
      if (row.post_id == null) continue;
      tipTotalMap.set(row.post_id, (tipTotalMap.get(row.post_id) ?? 0) + row.amount);
    }

    const pollIds = (pollsRaw ?? []).map((p: { id: number }) => p.id);

    const { data: userVotesRaw } = pollIds.length > 0 && user
      ? await service.from("poll_votes").select("poll_id, poll_option_id").eq("user_id", user.id).in("poll_id", pollIds)
      : { data: [] as { poll_id: number; poll_option_id: number }[] };

    type PollOption = { id: number; option_text: string; vote_count: number; display_order: number };
    type PollData   = { id: number; question: string; total_votes: number; ends_at: string | null; options: PollOption[]; user_voted_option_id: number | null };

    const pollByPostId = new Map<number, PollData>();

    for (const poll of (pollsRaw ?? []) as { id: number; post_id: number; question: string; total_votes: number; ends_at: string | null; poll_options: { id: number; option_text: string; vote_count: number; display_order: number }[] }[]) {
      const options = (poll.poll_options ?? [])
        .sort((a, b) => a.display_order - b.display_order)
        .map((o) => ({ id: o.id, option_text: o.option_text, vote_count: o.vote_count, display_order: o.display_order }));

      const userVote = (userVotesRaw ?? []).find((v: { poll_id: number }) => v.poll_id === poll.id) as { poll_id: number; poll_option_id: number } | undefined;

      pollByPostId.set(poll.post_id, {
        id: poll.id, question: poll.question, total_votes: poll.total_votes ?? 0,
        ends_at: poll.ends_at ?? null, options, user_voted_option_id: userVote?.poll_option_id ?? null,
      });
    }

    const processed = filteredPosts.map((post: Record<string, unknown>) => {
      const isPpv        = post.is_ppv as boolean;
      const postAudience = post.audience as string;
      const postId       = post.id as number;

      const canAccess = isOwnProfile
        || (isPpv && unlockedSet.has(postId))
        || (!isPpv && (postAudience === "everyone" || isSubscribed));

      const mediaItems = (post.media as Record<string, unknown>[] ?? [])
        .sort((a, b) => (a.display_order as number) - (b.display_order as number))
        .map((m: Record<string, unknown>) => {
          const rawUrl   = m.file_url as string | null;
          const path     = extractBunnyPath(rawUrl);
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

          const rawPreview   = !canAccess ? (m.thumbnail_url as string | null ?? rawUrl) : null;
          const previewPath  = extractBunnyPath(rawPreview);
          const freshPreview = previewPath ? signBunnyUrl(previewPath) : null;

          return {
            ...m, file_url: freshUrl, thumbnail_url: freshThumb,
            bunny_video_id: bunnyVideoId, locked_preview_url: !canAccess ? freshPreview : null,
            locked: !canAccess,
          };
        });

      return {
        ...post, audience: postAudience, media: mediaItems,
        liked: likedSet.has(postId), can_access: canAccess, locked: !canAccess,
        poll: pollByPostId.get(postId) ?? null,
        saved_post: savedPostSet.has(postId),
        saved_creator: isSavedCreator,
        ...((isOwnProfile || isSubscribed) && { tip_total: tipTotalMap.get(postId) ?? 0 }),
      };
    });

    const res = NextResponse.json({ posts: processed, isSubscribed });
    res.headers.set("Cache-Control", "private, s-maxage=60, stale-while-revalidate=120");
    return res;

  } catch (err) {
    console.error("[Creator Posts] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}