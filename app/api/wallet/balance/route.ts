// app/api/wallet/balance/route.ts
// Returns the user's current wallet balance from the wallets table

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Read from wallets table (cached balance, updated by webhook + internal ops)
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("balance, pending_balance, total_earned, total_spent")
      .eq("user_id", user.id)
      .single();

    if (walletError && walletError.code !== "PGRST116") {
      console.error("[Wallet Balance] DB error:", walletError.message);
      return NextResponse.json({ message: "Failed to fetch balance" }, { status: 500 });
    }

    // If no wallet row exists yet, return zero
    const balance = wallet?.balance ?? 0;
    const pendingBalance = wallet?.pending_balance ?? 0;
    const totalEarned = wallet?.total_earned ?? 0;
    const totalSpent = wallet?.total_spent ?? 0;

    return NextResponse.json({
      balance,
      pendingBalance,
      totalEarned,
      totalSpent,
      // Display values in naira (divide kobo by 100)
      balanceNaira: balance / 100,
      pendingBalanceNaira: pendingBalance / 100,
    });
  } catch (error) {
    console.error("[Wallet Balance Error]", error);
    return NextResponse.json({ message: "Failed to fetch balance" }, { status: 500 });
  }
}