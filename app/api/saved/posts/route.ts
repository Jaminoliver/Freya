import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { signBunnyUrl } from "@/lib/utils/bunny";

function resignImageUrl(storedUrl: string | null): string | null {
  if (!storedUrl) return null;
  try {
    const url  = new URL(storedUrl);
    const path = url.pathname;
    return signBunnyUrl(path);
  } catch {
    return storedUrl;
  }
}

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
  const service = createServiceSupabaseClient();

  const { data, error } = await service
    .from("saved_posts")
    .select(`
      post_id,
      posts!inner (
        id,
        content_type,
        is_ppv,
        is_deleted,
        audience,
        creator_id,
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

  const allRows = (data ?? []).filter((row: any) => row.posts != null);
  const allPostIds = allRows.map((row: any) => Number(row.posts?.id)).filter(Boolean);

  // Fetch subscriptions and PPV unlocks in parallel
  const [{ data: subsRaw }, { data: ppvUnlocksRaw }] = await Promise.all([
    allPostIds.length > 0
      ? service
          .from("subscriptions")
          .select("creator_id")
          .eq("fan_id", user.id)
          .eq("status", "active")
      : Promise.resolve({ data: [] }),
    allPostIds.length > 0
      ? service
          .from("ppv_unlocks")
          .select("post_id")
          .eq("fan_id", user.id)
          .in("post_id", allPostIds)
      : Promise.resolve({ data: [] }),
  ]);

  const subscribedSet = new Set((subsRaw ?? []).map((s: any) => s.creator_id));
  const unlockedSet   = new Set((ppvUnlocksRaw ?? []).map((u: any) => Number(u.post_id)));

  // Hide soft-deleted posts unless the user has a PPV unlock for them.
  // Also drop posts whose media rows were hard-deleted (legacy data) — broken thumbnails.
  const filtered = allRows.filter((row: any) => {
    const p = row.posts;
    if (!p.media || p.media.length === 0) return false;
    if (!p.is_deleted) return true;
    return unlockedSet.has(Number(p.id));
  });

  const STREAM_CDN = process.env.BUNNY_STREAM_CDN_HOSTNAME ?? "vz-8bc100f4-3c0.b-cdn.net";

  const posts = filtered.map((row: any) => {
    const p      = row.posts;
    const media  = (p.media ?? []).sort((a: any, b: any) => a.display_order - b.display_order);
    const first  = media[0];
    const isPpv  = p.is_ppv as boolean;
    const postId = Number(p.id);

    const isSubscribed = subscribedSet.has(p.creator_id);
    const isLocked     = isPpv
      ? !unlockedSet.has(postId)
      : !(p.audience === "everyone" || isSubscribed);

    // Always return thumbnail regardless of lock status — used for blur preview
    let thumbnail_url: string | null = null;
    if (first?.media_type === "video") {
      // Prefer Bunny Stream auto-generated thumbnail (lives on Stream CDN, not regular CDN)
      if (first?.bunny_video_id) {
        thumbnail_url = `https://${STREAM_CDN}/${first.bunny_video_id}/thumbnail.jpg`;
      } else {
        thumbnail_url = resignImageUrl(first?.thumbnail_url);
      }
    } else {
      thumbnail_url = resignImageUrl(first?.thumbnail_url) ?? resignImageUrl(first?.file_url) ?? null;
    }

    return {
      id:           String(p.id),
      thumbnail_url,
      media_type:   first?.media_type === "video" ? "video" : "image",
      media_count:  media.length,
      is_locked:    isLocked,
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
    if (error.code === "23505") return NextResponse.json({ saved: true });
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