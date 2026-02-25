import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId } = await req.json();

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    // Remove primary from all accounts
    await supabase
      .from("bank_accounts")
      .update({ is_primary: false })
      .eq("creator_id", user.id);

    // Set the selected one as primary
    const { error } = await supabase
      .from("bank_accounts")
      .update({ is_primary: true })
      .eq("id", accountId)
      .eq("creator_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Set Default Error]", err);
    return NextResponse.json({ error: "Failed to update default account" }, { status: 500 });
  }
}