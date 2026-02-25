import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWalletBalance, debitWallet, creditWallet } from "@/lib/utils/wallet";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RenewalResult {
  subscriptionId: string;
  fanId: string;
  creatorId: string;
  amount: number;
  success: boolean;
  reason?: string;
}

// ─── Auto-Renewal ─────────────────────────────────────────────────────────────

export async function processAutoRenewals(): Promise<RenewalResult[]> {
  const supabase = await createServerSupabaseClient();
  const results: RenewalResult[] = [];

  const today = new Date().toISOString().split("T")[0];

  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select("id, fan_id, creator_id, price_paid, current_period_end")
    .eq("status", "ACTIVE")
    .eq("auto_renew", true)
    .lte("current_period_end", `${today}T23:59:59.999Z`);

  if (error) {
    console.error("[Auto-Renewal] Failed to fetch subscriptions:", error.message);
    return results;
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log("[Auto-Renewal] No subscriptions due today.");
    return results;
  }

  console.log(`[Auto-Renewal] Processing ${subscriptions.length} subscriptions...`);

  for (const sub of subscriptions) {
    const result = await renewSubscription({
      subscriptionId: String(sub.id),
      fanId: sub.fan_id,
      creatorId: sub.creator_id,
      amount: sub.price_paid,
    });
    results.push(result);
  }

  return results;
}

// ─── Single Renewal ───────────────────────────────────────────────────────────

export async function renewSubscription({
  subscriptionId,
  fanId,
  creatorId,
  amount,
}: {
  subscriptionId: string;
  fanId: string;
  creatorId: string;
  amount: number;
}): Promise<RenewalResult> {
  const supabase = await createServerSupabaseClient();

  try {
    const balance = await getWalletBalance(fanId);

    if (balance < amount) {
      await supabase
        .from("subscriptions")
        .update({ status: "RENEWAL_FAILED" })
        .eq("id", subscriptionId);

      notifyRenewalFailed(fanId, creatorId, amount).catch(console.error);

      return { subscriptionId, fanId, creatorId, amount, success: false, reason: "Insufficient balance" };
    }

    const platformFee = Math.floor(amount * 0.18);
    const creatorEarning = amount - platformFee;
    const now = new Date();
    const nextRenewal = new Date();
    nextRenewal.setMonth(nextRenewal.getMonth() + 1);

    await debitWallet({
      userId: fanId,
      amount,
      category: "AUTO_SUBSCRIPTION",
      provider: "INTERNAL",
      referenceId: subscriptionId,
      description: "Auto-subscription renewal",
    });

    await creditWallet({
      userId: creatorId,
      amount: creatorEarning,
      category: "CREATOR_EARNING",
      provider: "INTERNAL",
      referenceId: subscriptionId,
      description: "Subscription renewal earning",
    });

    await supabase
      .from("subscriptions")
      .update({
        status: "ACTIVE",
        last_renewed_at: now.toISOString(),
        last_payment_method: "WALLET",
        current_period_start: now.toISOString(),
        current_period_end: nextRenewal.toISOString(),
      })
      .eq("id", subscriptionId);

    return { subscriptionId, fanId, creatorId, amount, success: true };

  } catch (error) {
    console.error(`[Auto-Renewal] Failed for subscription ${subscriptionId}:`, error);
    return { subscriptionId, fanId, creatorId, amount, success: false, reason: "Unexpected error" };
  }
}

// ─── Retry Failed Renewals ────────────────────────────────────────────────────

export async function retryFailedRenewals(): Promise<RenewalResult[]> {
  const supabase = await createServerSupabaseClient();
  const results: RenewalResult[] = [];

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: failed } = await supabase
    .from("subscriptions")
    .select("id, fan_id, creator_id, price_paid, current_period_end")
    .eq("status", "RENEWAL_FAILED")
    .gte("current_period_end", threeDaysAgo.toISOString());

  if (!failed || failed.length === 0) return results;

  console.log(`[Retry-Renewal] Retrying ${failed.length} failed subscriptions...`);

  for (const sub of failed) {
    const result = await renewSubscription({
      subscriptionId: String(sub.id),
      fanId: sub.fan_id,
      creatorId: sub.creator_id,
      amount: sub.price_paid,
    });
    results.push(result);
  }

  return results;
}

// ─── Expire Lapsed Subscriptions ─────────────────────────────────────────────

export async function expireLapsedSubscriptions(): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "EXPIRED" })
    .eq("status", "RENEWAL_FAILED")
    .lt("current_period_end", threeDaysAgo.toISOString());

  if (error) console.error("[Expire Subscriptions] Error:", error.message);
}

// ─── Cancel Subscription ──────────────────────────────────────────────────────

export async function cancelSubscription(subscriptionId: string, fanId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "CANCELLED",
      auto_renew: false,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId)
    .eq("fan_id", fanId);

  if (error) throw new Error(`Failed to cancel subscription: ${error.message}`);
}

// ─── Toggle Auto-Renew ────────────────────────────────────────────────────────

export async function toggleAutoRenew(subscriptionId: string, fanId: string, enabled: boolean): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("subscriptions")
    .update({ auto_renew: enabled })
    .eq("id", subscriptionId)
    .eq("fan_id", fanId);

  if (error) throw new Error(`Failed to toggle auto-renew: ${error.message}`);
}

// ─── Email Notification (stub) ────────────────────────────────────────────────

async function notifyRenewalFailed(fanId: string, creatorId: string, amount: number): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { data: fan } = await supabase
    .from("profiles")
    .select("email, username")
    .eq("id", fanId)
    .single();

  const { data: creator } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", creatorId)
    .single();

  if (!fan?.email) return;

  console.log(`[Email] Renewal failed for ${fan.email}:`, {
    fan: fan.username,
    creator: creator?.username,
    amount,
    message: `Your subscription to @${creator?.username} could not renew. Top up your wallet to keep your subscription active.`,
  });
}