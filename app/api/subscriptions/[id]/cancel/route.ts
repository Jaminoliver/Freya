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

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status:       "cancelled",
        auto_renew:   false,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) throw updateError;

    const { error: rpcError } = await supabase.rpc("decrement_subscriber_count", { creator_id: sub.creator_id });
    if (rpcError) console.error("[Cancel Subscription] decrement_subscriber_count error:", rpcError.message);

    // ── Fire notifications without blocking the response ──────────────────
    ;(async () => {
      try {
        const serviceSupabase = createServiceSupabaseClient();

        const [fanProfile, creatorProfile] = await Promise.all([
          supabase.from("profiles").select("display_name, username, avatar_url").eq("id", user.id).single(),
          supabase.from("profiles").select("display_name, username, avatar_url").eq("id", sub.creator_id).single(),
        ]);

        await Promise.all([
          serviceSupabase.from("notifications").insert({
            user_id:      sub.creator_id,
            type:         "subscription",
            role:         "creator",
            actor_id:     user.id,
            actor_name:   fanProfile.data?.display_name ?? fanProfile.data?.username ?? "Someone",
            actor_handle: fanProfile.data?.username ?? "",
            actor_avatar: fanProfile.data?.avatar_url ?? null,
            body_text:    "cancelled their subscription",
            sub_text:     `@${fanProfile.data?.username ?? ""}`,
            reference_id: user.id,
            is_read:      false,
          }),
          serviceSupabase.from("notifications").insert({
            user_id:      user.id,
            type:         "subscription_cancelled",
            role:         "fan",
            actor_id:     sub.creator_id,
            actor_name:   "",
            actor_handle: creatorProfile.data?.username ?? "",
            actor_avatar: creatorProfile.data?.avatar_url ?? null,
            body_text:    `You cancelled your subscription to ${creatorProfile.data?.display_name ?? creatorProfile.data?.username ?? "this creator"}`,
            sub_text:     "You'll keep access until the end of your billing period",
            reference_id: sub.creator_id,
            is_read:      false,
          }),
        ]);
      } catch (notifErr) {
        console.error("[Cancel] notification error:", notifErr);
      }
    })();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Cancel Subscription Error]", err);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}