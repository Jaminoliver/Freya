// app/api/payout/set-default/route.ts
// Sets a bank account as the primary (active) payout account

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId } = await req.json();
    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Verify the account belongs to this user
    const { data: account } = await serviceSupabase
      .from("creator_payout_accounts")
      .select("id")
      .eq("id", accountId)
      .eq("creator_id", user.id)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Set all accounts to inactive
    await serviceSupabase
      .from("creator_payout_accounts")
      .update({ is_active: false })
      .eq("creator_id", user.id);

    // Set selected account to active
    await serviceSupabase
      .from("creator_payout_accounts")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", accountId);

    return NextResponse.json({ message: "Default account updated" });
  } catch (error) {
    console.error("[Payout Set Default] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}