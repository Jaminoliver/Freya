import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// ─── GET /api/subscriptions/status?creatorId=xxx ─────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ active: false, pending: false }, { status: 401 });
    }

    const creatorId = req.nextUrl.searchParams.get("creatorId");

    if (!creatorId) {
      return NextResponse.json({ active: false, pending: false }, { status: 400 });
    }

    // Check for active subscription
    const { data: activeSub } = await supabase
      .from("subscriptions")
      .select("id, status, current_period_end")
      .eq("fan_id", user.id)
      .eq("creator_id", creatorId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSub) {
      return NextResponse.json({
        active:           true,
        pending:          false,
        subscriptionId:   activeSub.id,
        currentPeriodEnd: activeSub.current_period_end,
      });
    }

    // Check for a pending payment (awaiting bank transfer confirmation)
    const { data: pendingTxn } = await supabase
      .from("transactions")
      .select("id, provider_txn_id, amount, created_at")
      .eq("fan_id", user.id)
      .eq("purpose", "SUBSCRIPTION")
      .eq("status", "pending")
      .contains("metadata", { creator_id: creatorId })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingTxn) {
      return NextResponse.json({
        active:        false,
        pending:       true,
        reference:     pendingTxn.provider_txn_id,
        amount:        pendingTxn.amount,
        createdAt:     pendingTxn.created_at,
      });
    }

    return NextResponse.json({ active: false, pending: false });

  } catch (error) {
    console.error("[Subscription Status Error]", error);
    return NextResponse.json({ active: false, pending: false }, { status: 500 });
  }
}