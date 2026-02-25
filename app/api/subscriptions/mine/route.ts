import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select(`
        id,
        status,
        price_paid,
        auto_renew,
        current_period_end,
        created_at,
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
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Deduplicate — keep only the latest subscription per creator
    const latestPerCreator = new Map<string, typeof data[0]>();
    for (const s of data ?? []) {
      const creator = (Array.isArray(s.creator) ? s.creator[0] : s.creator) as { id: string };
      const existing = latestPerCreator.get(creator.id);
      if (!existing || new Date(s.created_at) > new Date(existing.created_at)) {
        latestPerCreator.set(creator.id, s);
      }
    }

    const subscriptions = Array.from(latestPerCreator.values()).map((s) => {
      const creator = (Array.isArray(s.creator) ? s.creator[0] : s.creator) as {
        id: string;
        username: string;
        display_name: string;
        avatar_url: string | null;
        banner_url: string | null;
        is_verified: boolean;
      };

      const expiresAt = new Date(s.current_period_end).toLocaleDateString("en-NG", {
        day: "numeric", month: "short",
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
        newPosts: 0,
      };
    });

    return NextResponse.json({ subscriptions });
  } catch (err) {
    console.error("[Subscriptions Mine Error]", err);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}