import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("payout_requests")
      .select("id, amount, status, bank_account_number, bank_code, requested_at, completed_at")
      .eq("creator_id", user.id)
      .order("requested_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    // Fetch bank name from bank_accounts to display alongside account number
    const { data: bankAccount } = await supabase
      .from("bank_accounts")
      .select("bank_name, account_number")
      .eq("creator_id", user.id)
      .maybeSingle();

    const history = (data ?? []).map((row) => ({
      id:     String(row.id),
      amount: Number(row.amount),
      status: row.status.toLowerCase(),
      date:   new Date(row.requested_at).toLocaleDateString("en-NG", {
        day: "numeric", month: "short", year: "numeric",
      }),
      bank: bankAccount
        ? `${bankAccount.bank_name} •••• ${row.bank_account_number.slice(-4)}`
        : `•••• ${row.bank_account_number.slice(-4)}`,
    }));

    return NextResponse.json({ history });
  } catch (err) {
    console.error("[Payout History]", err);
    return NextResponse.json({ error: "Failed to fetch payout history" }, { status: 500 });
  }
}