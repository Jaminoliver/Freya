import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const username = req.nextUrl.searchParams.get("username")?.toLowerCase().trim();

    if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

    // Validate format: 3-30 chars, alphanumeric + underscore only
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json({
        available: false,
        reason: "Username must be 3–30 characters. Letters, numbers, and underscores only.",
      });
    }

    const service = createServiceSupabaseClient();
    const { data, error } = await service
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      console.error("[check-username]", error.message);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    // If found and it's the current user's own username — still available (no change)
    if (data && data.id === user.id) {
      return NextResponse.json({ available: true, own: true });
    }

    if (data) {
      // Generate suggestions
      const suggestions = [
        `${username}_`,
        `${username}1`,
        `the_${username}`,
      ];
      return NextResponse.json({ available: false, reason: "Username not available", suggestions });
    }

    return NextResponse.json({ available: true });
  } catch (err) {
    console.error("[check-username] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}