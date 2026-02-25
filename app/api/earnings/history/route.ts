import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("type") ?? "all";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = 20;
    const offset = (page - 1) * limit;

    // Fetch CREATOR_EARNING CREDIT entries
    const { data: entries, error } = await supabase
      .from("ledger_entries")
      .select("id, amount, created_at, transaction_id")
      .eq("user_id", user.id)
      .eq("category", "CREATOR_EARNING")
      .eq("type", "CREDIT")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!entries || entries.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // Use service role to bypass RLS for fan transactions and profiles
    const serviceSupabase = createServiceSupabaseClient();

    // Fetch transactions for these entries
    const txIds = entries.map((e) => e.transaction_id);
    const { data: txs } = await serviceSupabase
      .from("transactions")
      .select("id, transaction_type, fan_id, created_at, status")
      .in("id", txIds);

    const txMap = Object.fromEntries((txs ?? []).map((t) => [t.id, t]));

    // Fetch fan profiles
    const fanIds = [...new Set((txs ?? []).map((t) => t.fan_id).filter(Boolean))];
    let fanMap: Record<string, { display_name: string; username: string }> = {};

    if (fanIds.length > 0) {
      const { data: fans } = await serviceSupabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", fanIds);

      fanMap = Object.fromEntries(
        (fans ?? []).map((f) => [f.id, { display_name: f.display_name, username: f.username }])
      );
    }

    const TYPE_LABEL: Record<string, string> = {
      subscription_payment: "Subscription",
      tip:                  "Tip",
      ppv_unlock:           "PPV",
      ppv_message:          "Message",
      bundle_purchase:      "On Request",
    };

    const history = entries
      .map((entry) => {
        const tx = txMap[entry.transaction_id];
        if (!tx) return null;

        const txType = tx.transaction_type;
        const typeLabel = TYPE_LABEL[txType] ?? txType;

        // Apply filter
        if (filter !== "all" && typeLabel.toLowerCase() !== filter.toLowerCase()) return null;

        const fan = tx.fan_id ? fanMap[tx.fan_id] : null;

        return {
          id: entry.id,
          amount: entry.amount,
          type: typeLabel,
          date: new Date(entry.created_at).toLocaleDateString("en-NG", {
            day: "numeric", month: "short", year: "numeric",
          }),
          fan: fan?.display_name ?? "Anonymous",
          username: fan?.username ? `@${fan.username}` : "",
          status: tx.status,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ history });
  } catch (err) {
    console.error("[Earnings History Error]", err);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}