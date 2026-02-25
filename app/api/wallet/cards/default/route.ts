import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { setDefaultCard } from "@/lib/utils/wallet";

// ─── POST /api/wallet/cards/default ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { cardId } = await req.json();
    if (!cardId) return NextResponse.json({ message: "cardId is required" }, { status: 400 });

    await setDefaultCard(user.id, Number(cardId));
    return NextResponse.json({ message: "Default card updated" });
  } catch (error) {
    console.error("[Set Default Card Error]", error);
    return NextResponse.json({ message: "Failed to update default card" }, { status: 500 });
  }
}