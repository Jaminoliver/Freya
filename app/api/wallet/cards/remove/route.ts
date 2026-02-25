import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { removeCard } from "@/lib/utils/wallet";

// ─── POST /api/wallet/cards/remove ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { cardId } = await req.json();
    if (!cardId) return NextResponse.json({ message: "cardId is required" }, { status: 400 });

    await removeCard(user.id, Number(cardId));
    return NextResponse.json({ message: "Card removed" });
  } catch (error) {
    console.error("[Remove Card Error]", error);
    return NextResponse.json({ message: "Failed to remove card" }, { status: 500 });
  }
}