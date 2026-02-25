import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(
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

    // Fetch subscription — must belong to this fan
    const { data: sub, error: fetchError } = await supabase
      .from("subscriptions")
      .select("id, status, creator_id")
      .eq("id", id)
      .eq("fan_id", user.id)
      .maybeSingle();

    if (fetchError || !sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (sub.status === "cancelled" || sub.status === "expired") {
      return NextResponse.json({ error: "Subscription is already inactive" }, { status: 400 });
    }

    // Cancel — keep access until period ends
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status:       "cancelled",
        auto_renew:   false,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) throw updateError;

    // Decrement subscriber count on creator profile
    const { error: rpcError } = await supabase.rpc("decrement_subscriber_count", { creator_id: sub.creator_id });
    if (rpcError) console.error("[Cancel Subscription] decrement_subscriber_count error:", rpcError.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Cancel Subscription Error]", err);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}