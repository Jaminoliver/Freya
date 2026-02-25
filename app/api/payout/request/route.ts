import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { initiateTransfer } from "@/lib/utils/kyshi";
import { getWalletBalance } from "@/lib/utils/wallet";

// ─── POST /api/payout/request ─────────────────────────────────────────────────
// Creator requests a withdrawal to their registered bank account
// Checks balance, initiates Kyshi transfer, saves payout request

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount } = body;

    if (!amount || amount < 1000) {
      return NextResponse.json({ message: "Minimum payout amount is ₦1,000" }, { status: 400 });
    }

    // Check creator has a verified active payout account
    const { data: bankAccount } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("creator_id", user.id)
      .eq("is_verified", true)
      .eq("is_active", true)
      .single();

    if (!bankAccount) {
      return NextResponse.json({
        message: "No verified payout account found. Please set up your bank account first.",
      }, { status: 400 });
    }

    // Check sufficient balance
    const balance = await getWalletBalance(user.id);
    if (balance < amount) {
      return NextResponse.json({ message: "Insufficient balance" }, { status: 400 });
    }

    // Create payout request record
    const { data: payoutRequest, error: dbError } = await supabase
      .from("payout_requests")
      .insert({
        creator_id: user.id,
        amount,
        status: "PENDING",
        bank_account_number: bankAccount.account_number,
        bank_code: bankAccount.bank_code,
        requested_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (dbError) throw new Error(dbError.message);

    // Initiate Kyshi transfer
    const result = await initiateTransfer({
      beneficiary: {
        accountNumber: bankAccount.account_number,
        accountName: bankAccount.account_name,
        bankCode: bankAccount.bank_code,
        bankName: bankAccount.bank_name,
      },
      amount,
      currency: "NGN",
      narration: `Freya earnings payout - ${new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`,
    });

    // Save transfer code for webhook matching
    await supabase
      .from("payout_requests")
      .update({
        status: "PROCESSING",
        kyshi_transfer_code: result.data.transferCode,
      })
      .eq("id", payoutRequest.id);

    return NextResponse.json({
      message: "Payout initiated successfully",
      transferCode: result.data.transferCode,
      amount,
    });

  } catch (error) {
    console.error("[Payout Request Error]", error);
    return NextResponse.json({ message: "Failed to process payout" }, { status: 500 });
  }
}