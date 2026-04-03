// app/api/payout/remove/route.ts
// Removes a bank account from creator's payout accounts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
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
      .select("id, is_active")
      .eq("id", accountId)
      .eq("creator_id", user.id)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Soft-delete the account (keep row for cooling period tracking)
    await serviceSupabase
      .from("creator_payout_accounts")
      .update({ is_active: false, is_verified: false, updated_at: new Date().toISOString() })
      .eq("id", accountId);

    // If the removed account was active, promote the next one
    if (account.is_active) {
      const { data: remaining } = await serviceSupabase
        .from("creator_payout_accounts")
        .select("id")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (remaining && remaining.length > 0) {
        await serviceSupabase
          .from("creator_payout_accounts")
          .update({ is_active: true })
          .eq("id", remaining[0].id);
      }
    }

    return NextResponse.json({ message: "Account removed" });
  } catch (error) {
    console.error("[Payout Remove] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}