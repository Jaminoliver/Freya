// app/api/wallet/all-transactions/route.ts
// Returns ALL fan payment activity: wallet operations + direct Monnify payments
// Combines ledger (wallet top-ups, wallet debits) + transactions (direct card/bank payments)

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
    const filter = searchParams.get("filter") ?? "all";
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "30");

    // 1. Get wallet ledger entries (top-ups + wallet debits for subs/tips/ppv)
    // Exclude CREATOR_EARNING and PLATFORM_FEE
    const { data: ledgerEntries } = await supabase
      .from("ledger")
      .select("id, type, amount, category, provider, reference_id, created_at")
      .eq("user_id", user.id)
      .not("category", "in", "(PLATFORM_FEE,CREATOR_EARNING)")
      .order("created_at", { ascending: false })
      .limit(100);

    // 2. Get direct Monnify transactions (card/bank payments that bypassed wallet)
    // These are payments where fan paid via card/transfer for subs/tips/ppv
    const { data: monnifyTx } = await supabase
      .from("transactions")
      .select("id, amount, purpose, payment_method, provider, status, created_at, provider_txn_id")
      .eq("user_id", user.id)
      .eq("provider", "MONNIFY")
      .eq("status", "confirmed")
      .not("purpose", "eq", "WALLET_TOPUP")
      .order("created_at", { ascending: false })
      .limit(100);

    // 3. Combine and deduplicate
    // Ledger entries from wallet payments have reference_id
    // Monnify transactions from direct payments have provider_txn_id
    // We need to avoid showing duplicates where a wallet top-up appears in both
    const ledgerRefIds = new Set((ledgerEntries ?? []).map((e) => e.reference_id).filter(Boolean));

    const allItems: {
      id: string;
      type: "credit" | "debit";
      amount: number;
      amountNaira: number;
      category: string;
      label: string;
      sublabel: string;
      provider: string;
      method: string;
      date: string;
      source: "wallet" | "direct";
    }[] = [];

    // Add ledger entries
    (ledgerEntries ?? []).forEach((entry) => {
      const cat = entry.category;
      const isCredit = entry.type === "CREDIT";

      allItems.push({
        id: `ledger-${entry.id}`,
        type: isCredit ? "credit" : "debit",
        amount: entry.amount,
        amountNaira: entry.amount / 100,
        category: cat,
        label: formatLabel(cat, isCredit),
        sublabel: isCredit ? "Wallet" : "From wallet",
        provider: entry.provider ?? "INTERNAL",
        method: "WALLET",
        date: entry.created_at,
        source: "wallet",
      });
    });

    // Add direct Monnify transactions (skip if already in ledger via reference)
    (monnifyTx ?? []).forEach((tx) => {
      // Skip if this transaction's reference already appears in ledger
      if (tx.provider_txn_id && ledgerRefIds.has(tx.provider_txn_id)) return;

      const purpose = tx.purpose ?? "OTHER";

      allItems.push({
        id: `tx-${tx.id}`,
        type: "debit",
        amount: tx.amount,
        amountNaira: tx.amount / 100,
        category: purpose,
        label: formatPurpose(purpose),
        sublabel: tx.payment_method === "CARD" ? "Card payment" : "Bank transfer",
        provider: "MONNIFY",
        method: tx.payment_method ?? "CARD",
        date: tx.created_at,
        source: "direct",
      });
    });

    // Sort by date descending
    allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply filter
    let filtered = allItems;
    if (filter !== "all") {
      filtered = allItems.filter((item) => {
        switch (filter) {
          case "topups": return item.category === "WALLET_TOPUP";
          case "subscriptions": return item.category === "SUBSCRIPTION_PAYMENT" || item.category === "AUTO_SUBSCRIPTION" || item.category === "SUBSCRIPTION";
          case "tips": return item.category === "TIP";
          case "ppv": return item.category === "PPV_PURCHASE" || item.category === "PPV_MESSAGE" || item.category === "PPV";
          default: return true;
        }
      });
    }

    // Paginate
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return NextResponse.json({
      transactions: paginated,
      total: filtered.length,
      page,
      limit,
    });
  } catch (error) {
    console.error("[All Transactions Error]", error);
    return NextResponse.json({ message: "Failed to fetch transactions" }, { status: 500 });
  }
}

function formatLabel(category: string, isCredit: boolean): string {
  switch (category) {
    case "WALLET_TOPUP": return "Wallet top-up";
    case "SUBSCRIPTION_PAYMENT": return "Subscription";
    case "AUTO_SUBSCRIPTION": return "Auto-renewal";
    case "TIP": return "Tip";
    case "PPV_PURCHASE": return "PPV unlock";
    case "PPV_MESSAGE": return "PPV message";
    case "PAYOUT": return "Withdrawal";
    case "REFUND": return "Refund";
    default: return category;
  }
}

function formatPurpose(purpose: string): string {
  switch (purpose) {
    case "SUBSCRIPTION": return "Subscription";
    case "TIP": return "Tip";
    case "PPV": return "PPV unlock";
    default: return purpose;
  }
}