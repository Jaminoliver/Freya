import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

// GET comments for a post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }   = await params;
    const postId   = Number(id);
    if (isNaN(postId)) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });

    const service = createServiceSupabaseClient();

    const { data: comments, error } = await service
      .from("comments")
      .select(`
        id,
        content,
        created_at,
        like_count,
        parent_comment_id,
        user_id,
        profiles!user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .eq("is_deleted", false)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("[Comments GET] Error:", error.message);
      return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
    }

    return NextResponse.json({ comments: comments ?? [] });

  } catch (err) {
    console.error("[Comments GET] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// POST a new comment
export async function POST(
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

    const { content, parent_comment_id } = await req.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: "Comment too long (max 1000 characters)" }, { status: 400 });
    }

    const service = createServiceSupabaseClient();

    const { data: comment, error } = await service
      .from("comments")
      .insert({
        user_id:           user.id,
        post_id:           postId,
        content:           content.trim(),
        parent_comment_id: parent_comment_id ?? null,
      })
      .select(`
        id,
        content,
        created_at,
        like_count,
        parent_comment_id,
        user_id,
        profiles!user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error("[Comments POST] Insert error:", error.message);
      return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
    }

    // Increment comment_count on post
    await service.rpc("increment_comment_count", { post_id: postId });

    return NextResponse.json({ comment });

  } catch (err) {
    console.error("[Comments POST] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}