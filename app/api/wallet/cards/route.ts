import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSavedCards } from "@/lib/utils/wallet";

// ─── GET /api/wallet/cards ────────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const cards = await getSavedCards(user.id);
    return NextResponse.json({ cards });
  } catch (error) {
    console.error("[Wallet Cards Error]", error);
    return NextResponse.json({ message: "Failed to fetch cards" }, { status: 500 });
  }
}