// app/api/wallet/topup/card/route.ts
// Card top-up via Monnify — first-time redirects to checkout, saved card charges silently

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { initializeTransaction } from "@/lib/monnify/client";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, cardId } = body;

    // amount comes from frontend in naira
    if (!amount || amount < 100) {
      return NextResponse.json(
        { message: "Minimum top-up amount is ₦100" },
        { status: 400 }
      );
    }

    // Convert naira to kobo for storage
    const amountKobo = Math.round(amount * 100);

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    const email = profile?.email ?? user.email ?? "";
    const name = profile?.full_name ?? "Freya User";

    // Generate unique payment reference
    const reference = `FRY-TOPUP-${user.id.slice(0, 8)}-${Date.now()}`;

    // TODO: Saved card charging via Monnify card token
    // Monnify card tokenization requires their SDK flow — for now all card
    // payments go through the hosted checkout. Saved card charging will be
    // added once we confirm Monnify's charge-with-token endpoint details.
    if (cardId) {
      // For now, fall through to checkout flow
      // Future: look up card_token from fan_payment_methods, call Monnify charge endpoint
    }

    // Insert pending transaction in DB
    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: user.id,
      fan_id: user.id,
      provider: "MONNIFY",
      provider_txn_id: reference,
      amount: amountKobo,
      currency: "NGN",
      status: "pending",
      payment_method: "CARD",
      purpose: "WALLET_TOPUP",
      metadata: {
        user_id: user.id,
        purpose: "WALLET_TOPUP",
      },
    });

    if (insertError) {
      console.error("[Card Topup] Failed to insert transaction:", insertError.message);
      return NextResponse.json(
        { message: "Failed to create transaction" },
        { status: 500 }
      );
    }

    // Initialize Monnify checkout
    const result = await initializeTransaction({
      amount: amountKobo,
      customerName: name,
      customerEmail: email,
      paymentReference: reference,
      paymentDescription: `Freya wallet top-up — ₦${amount.toLocaleString()}`,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?ref=${reference}`,
      paymentMethods: ["CARD"],
      metadata: {
        user_id: user.id,
        purpose: "WALLET_TOPUP",
      },
    });

    // Update transaction with Monnify's reference
    await supabase
      .from("transactions")
      .update({ monnify_transaction_ref: result.transactionReference })
      .eq("provider_txn_id", reference);

    return NextResponse.json({
      message: "Checkout initialized",
      authorizationUrl: result.checkoutUrl,
      reference,
      transactionReference: result.transactionReference,
    });
  } catch (error) {
    console.error("[Card Topup Error]", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}