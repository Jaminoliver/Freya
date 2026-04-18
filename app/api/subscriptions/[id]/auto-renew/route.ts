import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { auto_renew } = body as { auto_renew?: boolean };

    if (typeof auto_renew !== "boolean") {
      return NextResponse.json({ error: "auto_renew (boolean) is required" }, { status: 400 });
    }

    // Fetch subscription — must belong to this fan
    const { data: sub, error: fetchError } = await supabase
      .from("subscriptions")
      .select("id, status, price_paid")
      .eq("id", id)
      .eq("fan_id", user.id)
      .maybeSingle();

    if (fetchError || !sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (sub.status !== "active" && sub.status !== "grace_period") {
      return NextResponse.json(
        { error: "Auto-renew can only be toggled on active subscriptions" },
        { status: 400 }
      );
    }

    // Free subs can't auto-renew (nothing to charge)
    if (auto_renew === true && sub.price_paid === 0) {
      return NextResponse.json(
        { error: "Free subscriptions do not renew automatically" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        auto_renew,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("[Auto-Renew] update error:", updateError.message);
      return NextResponse.json({ error: "Failed to update auto-renew" }, { status: 500 });
    }

    return NextResponse.json({ success: true, auto_renew });
  } catch (err) {
    console.error("[Auto-Renew Error]", err);
    return NextResponse.json({ error: "Failed to toggle auto-renew" }, { status: 500 });
  }
}