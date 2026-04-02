// app/api/wallet/transactions/route.ts
// Returns the user's transaction history from the ledger table

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");
    const category = searchParams.get("category"); // optional filter

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query on the new ledger table
    let query = supabase
      .from("ledger")
      .select("id, type, amount, balance_after, category, provider, provider_reference, reference_id, created_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    // Optional category filter
    if (category) {
      query = query.eq("category", category);
    }

    // Exclude creator earnings and platform fees from fan wallet view
    // These belong on the earnings page, not the wallet
    query = query.not("category", "in", "(PLATFORM_FEE,CREATOR_EARNING)");

    const { data: entries, error: ledgerError, count } = await query;

    if (ledgerError) {
      console.error("[Wallet Transactions] DB error:", ledgerError.message);
      return NextResponse.json({ message: "Failed to fetch transactions" }, { status: 500 });
    }

    // Map ledger entries to frontend-friendly format
    const transactions = (entries || []).map((entry) => ({
      id: String(entry.id),
      type: entry.type,
      amount: entry.amount,
      amountNaira: entry.amount / 100,
      balanceAfter: entry.balance_after,
      category: entry.category,
      provider: entry.provider,
      providerReference: entry.provider_reference,
      referenceId: entry.reference_id,
      description: formatDescription(entry.category, entry.type),
      date: entry.created_at,
    }));

    return NextResponse.json({
      transactions,
      total: count ?? transactions.length,
      page,
      limit,
    });
  } catch (error) {
    console.error("[Wallet Transactions Error]", error);
    return NextResponse.json({ message: "Failed to fetch transactions" }, { status: 500 });
  }
}

/**
 * Generate a human-readable description from category + type
 */
function formatDescription(category: string, type: string): string {
  switch (category) {
    case "WALLET_TOPUP":
      return "Wallet top-up";
    case "SUBSCRIPTION_PAYMENT":
      return "Subscription payment";
    case "AUTO_SUBSCRIPTION":
      return "Auto-renewal";
    case "CREATOR_EARNING":
      return "Creator earning";
    case "PAYOUT":
      return "Withdrawal to bank";
    case "TIP":
      return type === "CREDIT" ? "Tip received" : "Tip sent";
    case "PPV_PURCHASE":
      return type === "CREDIT" ? "PPV sale" : "PPV unlock";
    case "PPV_MESSAGE":
      return type === "CREDIT" ? "PPV message sale" : "PPV message unlock";
    case "REFUND":
      return "Refund";
    default:
      return category;
  }
}