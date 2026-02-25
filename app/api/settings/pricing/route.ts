import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/settings/pricing
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("subscription_tiers")
      .select("id, monthly_price, three_month_price, six_month_price, is_active")
      .eq("creator_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ message: "Failed to fetch pricing" }, { status: 500 });
    }

    return NextResponse.json({ pricing: data ?? null });
  } catch {
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}

// PATCH /api/settings/pricing
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { monthly_price, three_month_price, six_month_price } = body;

    const isFree = monthly_price === null || monthly_price === 0;

    if (!isFree && (typeof monthly_price !== "number" || monthly_price < 10000)) {
      return NextResponse.json({ message: "Minimum subscription price is ₦10,000" }, { status: 400 });
    }

    // Check if tier exists
    const { data: existing } = await supabase
      .from("subscription_tiers")
      .select("id")
      .eq("creator_id", user.id)
      .maybeSingle();

    if (isFree) {
      // Free = delete the tier row entirely (avoids NOT NULL / check constraint issues)
      if (existing) {
        const { error } = await supabase
          .from("subscription_tiers")
          .delete()
          .eq("creator_id", user.id);

        if (error) {
          console.error("[Pricing PATCH] delete error:", error);
          return NextResponse.json({ message: "Failed to save pricing" }, { status: 500 });
        }
      }
      // If no existing row, nothing to do — already free
    } else {
      if (existing) {
        const { error } = await supabase
          .from("subscription_tiers")
          .update({
            price_monthly: monthly_price,
            monthly_price,
            three_month_price: three_month_price ?? null,
            six_month_price: six_month_price ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("creator_id", user.id);

        if (error) {
          console.error("[Pricing PATCH] update error:", error);
          return NextResponse.json({ message: "Failed to update pricing" }, { status: 500 });
        }
      } else {
        const { error } = await supabase
          .from("subscription_tiers")
          .insert({
            creator_id: user.id,
            tier_name: "Basic",
            price_monthly: monthly_price,
            monthly_price,
            three_month_price: three_month_price ?? null,
            six_month_price: six_month_price ?? null,
            is_active: true,
          });

        if (error) {
          console.error("[Pricing PATCH] insert error:", error);
          return NextResponse.json({ message: "Failed to create pricing" }, { status: 500 });
        }
      }
    }

    // Update profiles table so profile page reflects changes immediately
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        subscription_price: isFree ? 0 : monthly_price,
        bundle_price_3_months: isFree ? 0 : (three_month_price ?? 0),
        bundle_price_6_months: isFree ? 0 : (six_month_price ?? 0),
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("[Pricing PATCH] profiles update error:", profileError);
      return NextResponse.json({ message: "Failed to update profile pricing" }, { status: 500 });
    }

    return NextResponse.json({ message: "Pricing saved" });
  } catch (error) {
    console.error("[Pricing PATCH] unhandled error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}