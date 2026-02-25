import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createDynamicAccount, generatePayOnUsReference } from "@/lib/utils/payonus";

// ─── POST /api/subscriptions/checkout/virtual-account ────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("[SUB VA] Body received:", body);

    const { creatorId, tierId, currency = "NGN", tierDuration = "monthly" } = body;

    if (!creatorId || !tierId) {
      return NextResponse.json({ message: "creatorId and tierId are required" }, { status: 400 });
    }

    // Get tier details
    const { data: tier } = await supabase
      .from("subscription_tiers")
      .select("id, tier_name, price_monthly, three_month_price, six_month_price")
      .eq("id", tierId)
      .single();

    if (!tier) {
      return NextResponse.json({ message: "Subscription tier not found" }, { status: 404 });
    }

    // Pick price based on selected duration
    const amount =
      tierDuration === "three_month" ? Number(tier.three_month_price) :
      tierDuration === "six_month"   ? Number(tier.six_month_price) :
      Number(tier.price_monthly);

    // Block if already actively subscribed
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("fan_id", user.id)
      .eq("creator_id", creatorId)
      .eq("status", "active")
      .maybeSingle();

    if (existingSub) {
      return NextResponse.json({ message: "Already subscribed to this creator" }, { status: 409 });
    }

    // Block if a pending payment already exists for this combo (avoid duplicate VAs)
    const { data: pendingTxn } = await supabase
      .from("transactions")
      .select("id, provider_txn_id, amount")
      .eq("fan_id", user.id)
      .eq("purpose", "SUBSCRIPTION")
      .eq("status", "pending")
      .contains("metadata", { creator_id: creatorId, tier_id: tierId })
      .maybeSingle();

    if (pendingTxn) {
      console.log("[SUB VA] Reusing existing pending transaction:", pendingTxn.id);
      // Return existing reference so user can complete the same payment
      return NextResponse.json({
        message:       "Pending payment already exists. Please complete your bank transfer.",
        reference:     pendingTxn.provider_txn_id,
        amount:        pendingTxn.amount,
        currency,
        isPending:     true,
      });
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

    const reference = generatePayOnUsReference("VA-SUB");

    console.log("[SUB VA] Creating PayOnUs account", { amount, reference, email, tierId, creatorId, tierDuration });

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

    console.log("[SUB VA] PayOnUs result:", JSON.stringify(result, null, 2));

    // Save pending transaction only — subscription created by webhook on payment confirmation
    const { data: newTxn, error: txnError } = await supabase
      .from("transactions")
      .insert({
        user_id:          user.id,
        fan_id:           user.id,
        transaction_type: "subscription_payment",
        provider:         "PAYONUS",
        provider_txn_id:  reference,
        amount,
        currency,
        status:           "pending",
        payment_method:   "VIRTUAL_ACCOUNT",
        purpose:          "SUBSCRIPTION",
        subscription_id:  null, // set by webhook after confirmation
        description:      `Subscription payment via bank transfer (${tierDuration})`,
        metadata: {
          creator_id:    creatorId,
          tier_id:       tierId,
          tier_duration: tierDuration,
        },
      })
      .select("id")
      .single();

    if (txnError) {
      console.error("[SUB VA] Transaction insert failed:", txnError.message, txnError.details);
      return NextResponse.json({ message: "Failed to create payment record" }, { status: 500 });
    }

    return NextResponse.json({
      message:       "Virtual account created",
      accountNumber: result.accountNumber,
      bankName:      result.bankName,
      accountName:   result.accountName,
      onusReference: result.onusReference,
      expiresAt:     null,
      amount,
      currency,
      reference,
      transactionId: newTxn?.id,
    });

  } catch (error) {
    console.error("[SUB VA] Error:", error instanceof Error ? error.message : error);
    console.error("[SUB VA] Stack:", error instanceof Error ? error.stack : "no stack");
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}