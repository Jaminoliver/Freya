import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/saved/posts           — fetch all saved posts
// GET /api/saved/posts?post_id=X — check if a single post is saved
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const postId = req.nextUrl.searchParams.get("post_id");

  // ── Single check ───────────────────────────────────────────────────────────
  if (postId) {
    const { data } = await supabase
      .from("saved_posts")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();
    return NextResponse.json({ saved: !!data });
  }

  // ── Full list ──────────────────────────────────────────────────────────────
  const { data, error } = await supabase
    .from("saved_posts")
    .select(`
      post_id,
      posts (
        id,
        content_type,
        caption,
        published_at,
        media:media (
          id,
          media_type,
          file_url,
          thumbnail_url,
          bunny_video_id,
          display_order
        ),
        profiles (
          username,
          display_name,
          avatar_url
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/saved/posts] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const posts = (data ?? []).map((row: any) => {
    const p     = row.posts;
    const media = (p.media ?? []).sort((a: any, b: any) => a.display_order - b.display_order);
    const first = media[0];
    return {
      id:            String(p.id),
      thumbnail_url: first?.media_type === "video" && first?.bunny_video_id
        ? `https://${process.env.BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net"}/${first.bunny_video_id}/thumbnail.jpg`
        : (first?.thumbnail_url ?? first?.file_url ?? null),
      media_type:    first?.media_type === "video" ? "video" : "image",
      media_count:   media.length,
      is_locked:     false,
      creator: {
        username:   p.profiles.username,
        name:       p.profiles.display_name || p.profiles.username,
        avatar_url: p.profiles.avatar_url ?? "",
      },
    };
  });

  return NextResponse.json({ posts });
}

// POST /api/saved/posts — save a post
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id } = await req.json();
  if (!post_id) return NextResponse.json({ error: "post_id required" }, { status: 400 });

  const { error } = await supabase
    .from("saved_posts")
    .insert({ user_id: user.id, post_id });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ saved: true }); // already saved
    console.error("[POST /api/saved/posts] Supabase error:", error);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }
  return NextResponse.json({ saved: true });
}

// DELETE /api/saved/posts — unsave a post
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) {
    console.error("[DELETE /api/saved/posts] Auth error:", authError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { post_id } = await req.json();
  if (!post_id) return NextResponse.json({ error: "post_id required" }, { status: 400 });

  const { error } = await supabase
    .from("saved_posts")
    .delete()
    .eq("user_id", user.id)
    .eq("post_id", post_id);

  if (error) {
    console.error("[DELETE /api/saved/posts] Supabase error:", error);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }
  return NextResponse.json({ saved: false });
}