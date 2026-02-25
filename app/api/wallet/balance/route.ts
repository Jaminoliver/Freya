import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWalletBalance } from "@/lib/utils/wallet";

// ─── GET /api/wallet/balance ──────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Debug — remove after fix
    const { data, error: ledgerError } = await supabase
      .from("ledger_entries")
      .select("type, amount")
      .eq("user_id", user.id);
    console.log("[Balance Debug] user:", user.id, "data:", data, "error:", ledgerError?.message);

    const balance = await getWalletBalance(user.id);
    return NextResponse.json({ balance });
  } catch (error) {
    console.error("[Wallet Balance Error]", error);
    return NextResponse.json({ message: "Failed to fetch balance" }, { status: 500 });
  }
}