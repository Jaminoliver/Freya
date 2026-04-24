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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }   = await params;
    const postId   = Number(id);
    if (isNaN(postId)) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });

    // ── FIX: use getUser() directly instead of createServerSupabaseClient ──
    const { user } = await getUser();
    const service = createServiceSupabaseClient();

    const { data: post, error } = await service
      .from("posts")
      .select(`
        id,
        creator_id,
        content_type,
        caption,
        text_background,
        is_free,
        audience,
        is_ppv,
        ppv_price,
        like_count,
        comment_count,
        view_count,
        published_at,
        created_at,
        profiles!creator_id (
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
          raw_video_url,
          bunny_video_id,
          processing_status,
          duration_seconds,
          width,
          height,
          aspect_ratio,
          display_order,
          blur_hash
        )
      `)
      .eq("id", postId)
      .eq("is_published", true)
      .eq("is_deleted", false)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // ── OPTIMIZED: all access checks + like + poll in ONE parallel batch ──
    // Was 6 sequential queries: sub → ppv → like → poll → options → votes
    const isOwnPost = user?.id === post.creator_id;
    const isPoll    = post.content_type === "poll";

    const [subResult, ppvResult, likeResult, pollResult] = await Promise.all([
      // Subscription check
      user && !isOwnPost
        ? service.from("subscriptions").select("id").eq("fan_id", user.id).eq("creator_id", post.creator_id).eq("status", "active").maybeSingle()
        : Promise.resolve({ data: null }),

      // PPV unlock check
      user && post.is_ppv
        ? service.from("ppv_unlocks").select("id").eq("fan_id", user.id).eq("post_id", postId).maybeSingle()
        : Promise.resolve({ data: null }),

      // Like check
      user
        ? service.from("likes").select("id").eq("user_id", user.id).eq("post_id", postId).maybeSingle()
        : Promise.resolve({ data: null }),

      // Poll with nested options (single query instead of 2)
      isPoll
        ? service.from("polls").select("id, question, total_votes, ends_at, poll_options (id, option_text, vote_count, display_order)").eq("post_id", postId).single()
        : Promise.resolve({ data: null }),
    ]);

    // Determine access
    let canAccess = false;
    if (isOwnPost) canAccess = true;
    else if (post.is_ppv && ppvResult.data) canAccess = true;
    else if (!post.is_ppv && post.audience === "everyone") canAccess = true;
    else if (!post.is_ppv && subResult.data) canAccess = true;

    const liked = !!likeResult.data;

    // ── Fire post_views WITHOUT awaiting — don't block response ──────────
    if (user) {
      Promise.resolve(
        service
          .from("post_views")
          .upsert({ post_id: postId, user_id: user.id }, { onConflict: "post_id,user_id" })
      )
        .then(() => {})
        .catch(() => {});
    }

    // Process media
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
        return {
          ...m,
          file_url:          freshUrl,
          thumbnail_url:     freshThumb,
          bunny_video_id:    bunnyVideoId,
          raw_video_url:     canAccess ? m.raw_video_url : null,
          processing_status: m.processing_status,
          locked:            !canAccess,
        };
      });

    // Build poll data
    let pollData: {
      id: number;
      question: string;
      total_votes: number;
      ends_at: string | null;
      options: { id: number; option_text: string; vote_count: number; display_order: number }[];
      user_voted_option_id: number | null;
    } | null = null;

    if (isPoll && pollResult.data) {
      const poll = pollResult.data as {
        id: number; question: string; total_votes: number; ends_at: string | null;
        poll_options: { id: number; option_text: string; vote_count: number; display_order: number }[];
      };

      // Single follow-up: user's vote (only if poll exists and user is logged in)
      let userVotedOptionId: number | null = null;
      if (user) {
        const { data: vote } = await service
          .from("poll_votes")
          .select("poll_option_id")
          .eq("poll_id", poll.id)
          .eq("user_id", user.id)
          .maybeSingle();
        userVotedOptionId = vote?.poll_option_id ?? null;
      }

      pollData = {
        id:                   poll.id,
        question:             poll.question,
        total_votes:          poll.total_votes ?? 0,
        ends_at:              poll.ends_at ?? null,
        options:              (poll.poll_options ?? []).sort((a, b) => a.display_order - b.display_order),
        user_voted_option_id: userVotedOptionId,
      };
    }

    const res = NextResponse.json({
      post: {
        ...post,
        media:      mediaItems,
        liked,
        can_access: canAccess,
        locked:     !canAccess,
        poll_data:  pollData,
      },
    });

    // ── Cache: short cache for single posts, user-specific ──────────────
    res.headers.set("Cache-Control", "no-store");

    return res;

  } catch (err) {
    console.error("[Single Post] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }  = await params;
    const postId  = Number(id);
    if (isNaN(postId)) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });

    const { user } = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const service = createServiceSupabaseClient();

    const { data: post } = await service
      .from("posts")
      .select("creator_id")
      .eq("id", postId)
      .single();

    if (!post || post.creator_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    if ("caption" in body) {
      updates.caption = typeof body.caption === "string" ? body.caption.trim() : null;
    }

    if ("is_ppv" in body) {
      updates.is_ppv = !!body.is_ppv;
      if (updates.is_ppv) updates.is_free = false;
    }

    if ("ppv_price" in body) {
      const price = Number(body.ppv_price);
      updates.ppv_price = isNaN(price) ? null : price;
    }

    const { error } = await service
      .from("posts")
      .update(updates)
      .eq("id", postId);

    if (error) {
      console.error("[PATCH Post] Supabase error:", error.message);
      return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...updates });

  } catch (err) {
    console.error("[PATCH Post] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}