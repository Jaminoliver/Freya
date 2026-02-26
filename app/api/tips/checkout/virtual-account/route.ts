import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createDynamicAccount, generatePayOnUsReference } from "@/lib/utils/payonus";

// ─── POST /api/tips/checkout/virtual-account ─────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("[TIP VA] Body received:", body);

    const { creatorId, amount, currency = "NGN", message = "" } = body;

    if (!creatorId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ message: "creatorId and a valid amount are required" }, { status: 400 });
    }

    const tipAmount = Number(amount);

    // Prevent tipping yourself
    if (user.id === creatorId) {
      return NextResponse.json({ message: "You cannot tip yourself" }, { status: 400 });
    }

    // Check creator exists
    const { data: creator } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .eq("id", creatorId)
      .single();

    if (!creator) {
      return NextResponse.json({ message: "Creator not found" }, { status: 404 });
    }

    // Get fan profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, phone")
      .eq("id", user.id)
      .single();

    const email = profile?.email ?? user.email ?? "";
    const name  = profile?.full_name ?? "Freya User";
    const phone = profile?.phone ?? "+2340000000000";

    const reference = generatePayOnUsReference("VA-TIP");

    console.log("[TIP VA] Creating PayOnUs account", { tipAmount, reference, email, creatorId });

    // Create PayOnUs dynamic account
    const result = await createDynamicAccount({
      amount: tipAmount,
      reference,
      customer: {
        name,
        email,
        phone,
        externalId: user.id,
        address: {
          countryCode: "NG",
          state:       "Lagos",
          line1:       "Nigeria",
        },
      },
    });

    console.log("[TIP VA] PayOnUs result:", JSON.stringify(result, null, 2));

    // Save pending tip transaction
    const { data: newTxn, error: txnError } = await supabase
      .from("transactions")
      .insert({
        user_id:          user.id,
        fan_id:           user.id,
        transaction_type: "tip",
        provider:         "PAYONUS",
        provider_txn_id:  reference,
        amount:           tipAmount,
        currency,
        status:           "pending",
        payment_method:   "VIRTUAL_ACCOUNT",
        purpose:          "TIP",
        description:      `Tip to @${creator.username} via bank transfer`,
        metadata: {
          creator_id: creatorId,
          message,
        },
      })
      .select("id")
      .single();

    if (txnError) {
      console.error("[TIP VA] Transaction insert failed:", txnError.message, txnError.details);
      return NextResponse.json({ message: "Failed to create payment record" }, { status: 500 });
    }

    return NextResponse.json({
      message:       "Virtual account created",
      accountNumber: result.accountNumber,
      bankName:      result.bankName,
      accountName:   result.accountName,
      onusReference: result.onusReference,
      expiresAt:     null,
      amount:        tipAmount,
      currency,
      reference,
      transactionId: newTxn?.id,
    });

  } catch (error) {
    console.error("[TIP VA] Error:", error instanceof Error ? error.message : error);
    console.error("[TIP VA] Stack:", error instanceof Error ? error.stack : "no stack");
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}