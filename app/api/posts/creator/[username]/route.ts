import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { signBunnyUrl } from "@/lib/utils/bunny";

// Extract just the path from a stored Bunny URL (strips base + query params)
function extractBunnyPath(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    return url.startsWith("/") ? url : `/${url}`;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const service = createServiceSupabaseClient();

    // Get creator profile
    const { data: creator } = await service
      .from("profiles")
      .select("id, role")
      .eq("username", username)
      .single();

    if (!creator || creator.role !== "creator") {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    // Check if viewer is subscribed
    let isSubscribed = false;
    const isOwnProfile = user?.id === creator.id;

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

    // Fetch posts
    const { data: posts, error } = await service
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
          display_order,
          processing_status,
          bunny_video_id,
          raw_video_url
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

    // Get liked post IDs for the viewer
    const postIds = (posts ?? []).map((p: { id: number }) => p.id);
    let likedSet = new Set<number>();

    if (user && postIds.length > 0) {
      const { data: likes } = await service
        .from("likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      likedSet = new Set((likes ?? []).map((l: { post_id: number }) => l.post_id));
    }

    const processed = (posts ?? [])
      .filter((post: Record<string, unknown>) => {
        const mediaItems = post.media as Record<string, unknown>[] ?? [];
        const hasUnreadyVideo = mediaItems.some(
          (m) =>
            m.media_type === "video" &&
            m.processing_status !== "completed" &&
            m.processing_status !== null
        );
        return !hasUnreadyVideo;
      })
      .map((post: Record<string, unknown>) => {
        const isFree    = post.is_free as boolean;
        const isPpv     = post.is_ppv as boolean;
        const canAccess = isFree || (isSubscribed && !isPpv) || isOwnProfile;

        const mediaItems = (post.media as Record<string, unknown>[] ?? [])
          .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
            (a.display_order as number) - (b.display_order as number)
          )
          .map((m: Record<string, unknown>) => {
            // Re-sign file_url fresh on every request (24h expiry)
            const rawUrl   = m.file_url as string | null;
            const path     = extractBunnyPath(rawUrl);
            const freshUrl = canAccess && path ? signBunnyUrl(path) : null;

            // Re-sign thumbnail_url if present
            const rawThumb   = m.thumbnail_url as string | null;
            const thumbPath  = extractBunnyPath(rawThumb);
            const freshThumb = thumbPath ? signBunnyUrl(thumbPath) : null;

            // Re-sign locked_preview_url (blurred preview for non-subscribers)
            const rawPreview   = !canAccess ? (rawThumb ?? rawUrl) : null;
            const previewPath  = extractBunnyPath(rawPreview);
            const freshPreview = previewPath ? signBunnyUrl(previewPath) : null;

            return {
              ...m,
              file_url:           freshUrl,
              thumbnail_url:      freshThumb,
              locked_preview_url: !canAccess ? freshPreview : null,
              locked:             !canAccess,
            };
          });

        return {
          ...post,
          media:      mediaItems,
          liked:      likedSet.has(post.id as number),
          can_access: canAccess,
          locked:     !canAccess,
        };
      });

    return NextResponse.json({ posts: processed });

  } catch (err) {
    console.error("[Creator Posts] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}