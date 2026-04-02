// app/api/webhooks/monnify/route.ts
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

  const signature = request.headers.get("monnify-signature");
  console.log("[Monnify Webhook] Signature present:", !!signature);

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("[Monnify Webhook] Invalid signature — rejecting");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  console.log("[Monnify Webhook] Signature verified OK");

  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0]?.trim();
  console.log("[Monnify Webhook] Client IP:", clientIp);
  if (clientIp && clientIp !== MONNIFY_WEBHOOK_IP) {
    console.warn("[Monnify Webhook] Request from unexpected IP:", clientIp);
  }

  let event;
  try {
    event = parseWebhookEvent(rawBody);
  } catch (error) {
    console.error("[Monnify Webhook] Failed to parse event:", error);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[Monnify Webhook] Event type:", event.eventType);
  console.log("[Monnify Webhook] Event data:", JSON.stringify(event, null, 2).substring(0, 500));

  try {
    if (isSuccessfulTransaction(event)) {
      await handleSuccessfulTransaction(event);
    } else if (isFailedTransaction(event)) {
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
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

// ============================================================
// EVENT HANDLERS
// ============================================================

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

  // Idempotency check
  let existingTx: { id: number; status: string } | null = null;

  const { data: txByRef } = await supabase
    .from("transactions")
    .select("id, status")
    .eq("monnify_transaction_ref", eventData.transactionReference)
    .single();

  if (txByRef) {
    existingTx = txByRef;
  } else {
    const { data: txByPayRef } = await supabase
      .from("transactions")
      .select("id, status")
      .eq("provider_txn_id", eventData.paymentReference)
      .single();
    existingTx = txByPayRef;
  }

  if (existingTx && existingTx.status === "confirmed") {
    console.log("[Monnify Webhook] Transaction already processed, skipping:", eventData.transactionReference);
    return;
  }

  const amountKobo = Math.round(eventData.amountPaid * 100);
  const metadata = eventData.metaData || {};
  let purpose = metadata.purpose || "WALLET_TOPUP";
  let userId = metadata.user_id;

  console.log("[Monnify Webhook] Extracted — purpose:", purpose, "userId:", userId, "amountKobo:", amountKobo);

  // Fallback: pull from existing transaction row if metadata missing
  if (!userId && existingTx) {
    const { data: txRow } = await supabase
      .from("transactions")
      .select("user_id, purpose, metadata")
      .eq("id", existingTx.id)
      .single();

    console.log("[Monnify Webhook] Fallback txRow lookup:", txRow);

    if (txRow?.user_id) {
      userId = txRow.user_id;
      purpose = txRow.metadata?.purpose || txRow.purpose || "WALLET_TOPUP";
      // Merge metadata from transaction row
      if (txRow.metadata) {
        Object.assign(metadata, txRow.metadata);
      }
      console.log("[Monnify Webhook] Using fallback userId:", userId, "purpose:", purpose);
    }
  }

  if (!userId) {
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
  } else if (purpose === "TIP") {
    await processTip(supabase, {
      userId,
      amountKobo,
      transactionReference: eventData.transactionReference,
      paymentReference: eventData.paymentReference,
      paymentMethod: eventData.paymentMethod === "CARD" ? "CARD" : "BANK_TRANSFER",
      creatorId: metadata.creator_id,
      postId: metadata.post_id ? Number(metadata.post_id) : null,
      message: metadata.message || null,
      existingTxId: existingTx?.id || null,
    });
  } else if (purpose === "PPV") {
    await processPPV(supabase, {
      userId,
      amountKobo,
      transactionReference: eventData.transactionReference,
      paymentReference: eventData.paymentReference,
      paymentMethod: eventData.paymentMethod === "CARD" ? "CARD" : "BANK_TRANSFER",
      creatorId: metadata.creator_id,
      postId: metadata.post_id ? Number(metadata.post_id) : null,
      existingTxId: existingTx?.id || null,
    });
  } else {
    console.warn("[Monnify Webhook] Unknown purpose:", purpose);
  }
}

// ============================================================
// PROCESS WALLET TOP-UP
// ============================================================

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

  console.log("[processWalletTopUp] Starting:", { userId, amountKobo, transactionReference });

  if (existingTxId) {
    await supabase
      .from("transactions")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString(), monnify_transaction_ref: transactionReference })
      .eq("id", existingTxId);
  } else {
    await supabase.from("transactions").insert({
      user_id: userId, fan_id: userId, amount: amountKobo,
      status: "confirmed", provider: "MONNIFY",
      provider_txn_id: paymentReference, monnify_transaction_ref: transactionReference,
      currency: "NGN", payment_method: paymentMethod, purpose: "WALLET_TOPUP",
      confirmed_at: new Date().toISOString(),
    });
  }

  const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", userId).single();
  const currentBalance = wallet?.balance || 0;
  const newBalance = currentBalance + amountKobo;

  await supabase.from("ledger").insert({
    user_id: userId, type: "CREDIT", amount: amountKobo, balance_after: newBalance,
    category: "WALLET_TOPUP", reference_id: paymentReference,
    provider: "MONNIFY", provider_reference: transactionReference,
  });

  await supabase.from("wallets")
    .update({ balance: newBalance, total_earned: currentBalance + amountKobo, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (paymentMethod === "CARD" && cardDetails?.reusableToken) {
    const { data: existingCard } = await supabase
      .from("fan_payment_methods").select("id")
      .eq("fan_id", userId).eq("card_token", cardDetails.reusableToken).single();

    if (!existingCard) {
      await supabase.from("fan_payment_methods").insert({
        fan_id: userId, provider: "MONNIFY", card_token: cardDetails.reusableToken,
        card_type: cardDetails.cardType || null, last_four: cardDetails.last4 || null,
        expiry: cardDetails.expMonth && cardDetails.expYear ? `${cardDetails.expMonth}/${cardDetails.expYear}` : null,
        is_default: true,
      });
      await supabase.from("fan_payment_methods")
        .update({ is_default: false })
        .eq("fan_id", userId).neq("card_token", cardDetails.reusableToken);
    }
  }

  console.log("[Monnify Webhook] Wallet top-up processed:", { userId, amountKobo, newBalance });
}

// ============================================================
// PROCESS DIRECT SUBSCRIPTION
// ============================================================

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

  const { data: settings } = await supabase
    .from("platform_settings").select("value").eq("key", "commission_rate").single();
  const commissionRate = parseInt(settings?.value || "18") / 100;
  const platformFee = Math.round(amountKobo * commissionRate);
  const creatorEarning = amountKobo - platformFee;

  const now = new Date();
  const nextRenewal = new Date(now);
  nextRenewal.setMonth(nextRenewal.getMonth() + 1);

  if (existingTxId) {
    await supabase.from("transactions")
      .update({ status: "confirmed", confirmed_at: now.toISOString(), monnify_transaction_ref: transactionReference })
      .eq("id", existingTxId);
  } else {
    await supabase.from("transactions").insert({
      user_id: userId, fan_id: userId, amount: amountKobo,
      status: "confirmed", provider: "MONNIFY",
      provider_txn_id: paymentReference, monnify_transaction_ref: transactionReference,
      currency: "NGN", payment_method: paymentMethod, purpose: "SUBSCRIPTION",
      confirmed_at: now.toISOString(),
    });
  }

  const { data: existingSub } = await supabase
    .from("subscriptions").select("id")
    .eq("fan_id", userId).eq("creator_id", creatorId).eq("tier_id", tierId).single();

  if (existingSub) {
    await supabase.from("subscriptions").update({
      status: "active", price_paid: amountKobo,
      current_period_start: now.toISOString(), current_period_end: nextRenewal.toISOString(),
      next_renewal_date: nextRenewal.toISOString().split("T")[0],
      last_renewed_at: now.toISOString(), last_payment_method: paymentMethod,
      auto_renew: true, updated_at: now.toISOString(),
    }).eq("id", existingSub.id);
  } else {
    await supabase.from("subscriptions").insert({
      fan_id: userId, creator_id: creatorId, tier_id: tierId,
      status: "active", price_paid: amountKobo, auto_renew: true,
      current_period_start: now.toISOString(), current_period_end: nextRenewal.toISOString(),
      next_renewal_date: nextRenewal.toISOString().split("T")[0],
      last_renewed_at: now.toISOString(), last_payment_method: paymentMethod,
    });
  }

  const { data: creatorWallet } = await supabase.from("wallets").select("balance").eq("user_id", creatorId).single();
  const creatorCurrentBalance = creatorWallet?.balance || 0;
  const creatorNewBalance = creatorCurrentBalance + creatorEarning;

  await supabase.from("ledger").insert({
    user_id: creatorId, type: "CREDIT", amount: creatorEarning, balance_after: creatorNewBalance,
    category: "CREATOR_EARNING", reference_id: paymentReference,
    provider: "MONNIFY", provider_reference: transactionReference,
  });

  await supabase.from("ledger").insert({
    user_id: creatorId, type: "CREDIT", amount: platformFee, balance_after: creatorNewBalance,
    category: "PLATFORM_FEE", reference_id: paymentReference,
    provider: "MONNIFY", provider_reference: transactionReference,
  });

  await supabase.from("wallets")
    .update({ balance: creatorNewBalance, total_earned: creatorCurrentBalance + creatorEarning, updated_at: now.toISOString() })
    .eq("user_id", creatorId);

  if (paymentMethod === "CARD" && cardDetails?.reusableToken) {
    const { data: existingCard } = await supabase
      .from("fan_payment_methods").select("id")
      .eq("fan_id", userId).eq("card_token", cardDetails.reusableToken).single();
    if (!existingCard) {
      await supabase.from("fan_payment_methods").insert({
        fan_id: userId, provider: "MONNIFY", card_token: cardDetails.reusableToken,
        card_type: cardDetails.cardType || null, last_four: cardDetails.last4 || null,
        expiry: cardDetails.expMonth && cardDetails.expYear ? `${cardDetails.expMonth}/${cardDetails.expYear}` : null,
        is_default: true,
      });
    }
  }

  console.log("[Monnify Webhook] Direct subscription processed:", { fanId: userId, creatorId, tierId, amountKobo, creatorEarning });
}

// ============================================================
// PROCESS TIP
// ============================================================

async function processTip(
  supabase: any,
  params: {
    userId: string;
    amountKobo: number;
    transactionReference: string;
    paymentReference: string;
    paymentMethod: "CARD" | "BANK_TRANSFER";
    creatorId: string;
    postId: number | null;
    message: string | null;
    existingTxId: number | null;
  }
) {
  const { userId, amountKobo, transactionReference, paymentReference, paymentMethod, creatorId, postId, message, existingTxId } = params;

  if (!creatorId) {
    console.error("[processTip] Missing creator_id:", transactionReference);
    return;
  }

  console.log("[processTip] Starting:", { userId, creatorId, amountKobo, postId });

  const { data: settings } = await supabase
    .from("platform_settings").select("value").eq("key", "commission_rate").single();
  const commissionRate = parseInt(settings?.value || "18") / 100;
  const platformFee = Math.round(amountKobo * commissionRate);
  const creatorEarning = amountKobo - platformFee;

  const now = new Date();

  // Confirm transaction
  let confirmedTxId = existingTxId;
  if (existingTxId) {
    await supabase.from("transactions")
      .update({ status: "confirmed", confirmed_at: now.toISOString(), monnify_transaction_ref: transactionReference })
      .eq("id", existingTxId);
  } else {
    const { data: newTx } = await supabase.from("transactions").insert({
      user_id: userId, fan_id: userId, amount: amountKobo,
      status: "confirmed", provider: "MONNIFY",
      provider_txn_id: paymentReference, monnify_transaction_ref: transactionReference,
      currency: "NGN", payment_method: paymentMethod, purpose: "TIP",
      confirmed_at: now.toISOString(),
    }).select("id").single();
    confirmedTxId = newTx?.id || null;
  }

  // Create tip record
  await supabase.from("tips").insert({
    tipper_id: userId,
    recipient_id: creatorId,
    post_id: postId || null,
    amount: amountKobo,
    message: message || null,
    transaction_id: confirmedTxId,
  });

  // Credit creator
  const { data: creatorWallet } = await supabase.from("wallets").select("balance").eq("user_id", creatorId).single();
  const creatorCurrentBalance = creatorWallet?.balance || 0;
  const creatorNewBalance = creatorCurrentBalance + creatorEarning;

  await supabase.from("ledger").insert({
    user_id: creatorId, type: "CREDIT", amount: creatorEarning, balance_after: creatorNewBalance,
    category: "CREATOR_EARNING", reference_id: paymentReference,
    provider: "MONNIFY", provider_reference: transactionReference,
  });

  await supabase.from("wallets")
    .update({ balance: creatorNewBalance, total_earned: creatorCurrentBalance + creatorEarning, updated_at: now.toISOString() })
    .eq("user_id", creatorId);

  console.log("[Monnify Webhook] Tip processed:", { userId, creatorId, amountKobo, creatorEarning });
}

// ============================================================
// PROCESS PPV
// ============================================================

async function processPPV(
  supabase: any,
  params: {
    userId: string;
    amountKobo: number;
    transactionReference: string;
    paymentReference: string;
    paymentMethod: "CARD" | "BANK_TRANSFER";
    creatorId: string;
    postId: number | null;
    existingTxId: number | null;
  }
) {
  const { userId, amountKobo, transactionReference, paymentReference, paymentMethod, creatorId, postId, existingTxId } = params;

  if (!creatorId || !postId) {
    console.error("[processPPV] Missing creator_id or post_id:", transactionReference);
    return;
  }

  console.log("[processPPV] Starting:", { userId, creatorId, postId, amountKobo });

  const { data: settings } = await supabase
    .from("platform_settings").select("value").eq("key", "commission_rate").single();
  const commissionRate = parseInt(settings?.value || "18") / 100;
  const platformFee = Math.round(amountKobo * commissionRate);
  const creatorEarning = amountKobo - platformFee;

  const now = new Date();

  // Idempotency — skip if already unlocked
  const { data: existingUnlock } = await supabase
    .from("ppv_unlocks").select("id")
    .eq("fan_id", userId).eq("post_id", postId).single();

  if (existingUnlock) {
    console.log("[processPPV] Already unlocked, skipping:", { userId, postId });
    return;
  }

  // Confirm transaction
  let confirmedTxId = existingTxId;
  if (existingTxId) {
    await supabase.from("transactions")
      .update({ status: "confirmed", confirmed_at: now.toISOString(), monnify_transaction_ref: transactionReference })
      .eq("id", existingTxId);
  } else {
    const { data: newTx } = await supabase.from("transactions").insert({
      user_id: userId, fan_id: userId, amount: amountKobo,
      status: "confirmed", provider: "MONNIFY",
      provider_txn_id: paymentReference, monnify_transaction_ref: transactionReference,
      currency: "NGN", payment_method: paymentMethod, purpose: "PPV",
      confirmed_at: now.toISOString(),
    }).select("id").single();
    confirmedTxId = newTx?.id || null;
  }

  // Create unlock record
  await supabase.from("ppv_unlocks").insert({
    fan_id: userId,
    post_id: postId,
    creator_id: creatorId,
    amount_paid: amountKobo,
    transaction_id: confirmedTxId,
    unlocked_at: now.toISOString(),
  });

  // Credit creator
  const { data: creatorWallet } = await supabase.from("wallets").select("balance").eq("user_id", creatorId).single();
  const creatorCurrentBalance = creatorWallet?.balance || 0;
  const creatorNewBalance = creatorCurrentBalance + creatorEarning;

  await supabase.from("ledger").insert({
    user_id: creatorId, type: "CREDIT", amount: creatorEarning, balance_after: creatorNewBalance,
    category: "CREATOR_EARNING", reference_id: paymentReference,
    provider: "MONNIFY", provider_reference: transactionReference,
  });

  await supabase.from("wallets")
    .update({ balance: creatorNewBalance, total_earned: creatorCurrentBalance + creatorEarning, updated_at: now.toISOString() })
    .eq("user_id", creatorId);

  console.log("[Monnify Webhook] PPV processed:", { userId, creatorId, postId, amountKobo, creatorEarning });
}

// ============================================================
// HANDLE FAILED TRANSACTION
// ============================================================

async function handleFailedTransaction(event: MonnifyTransactionEvent) {
  const { eventData } = event;
  const supabase = createServiceSupabaseClient();

  console.log("[Monnify Webhook] Transaction failed:", {
    reference: eventData.paymentReference,
    status: eventData.paymentStatus,
  });

  await supabase.from("transactions")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("monnify_transaction_ref", eventData.transactionReference);
}

// ============================================================
// HANDLE SUCCESSFUL DISBURSEMENT
// ============================================================

async function handleSuccessfulDisbursement(event: MonnifyDisbursementEvent) {
  const { eventData } = event;
  const supabase = createServiceSupabaseClient();

  console.log("[Monnify Webhook] Disbursement successful:", { reference: eventData.reference, amount: eventData.amount });

  const { data: payout } = await supabase
    .from("payout_requests").select("id, creator_id, amount, status")
    .eq("monnify_transfer_ref", eventData.reference).single();

  if (!payout) {
    console.error("[Monnify Webhook] No payout_request found for reference:", eventData.reference);
    return;
  }

  if (payout.status === "COMPLETED") {
    console.log("[Monnify Webhook] Payout already completed, skipping:", eventData.reference);
    return;
  }

  const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", payout.creator_id).single();
  const currentBalance = wallet?.balance || 0;
  const newBalance = currentBalance - payout.amount;

  await supabase.from("payout_requests")
    .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
    .eq("id", payout.id);

  await supabase.from("ledger").insert({
    user_id: payout.creator_id, type: "DEBIT", amount: payout.amount, balance_after: newBalance,
    category: "PAYOUT", reference_id: String(payout.id),
    provider: "MONNIFY", provider_reference: eventData.reference,
  });

  await supabase.from("wallets")
    .update({ balance: newBalance, total_spent: currentBalance + payout.amount, updated_at: new Date().toISOString() })
    .eq("user_id", payout.creator_id);

  console.log("[Monnify Webhook] Payout completed:", { creatorId: payout.creator_id, amount: payout.amount, newBalance });
}

// ============================================================
// HANDLE FAILED DISBURSEMENT
// ============================================================

async function handleFailedDisbursement(event: MonnifyDisbursementEvent) {
  const { eventData } = event;
  const supabase = createServiceSupabaseClient();

  console.log("[Monnify Webhook] Disbursement failed:", { reference: eventData.reference, status: eventData.status });

  await supabase.from("payout_requests")
    .update({ status: "FAILED" })
    .eq("monnify_transfer_ref", eventData.reference);
}