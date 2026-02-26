import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { verifyPayOnUsWebhook } from "@/lib/utils/payonus";
import { creditWallet, debitWallet } from "@/lib/utils/wallet";
import type { PayOnUsWebhookPayload } from "@/lib/utils/payonus";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const payload: PayOnUsWebhookPayload = JSON.parse(rawBody);

    const receivedHash = req.headers.get("hash");
    const isValid = verifyPayOnUsWebhook(payload, receivedHash);

    if (!isValid) {
      console.warn("[PayOnUs Webhook] Invalid signature");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    switch (payload.type) {
      case "COLLECTION":
        await handleCollection(payload);
        break;
      case "PAYOUT":
        await handlePayout(payload);
        break;
      default:
        console.log("[PayOnUs Webhook] Unhandled event type:", payload.type);
    }

    return NextResponse.json({ message: "OK" }, { status: 200 });

  } catch (error) {
    console.error("[PayOnUs Webhook Error]", error);
    return NextResponse.json({ message: "OK" }, { status: 200 });
  }
}

async function handleCollection(payload: PayOnUsWebhookPayload) {
  if (payload.paymentStatus !== "SUCCESSFUL") return;

  const supabase = createServiceSupabaseClient();

  console.log("[PayOnUs Webhook] Looking for reference:", payload.merchantReference);

  const { data: existing, error: fetchError } = await supabase
    .from("transactions")
    .select("id, status, purpose, fan_id, subscription_id, metadata")
    .eq("provider_txn_id", payload.merchantReference)
    .maybeSingle();

  console.log("[PayOnUs Webhook] Found:", existing, "Error:", fetchError?.message);

  if (!existing) {
    console.warn("[PayOnUs Webhook] No transaction found for reference:", payload.merchantReference);
    return;
  }

  if (existing.status === "completed") {
    console.log("[PayOnUs Webhook] Already processed:", payload.merchantReference);
    return;
  }

  const { error: updateError } = await supabase
    .from("transactions")
    .update({
      status:       "completed",
      confirmed_at: new Date().toISOString(),
    })
    .eq("provider_txn_id", payload.merchantReference);

  if (updateError) {
    console.error("[PayOnUs Webhook] Failed to update transaction:", updateError.message);
    return;
  }

  if (existing.purpose === "WALLET_TOPUP") {
    await handleWalletTopup(
      existing.fan_id,
      payload.transactionAmount,
      payload.merchantReference,
      payload.onusReference
    );
  } else if (existing.purpose === "SUBSCRIPTION") {
    await handleSubscriptionPayment(
      existing.fan_id,
      payload.transactionAmount,
      payload.merchantReference,
      payload.onusReference,
      existing.metadata,
      existing.id
    );
  } else if (existing.purpose === "TIP") {
    await handleTipPayment(
      existing.fan_id,
      payload.transactionAmount,
      payload.merchantReference,
      existing.metadata,
      existing.id
    );
  }
}

async function handleWalletTopup(
  fanId: string,
  amount: number,
  merchantReference: string,
  onusReference: string
) {
  await creditWallet({
    userId:            fanId,
    amount,
    category:          "WALLET_TOPUP",
    provider:          "PAYONUS",
    providerReference: merchantReference,
    description:       "Wallet top-up via bank transfer",
    useServiceRole:    true,
  });
}

async function handleSubscriptionPayment(
  fanId: string,
  amount: number,
  merchantReference: string,
  onusReference: string,
  metadata: Record<string, string> | null,
  transactionId: number
) {
  const supabase = createServiceSupabaseClient();

  const creatorId    = metadata?.creator_id;
  const tierId       = metadata?.tier_id;
  const tierDuration = metadata?.tier_duration ?? "monthly";

  if (!creatorId || !tierId) {
    console.error("[PayOnUs Webhook] Missing creator_id or tier_id in metadata for:", merchantReference);
    return;
  }

  const now = new Date();
  const monthsToAdd = tierDuration === "three_month" ? 3 : tierDuration === "six_month" ? 6 : 1;
  const nextRenewal = new Date();
  nextRenewal.setMonth(nextRenewal.getMonth() + monthsToAdd);

  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .upsert(
      {
        fan_id:               fanId,
        creator_id:           creatorId,
        tier_id:              tierId,
        price_paid:           amount,
        status:               "active",
        auto_renew:           true,
        last_renewed_at:      now.toISOString(),
        last_payment_method:  "VIRTUAL_ACCOUNT",
        current_period_start: now.toISOString(),
        current_period_end:   nextRenewal.toISOString(),
      },
      { onConflict: "fan_id,creator_id,tier_id" }
    )
    .select("id, creator_id")
    .single();

  if (subError || !subscription) {
    console.error("[PayOnUs Webhook] Failed to upsert subscription:", subError?.message);
    return;
  }

  console.log("[PayOnUs Webhook] Subscription activated:", subscription.id);

  await supabase
    .from("transactions")
    .update({ subscription_id: subscription.id })
    .eq("id", transactionId);

  const platformFee    = Math.floor(amount * 0.18);
  const creatorEarning = amount - platformFee;

  await creditWallet({
    userId:            subscription.creator_id,
    amount:            creatorEarning,
    category:          "CREATOR_EARNING",
    provider:          "PAYONUS",
    providerReference: merchantReference,
    description:       "Subscription earning",
    useServiceRole:    true,
  });

  console.log("[PayOnUs Webhook] Creator credited:", creatorEarning, "for creator:", subscription.creator_id);

  await supabase.rpc("increment_subscriber_count", { creator_id: subscription.creator_id });
}

async function handleTipPayment(
  fanId: string,
  amount: number,
  merchantReference: string,
  metadata: Record<string, string> | null,
  transactionId: number
) {
  const supabase = createServiceSupabaseClient();

  const creatorId = metadata?.creator_id;
  const message   = metadata?.message ?? null;

  if (!creatorId) {
    console.error("[PayOnUs Webhook] Missing creator_id in tip metadata for:", merchantReference);
    return;
  }

  const platformFee    = Math.floor(amount * 0.18);
  const creatorEarning = amount - platformFee;

  const { data: tip, error: tipError } = await supabase
    .from("tips")
    .insert({
      tipper_id:    fanId,
      recipient_id: creatorId,
      amount,
      message,
    })
    .select("id")
    .single();

  if (tipError || !tip) {
    console.error("[PayOnUs Webhook] Failed to insert tip:", tipError?.message);
    return;
  }

  console.log("[PayOnUs Webhook] Tip recorded:", tip.id);

  await creditWallet({
    userId:            creatorId,
    amount:            creatorEarning,
    category:          "CREATOR_EARNING",
    provider:          "PAYONUS",
    providerReference: merchantReference,
    description:       "Tip received via bank transfer",
    referenceId:       String(transactionId),
    useServiceRole:    true,
  });

  console.log("[PayOnUs Webhook] Creator tip credited:", creatorEarning, "for creator:", creatorId);
}

async function handlePayout(payload: PayOnUsWebhookPayload) {
  const supabase = createServiceSupabaseClient();

  const { data: payout } = await supabase
    .from("payout_requests")
    .select("id, creator_id, amount, status")
    .eq("kyshi_transfer_code", payload.merchantReference)
    .maybeSingle();

  if (!payout || payout.status === "COMPLETED") return;

  if (payload.paymentStatus === "SUCCESSFUL") {
    await supabase
      .from("payout_requests")
      .update({
        status:       "COMPLETED",
        completed_at: new Date().toISOString(),
      })
      .eq("id", payout.id);

    await debitWallet({
      userId:            payout.creator_id,
      amount:            payout.amount,
      category:          "PAYOUT",
      provider:          "PAYONUS",
      providerReference: payload.onusReference,
      description:       "Payout to bank account",
      useServiceRole:    true,
    });
  } else if (payload.paymentStatus === "FAILED") {
    await supabase
      .from("payout_requests")
      .update({ status: "FAILED" })
      .eq("id", payout.id);
  }
}