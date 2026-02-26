import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// ─── GET /api/transactions/status?reference=VA-TIP-xxx ───────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reference = req.nextUrl.searchParams.get("reference");
    if (!reference) {
      return NextResponse.json({ error: "reference is required" }, { status: 400 });
    }

    const { data } = await supabase
      .from("transactions")
      .select("status")
      .eq("provider_txn_id", reference)
      .eq("fan_id", user.id)
      .maybeSingle();

    return NextResponse.json({ completed: data?.status === "completed" });

  } catch (err) {
    console.error("[Transaction Status Error]", err);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}