// app/api/wallet/cards/remove/route.ts
// Remove a saved card from fan_payment_methods

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

    const { cardId } = await req.json();
    if (!cardId) {
      return NextResponse.json({ message: "cardId is required" }, { status: 400 });
    }

    // Verify the card belongs to this user
    const { data: card, error: cardError } = await supabase
      .from("fan_payment_methods")
      .select("id, is_default")
      .eq("id", Number(cardId))
      .eq("fan_id", user.id)
      .single();

    if (cardError || !card) {
      return NextResponse.json({ message: "Card not found" }, { status: 404 });
    }

    const wasDefault = card.is_default;

    // Delete the card
    await supabase
      .from("fan_payment_methods")
      .delete()
      .eq("id", Number(cardId))
      .eq("fan_id", user.id);

    // If the deleted card was default, set the most recent remaining card as default
    if (wasDefault) {
      const { data: remainingCards } = await supabase
        .from("fan_payment_methods")
        .select("id")
        .eq("fan_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (remainingCards && remainingCards.length > 0) {
        await supabase
          .from("fan_payment_methods")
          .update({ is_default: true })
          .eq("id", remainingCards[0].id);
      }
    }

    return NextResponse.json({ message: "Card removed" });
  } catch (error) {
    console.error("[Remove Card Error]", error);
    return NextResponse.json({ message: "Failed to remove card" }, { status: 500 });
  }
}