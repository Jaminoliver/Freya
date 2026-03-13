import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
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

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const service = createServiceSupabaseClient();

    const { data: post, error } = await service
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

    let canAccess = post.is_free;

    if (user && !canAccess) {
      const { data: sub } = await service
        .from("subscriptions")
        .select("id")
        .eq("fan_id", user.id)
        .eq("creator_id", post.creator_id)
        .in("status", ["active", "ACTIVE"])
        .maybeSingle();

      if (sub && !post.is_ppv) canAccess = true;
      if (user.id === post.creator_id) canAccess = true;
    }

    let liked = false;
    if (user) {
      const { data: likeRow } = await service
        .from("likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .maybeSingle();
      liked = !!likeRow;
    }

    if (user) {
      await service
        .from("post_views")
        .upsert({ post_id: postId, user_id: user.id }, { onConflict: "post_id,user_id" });
    }

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
          file_url:          freshUrl,
          thumbnail_url:     freshThumb,
          bunny_video_id:    bunnyVideoId,
          raw_video_url:     canAccess ? m.raw_video_url : null,
          processing_status: m.processing_status,
          locked:            !canAccess,
        };
      });

    let pollData: {
      id: number;
      question: string;
      total_votes: number;
      ends_at: string | null;
      options: { id: number; option_text: string; vote_count: number; display_order: number }[];
      user_voted_option_id: number | null;
    } | null = null;

    if (post.content_type === "poll") {
      const { data: poll } = await service
        .from("polls")
        .select("id, question, total_votes, ends_at")
        .eq("post_id", postId)
        .single();

      if (poll) {
        const { data: options } = await service
          .from("poll_options")
          .select("id, option_text, vote_count, display_order")
          .eq("poll_id", poll.id)
          .order("display_order");

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
          options:              options ?? [],
          user_voted_option_id: userVotedOptionId,
        };
      }
    }

    return NextResponse.json({
      post: {
        ...post,
        media:      mediaItems,
        liked,
        can_access: canAccess,
        locked:     !canAccess,
        poll:       pollData,
      },
    });

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

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
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

    // Build update payload — only include fields that were sent
    const updates: Record<string, unknown> = {};

    if ("caption" in body) {
      updates.caption = typeof body.caption === "string" ? body.caption.trim() : null;
    }

    if ("is_ppv" in body) {
      updates.is_ppv = !!body.is_ppv;
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }   = await params;
    const postId   = Number(id);
    if (isNaN(postId)) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceSupabaseClient();

    const { data: post } = await service
      .from("posts")
      .select("creator_id")
      .eq("id", postId)
      .single();

    if (!post || post.creator_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await service
      .from("posts")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", postId);

    await service.rpc("decrement_post_count", { user_id: user.id });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[Delete Post] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}