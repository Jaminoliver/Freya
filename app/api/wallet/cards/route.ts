// app/api/wallet/cards/route.ts
// Returns saved cards from fan_payment_methods table

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: cards, error: cardsError } = await supabase
      .from("fan_payment_methods")
      .select("id, card_type, last_four, expiry, is_default, created_at")
      .eq("fan_id", user.id)
      .order("created_at", { ascending: false });

    if (cardsError) {
      console.error("[Wallet Cards] DB error:", cardsError.message);
      return NextResponse.json({ message: "Failed to fetch cards" }, { status: 500 });
    }

    // Map to frontend-friendly format
    const formattedCards = (cards || []).map((c) => ({
      id: c.id,
      cardType: c.card_type ?? "Card",
      lastFour: c.last_four ?? "••••",
      expiry: c.expiry ?? "••/••",
      isDefault: c.is_default ?? false,
    }));

    return NextResponse.json({ cards: formattedCards });
  } catch (error) {
    console.error("[Wallet Cards Error]", error);
    return NextResponse.json({ message: "Failed to fetch cards" }, { status: 500 });
  }
}