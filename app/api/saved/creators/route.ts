import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/saved/creators                — fetch all saved creators
// GET /api/saved/creators?creator_id=X   — check if a single creator is saved
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creatorId = req.nextUrl.searchParams.get("creator_id");

  // ── Single check ───────────────────────────────────────────────────────────
  if (creatorId) {
    const { data } = await supabase
      .from("saved_creators")
      .select("id")
      .eq("user_id", user.id)
      .eq("creator_id", creatorId)
      .maybeSingle();
    return NextResponse.json({ saved: !!data });
  }

  // ── Full list ──────────────────────────────────────────────────────────────
  const { data: savedData, error } = await supabase
    .from("saved_creators")
    .select("creator_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const creatorIds = (savedData ?? []).map((r: any) => r.creator_id);
  if (!creatorIds.length) return NextResponse.json({ creators: [] });

  const [profilesResult, subsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, banner_url, is_verified, subscriber_count, follower_count, likes_count")
      .in("id", creatorIds),
    supabase
      .from("subscriptions")
      .select("creator_id")
      .eq("fan_id", user.id)
      .eq("status", "active")
      .in("creator_id", creatorIds),
  ]);

  const subscribedSet = new Set((subsResult.data ?? []).map((s: any) => s.creator_id));
  const profileMap    = new Map((profilesResult.data ?? []).map((p: any) => [p.id, p]));

  const creators = creatorIds
    .map((id: string) => {
      const p = profileMap.get(id);
      if (!p) return null;
      return {
        id:              p.id,
        username:        p.username,
        name:            p.display_name || p.username,
        avatar_url:      p.avatar_url ?? "",
        banner_url:      p.banner_url ?? null,
        isVerified:      p.is_verified ?? false,
        subscriberCount: p.subscriber_count ?? 0,
        follower_count:  p.follower_count ?? 0,
        likes_count:     p.likes_count ?? 0,
        isSubscribed:    subscribedSet.has(p.id),
      };
    })
    .filter(Boolean);

  return NextResponse.json({ creators });
}

// POST /api/saved/creators — save a creator
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { creator_id } = await req.json();
  if (!creator_id) return NextResponse.json({ error: "creator_id required" }, { status: 400 });

  const { error } = await supabase
    .from("saved_creators")
    .insert({ user_id: user.id, creator_id });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ saved: true }); // already saved
    console.error("[POST /api/saved/creators] Supabase error:", error);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }
  return NextResponse.json({ saved: true });
}

// DELETE /api/saved/creators — unsave a creator
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { creator_id } = await req.json();
  if (!creator_id) return NextResponse.json({ error: "creator_id required" }, { status: 400 });

  const { error } = await supabase
    .from("saved_creators")
    .delete()
    .eq("user_id", user.id)
    .eq("creator_id", creator_id);

  if (error) {
    console.error("[DELETE /api/saved/creators] Supabase error:", error);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }
  return NextResponse.json({ saved: false });
}