import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
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

    // Check if it's the primary — if so, assign primary to another account after deletion
    const { data: account } = await supabase
      .from("bank_accounts")
      .select("is_primary")
      .eq("id", accountId)
      .eq("creator_id", user.id)
      .single();

    const { error } = await supabase
      .from("bank_accounts")
      .delete()
      .eq("id", accountId)
      .eq("creator_id", user.id);

    if (error) throw error;

    // If deleted account was primary, make the next one primary
    if (account?.is_primary) {
      const { data: remaining } = await supabase
        .from("bank_accounts")
        .select("id")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (remaining && remaining.length > 0) {
        await supabase
          .from("bank_accounts")
          .update({ is_primary: true })
          .eq("id", remaining[0].id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Remove Account Error]", err);
    return NextResponse.json({ error: "Failed to remove account" }, { status: 500 });
  }
}