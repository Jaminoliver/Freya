// app/api/checkout/initialize/route.ts
// Initializes a Monnify transaction for direct card or bank transfer payments
// Used for subscriptions, tips, and PPV when paying via card or bank transfer (not wallet)
// Card → returns checkoutUrl for redirect
// Bank transfer → returns inline account details

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { initializeTransaction, getMonnifyAccessToken } from "@/lib/monnify/client";

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
    const { paymentMethod, type, amount, creatorId, tierId, postId, message } = body;

    // Validate
    if (!paymentMethod || !type || !amount || !creatorId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (!["CARD", "BANK_TRANSFER"].includes(paymentMethod)) {
      return NextResponse.json({ message: "Invalid payment method" }, { status: 400 });
    }

    if (!["subscription", "tip", "ppv"].includes(type)) {
      return NextResponse.json({ message: "Invalid type" }, { status: 400 });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ message: "Invalid amount" }, { status: 400 });
    }

    // Amount from frontend is in naira — convert to kobo for storage
    const amountKobo = Math.round(amount * 100);

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    const email = profile?.email ?? user.email ?? "";
    const name = profile?.full_name ?? "Freya User";

    // Generate reference based on type
    const typePrefix = type === "subscription" ? "SUB" : type === "tip" ? "TIP" : "PPV";
    const reference = `FRY-${typePrefix}-${user.id.slice(0, 8)}-${Date.now()}`;

    // Build description
    let description = "";
    if (type === "subscription") description = `Freya subscription — ₦${amount.toLocaleString()}`;
    else if (type === "tip") description = `Freya tip — ₦${amount.toLocaleString()}`;
    else description = `Freya content unlock — ₦${amount.toLocaleString()}`;

    // Build metadata — this is how the webhook knows what to do
    const metadata: Record<string, any> = {
      user_id: user.id,
      purpose: type === "subscription" ? "SUBSCRIPTION" : type === "tip" ? "TIP" : "PPV",
      creator_id: creatorId,
    };
    if (tierId) metadata.tier_id = tierId;
    if (postId) metadata.post_id = postId;
    if (message) metadata.message = message;

    // Determine Monnify payment methods
    const monnifyMethods: ("CARD" | "ACCOUNT_TRANSFER")[] =
      paymentMethod === "CARD" ? ["CARD"] : ["ACCOUNT_TRANSFER"];

    // Use service role for DB operations to bypass RLS
    const serviceSupabase = createServiceSupabaseClient();

    // Insert pending transaction
    const { error: insertError } = await serviceSupabase.from("transactions").insert({
      user_id: user.id,
      fan_id: user.id,
      provider: "MONNIFY",
      provider_txn_id: reference,
      amount: amountKobo,
      currency: "NGN",
      status: "pending",
      payment_method: paymentMethod,
      purpose: type === "subscription" ? "SUBSCRIPTION" : type === "tip" ? "TIP" : "PPV",
      subscription_id: tierId ? Number(tierId) : null,
      metadata,
    });

    if (insertError) {
      console.error("[Checkout Initialize] Failed to insert transaction:", insertError.message);
      return NextResponse.json({ message: "Failed to create transaction" }, { status: 500 });
    }

    // Initialize Monnify transaction
    const result = await initializeTransaction({
      amount: amountKobo,
      customerName: name,
      customerEmail: email,
      paymentReference: reference,
      paymentDescription: description,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?ref=${reference}`,
      paymentMethods: monnifyMethods,
      metadata,
    });

    // Update transaction with Monnify reference
    const { error: updateError } = await serviceSupabase
      .from("transactions")
      .update({ monnify_transaction_ref: result.transactionReference })
      .eq("provider_txn_id", reference);

    if (updateError) {
      console.error("[Checkout Initialize] Failed to update monnify_transaction_ref:", updateError.message);
    } else {
      console.log("[Checkout Initialize] Saved monnify_transaction_ref:", result.transactionReference, "for reference:", reference);
    }

    // For bank transfer — fetch the account details from Monnify
    if (paymentMethod === "BANK_TRANSFER") {
      try {
        // ✅ Reuse the shared cached token from client.ts (avoids auth race conditions)
        const accessToken = await getMonnifyAccessToken();

        const bankDetailsRes = await fetch(
          `${process.env.MONNIFY_BASE_URL}/api/v1/merchant/bank-transfer/init-payment`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              transactionReference: result.transactionReference,
            }),
          }
        );

        const bankData = await bankDetailsRes.json();

        console.log("[Checkout Initialize] Bank transfer raw response:", JSON.stringify(bankData, null, 2));

        if (bankData.requestSuccessful && bankData.responseBody) {
          const bd = bankData.responseBody;
          return NextResponse.json({
            paymentMethod: "BANK_TRANSFER",
            reference,
            transactionReference: result.transactionReference,
            accountNumber: bd.accountNumber,
            bankName: bd.bankName,
            accountName: bd.accountName || "Freya Media",
            expiresAt: bd.expiresOn || null,
            amount,
            currency: "NGN",
          });
        }

        // ✅ Return a clear error instead of falling back to redirect
        console.error("[Checkout Initialize] Bank transfer init failed:", bankData.responseMessage);
        return NextResponse.json(
          { message: bankData.responseMessage || "Failed to generate bank account. Please try again." },
          { status: 502 }
        );
      } catch (bankErr) {
        console.error("[Checkout Initialize] Bank transfer init error:", bankErr);
        return NextResponse.json(
          { message: "Could not generate a bank account. Please try again." },
          { status: 502 }
        );
      }
    }

    // Card payment — return checkout URL for redirect
    return NextResponse.json({
      paymentMethod: "CARD",
      reference,
      transactionReference: result.transactionReference,
      checkoutUrl: result.checkoutUrl,
      amount,
      currency: "NGN",
    });
  } catch (error) {
    console.error("[Checkout Initialize Error]", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}