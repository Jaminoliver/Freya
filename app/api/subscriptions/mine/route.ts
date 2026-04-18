import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("get_latest_subscriptions", {
      p_fan_id: user.id,
    });

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
          is_favourite,
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

      const seen = new Set<string>();
      rows = (fallback ?? []).filter((s) => {
        const creatorId = (Array.isArray(s.creator) ? s.creator[0] : s.creator)?.id;
        if (!creatorId || seen.has(creatorId)) return false;
        seen.add(creatorId);
        return true;
      });
    }

    // Fetch tier prices for all unique creators in one query
    const creatorIds = Array.from(
      new Set(
        (rows ?? [])
          .map((s: any) => {
            const c = Array.isArray(s.creator) ? s.creator[0] : s.creator;
            return c?.id;
          })
          .filter(Boolean)
      )
    );

    const tiersByCreator: Record<string, {
      monthly_price: number;
      three_month_price: number | null;
      six_month_price: number | null;
    }> = {};

    if (creatorIds.length > 0) {
      const { data: tiers } = await supabase
        .from("subscription_tiers")
        .select("creator_id, price_monthly, three_month_price, six_month_price, is_active")
        .in("creator_id", creatorIds)
        .eq("is_active", true);

      for (const t of tiers ?? []) {
        tiersByCreator[t.creator_id] = {
          monthly_price:     t.price_monthly,
          three_month_price: t.three_month_price,
          six_month_price:   t.six_month_price,
        };
      }
    }

    const subscriptions = (rows ?? [])
      .map((s: any) => {
        const creator = (Array.isArray(s.creator) ? s.creator[0] : s.creator) as {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          banner_url: string | null;
          is_verified: boolean;
        } | null;

        if (!creator) return null;

        const expiresAt = new Date(s.current_period_end).toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
        });

        let status: "active" | "expired" | "attention" = "active";
        if (s.status === "expired" || s.status === "cancelled") status = "expired";
        else if (s.status === "grace_period" || s.status === "renewal_failed") status = "attention";

        const tier = tiersByCreator[creator.id] ?? null;
        const isFreeCreator = tier === null;

        return {
          id:               s.id,
          creatorId:        creator.id,
          creatorName:      creator.display_name ?? creator.username,
          username:         creator.username,
          avatar_url:       creator.avatar_url,
          banner_url:       creator.banner_url,
          isVerified:       creator.is_verified,
          status,
          price:            s.price_paid,
          autoRenew:        s.auto_renew,
          expiresAt,
          newPosts:         s.new_posts_count ?? 0,
          isFavourite:      s.is_favourite ?? false,
          isFreeCreator,
          monthlyPrice:     tier?.monthly_price     ?? 0,
          threeMonthPrice:  tier?.three_month_price ?? null,
          sixMonthPrice:    tier?.six_month_price   ?? null,
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      { subscriptions },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[Subscriptions Mine Error]", err);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}