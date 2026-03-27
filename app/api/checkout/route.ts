import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { debitWallet, creditWallet, hasSufficientBalance } from "@/lib/utils/wallet";
import { sendWelcomeMessage } from "@/lib/welcome-message";

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

    console.log("[Checkout] incoming:", { type, amount, creatorId, tierId, postId, userId: user.id });

    if (!type || amount === undefined || amount === null || !creatorId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (typeof amount !== "number" || isNaN(amount) || amount < 0) {
      return NextResponse.json({ message: "Invalid amount" }, { status: 400 });
    }

    const isFree = amount === 0;

    if (!isFree) {
      const sufficient = await hasSufficientBalance(user.id, amount);
      if (!sufficient) {
        return NextResponse.json({ message: "Insufficient wallet balance" }, { status: 400 });
      }
    }

    const PLATFORM_FEE_RATE = 0.18;
    const platformFee    = Math.floor(amount * PLATFORM_FEE_RATE);
    const creatorEarning = amount - platformFee;

    // ─── Subscription ───────────────────────────────────────────────────────

    if (type === "subscription") {
      if (!isFree && !tierId) {
        return NextResponse.json({ message: "tierId is required for paid subscription" }, { status: 400 });
      }

      const existingSubQuery = supabase
        .from("subscriptions")
        .select("id, status")
        .eq("fan_id", user.id)
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (tierId) {
        existingSubQuery.eq("tier_id", tierId);
      } else {
        existingSubQuery.is("tier_id", null);
      }

      const { data: existingSub, error: existingSubError } = await existingSubQuery.maybeSingle();

      console.log("[Checkout] existingSub query:", { existingSub, existingSubError, tierId: tierId ?? null });

      if (existingSub?.status === "active") {
        console.log("[Checkout] already subscribed — returning 409");
        return NextResponse.json({ message: "Already subscribed to this creator" }, { status: 409 });
      }

      const now = new Date();
      const nextRenewal = new Date();
      nextRenewal.setMonth(nextRenewal.getMonth() + 1);

      let subId:          string;
      let isResubscription = false;

      if (existingSub) {
        isResubscription = true;
        console.log("[Checkout] updating existing sub row:", existingSub.id);
        const { data: updatedSub, error: updateError } = await supabase
          .from("subscriptions")
          .update({
            tier_id:              tierId ?? null,
            price_paid:           amount,
            status:               "active",
            auto_renew:           !isFree,
            current_period_start: now.toISOString(),
            current_period_end:   nextRenewal.toISOString(),
            last_renewed_at:      now.toISOString(),
            last_payment_method:  "WALLET",
          })
          .eq("id", existingSub.id)
          .select("id")
          .single();

        console.log("[Checkout] update result:", { updatedSub, updateError });

        if (updateError || !updatedSub) {
          console.error("[Checkout] subscription update error:", updateError);
          return NextResponse.json({ message: "Failed to reactivate subscription" }, { status: 500 });
        }

        subId = updatedSub.id;
      } else {
        console.log("[Checkout] inserting new sub row");
        const { data: newSub, error: subError } = await supabase
          .from("subscriptions")
          .insert({
            fan_id:               user.id,
            creator_id:           creatorId,
            tier_id:              tierId ?? null,
            price_paid:           amount,
            status:               "active",
            auto_renew:           !isFree,
            current_period_start: now.toISOString(),
            current_period_end:   nextRenewal.toISOString(),
            last_renewed_at:      now.toISOString(),
            last_payment_method:  "WALLET",
          })
          .select("id")
          .single();

        console.log("[Checkout] insert result:", { newSub, subError });

        if (subError || !newSub) {
          console.error("[Checkout] subscription insert error:", subError);
          return NextResponse.json({ message: "Failed to create subscription" }, { status: 500 });
        }

        subId = newSub.id;
      }

      await supabase.rpc("increment_subscriber_count", { creator_id: creatorId });

      if (!isFree) {
        await debitWallet({
          userId:         user.id,
          amount,
          category:       "SUBSCRIPTION_PAYMENT",
          provider:       "INTERNAL",
          description:    "Subscription payment via wallet",
          referenceId:    subId,
          useServiceRole: true,
        });

        await creditWallet({
          userId:         creatorId,
          fanId:          user.id,
          amount:         creatorEarning,
          category:       "CREATOR_EARNING",
          provider:       "INTERNAL",
          description:    "Subscription earning",
          referenceId:    subId,
          useServiceRole: true,
        });
      }

      // ── Notify creator ──────────────────────────────────────────────────
      try {
        const { data: fanProfile, error: profileErr } = await supabase
          .from("profiles")
          .select("display_name, username, avatar_url")
          .eq("id", user.id)
          .single();

        if (profileErr) console.error("[Checkout] fan profile fetch failed:", profileErr.message);
        console.log("[Checkout] fan profile:", fanProfile);

        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("display_name, username, avatar_url")
          .eq("id", creatorId)
          .single();

        const serviceSupabase  = createServiceSupabaseClient();
        const notifType        = isResubscription ? "resubscription" : "subscription";
        const notifBody        = isResubscription ? "resubscribed to your page" : "just subscribed to your page";

        console.log("[Checkout] inserting notification — type:", notifType, "for creator:", creatorId);

        const { error: notifError } = await serviceSupabase.from("notifications").insert({
          user_id:      creatorId,
          type:         notifType,
          role:         "creator",
          actor_id:     user.id,
          actor_name:   fanProfile?.display_name ?? fanProfile?.username ?? "Someone",
          actor_handle: fanProfile?.username ?? "",
          actor_avatar: fanProfile?.avatar_url ?? null,
          body_text:    notifBody,
          sub_text:     `@${fanProfile?.username ?? ""}`,
          reference_id: user.id,
          is_read:      false,
        });

        if (notifError) {
          console.error("[Checkout] notification insert failed:", notifError.message, notifError.details);
        } else {
          console.log("[Checkout] creator notification inserted successfully");
        }

        // ── Notify fan — subscription confirmation ──────────────────────
        const creatorDisplayName = creatorProfile?.display_name ?? creatorProfile?.username ?? "this creator";
        const fanNotifBody = isResubscription
          ? `You resubscribed to ${creatorDisplayName}`
          : `You subscribed to ${creatorDisplayName}`;

        const { error: fanNotifError } = await serviceSupabase.from("notifications").insert({
          user_id:      user.id,
          type:         "subscription_activated",
          role:         "fan",
          actor_id:     creatorId,
          actor_name:   "",
          actor_handle: creatorProfile?.username ?? "",
          actor_avatar: creatorProfile?.avatar_url ?? null,
          body_text:    fanNotifBody,
          sub_text:     isFree ? "Free subscription · Monthly" : `₦${(amount / 100).toLocaleString()} · Monthly`,
          reference_id: creatorId,
          is_read:      false,
        });

        if (fanNotifError) {
          console.error("[Checkout] fan notification insert failed:", fanNotifError.message);
        } else {
          console.log("[Checkout] fan notification inserted successfully");
        }
      } catch (notifErr) {
        console.error("[Checkout] subscription notification failed:", notifErr);
      }

      sendWelcomeMessage(creatorId, user.id).catch((err) =>
        console.error("[Checkout] Welcome message failed:", err)
      );

      console.log("[Checkout] subscription success — subId:", subId);
      return NextResponse.json({ message: "Subscription activated", subscriptionId: subId });
    }

    // ─── Tips ───────────────────────────────────────────────────────────────

    if (type === "tip") {
      const { data: tip, error: tipError } = await supabase
        .from("tips")
        .insert({
          tipper_id:    user.id,
          recipient_id: creatorId,
          post_id:      postId ?? null,
          amount,
          message:      message ?? null,
        })
        .select("id")
        .single();

      if (tipError || !tip) {
        return NextResponse.json({ message: "Failed to record tip" }, { status: 500 });
      }

      await debitWallet({
        userId:         user.id,
        amount,
        category:       "SUBSCRIPTION_PAYMENT",
        provider:       "INTERNAL",
        description:    "Tip to creator",
        referenceId:    tip.id,
        useServiceRole: true,
      });

      await creditWallet({
        userId:         creatorId,
        fanId:          user.id,
        amount:         creatorEarning,
        category:       "CREATOR_EARNING",
        provider:       "INTERNAL",
        description:    "Tip received",
        referenceId:    tip.id,
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
          fan_id:     user.id,
          post_id:    postId,
          creator_id: creatorId,
          amount_paid: amount,
        })
        .select("id")
        .single();

      if (unlockError || !unlock) {
        return NextResponse.json({ message: "Failed to unlock content" }, { status: 500 });
      }

      await debitWallet({
        userId:         user.id,
        amount,
        category:       "SUBSCRIPTION_PAYMENT",
        provider:       "INTERNAL",
        description:    "PPV content unlock",
        referenceId:    unlock.id,
        useServiceRole: true,
      });

      await creditWallet({
        userId:         creatorId,
        fanId:          user.id,
        amount:         creatorEarning,
        category:       "CREATOR_EARNING",
        provider:       "INTERNAL",
        description:    "PPV content earning",
        referenceId:    unlock.id,
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