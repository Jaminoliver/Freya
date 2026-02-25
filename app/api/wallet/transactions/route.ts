import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getTransactionHistory } from "@/lib/utils/wallet";

// ─── GET /api/wallet/transactions ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");

    const { transactions, total } = await getTransactionHistory({ userId: user.id, page, limit });

    // Wallet tab only shows fan-facing entries — exclude creator earnings and platform fees
    const walletTransactions = transactions.filter(
      (t) => t.category !== "CREATOR_EARNING" && t.category !== "PLATFORM_FEE"
    );

    return NextResponse.json({ transactions: walletTransactions, total: walletTransactions.length });
  } catch (error) {
    console.error("[Wallet Transactions Error]", error);
    return NextResponse.json({ message: "Failed to fetch transactions" }, { status: 500 });
  }
}