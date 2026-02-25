import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all CREATOR_EARNING ledger entries for this user
    const { data: entries, error } = await supabase
      .from("ledger_entries")
      .select("amount, type, created_at, transaction_id")
      .eq("user_id", user.id)
      .eq("category", "CREATOR_EARNING");

    if (error) throw error;

    // Fetch all PAYOUT DEBIT entries to calculate available balance
    const { data: payouts, error: payoutError } = await supabase
      .from("ledger_entries")
      .select("amount, type")
      .eq("user_id", user.id)
      .eq("category", "PAYOUT")
      .eq("type", "DEBIT");

    if (payoutError) throw payoutError;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Total earned = sum of all CREDIT CREATOR_EARNING entries
    const totalEarned = (entries ?? [])
      .filter((e) => e.type === "CREDIT")
      .reduce((sum, e) => sum + e.amount, 0);

    // Total paid out
    const totalPaidOut = (payouts ?? [])
      .reduce((sum, e) => sum + e.amount, 0);

    // Available = total earned - total paid out
    const available = Math.max(0, totalEarned - totalPaidOut);

    // This month entries
    const thisMonthEntries = (entries ?? []).filter(
      (e) => e.type === "CREDIT" && e.created_at >= startOfMonth
    );

    // Fetch transaction types for this month entries
    const txIds = thisMonthEntries.map((e) => e.transaction_id);

    let txMap: Record<number, string> = {};
    if (txIds.length > 0) {
      const serviceSupabase = createServiceSupabaseClient();
      const { data: txs } = await serviceSupabase
        .from("transactions")
        .select("id, transaction_type")
        .in("id", txIds);

      txMap = Object.fromEntries((txs ?? []).map((t) => [t.id, t.transaction_type]));
    }

    // Breakdown by type this month
    const breakdown = {
      subscriptions: 0,
      tips: 0,
      ppv: 0,
      messages: 0,
      on_request: 0,
    };

    thisMonthEntries.forEach((e) => {
      const txType = txMap[e.transaction_id];
      if (txType === "subscription_payment") breakdown.subscriptions += e.amount;
      else if (txType === "tip") breakdown.tips += e.amount;
      else if (txType === "ppv_unlock") breakdown.ppv += e.amount;
      else if (txType === "ppv_message") breakdown.messages += e.amount;
      else if (txType === "bundle_purchase") breakdown.on_request += e.amount;
    });

    const thisMonthTotal = Object.values(breakdown).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      totalEarned,
      available,
      thisMonth: {
        ...breakdown,
        total: thisMonthTotal,
      },
    });
  } catch (err) {
    console.error("[Earnings Summary Error]", err);
    return NextResponse.json({ error: "Failed to fetch earnings" }, { status: 500 });
  }
}