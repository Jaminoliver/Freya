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
      .select("id, is_favourite, fan_id")
      .eq("id", id)
      .eq("fan_id", user.id)
      .maybeSingle();

    if (fetchError || !sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const nextValue = !sub.is_favourite;

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        is_favourite: nextValue,
        updated_at:   new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("[Favourite Subscription] update error:", updateError.message);
      return NextResponse.json({ error: "Failed to update favourite" }, { status: 500 });
    }

    return NextResponse.json({ success: true, is_favourite: nextValue });
  } catch (err) {
    console.error("[Favourite Subscription Error]", err);
    return NextResponse.json({ error: "Failed to toggle favourite" }, { status: 500 });
  }
}