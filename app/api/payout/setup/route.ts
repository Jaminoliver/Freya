import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createBeneficiary } from "@/lib/utils/kyshi";

// ─── POST /api/payout/setup ───────────────────────────────────────────────────
// Registers creator's bank account as a Kyshi beneficiary
// Called when creator saves their payout account during onboarding or settings

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accountNumber, accountName, bankCode, bankName } = body;

    if (!accountNumber || !accountName || !bankCode || !bankName) {
      return NextResponse.json({ message: "All bank account fields are required" }, { status: 400 });
    }

    // Register as Kyshi beneficiary
    const result = await createBeneficiary({
      accountNumber,
      accountName,
      bankCode,
      bankName,
    });

    // Deactivate existing payout account if any
    await supabase
      .from("bank_accounts")
      .update({ is_active: false })
      .eq("creator_id", user.id);

    // Save new payout account
    const { error: dbError } = await supabase.from("bank_accounts").insert({
      creator_id: user.id,
      account_number: accountNumber,
      account_name: accountName,
      bank_code: bankCode,
      bank_name: bankName,
      kyshi_beneficiary_id: result.data.id,
      is_verified: true,
      is_active: true,
      verified_at: new Date().toISOString(),
    });

    if (dbError) throw new Error(dbError.message);

    return NextResponse.json({ message: "Payout account saved successfully" });

  } catch (error) {
    console.error("[Payout Setup Error]", error);
    return NextResponse.json({ message: "Failed to save payout account" }, { status: 500 });
  }
}