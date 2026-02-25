import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  initializeTransaction,
  chargeTransaction,
  generateReference,
} from "@/lib/utils/kyshi";
import { getSavedCards, hasSufficientBalance, debitWallet, creditWallet } from "@/lib/utils/wallet";

// ─── POST /api/subscriptions/checkout/card ────────────────────────────────────
// Handles direct card subscription payment
// If cardId provided — charges saved card silently
// If no cardId — initializes Kyshi checkout for new card

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { creatorId, tierId, cardId, currency = "NGN" } = body;

    if (!creatorId || !tierId) {
      return NextResponse.json({ message: "creatorId and tierId are required" }, { status: 400 });
    }

    // Get tier details
    const { data: tier } = await supabase
      .from("subscription_tiers")
      .select("id, price, name")
      .eq("id", tierId)
      .eq("creator_id", creatorId)
      .single();

    if (!tier) {
      return NextResponse.json({ message: "Subscription tier not found" }, { status: 404 });
    }

    // Check if already subscribed
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("fan_id", user.id)
      .eq("creator_id", creatorId)
      .eq("status", "ACTIVE")
      .single();

    if (existingSub) {
      return NextResponse.json({ message: "Already subscribed to this creator" }, { status: 409 });
    }

    // Get user email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    const email = profile?.email ?? user.email ?? "";
    const amount = tier.price;
    const reference = generateReference("SUB");

    // Calculate earnings split
    const platformFee = Math.floor(amount * 0.18);
    const creatorEarning = amount - platformFee;

    // Create subscription record first (status = pending)
    const now = new Date();
    const nextRenewal = new Date();
    nextRenewal.setMonth(nextRenewal.getMonth() + 1);

    const { data: newSub } = await supabase
      .from("subscriptions")
      .insert({
        fan_id: user.id,
        creator_id: creatorId,
        tier_id: tierId,
        price_paid: amount,
        status: "PENDING",
        auto_renew: true,
        current_period_start: now.toISOString(),
        current_period_end: nextRenewal.toISOString(),
      })
      .select("id")
      .single();

    // Save pending transaction
    await supabase.from("transactions").insert({
      fan_id: user.id,
      provider: "KYSHI",
      provider_txn_id: reference,
      amount,
      currency,
      status: "PENDING",
      payment_method: "CARD",
      purpose: "SUBSCRIPTION",
      subscription_id: newSub?.id ?? null,
    });

    // If cardId provided — charge saved card silently
    if (cardId) {
      const savedCards = await getSavedCards(user.id);
      const card = savedCards.find((c) => c.id === cardId);

      if (!card) {
        return NextResponse.json({ message: "Card not found" }, { status: 404 });
      }

      const result = await chargeTransaction({
        amount,
        currency,
        email,
        authorizationCode: card.authorizationCode,
        reference,
        metadata: { userId: user.id, purpose: "SUBSCRIPTION", subscriptionId: newSub?.id },
      });

      // If confirmed instantly
      if (result.data.status === "CONFIRMED") {
        await supabase
          .from("transactions")
          .update({ status: "CONFIRMED", confirmed_at: new Date().toISOString() })
          .eq("provider_txn_id", reference);

        // Activate subscription
        await supabase
          .from("subscriptions")
          .update({
            status: "ACTIVE",
            last_renewed_at: now.toISOString(),
            last_payment_method: "CARD",
          })
          .eq("id", newSub?.id);

        // Credit creator
        await creditWallet({
          userId: creatorId,
          amount: creatorEarning,
          category: "CREATOR_EARNING",
          provider: "KYSHI",
          providerReference: reference,
          referenceId: newSub?.id,
          description: "Subscription earning",
        });
      }

      return NextResponse.json({
        message: "Subscription payment processed",
        reference,
        status: result.data.status,
        subscriptionId: newSub?.id,
      });
    }

    // No cardId — initialize checkout for new card
    const result = await initializeTransaction({
      amount,
      currency,
      email,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe/success?ref=${reference}`,
      metadata: {
        userId: user.id,
        purpose: "SUBSCRIPTION",
        subscriptionId: newSub?.id,
        creatorId,
      },
    });

    return NextResponse.json({
      message: "Checkout initialized",
      authorizationUrl: result.data.authorizationUrl,
      reference,
      subscriptionId: newSub?.id,
    });

  } catch (error) {
    console.error("[Subscription Card Checkout Error]", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}