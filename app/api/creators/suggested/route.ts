// app/api/creators/suggested/route.ts
// Returns top creators for the "Suggested for you" feed cards
import { NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { user, error: authErr } = await getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceSupabaseClient();

    const { data, error } = await service
      .from("profiles")
      .select("id, display_name, username, avatar_url, banner_url, is_verified, subscriber_count, likes_count")
      .eq("role", "creator")
      .eq("is_active", true)
      .eq("is_suspended", false)
      .neq("id", user.id)
      .order("likes_count", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[SuggestedCreators:ERROR]", error.message);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    const creators = (data ?? []).map((p) => ({
      id:               p.id,
      name:             p.display_name || p.username,
      username:         p.username,
      avatar_url:       p.avatar_url,
      banner_url:       p.banner_url,
      isVerified:       p.is_verified ?? false,
      subscriber_count: p.subscriber_count ?? 0,
      likes_count:      p.likes_count ?? 0,
    }));

    const res = NextResponse.json({ creators });

    // Suggestions change slowly — cache for 5 minutes, stale for 10
    res.headers.set("Cache-Control", "private, s-maxage=300, stale-while-revalidate=600");

    return res;
  } catch (err) {
    console.error("[SuggestedCreators:ERROR] Unhandled:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}