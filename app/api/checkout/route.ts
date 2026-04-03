// app/api/checkout/route.ts
// Unified wallet-spend endpoint for: subscription, tip, PPV
// All amounts received in kobo from frontend
// No Monnify involved — purely internal wallet operations

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { hasSufficientBalance, debitFanCreditCreator, ensureWalletExists } from "@/lib/payments/wallet";
import { sendWelcomeMessage } from "@/lib/welcome-message";

const TIER_MONTHS: Record<string, number> = {
  monthly: 1,
  three_month: 3,
  six_month: 6,
};

const TIER_LABEL: Record<string, string> = {
  monthly: "1 Month",
  three_month: "3 Months",
  six_month: "6 Months",
};

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
    const { type, amount, creatorId, selectedTier = "monthly", postId, message } = body;

    console.log("[Checkout] incoming:", { type, amount, creatorId, selectedTier, postId, userId: user.id });

    if (!type || amount === undefined || amount === null || !creatorId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (typeof amount !== "number" || isNaN(amount) || amount < 0) {
      return NextResponse.json({ message: "Invalid amount" }, { status: 400 });
    }

    // Amount is in kobo from frontend
    const amountKobo = Math.round(amount * 100);
    const isFree = amountKobo === 0;

    // Check balance for paid transactions
    if (!isFree) {
      const sufficient = await hasSufficientBalance(user.id, amountKobo);
      if (!sufficient) {
        return NextResponse.json({ message: "Insufficient wallet balance" }, { status: 400 });
      }
    }

    // Ensure both fan and creator have wallet rows
    await ensureWalletExists(user.id);
    await ensureWalletExists(creatorId);

    const serviceSupabase = createServiceSupabaseClient();

    // ─── Subscription ─────────────────────────────────────────────────────

    if (type === "subscription") {
      const months = TIER_MONTHS[selectedTier] ?? 1;

      // Check for existing subscription
      const { data: existingSub } = await serviceSupabase
        .from("subscriptions")
        .select("id, status")
        .eq("fan_id", user.id)
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSub?.status === "active") {
        return NextResponse.json({ message: "Already subscribed to this creator" }, { status: 409 });
      }

      const now = new Date();
      const nextRenewal = new Date(now);
      nextRenewal.setMonth(nextRenewal.getMonth() + months);
      const nextRenewalDate = nextRenewal.toISOString().split("T")[0];

      let subId: string;
      let isResubscription = false;

      if (existingSub) {
        // Reactivate existing subscription
        isResubscription = true;
        const { data: updatedSub, error: updateError } = await serviceSupabase
          .from("subscriptions")
          .update({
            selected_tier: selectedTier,
            price_paid: amountKobo,
            status: "active",
            auto_renew: !isFree,
            current_period_start: now.toISOString(),
            current_period_end: nextRenewal.toISOString(),
            next_renewal_date: nextRenewalDate,
            last_renewed_at: now.toISOString(),
            last_payment_method: "WALLET",
            updated_at: now.toISOString(),
          })
          .eq("id", existingSub.id)
          .select("id")
          .single();

        if (updateError || !updatedSub) {
          console.error("[Checkout] subscription update error:", updateError);
          return NextResponse.json({ message: "Failed to reactivate subscription" }, { status: 500 });
        }

        subId = String(updatedSub.id);
      } else {
        // Create new subscription
        const { data: newSub, error: subError } = await serviceSupabase
          .from("subscriptions")
          .insert({
            fan_id: user.id,
            creator_id: creatorId,
            selected_tier: selectedTier,
            price_paid: amountKobo,
            status: "active",
            auto_renew: !isFree,
            current_period_start: now.toISOString(),
            current_period_end: nextRenewal.toISOString(),
            next_renewal_date: nextRenewalDate,
            last_renewed_at: now.toISOString(),
            last_payment_method: "WALLET",
          })
          .select("id")
          .single();

        if (subError || !newSub) {
          console.error("[Checkout] subscription insert error:", subError);
          return NextResponse.json({ message: "Failed to create subscription" }, { status: 500 });
        }

        subId = String(newSub.id);
      }

      // Increment subscriber count
      await serviceSupabase.rpc("increment_subscriber_count", { creator_id: creatorId });

      // Process payment if not free
      if (!isFree) {
        await debitFanCreditCreator({
          fanId: user.id,
          creatorId,
          amountKobo,
          fanCategory: "SUBSCRIPTION_PAYMENT",
          creatorCategory: "CREATOR_EARNING",
          referenceId: subId,
        });
      }

      // Send welcome message (fire and forget)
      sendWelcomeMessage(creatorId, user.id).catch((err) =>
        console.error("[Checkout] Welcome message failed:", err)
      );

      return NextResponse.json({ message: "Subscription activated", subscriptionId: subId });
    }

    // ─── Tips ─────────────────────────────────────────────────────────────

    if (type === "tip") {
      if (isFree) {
        return NextResponse.json({ message: "Tip amount must be greater than 0" }, { status: 400 });
      }

      const { data: tip, error: tipError } = await serviceSupabase
        .from("tips")
        .insert({
          tipper_id: user.id,
          recipient_id: creatorId,
          post_id: postId ?? null,
          amount: amountKobo,
          message: message ?? null,
        })
        .select("id")
        .single();

      if (tipError || !tip) {
        console.error("[Checkout] tip insert error:", tipError);
        return NextResponse.json({ message: "Failed to record tip" }, { status: 500 });
      }

      const tipRefId = String(tip.id);

      await debitFanCreditCreator({
        fanId: user.id,
        creatorId,
        amountKobo,
        fanCategory: "TIP",
        creatorCategory: "CREATOR_EARNING",
        referenceId: tipRefId,
      });

      // Notify creator about tip
      try {
        const { data: fanProfile } = await supabase
          .from("profiles")
          .select("display_name, username, avatar_url")
          .eq("id", user.id)
          .single();

        await serviceSupabase.from("notifications").insert({
          user_id: creatorId,
          type: "tip",
          role: "creator",
          actor_id: user.id,
          actor_name: fanProfile?.display_name ?? fanProfile?.username ?? "Someone",
          actor_handle: fanProfile?.username ?? "",
          actor_avatar: fanProfile?.avatar_url ?? null,
          body_text: `sent you a ₦${(amountKobo / 100).toLocaleString()} tip`,
          sub_text: message ?? "",
          reference_id: tipRefId,
          is_read: false,
        });
      } catch (notifErr) {
        console.error("[Checkout] tip notification error:", notifErr);
      }

      return NextResponse.json({ message: "Tip sent", tipId: tip.id });
    }

    // ─── PPV ──────────────────────────────────────────────────────────────

    if (type === "ppv") {
      if (!postId) {
        return NextResponse.json({ message: "postId is required for PPV" }, { status: 400 });
      }

      if (isFree) {
        return NextResponse.json({ message: "PPV amount must be greater than 0" }, { status: 400 });
      }

      // Check if already unlocked
      const { data: existingUnlock } = await serviceSupabase
        .from("ppv_unlocks")
        .select("id")
        .eq("fan_id", user.id)
        .eq("post_id", postId)
        .maybeSingle();

      if (existingUnlock) {
        return NextResponse.json({ message: "Already unlocked" }, { status: 409 });
      }

      const { data: unlock, error: unlockError } = await serviceSupabase
        .from("ppv_unlocks")
        .insert({
          fan_id: user.id,
          post_id: postId,
          creator_id: creatorId,
          amount_paid: amountKobo,
        })
        .select("id")
        .single();

      if (unlockError || !unlock) {
        console.error("[Checkout] ppv unlock error:", unlockError);
        return NextResponse.json({ message: "Failed to unlock content" }, { status: 500 });
      }

      const unlockRefId = String(unlock.id);

      await debitFanCreditCreator({
        fanId: user.id,
        creatorId,
        amountKobo,
        fanCategory: "PPV_PURCHASE",
        creatorCategory: "CREATOR_EARNING",
        referenceId: unlockRefId,
      });

      // Notify creator about PPV purchase
      try {
        const { data: fanProfile } = await supabase
          .from("profiles")
          .select("display_name, username, avatar_url")
          .eq("id", user.id)
          .single();

        await serviceSupabase.from("notifications").insert({
          user_id: creatorId,
          type: "ppv_purchase",
          role: "creator",
          actor_id: user.id,
          actor_name: fanProfile?.display_name ?? fanProfile?.username ?? "Someone",
          actor_handle: fanProfile?.username ?? "",
          actor_avatar: fanProfile?.avatar_url ?? null,
          body_text: `unlocked your content for ₦${(amountKobo / 100).toLocaleString()}`,
          sub_text: "",
          reference_id: unlockRefId,
          is_read: false,
        });
      } catch (notifErr) {
        console.error("[Checkout] ppv notification error:", notifErr);
      }

      return NextResponse.json({ message: "Content unlocked", unlockId: unlock.id });
    }

    return NextResponse.json({ message: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("[Checkout Error]", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}