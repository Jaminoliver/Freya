import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { user, error } = await getUser();
  if (!user || error) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "all";

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("subscriptions")
    .select(`
      id,
      status,
      created_at,
      current_period_end,
      selected_tier,
      price_paid,
      fan:profiles!fan_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error: fetchError } = await query;
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const seen = new Set<string>();
  const deduped = (data ?? []).filter((row: any) => {
    const fid = row.fan?.id;
    if (!fid || seen.has(fid)) return false;
    seen.add(fid);
    return true;
  });

  const fanIds = deduped.map((row: any) => row.fan?.id).filter(Boolean);

  const tipsMap: Record<string, number> = {};
  const ppvMap:  Record<string, number> = {};
  const subMap:  Record<string, number> = {};

  if (fanIds.length > 0) {
    const [tipsRes, ppvRes, subRes] = await Promise.allSettled([
      supabase
        .from("tips")
        .select("tipper_id, amount")
        .eq("recipient_id", user.id)
        .in("tipper_id", fanIds),
      supabase
        .from("ppv_unlocks")
        .select("fan_id, amount_paid")
        .eq("creator_id", user.id)
        .in("fan_id", fanIds),
      supabase
        .from("subscriptions")
        .select("fan_id, price_paid")
        .eq("creator_id", user.id)
        .in("fan_id", fanIds),
    ]);

    if (tipsRes.status === "fulfilled") {
      (tipsRes.value.data ?? []).forEach((t: any) => {
        tipsMap[t.tipper_id] = (tipsMap[t.tipper_id] ?? 0) + ((t.amount ?? 0) / 100);
      });
    }
    if (ppvRes.status === "fulfilled") {
      (ppvRes.value.data ?? []).forEach((t: any) => {
        ppvMap[t.fan_id] = (ppvMap[t.fan_id] ?? 0) + ((t.amount_paid ?? 0) / 100);
      });
    }
    if (subRes.status === "fulfilled") {
      (subRes.value.data ?? []).forEach((t: any) => {
        subMap[t.fan_id] = (subMap[t.fan_id] ?? 0) + ((t.price_paid ?? 0) / 100);
      });
    }
  }

  const fans = deduped.map((row: any) => {
    const fid        = row.fan?.id;
    const totalSpent = (tipsMap[fid] ?? 0) + (ppvMap[fid] ?? 0) + (subMap[fid] ?? 0);
    return {
      id:            fid,
      username:      row.fan?.username,
      display_name:  row.fan?.display_name,
      avatar_url:    row.fan?.avatar_url ?? null,
      subscribed_at: row.created_at,
      expires_at:    row.current_period_end ?? null,
      status:        row.status,
      selected_tier: row.selected_tier ?? null,
      total_spent:   totalSpent,
    };
  });

  return NextResponse.json({ fans });
}