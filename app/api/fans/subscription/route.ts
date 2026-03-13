import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { user, error } = await getUser();
  if (!user || error) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fanId = searchParams.get("fanId");
  if (!fanId) return NextResponse.json({ error: "fanId required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();

  // Fetch the subscription for this fan on the viewer's (creator's) page
  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("id, status, created_at, current_period_end")
    .eq("creator_id", user.id)
    .eq("fan_id", fanId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 });
  if (!sub) return NextResponse.json({ subscription: null });

  // Fetch total spent by this fan on the creator's page
  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount")
    .eq("creator_id", user.id)
    .eq("fan_id", fanId);

  const totalSpent = (transactions ?? []).reduce((sum: number, t: any) => sum + (t.amount ?? 0), 0);

  const subscription = {
    id:             sub.id,
    status:         sub.status,
    subscribed_at:  sub.created_at,
    expires_at:     sub.current_period_end ?? null,
    total_spent:    totalSpent,
  };

  return NextResponse.json({ subscription });
}