import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

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
          display_order
        )
      `)
      .eq("id", postId)
      .eq("is_published", true)
      .eq("is_deleted", false)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Determine access
    let canAccess = post.is_free;

    if (user && !canAccess) {
      const { data: sub } = await service
        .from("subscriptions")
        .select("id")
        .eq("fan_id", user.id)
        .eq("creator_id", post.creator_id)
        .eq("status", "ACTIVE")
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
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        (a.display_order as number) - (b.display_order as number)
      )
      .map((m: Record<string, unknown>) => ({
        ...m,
        file_url:         canAccess ? m.file_url : null,
        raw_video_url:    canAccess ? m.raw_video_url : null,
        bunny_video_id:   canAccess ? m.bunny_video_id : null,
        thumbnail_url:    m.thumbnail_url,
        processing_status: m.processing_status,
        locked:           !canAccess,
      }));

    return NextResponse.json({
      post: {
        ...post,
        media:      mediaItems,
        liked,
        can_access: canAccess,
        locked:     !canAccess,
      },
    });

  } catch (err) {
    console.error("[Single Post] Error:", err);
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