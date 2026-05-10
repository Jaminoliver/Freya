import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceSupabaseClient();

  // All subscribers (any status)
  const { data: subs } = await service
    .from("subscriptions")
    .select("fan_id, profiles!subscriptions_fan_id_fkey(id, display_name, username, avatar_url)")
    .eq("creator_id", user.id);

  // All spenders
  const [tipsRes, ppvPostRes, ppvMsgRes] = await Promise.all([
    service.from("tips").select("tipper_id, amount").eq("recipient_id", user.id),
    service.from("ppv_unlocks").select("fan_id, amount_paid").eq("creator_id", user.id),
    service.from("messages").select("ppv_message_unlocks!inner(fan_id, amount_paid)").eq("sender_id", user.id),
  ]);

  // Build spend totals
  const totals = new Map<string, number>();
  for (const t of (tipsRes.data ?? []) as { tipper_id: string; amount: number }[]) {
    totals.set(t.tipper_id, (totals.get(t.tipper_id) ?? 0) + t.amount);
  }
  for (const p of (ppvPostRes.data ?? []) as { fan_id: string; amount_paid: number }[]) {
    totals.set(p.fan_id, (totals.get(p.fan_id) ?? 0) + p.amount_paid);
  }
  for (const m of (ppvMsgRes.data ?? []) as { ppv_message_unlocks: { fan_id: string; amount_paid: number }[] }[]) {
    for (const p of (m.ppv_message_unlocks ?? [])) {
      totals.set(p.fan_id, (totals.get(p.fan_id) ?? 0) + p.amount_paid);
    }
  }

  // Build fan map from subs
  const fanMap = new Map<string, { id: string; display_name: string; username: string; avatar_url: string | null }>();
  for (const s of (subs ?? []) as any[]) {
    if (s.profiles) fanMap.set(s.fan_id, { id: s.fan_id, ...s.profiles });
  }

  // Add spenders not in sub list — fetch their profiles
  const spenderIds = [...totals.keys()].filter((id) => !fanMap.has(id));
  if (spenderIds.length > 0) {
    const { data: spenderProfiles } = await service
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", spenderIds);
    for (const p of (spenderProfiles ?? []) as any[]) {
      fanMap.set(p.id, p);
    }
  }

  const fans = [...fanMap.values()].map((f) => ({
    id:           f.id,
    display_name: f.display_name ?? f.username,
    username:     f.username,
    avatar_url:   f.avatar_url ?? null,
    total_spend:  totals.get(f.id) ?? 0,
  })).sort((a, b) => b.total_spend - a.total_spend);

  return NextResponse.json({ fans });
}