import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  initializeTransaction,
  chargeTransaction,
  generateReference,
} from "@/lib/utils/kyshi";
import { getSavedCards } from "@/lib/utils/wallet";

// ─── POST /api/wallet/topup/card ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, currency = "NGN", cardId } = body;

    if (!amount || amount < 100) {
      return NextResponse.json({ message: "Minimum top-up amount is ₦100" }, { status: 400 });
    }

    // Convert naira → kobo for Kyshi
    const amountInKobo = amount * 100;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    const email = profile?.email ?? user.email ?? "";
    const reference = generateReference("TOPUP");

    if (cardId) {
      const savedCards = await getSavedCards(user.id);
      const card = savedCards.find((c) => c.id === cardId);

      if (!card) {
        return NextResponse.json({ message: "Card not found" }, { status: 404 });
      }

      // Store amount in naira in DB, send kobo to Kyshi
      await supabase.from("transactions").insert({
        fan_id: user.id,
        provider: "KYSHI",
        provider_txn_id: reference,
        amount, // naira — stored in DB
        currency,
        status: "PENDING",
        payment_method: "CARD",
        purpose: "WALLET_TOPUP",
      });

      const result = await chargeTransaction({
        amount: amountInKobo, // kobo — sent to Kyshi
        currency,
        email,
        authorizationCode: card.authorizationCode,
        reference,
      });

      if (result.data.status === "CONFIRMED") {
        await supabase
          .from("transactions")
          .update({ status: "CONFIRMED", confirmed_at: new Date().toISOString() })
          .eq("provider_txn_id", reference);
      }

      return NextResponse.json({
        message: "Card charged successfully",
        reference,
        status: result.data.status,
      });
    }

    // First-time — initialize checkout
    await supabase.from("transactions").insert({
      fan_id: user.id,
      provider: "KYSHI",
      provider_txn_id: reference,
      amount, // naira — stored in DB
      currency,
      status: "PENDING",
      payment_method: "CARD",
      purpose: "WALLET_TOPUP",
    });

    const result = await initializeTransaction({
      amount: amountInKobo, // kobo — sent to Kyshi
      currency,
      email,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?ref=${reference}`,
      metadata: { userId: user.id, purpose: "WALLET_TOPUP" },
    });

    return NextResponse.json({
      message: "Checkout initialized",
      authorizationUrl: result.data.authorizationUrl,
      reference,
    });

  } catch (error) {
    console.error("[Wallet Topup Card Error]", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}