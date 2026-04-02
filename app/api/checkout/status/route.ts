// app/api/checkout/status/route.ts
// Polls transaction status by reference — used by bank transfer inline flow

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const reference = req.nextUrl.searchParams.get("reference");
    if (!reference) {
      return NextResponse.json({ message: "reference is required" }, { status: 400 });
    }

    const { data: tx } = await supabase
      .from("transactions")
      .select("status")
      .eq("provider_txn_id", reference)
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      confirmed: tx?.status === "confirmed",
      status: tx?.status ?? "not_found",
    });
  } catch (error) {
    console.error("[Checkout Status Error]", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}