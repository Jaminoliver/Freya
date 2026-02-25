import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createDynamicAccount, generatePayOnUsReference } from "@/lib/utils/payonus";

// ─── POST /api/wallet/topup/virtual-account ───────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount } = body;

    if (!amount || amount < 500) {
      return NextResponse.json({ message: "Minimum top-up amount is ₦500" }, { status: 400 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, phone")
      .eq("id", user.id)
      .single();

    const email = profile?.email ?? user.email ?? "";
    const name  = profile?.full_name ?? "Freya User";
    const phone = profile?.phone ?? "+2340000000000";

    const reference = generatePayOnUsReference("VA-TOPUP");

    // Create PayOnUs dynamic account
    const result = await createDynamicAccount({
      amount,
      reference,
      customer: {
        name,
        email,
        phone,
        externalId: user.id,
        address: {
          countryCode: "NG",
          state: "Lagos",
          line1: "Nigeria",
        },
      },
    });

    // Save pending transaction
    const { error: insertError } = await supabase.from("transactions").insert({
      user_id:          user.id,
      fan_id:           user.id,
      transaction_type: "wallet_topup",
      provider:         "PAYONUS",
      provider_txn_id:  reference,
      amount,
      currency:         "NGN",
      status:           "pending",
      payment_method:   "VIRTUAL_ACCOUNT",
      purpose:          "WALLET_TOPUP",
      description:      "Wallet top-up via bank transfer",
    });

    if (insertError) {
      console.error("[Wallet Topup] Failed to insert transaction:", insertError.message);
    }

    return NextResponse.json({
      message:       "Dynamic account created",
      accountNumber: result.accountNumber,
      bankName:      result.bankName,
      accountName:   result.accountName,
      onusReference: result.onusReference,
      amount,
      currency:      "NGN",
      reference,
    });

  } catch (error) {
    console.error("[Wallet Topup Virtual Account Error]", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}