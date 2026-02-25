import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/utils/kyshi";
import { creditWallet, debitWallet } from "@/lib/utils/wallet";
import type { KyshiWebhookPayload } from "@/lib/types/checkout";

// ─── POST /api/webhooks/kyshi ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-kyshi-signature") ?? req.headers.get("secrethash");
    const isValid = verifyWebhookSignature(signature);

    if (!isValid) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload: KyshiWebhookPayload = await req.json();
    const { event, data } = payload;

    switch (event) {
      case "payment.success":
        await handlePaymentSuccess(data);
        break;
      case "payment.failed":
        await handlePaymentFailed(data);
        break;
      case "transfer.success":
        await handleTransferSuccess(data);
        break;
      case "transfer.failed":
        await handleTransferFailed(data);
        break;
      default:
        return NextResponse.json({ message: "Event not handled" }, { status: 200 });
    }

    return NextResponse.json({ message: "OK" }, { status: 200 });

  } catch (error) {
    console.error("[Kyshi Webhook Error]", error);
    return NextResponse.json({ message: "OK" }, { status: 200 });
  }
}

// ─── Payment Success ──────────────────────────────────────────────────────────

async function handlePaymentSuccess(data: KyshiWebhookPayload["data"]) {
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("transactions")
    .select("id, status, purpose, fan_id, subscription_id")
    .eq("provider_txn_id", data.reference)
    .single();

  if (!existing) {
    console.warn("[Kyshi Webhook] No transaction found for reference:", data.reference);
    return;
  }

  if (existing.status === "CONFIRMED") {
    console.log("[Kyshi Webhook] Already processed:", data.reference);
    return;
  }

  await supabase
    .from("transactions")
    .update({
      status: "CONFIRMED",
      confirmed_at: new Date().toISOString(),
    })
    .eq("provider_txn_id", data.reference);

  if (data.authorizationCode && data.card && existing.fan_id) {
    const { data: existingCard } = await supabase
      .from("fan_payment_methods")
      .select("id")
      .eq("fan_id", existing.fan_id)
      .eq("authorization_code", data.authorizationCode)
      .single();

    if (!existingCard) {
      await supabase.from("fan_payment_methods").insert({
        fan_id: existing.fan_id,
        provider: "KYSHI",
        authorization_code: data.authorizationCode,
        card_type: data.card.cardType,
        last_four: data.card.last4,
        is_default: false,
      });
    }
  }

  if (existing.purpose === "WALLET_TOPUP") {
    await handleWalletTopup(existing.fan_id, data.amount, data.reference);
  } else if (existing.purpose === "SUBSCRIPTION") {
    await handleSubscriptionPayment(
      existing.fan_id,
      data.amount,
      data.reference,
      existing.subscription_id
    );
  }
}

// ─── Wallet Top-Up ────────────────────────────────────────────────────────────

async function handleWalletTopup(fanId: string, amount: number, reference: string) {
  await creditWallet({
    userId: fanId,
    amount,
    category: "WALLET_TOPUP",
    provider: "KYSHI",
    providerReference: reference,
    description: "Wallet top-up via Kyshi",
  });
}

// ─── Subscription Payment ─────────────────────────────────────────────────────

async function handleSubscriptionPayment(
  fanId: string,
  amount: number,
  reference: string,
  subscriptionId: string | null
) {
  const supabase = await createServerSupabaseClient();

  if (!subscriptionId) {
    console.warn("[Kyshi Webhook] No subscription_id for payment:", reference);
    return;
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("creator_id, price_paid")
    .eq("id", subscriptionId)
    .single();

  if (!subscription) return;

  const platformFee = Math.floor(amount * 0.18);
  const creatorEarning = amount - platformFee;

  await debitWallet({
    userId: fanId,
    amount,
    category: "SUBSCRIPTION_PAYMENT",
    provider: "KYSHI",
    providerReference: reference,
    referenceId: subscriptionId,
    description: "Subscription payment",
  });

  await creditWallet({
    userId: subscription.creator_id,
    amount: creatorEarning,
    category: "CREATOR_EARNING",
    provider: "KYSHI",
    providerReference: reference,
    referenceId: subscriptionId,
    description: "Subscription earning",
  });

  const now = new Date();
  const nextRenewal = new Date();
  nextRenewal.setMonth(nextRenewal.getMonth() + 1);

  await supabase
    .from("subscriptions")
    .update({
      status: "ACTIVE",
      last_renewed_at: now.toISOString(),
      last_payment_method: "CARD",
      current_period_start: now.toISOString(),
      current_period_end: nextRenewal.toISOString(),
    })
    .eq("id", subscriptionId);
}

// ─── Payment Failed ───────────────────────────────────────────────────────────

async function handlePaymentFailed(data: KyshiWebhookPayload["data"]) {
  const supabase = await createServerSupabaseClient();
  await supabase
    .from("transactions")
    .update({ status: "FAILED" })
    .eq("provider_txn_id", data.reference);
}

// ─── Transfer Success ─────────────────────────────────────────────────────────

async function handleTransferSuccess(data: KyshiWebhookPayload["data"]) {
  const supabase = await createServerSupabaseClient();

  if (!data.transferCode) return;

  const { data: payout } = await supabase
    .from("payout_requests")
    .select("id, creator_id, amount, status")
    .eq("kyshi_transfer_code", data.transferCode)
    .single();

  if (!payout || payout.status === "COMPLETED") return;

  await supabase
    .from("payout_requests")
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
    })
    .eq("id", payout.id);

  await debitWallet({
    userId: payout.creator_id,
    amount: payout.amount,
    category: "PAYOUT",
    provider: "KYSHI",
    providerReference: data.transferCode,
    referenceId: String(payout.id),
    description: "Payout to bank account",
  });
}

// ─── Transfer Failed ──────────────────────────────────────────────────────────

async function handleTransferFailed(data: KyshiWebhookPayload["data"]) {
  const supabase = await createServerSupabaseClient();

  if (!data.transferCode) return;

  await supabase
    .from("payout_requests")
    .update({ status: "FAILED" })
    .eq("kyshi_transfer_code", data.transferCode);
}