// app/api/earnings/history/route.ts
// Returns creator earning history from the ledger table

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

    // Fetch CREATOR_EARNING CREDIT entries from ledger
    const { data: entries, error } = await supabase
      .from("ledger")
      .select("id, amount, reference_id, created_at")
      .eq("user_id", user.id)
      .eq("category", "CREATOR_EARNING")
      .eq("type", "CREDIT")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!entries || entries.length === 0) {
      return NextResponse.json({ history: [] });
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Get reference_ids to look up the fan-side debit entries for type info
    const refIds = entries.map((e) => e.reference_id).filter(Boolean) as string[];

    // Look up fan-side debit entries to determine type and fan_id
    let fanDebitMap: Record<string, { category: string; userId: string }> = {};

    if (refIds.length > 0) {
      const { data: fanDebits } = await serviceSupabase
        .from("ledger")
        .select("reference_id, category, user_id")
        .in("reference_id", refIds)
        .eq("type", "DEBIT")
        .in("category", ["SUBSCRIPTION_PAYMENT", "AUTO_SUBSCRIPTION", "TIP", "PPV_PURCHASE", "PPV_MESSAGE"]);

      if (fanDebits) {
        fanDebits.forEach((fd) => {
          if (fd.reference_id) {
            fanDebitMap[fd.reference_id] = {
              category: fd.category,
              userId: fd.user_id,
            };
          }
        });
      }
    }

    // For entries with no fan debit (bank transfer payments), check transactions table
    const missingRefIds = refIds.filter((r) => !fanDebitMap[r]);
    if (missingRefIds.length > 0) {
      const { data: txFans } = await serviceSupabase
        .from("transactions")
        .select("provider_txn_id, fan_id")
        .in("provider_txn_id", missingRefIds);

      if (txFans) {
        txFans.forEach((tx) => {
          if (tx.provider_txn_id && tx.fan_id && !fanDebitMap[tx.provider_txn_id]) {
            fanDebitMap[tx.provider_txn_id] = {
              category: "SUBSCRIPTION_PAYMENT",
              userId: tx.fan_id,
            };
          }
        });
      }
    }

    // Fetch fan profiles
    const fanIds = [...new Set(Object.values(fanDebitMap).map((d) => d.userId).filter(Boolean))];
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

    // Map category to display label
    const CATEGORY_LABEL: Record<string, string> = {
      SUBSCRIPTION_PAYMENT: "Subscription",
      AUTO_SUBSCRIPTION: "Subscription",
      TIP: "Tip",
      PPV_PURCHASE: "PPV",
      PPV_MESSAGE: "Message",
    };

    const history = entries
      .map((entry) => {
        const fanDebit = entry.reference_id ? fanDebitMap[entry.reference_id] : null;
        const typeLabel = fanDebit ? (CATEGORY_LABEL[fanDebit.category] ?? "Other") : "Other";

        // Apply filter
        if (filter !== "all" && typeLabel.toLowerCase() !== filter.toLowerCase()) return null;

        const fan = fanDebit?.userId ? fanMap[fanDebit.userId] : null;

        return {
          id: entry.id,
          amount: entry.amount / 100, // kobo to naira
          type: typeLabel,
          date: new Date(entry.created_at).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          fan: fan?.display_name ?? "Anonymous",
          username: fan?.username ? `@${fan.username}` : "",
          status: "completed",
        };
      })
      .filter(Boolean);

    return NextResponse.json({ history });
  } catch (err) {
    console.error("[Earnings History Error]", err);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}