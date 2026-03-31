// app/api/wallet/cards/default/route.ts
// Set a saved card as the default payment method

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
      .select("id")
      .eq("id", Number(cardId))
      .eq("fan_id", user.id)
      .single();

    if (cardError || !card) {
      return NextResponse.json({ message: "Card not found" }, { status: 404 });
    }

    // Set all cards as non-default first
    await supabase
      .from("fan_payment_methods")
      .update({ is_default: false })
      .eq("fan_id", user.id);

    // Set the selected card as default
    await supabase
      .from("fan_payment_methods")
      .update({ is_default: true })
      .eq("id", Number(cardId))
      .eq("fan_id", user.id);

    return NextResponse.json({ message: "Default card updated" });
  } catch (error) {
    console.error("[Set Default Card Error]", error);
    return NextResponse.json({ message: "Failed to update default card" }, { status: 500 });
  }
}