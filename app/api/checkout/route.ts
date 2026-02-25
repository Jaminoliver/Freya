import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { debitWallet, creditWallet, hasSufficientBalance } from "@/lib/utils/wallet";

// ─── POST /api/checkout ───────────────────────────────────────────────────────
// Handles wallet payments for: subscription, tips, ppv

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, amount, creatorId, tierId, postId, message } = body;

    if (!type || amount === undefined || amount === null || !creatorId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const isFree = amount === 0;

    // Only check balance if there's an actual charge
    if (!isFree) {
      const sufficient = await hasSufficientBalance(user.id, amount);
      if (!sufficient) {
        return NextResponse.json({ message: "Insufficient wallet balance" }, { status: 400 });
      }
    }

    const PLATFORM_FEE_RATE = 0.18;
    const platformFee = Math.floor(amount * PLATFORM_FEE_RATE);
    const creatorEarning = amount - platformFee;

    // ─── Subscription ───────────────────────────────────────────────────────

    if (type === "subscription") {
      if (!isFree && !tierId) {
        return NextResponse.json({ message: "tierId is required for paid subscription" }, { status: 400 });
      }

      // Check for ANY existing subscription row (any status) to avoid unique constraint violation
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id, status")
        .eq("fan_id", user.id)
        .eq("creator_id", creatorId)
        .eq("tier_id", tierId ?? null)
        .maybeSingle();

      if (existingSub?.status === "active") {
        return NextResponse.json({ message: "Already subscribed to this creator" }, { status: 409 });
      }

      const now = new Date();
      const nextRenewal = new Date();
      nextRenewal.setMonth(nextRenewal.getMonth() + 1);

      let subId: string;

      if (existingSub) {
        // Row exists (expired/cancelled) — update it instead of inserting
        const { data: updatedSub, error: updateError } = await supabase
          .from("subscriptions")
          .update({
            tier_id: tierId ?? null,
            price_paid: amount,
            status: "active",
            auto_renew: !isFree,
            current_period_start: now.toISOString(),
            current_period_end: nextRenewal.toISOString(),
            last_renewed_at: now.toISOString(),
            last_payment_method: "WALLET",
          })
          .eq("id", existingSub.id)
          .select("id")
          .single();

        if (updateError || !updatedSub) {
          console.error("[Checkout] subscription update error:", updateError);
          return NextResponse.json({ message: "Failed to reactivate subscription" }, { status: 500 });
        }

        subId = updatedSub.id;
      } else {
        // No row exists — fresh insert
        const { data: newSub, error: subError } = await supabase
          .from("subscriptions")
          .insert({
            fan_id: user.id,
            creator_id: creatorId,
            tier_id: tierId ?? null,
            price_paid: amount,
            status: "active",
            auto_renew: !isFree,
            current_period_start: now.toISOString(),
            current_period_end: nextRenewal.toISOString(),
            last_renewed_at: now.toISOString(),
            last_payment_method: "WALLET",
          })
          .select("id")
          .single();

        if (subError || !newSub) {
          console.error("[Checkout] subscription insert error:", subError);
          return NextResponse.json({ message: "Failed to create subscription" }, { status: 500 });
        }

        subId = newSub.id;
      }

      // ✅ Increment subscriber_count on creator's profile
      await supabase.rpc("increment_subscriber_count", { creator_id: creatorId });

      if (!isFree) {
        await debitWallet({
          userId: user.id,
          amount,
          category: "SUBSCRIPTION_PAYMENT",
          provider: "INTERNAL",
          description: "Subscription payment via wallet",
          referenceId: subId,
          useServiceRole: true,
        });

        await creditWallet({
          userId: creatorId,
          fanId: user.id,
          amount: creatorEarning,
          category: "CREATOR_EARNING",
          provider: "INTERNAL",
          description: "Subscription earning",
          referenceId: subId,
          useServiceRole: true,
        });
      }

      return NextResponse.json({ message: "Subscription activated", subscriptionId: subId });
    }

    // ─── Tips ───────────────────────────────────────────────────────────────

    if (type === "tip") {
      const { data: tip, error: tipError } = await supabase
        .from("tips")
        .insert({
          tipper_id: user.id,
          recipient_id: creatorId,
          post_id: postId ?? null,
          amount,
          message: message ?? null,
        })
        .select("id")
        .single();

      if (tipError || !tip) {
        return NextResponse.json({ message: "Failed to record tip" }, { status: 500 });
      }

      await debitWallet({
        userId: user.id,
        amount,
        category: "SUBSCRIPTION_PAYMENT",
        provider: "INTERNAL",
        description: "Tip to creator",
        referenceId: tip.id,
        useServiceRole: true,
      });

      await creditWallet({
        userId: creatorId,
        fanId: user.id,
        amount: creatorEarning,
        category: "CREATOR_EARNING",
        provider: "INTERNAL",
        description: "Tip received",
        referenceId: tip.id,
        useServiceRole: true,
      });

      return NextResponse.json({ message: "Tip sent", tipId: tip.id });
    }

    // ─── PPV ────────────────────────────────────────────────────────────────

    if (type === "ppv") {
      if (!postId) {
        return NextResponse.json({ message: "postId is required for PPV" }, { status: 400 });
      }

      const { data: existingUnlock } = await supabase
        .from("ppv_unlocks")
        .select("id")
        .eq("fan_id", user.id)
        .eq("post_id", postId)
        .maybeSingle();

      if (existingUnlock) {
        return NextResponse.json({ message: "Already unlocked" }, { status: 409 });
      }

      const { data: unlock, error: unlockError } = await supabase
        .from("ppv_unlocks")
        .insert({
          fan_id: user.id,
          post_id: postId,
          creator_id: creatorId,
          amount_paid: amount,
        })
        .select("id")
        .single();

      if (unlockError || !unlock) {
        return NextResponse.json({ message: "Failed to unlock content" }, { status: 500 });
      }

      await debitWallet({
        userId: user.id,
        amount,
        category: "SUBSCRIPTION_PAYMENT",
        provider: "INTERNAL",
        description: "PPV content unlock",
        referenceId: unlock.id,
        useServiceRole: true,
      });

      await creditWallet({
        userId: creatorId,
        fanId: user.id,
        amount: creatorEarning,
        category: "CREATOR_EARNING",
        provider: "INTERNAL",
        description: "PPV content earning",
        referenceId: unlock.id,
        useServiceRole: true,
      });

      return NextResponse.json({ message: "Content unlocked", unlockId: unlock.id });
    }

    return NextResponse.json({ message: "Invalid type" }, { status: 400 });

  } catch (error) {
    console.error("[Wallet Checkout Error]", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}