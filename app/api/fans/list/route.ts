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

  // Fetch total spent per fan from transactions table
  const fanIds = (data ?? []).map((row: any) => row.fan?.id).filter(Boolean);

  let spentMap: Record<string, number> = {};

  if (fanIds.length > 0) {
    const { data: transactions } = await supabase
      .from("transactions")
      .select("fan_id, amount")
      .eq("creator_id", user.id)
      .in("fan_id", fanIds);

    (transactions ?? []).forEach((t: any) => {
      spentMap[t.fan_id] = (spentMap[t.fan_id] ?? 0) + (t.amount ?? 0);
    });
  }

  const fans = (data ?? []).map((row: any) => ({
    id:            row.fan?.id,
    username:      row.fan?.username,
    display_name:  row.fan?.display_name,
    avatar_url:    row.fan?.avatar_url ?? null,
    subscribed_at: row.created_at,
    expires_at:    row.current_period_end ?? null,
    status:        row.status,
    total_spent:   spentMap[row.fan?.id] ?? 0,
  }));

  return NextResponse.json({ fans });
}