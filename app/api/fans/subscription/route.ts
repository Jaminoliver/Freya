import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { user, error } = await getUser();
  if (!user || error) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fanId = searchParams.get("fanId");
  if (!fanId) return NextResponse.json({ error: "fanId required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("id, status, created_at, current_period_end, selected_tier, price_paid")
    .eq("creator_id", user.id)
    .eq("fan_id", fanId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 });
  if (!sub) return NextResponse.json({ subscription: null });

  const [tipsRes, ppvRes, subSpendRes] = await Promise.allSettled([
    supabase
      .from("tips")
      .select("amount")
      .eq("tipper_id", fanId)
      .eq("recipient_id", user.id),
    supabase
      .from("ppv_unlocks")
      .select("amount_paid")
      .eq("fan_id", fanId)
      .eq("creator_id", user.id),
    supabase
      .from("subscriptions")
      .select("price_paid")
      .eq("fan_id", fanId)
      .eq("creator_id", user.id),
  ]);

  const tips = tipsRes.status === "fulfilled"
    ? (tipsRes.value.data ?? []).reduce((s: number, t: any) => s + ((t.amount ?? 0) / 100), 0)
    : 0;

  const ppvCount = ppvRes.status === "fulfilled"
    ? (ppvRes.value.data ?? []).length
    : 0;

  const ppvSpend = ppvRes.status === "fulfilled"
    ? (ppvRes.value.data ?? []).reduce((s: number, t: any) => s + ((t.amount_paid ?? 0) / 100), 0)
    : 0;

  const subSpend = subSpendRes.status === "fulfilled"
    ? (subSpendRes.value.data ?? []).reduce((s: number, t: any) => s + ((t.price_paid ?? 0) / 100), 0)
    : 0;

  const totalSpent = tips + ppvSpend + subSpend;

  const subscription = {
    id:            sub.id,
    status:        sub.status,
    subscribed_at: sub.created_at,
    expires_at:    sub.current_period_end ?? null,
    selected_tier: sub.selected_tier ?? null,
    total_spent:   totalSpent,
    tips,
    ppv_count:     ppvCount,
  };

  return NextResponse.json({ subscription });
}