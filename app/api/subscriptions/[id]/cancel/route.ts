import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

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

    // ── Notify creator ──────────────────────────────────────────────────────
    try {
      const { data: fanProfile } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", user.id)
        .single();

      console.log("[Cancel] fan profile:", fanProfile);

      const serviceSupabase = createServiceSupabaseClient();

      const { error: notifError } = await serviceSupabase.from("notifications").insert({
        user_id:      sub.creator_id,
        type:         "subscription",
        role:         "creator",
        actor_id:     user.id,
        actor_name:   fanProfile?.display_name ?? fanProfile?.username ?? "Someone",
        actor_handle: fanProfile?.username ?? "",
        actor_avatar: fanProfile?.avatar_url ?? null,
        body_text:    "cancelled their subscription",
        sub_text:     `@${fanProfile?.username ?? ""}`,
        reference_id: user.id,
        is_read:      false,
      });

      if (notifError) {
        console.error("[Cancel] notification insert failed:", notifError.message);
      } else {
        console.log("[Cancel] creator notification inserted for creator:", sub.creator_id);
      }

      // ── Notify fan — cancellation confirmed ────────────────────────────
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", sub.creator_id)
        .single();

      const { error: fanNotifError } = await serviceSupabase.from("notifications").insert({
        user_id:      user.id,
        type:         "subscription_cancelled",
        role:         "fan",
        actor_id:     sub.creator_id,
        actor_name:   "",
        actor_handle: creatorProfile?.username ?? "",
        actor_avatar: creatorProfile?.avatar_url ?? null,
        body_text:    `You cancelled your subscription to ${creatorProfile?.display_name ?? creatorProfile?.username ?? "this creator"}`,
        sub_text:     "You'll keep access until the end of your billing period",
        reference_id: sub.creator_id,
        is_read:      false,
      });

      if (fanNotifError) {
        console.error("[Cancel] fan notification insert failed:", fanNotifError.message);
      } else {
        console.log("[Cancel] fan notification inserted for fan:", user.id);
      }
    } catch (notifErr) {
      console.error("[Cancel] notification unexpected error:", notifErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Cancel Subscription Error]", err);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}