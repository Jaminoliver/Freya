import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // DISTINCT ON (creator_id) — dedup in DB, not JS
    // Also pulls newPosts count via a subquery
    const { data, error } = await supabase.rpc("get_latest_subscriptions", {
      p_fan_id: user.id,
    });

    // Fallback: plain query if RPC not set up yet
    let rows = data;
    if (error || !data) {
      const { data: fallback, error: fallbackError } = await supabase
        .from("subscriptions")
        .select(`
          id,
          status,
          price_paid,
          auto_renew,
          current_period_end,
          created_at,
          creator_id,
          creator:profiles!subscriptions_creator_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            banner_url,
            is_verified
          )
        `)
        .eq("fan_id", user.id)
        .order("creator_id")
        .order("created_at", { ascending: false });

      if (fallbackError) throw fallbackError;

      // Dedup in JS as last resort — one pass with a Set (no double new Date())
      const seen = new Set<string>();
      rows = (fallback ?? []).filter((s) => {
        const creatorId = (Array.isArray(s.creator) ? s.creator[0] : s.creator)?.id;
        if (!creatorId || seen.has(creatorId)) return false;
        seen.add(creatorId);
        return true;
      });
    }

    const subscriptions = (rows ?? []).map((s: any) => {
      const creator = (Array.isArray(s.creator) ? s.creator[0] : s.creator) as {
        id: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
        banner_url: string | null;
        is_verified: boolean;
      };

      const expiresAt = new Date(s.current_period_end).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
      });

      let status: "active" | "expired" | "attention" = "active";
      if (s.status === "expired" || s.status === "cancelled") status = "expired";
      else if (s.status === "grace_period") status = "attention";

      return {
        id: s.id,
        creatorId: creator.id,
        creatorName: creator.display_name ?? creator.username,
        username: creator.username,
        avatar_url: creator.avatar_url,
        banner_url: creator.banner_url,
        isVerified: creator.is_verified,
        status,
        price: s.price_paid,
        autoRenew: s.auto_renew,
        expiresAt,
        newPosts: s.new_posts_count ?? 0, // populated by RPC, 0 fallback
      };
    });

    return NextResponse.json(
      { subscriptions },
      {
        headers: {
          // Fresh for 60s, stale-while-revalidate for 5min
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    console.error("[Subscriptions Mine Error]", err);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}