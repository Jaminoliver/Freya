// app/api/webhooks/monnify/route.ts
// Monnify webhook endpoint — receives payment and disbursement events
// Must return 200 quickly to avoid Monnify retries (max 10 retries, 5min intervals)

import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  verifyWebhookSignature,
  parseWebhookEvent,
  isSuccessfulTransaction,
  isFailedTransaction,
  isSuccessfulDisbursement,
  isFailedDisbursement,
  MONNIFY_WEBHOOK_IP,
} from "@/lib/monnify/webhook";
import type {
  MonnifyTransactionEvent,
  MonnifyDisbursementEvent,
} from "@/lib/monnify/webhook";

export async function POST(request: NextRequest) {
  console.log("[Monnify Webhook] ========== WEBHOOK HIT ==========");
  console.log("[Monnify Webhook] Method:", request.method);
  console.log("[Monnify Webhook] URL:", request.url);

  let rawBody: string;

  try {
    rawBody = await request.text();
    console.log("[Monnify Webhook] Raw body length:", rawBody.length);
    console.log("[Monnify Webhook] Raw body preview:", rawBody.substring(0, 300));
  } catch (error) {
    console.error("[Monnify Webhook] Failed to read request body:", error);
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // 1. Verify webhook signature
  const signature = request.headers.get("monnify-signature");
  console.log("[Monnify Webhook] Signature present:", !!signature);
  console.log("[Monnify Webhook] Signature preview:", signature?.substring(0, 30) + "...");

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("[Monnify Webhook] Invalid signature — rejecting");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  console.log("[Monnify Webhook] Signature verified OK");

  // 2. Optional: IP whitelist check
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0]?.trim();
  console.log("[Monnify Webhook] Client IP:", clientIp);
  if (clientIp && clientIp !== MONNIFY_WEBHOOK_IP) {
    console.warn("[Monnify Webhook] Request from unexpected IP:", clientIp);
  }

  // 3. Parse the event
  let event;
  try {
    event = parseWebhookEvent(rawBody);
  } catch (error) {
    console.error("[Monnify Webhook] Failed to parse event:", error);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[Monnify Webhook] Event type:", event.eventType);
  console.log("[Monnify Webhook] Event data:", JSON.stringify(event, null, 2).substring(0, 500));

  // 4. Route to handler based on event type
  try {
    if (isSuccessfulTransaction(event)) {
      console.log("[Monnify Webhook] Routing to handleSuccessfulTransaction");
      await handleSuccessfulTransaction(event);
    } else if (isFailedTransaction(event)) {
      console.log("[Monnify Webhook] Routing to handleFailedTransaction");
      await handleFailedTransaction(event);
    } else if (isSuccessfulDisbursement(event)) {
      await handleSuccessfulDisbursement(event);
    } else if (isFailedDisbursement(event)) {
      await handleFailedDisbursement(event);
    } else {
      console.log("[Monnify Webhook] Unhandled event type:", event.eventType);
    }
  } catch (error) {
    console.error("[Monnify Webhook] Handler error:", error);
    // Still return 200 to prevent Monnify retries on our processing errors
    // The error is logged — we can reconcile manually if needed
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

// ============================================================
// EVENT HANDLERS
// ============================================================

/**
 * Handle successful payment (wallet top-up or direct subscription)
 */
async function handleSuccessfulTransaction(event: MonnifyTransactionEvent) {
  const { eventData } = event;
  const supabase = createServiceSupabaseClient();

  console.log("[Monnify Webhook] Processing successful transaction:", {
    transactionReference: eventData.transactionReference,
    paymentReference: eventData.paymentReference,
    amount: eventData.amountPaid,
    method: eventData.paymentMethod,
    status: eventData.paymentStatus,
  });
  console.log("[Monnify Webhook] MetaData:", JSON.stringify(eventData.metaData));
  console.log("[Monnify Webhook] Customer:", JSON.stringify(eventData.customer));
  console.log("[Monnify Webhook] Product:", JSON.stringify(eventData.product));

  // Idempotency check — try by monnify_transaction_ref first, then by provider_txn_id (paymentReference)
  let existingTx: { id: number; status: string } | null = null;

  const { data: txByRef } = await supabase
    .from("transactions")
    .select("id, status")
    .eq("monnify_transaction_ref", eventData.transactionReference)
    .single();

  console.log("[Monnify Webhook] Lookup by monnify_transaction_ref:", txByRef);

  if (txByRef) {
    existingTx = txByRef;
  } else {
    // Fallback: lookup by paymentReference (our provider_txn_id)
    const { data: txByPayRef } = await supabase
      .from("transactions")
      .select("id, status")
      .eq("provider_txn_id", eventData.paymentReference)
      .single();

    console.log("[Monnify Webhook] Lookup by provider_txn_id:", txByPayRef);
    existingTx = txByPayRef;
  }

  if (existingTx && existingTx.status === "confirmed") {
    console.log("[Monnify Webhook] Transaction already processed, skipping:", eventData.transactionReference);
    return;
  }

  // Convert amount from naira (Monnify) to kobo (our system)
  const amountKobo = Math.round(eventData.amountPaid * 100);

  // Determine purpose from metadata or payment reference
  const metadata = eventData.metaData || {};
  const purpose = metadata.purpose || "WALLET_TOPUP";
  const userId = metadata.user_id;

  console.log("[Monnify Webhook] Extracted — purpose:", purpose, "userId:", userId, "amountKobo:", amountKobo);

  if (!userId) {
    // Try to get userId from existing transaction row
    if (existingTx) {
      const { data: txRow } = await supabase
        .from("transactions")
        .select("user_id, purpose, metadata")
        .eq("id", existingTx.id)
        .single();

      console.log("[Monnify Webhook] Fallback txRow lookup:", txRow);

      if (txRow?.user_id) {
        const fallbackUserId = txRow.user_id;
        const fallbackPurpose = txRow.metadata?.purpose || txRow.purpose || "WALLET_TOPUP";
        console.log("[Monnify Webhook] Using fallback userId:", fallbackUserId, "purpose:", fallbackPurpose);

        if (fallbackPurpose === "WALLET_TOPUP") {
          await processWalletTopUp(supabase, {
            userId: fallbackUserId,
            amountKobo,
            transactionReference: eventData.transactionReference,
            paymentReference: eventData.paymentReference,
            paymentMethod: eventData.paymentMethod === "CARD" ? "CARD" : "BANK_TRANSFER",
            cardDetails: eventData.cardDetails,
            existingTxId: existingTx.id,
          });
        }
        return;
      }
    }

    console.error("[Monnify Webhook] No user_id found anywhere — cannot process:", eventData.transactionReference);
    return;
  }

  if (purpose === "WALLET_TOPUP") {
    await processWalletTopUp(supabase, {
      userId,
      amountKobo,
      transactionReference: eventData.transactionReference,
      paymentReference: eventData.paymentReference,
      paymentMethod: eventData.paymentMethod === "CARD" ? "CARD" : "BANK_TRANSFER",
      cardDetails: eventData.cardDetails,
      existingTxId: existingTx?.id || null,
    });
  } else if (purpose === "SUBSCRIPTION") {
    await processDirectSubscription(supabase, {
      userId,
      amountKobo,
      transactionReference: eventData.transactionReference,
      paymentReference: eventData.paymentReference,
      paymentMethod: eventData.paymentMethod === "CARD" ? "CARD" : "BANK_TRANSFER",
      cardDetails: eventData.cardDetails,
      creatorId: metadata.creator_id,
      tierId: metadata.tier_id,
      existingTxId: existingTx?.id || null,
    });
  } else {
    console.warn("[Monnify Webhook] Unknown purpose:", purpose);
  }
}

/**
 * Process a wallet top-up payment
 */
async function processWalletTopUp(
  supabase: any,
  params: {
    userId: string;
    amountKobo: number;
    transactionReference: string;
    paymentReference: string;
    paymentMethod: "CARD" | "BANK_TRANSFER";
    cardDetails: MonnifyTransactionEvent["eventData"]["cardDetails"];
    existingTxId: number | null;
  }
) {
  const { userId, amountKobo, transactionReference, paymentReference, paymentMethod, cardDetails, existingTxId } = params;

  console.log("[processWalletTopUp] Starting:", { userId, amountKobo, transactionReference, paymentReference, paymentMethod, existingTxId });

  // Update or insert transaction record
  if (existingTxId) {
    const { error: updateErr } = await supabase
      .from("transactions")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        monnify_transaction_ref: transactionReference,
      })
      .eq("id", existingTxId);

    console.log("[processWalletTopUp] Transaction update:", updateErr ? `ERROR: ${updateErr.message}` : "OK");
  } else {
    const { error: insertErr } = await supabase.from("transactions").insert({
      user_id: userId,
      fan_id: userId,
      amount: amountKobo,
      status: "confirmed",
      provider: "MONNIFY",
      provider_txn_id: paymentReference,
      monnify_transaction_ref: transactionReference,
      currency: "NGN",
      payment_method: paymentMethod,
      purpose: "WALLET_TOPUP",
      confirmed_at: new Date().toISOString(),
    });

    console.log("[processWalletTopUp] Transaction insert:", insertErr ? `ERROR: ${insertErr.message}` : "OK");
  }

  // Get current wallet balance for balance_after calculation
  const { data: wallet, error: walletErr } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .single();

  console.log("[processWalletTopUp] Wallet lookup:", { wallet, error: walletErr?.message });

  const currentBalance = wallet?.balance || 0;
  const newBalance = currentBalance + amountKobo;

  console.log("[processWalletTopUp] Balance calc:", { currentBalance, amountKobo, newBalance });

  // Insert ledger entry
  const { error: ledgerErr } = await supabase.from("ledger").insert({
    user_id: userId,
    type: "CREDIT",
    amount: amountKobo,
    balance_after: newBalance,
    category: "WALLET_TOPUP",
    reference_id: paymentReference,
    provider: "MONNIFY",
    provider_reference: transactionReference,
  });

  console.log("[processWalletTopUp] Ledger insert:", ledgerErr ? `ERROR: ${ledgerErr.message}` : "OK");

  // Update wallet balance
  const { error: walletUpdateErr } = await supabase
    .from("wallets")
    .update({
      balance: newBalance,
      total_earned: (wallet?.balance || 0) + amountKobo,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  console.log("[processWalletTopUp] Wallet update:", walletUpdateErr ? `ERROR: ${walletUpdateErr.message}` : "OK");

  // Save card token for future charges if card payment
  if (paymentMethod === "CARD" && cardDetails?.reusableToken) {
    const { data: existingCard } = await supabase
      .from("fan_payment_methods")
      .select("id")
      .eq("fan_id", userId)
      .eq("card_token", cardDetails.reusableToken)
      .single();

    if (!existingCard) {
      await supabase.from("fan_payment_methods").insert({
        fan_id: userId,
        provider: "MONNIFY",
        card_token: cardDetails.reusableToken,
        card_type: cardDetails.cardType || null,
        last_four: cardDetails.last4 || null,
        expiry: cardDetails.expMonth && cardDetails.expYear
          ? `${cardDetails.expMonth}/${cardDetails.expYear}`
          : null,
        is_default: true,
      });

      // Set all other cards as non-default
      if (cardDetails.reusableToken) {
        await supabase
          .from("fan_payment_methods")
          .update({ is_default: false })
          .eq("fan_id", userId)
          .neq("card_token", cardDetails.reusableToken);
      }
    }
  }

  console.log("[Monnify Webhook] Wallet top-up processed:", {
    userId,
    amountKobo,
    newBalance,
    method: paymentMethod,
  });
}

/**
 * Process a direct subscription payment (card/transfer, not wallet)
 */
async function processDirectSubscription(
  supabase: any,
  params: {
    userId: string;
    amountKobo: number;
    transactionReference: string;
    paymentReference: string;
    paymentMethod: "CARD" | "BANK_TRANSFER";
    cardDetails: MonnifyTransactionEvent["eventData"]["cardDetails"];
    creatorId: string;
    tierId: string;
    existingTxId: number | null;
  }
) {
  const { userId, amountKobo, transactionReference, paymentReference, paymentMethod, cardDetails, creatorId, tierId, existingTxId } = params;

  if (!creatorId || !tierId) {
    console.error("[Monnify Webhook] Missing creator_id or tier_id for subscription:", transactionReference);
    return;
  }

  // Get platform commission rate
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "commission_rate")
    .single();

  const commissionRate = parseInt(settings?.value || "18") / 100;
  const platformFee = Math.round(amountKobo * commissionRate);
  const creatorEarning = amountKobo - platformFee;

  // Calculate next renewal date
  const { data: tier } = await supabase
    .from("subscription_tiers")
    .select("price_monthly")
    .eq("id", tierId)
    .single();

  const now = new Date();
  const nextRenewal = new Date(now);
  nextRenewal.setMonth(nextRenewal.getMonth() + 1);

  // Update or insert transaction
  if (existingTxId) {
    await supabase
      .from("transactions")
      .update({
        status: "confirmed",
        confirmed_at: now.toISOString(),
        monnify_transaction_ref: transactionReference,
      })
      .eq("id", existingTxId);
  } else {
    await supabase.from("transactions").insert({
      user_id: userId,
      fan_id: userId,
      amount: amountKobo,
      status: "confirmed",
      provider: "MONNIFY",
      provider_txn_id: paymentReference,
      monnify_transaction_ref: transactionReference,
      currency: "NGN",
      payment_method: paymentMethod,
      purpose: "SUBSCRIPTION",
      confirmed_at: now.toISOString(),
    });
  }

  // Create or reactivate subscription
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("fan_id", userId)
    .eq("creator_id", creatorId)
    .eq("tier_id", tierId)
    .single();

  if (existingSub) {
    await supabase
      .from("subscriptions")
      .update({
        status: "active",
        price_paid: amountKobo,
        current_period_start: now.toISOString(),
        current_period_end: nextRenewal.toISOString(),
        next_renewal_date: nextRenewal.toISOString().split("T")[0],
        last_renewed_at: now.toISOString(),
        last_payment_method: paymentMethod,
        auto_renew: true,
        updated_at: now.toISOString(),
      })
      .eq("id", existingSub.id);
  } else {
    await supabase.from("subscriptions").insert({
      fan_id: userId,
      creator_id: creatorId,
      tier_id: tierId,
      status: "active",
      price_paid: amountKobo,
      auto_renew: true,
      current_period_start: now.toISOString(),
      current_period_end: nextRenewal.toISOString(),
      next_renewal_date: nextRenewal.toISOString().split("T")[0],
      last_renewed_at: now.toISOString(),
      last_payment_method: paymentMethod,
    });
  }

  // Get creator wallet balance for ledger
  const { data: creatorWallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", creatorId)
    .single();

  const creatorCurrentBalance = creatorWallet?.balance || 0;
  const creatorNewBalance = creatorCurrentBalance + creatorEarning;

  // Insert creator earning ledger entry
  await supabase.from("ledger").insert({
    user_id: creatorId,
    type: "CREDIT",
    amount: creatorEarning,
    balance_after: creatorNewBalance,
    category: "CREATOR_EARNING",
    reference_id: paymentReference,
    provider: "MONNIFY",
    provider_reference: transactionReference,
  });

  // Insert platform fee ledger entry (tracked under a system/platform user or the creator)
  await supabase.from("ledger").insert({
    user_id: creatorId,
    type: "CREDIT",
    amount: platformFee,
    balance_after: creatorNewBalance,
    category: "PLATFORM_FEE",
    reference_id: paymentReference,
    provider: "MONNIFY",
    provider_reference: transactionReference,
  });

  // Update creator wallet
  await supabase
    .from("wallets")
    .update({
      balance: creatorNewBalance,
      total_earned: creatorCurrentBalance + creatorEarning,
      updated_at: now.toISOString(),
    })
    .eq("user_id", creatorId);

  // Save card token if card payment
  if (paymentMethod === "CARD" && cardDetails?.reusableToken) {
    const { data: existingCard } = await supabase
      .from("fan_payment_methods")
      .select("id")
      .eq("fan_id", userId)
      .eq("card_token", cardDetails.reusableToken)
      .single();

    if (!existingCard) {
      await supabase.from("fan_payment_methods").insert({
        fan_id: userId,
        provider: "MONNIFY",
        card_token: cardDetails.reusableToken,
        card_type: cardDetails.cardType || null,
        last_four: cardDetails.last4 || null,
        expiry: cardDetails.expMonth && cardDetails.expYear
          ? `${cardDetails.expMonth}/${cardDetails.expYear}`
          : null,
        is_default: true,
      });
    }
  }

  console.log("[Monnify Webhook] Direct subscription processed:", {
    fanId: userId,
    creatorId,
    tierId,
    amountKobo,
    creatorEarning,
    platformFee,
  });
}

/**
 * Handle failed transaction
 */
async function handleFailedTransaction(event: MonnifyTransactionEvent) {
  const { eventData } = event;
  const supabase = createServiceSupabaseClient();

  console.log("[Monnify Webhook] Transaction failed:", {
    reference: eventData.paymentReference,
    status: eventData.paymentStatus,
  });

  // Update transaction status to failed
  await supabase
    .from("transactions")
    .update({
      status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("monnify_transaction_ref", eventData.transactionReference);
}

/**
 * Handle successful disbursement (creator payout completed)
 */
async function handleSuccessfulDisbursement(event: MonnifyDisbursementEvent) {
  const { eventData } = event;
  const supabase = createServiceSupabaseClient();

  console.log("[Monnify Webhook] Disbursement successful:", {
    reference: eventData.reference,
    amount: eventData.amount,
  });

  // Find the payout request by reference
  const { data: payout } = await supabase
    .from("payout_requests")
    .select("id, creator_id, amount, status")
    .eq("monnify_transfer_ref", eventData.reference)
    .single();

  if (!payout) {
    console.error("[Monnify Webhook] No payout_request found for reference:", eventData.reference);
    return;
  }

  // Idempotency — skip if already completed
  if (payout.status === "COMPLETED") {
    console.log("[Monnify Webhook] Payout already completed, skipping:", eventData.reference);
    return;
  }

  // Get creator wallet for balance_after
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", payout.creator_id)
    .single();

  const currentBalance = wallet?.balance || 0;
  const newBalance = currentBalance - payout.amount;

  // Update payout request
  await supabase
    .from("payout_requests")
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
    })
    .eq("id", payout.id);

  // Insert DEBIT ledger entry
  await supabase.from("ledger").insert({
    user_id: payout.creator_id,
    type: "DEBIT",
    amount: payout.amount,
    balance_after: newBalance,
    category: "PAYOUT",
    reference_id: String(payout.id),
    provider: "MONNIFY",
    provider_reference: eventData.reference,
  });

  // Update creator wallet
  await supabase
    .from("wallets")
    .update({
      balance: newBalance,
      total_spent: (wallet?.balance || 0) + payout.amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", payout.creator_id);

  console.log("[Monnify Webhook] Payout completed:", {
    creatorId: payout.creator_id,
    amount: payout.amount,
    newBalance,
  });
}

/**
 * Handle failed disbursement (creator payout failed)
 */
async function handleFailedDisbursement(event: MonnifyDisbursementEvent) {
  const { eventData } = event;
  const supabase = createServiceSupabaseClient();

  console.log("[Monnify Webhook] Disbursement failed:", {
    reference: eventData.reference,
    status: eventData.status,
  });

  // Update payout request to FAILED — no ledger change, balance stays
  await supabase
    .from("payout_requests")
    .update({
      status: "FAILED",
    })
    .eq("monnify_transfer_ref", eventData.reference);
}