// app/api/wallet/topup/virtual-account/route.ts
// Bank transfer top-up via Monnify — generates temporary account for one-time transfer

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
    const { amount } = body;

    // amount comes from frontend in naira
    if (!amount || amount < 500) {
      return NextResponse.json(
        { message: "Minimum top-up amount is ₦500" },
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
    const reference = `FRY-VA-${user.id.slice(0, 8)}-${Date.now()}`;

    // Insert pending transaction
    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: user.id,
      fan_id: user.id,
      provider: "MONNIFY",
      provider_txn_id: reference,
      amount: amountKobo,
      currency: "NGN",
      status: "pending",
      payment_method: "BANK_TRANSFER",
      purpose: "WALLET_TOPUP",
      metadata: {
        user_id: user.id,
        purpose: "WALLET_TOPUP",
      },
    });

    if (insertError) {
      console.error("[VA Topup] Failed to insert transaction:", insertError.message);
      return NextResponse.json(
        { message: "Failed to create transaction" },
        { status: 500 }
      );
    }

    // Initialize Monnify transaction with ACCOUNT_TRANSFER only
    // This returns a checkout URL — Monnify's checkout page shows the
    // temporary bank account details (account number, bank name, amount)
    // The fan can then transfer from their banking app
    const result = await initializeTransaction({
      amount: amountKobo,
      customerName: name,
      customerEmail: email,
      paymentReference: reference,
      paymentDescription: `Freya wallet top-up — ₦${amount.toLocaleString()}`,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?ref=${reference}`,
      paymentMethods: ["ACCOUNT_TRANSFER"],
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

    // Return checkout URL — Monnify's hosted page displays the account details
    // The fan sees: account number, bank name, amount, countdown timer
    return NextResponse.json({
      message: "Bank transfer initialized",
      // SDK data for inline checkout
      reference,
      transactionReference: result.transactionReference,
      amountNaira: amount,
      customerName: name,
      customerEmail: email,
      apiKey: process.env.MONNIFY_API_KEY,
      contractCode: process.env.MONNIFY_CONTRACT_CODE,
      paymentDescription: `Freya wallet top-up — ₦${amount.toLocaleString()}`,
      isTestMode: (process.env.MONNIFY_BASE_URL || "").includes("sandbox"),
      metadata: {
        user_id: user.id,
        purpose: "WALLET_TOPUP",
      },
      // Fallback for redirect flow
      checkoutUrl: result.checkoutUrl,
      amount,
      currency: "NGN",
    });
  } catch (error) {
    console.error("[VA Topup Error]", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}