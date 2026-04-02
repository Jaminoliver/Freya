// app/api/earnings/summary/route.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: earnings, error: earningsError } = await supabase
      .from("ledger")
      .select("amount, category, reference_id, created_at")
      .eq("user_id", user.id)
      .eq("type", "CREDIT")
      .eq("category", "CREATOR_EARNING");

    if (earningsError) throw earningsError;

    const { data: payouts, error: payoutError } = await supabase
      .from("ledger")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "DEBIT")
      .eq("category", "PAYOUT");

    if (payoutError) throw payoutError;

    const totalEarned = (earnings ?? []).reduce((sum, e) => sum + e.amount, 0);
    const totalPaidOut = (payouts ?? []).reduce((sum, e) => sum + e.amount, 0);
    const available = Math.max(0, totalEarned - totalPaidOut);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thisMonthEntries = (earnings ?? []).filter((e) => e.created_at >= startOfMonth);

    const refIds = thisMonthEntries.map((e) => e.reference_id).filter(Boolean) as string[];

    let txCategoryMap: Record<string, string> = {};

    if (refIds.length > 0) {
      // Use service client to bypass RLS when reading other users' ledger rows
      const serviceSupabase = createServiceSupabaseClient();

      const { data: fanEntries } = await serviceSupabase
        .from("ledger")
        .select("reference_id, category")
        .in("reference_id", refIds)
        .eq("type", "DEBIT")
        .in("category", ["SUBSCRIPTION_PAYMENT", "AUTO_SUBSCRIPTION", "TIP", "PPV_PURCHASE", "PPV_MESSAGE"]);

      if (fanEntries) {
        fanEntries.forEach((fe) => {
          if (fe.reference_id) {
            txCategoryMap[fe.reference_id] = fe.category;
          }
        });
      }

      // Fallback: ref_ids still unmatched → check transactions table (bank transfer subs)
      const missingRefIds = refIds.filter((r) => !txCategoryMap[r]);
      if (missingRefIds.length > 0) {
        const { data: txFans } = await serviceSupabase
          .from("transactions")
          .select("provider_txn_id")
          .in("provider_txn_id", missingRefIds);

        if (txFans) {
          txFans.forEach((tx) => {
            if (tx.provider_txn_id && !txCategoryMap[tx.provider_txn_id]) {
              txCategoryMap[tx.provider_txn_id] = "SUBSCRIPTION_PAYMENT";
            }
          });
        }
      }
    }

    const breakdown = {
      subscriptions: 0,
      tips: 0,
      ppv: 0,
      messages: 0,
      on_request: 0,
    };

    thisMonthEntries.forEach((e) => {
      const fanCategory = e.reference_id ? txCategoryMap[e.reference_id] : null;

      if (fanCategory === "SUBSCRIPTION_PAYMENT" || fanCategory === "AUTO_SUBSCRIPTION") {
        breakdown.subscriptions += e.amount;
      } else if (fanCategory === "TIP") {
        breakdown.tips += e.amount;
      } else if (fanCategory === "PPV_PURCHASE") {
        breakdown.ppv += e.amount;
      } else if (fanCategory === "PPV_MESSAGE") {
        breakdown.messages += e.amount;
      } else {
        breakdown.on_request += e.amount;
      }
    });

    const thisMonthTotal = Object.values(breakdown).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      totalEarned: totalEarned / 100,
      available: available / 100,
      thisMonth: {
        subscriptions: breakdown.subscriptions / 100,
        tips: breakdown.tips / 100,
        ppv: breakdown.ppv / 100,
        messages: breakdown.messages / 100,
        on_request: breakdown.on_request / 100,
        total: thisMonthTotal / 100,
      },
    });
  } catch (err) {
    console.error("[Earnings Summary Error]", err);
    return NextResponse.json({ error: "Failed to fetch earnings" }, { status: 500 });
  }
}