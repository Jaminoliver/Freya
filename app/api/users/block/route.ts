import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

// ─── GET /api/users/block ─────────────────────────────────────────────────
// With ?userId=X  → returns { isBlocked: boolean, blockedByThem: boolean }
// Without param   → returns { blockedUsers: [...] }

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = req.nextUrl.searchParams.get("userId");

    // Single-user check
    if (userId) {
      const serviceClient = createServiceSupabaseClient();
      const [{ data: iBlockedThem }, { data: theyBlockedMe }] = await Promise.all([
        supabase
          .from("blocked_users")
          .select("id")
          .eq("creator_id", user.id)
          .eq("blocked_user_id", userId)
          .maybeSingle(),
        serviceClient
          .from("blocked_users")
          .select("id")
          .eq("creator_id", userId)
          .eq("blocked_user_id", user.id)
          .maybeSingle(),
      ]);
      return NextResponse.json({
        isBlocked:    !!iBlockedThem,
        blockedByThem: !!theyBlockedMe,
      });
    }

    // Full list
    const { data: blockedUsers, error } = await supabase
      .from("blocked_users")
      .select(`
        id,
        blocked_user_id,
        reason,
        created_at,
        blocked_user:profiles!blocked_users_blocked_user_id_fkey (
          id, username, display_name, avatar_url
        )
      `)
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Block GET] Error:", error);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    return NextResponse.json({ blockedUsers: blockedUsers ?? [] });
  } catch (error) {
    console.error("[Block GET] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// ─── POST /api/users/block ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, reason } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("blocked_users")
      .select("id")
      .eq("creator_id", user.id)
      .eq("blocked_user_id", userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: "Already blocked" }, { status: 409 });
    }

    const { error: insertError } = await supabase
      .from("blocked_users")
      .insert({ creator_id: user.id, blocked_user_id: userId, reason: reason ?? null });

    if (insertError) {
      console.error("[Block] Insert error:", insertError);
      return NextResponse.json({ error: "Failed to block user" }, { status: 500 });
    }

    const { data: convo } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(creator_id.eq.${user.id},fan_id.eq.${userId}),and(creator_id.eq.${userId},fan_id.eq.${user.id})`)
      .maybeSingle();

    if (convo) {
      await supabase
        .from("conversations")
        .update({ is_blocked: true, updated_at: new Date().toISOString() })
        .eq("id", convo.id);
    }

    // Block supersedes restrict — remove any existing restriction
    await supabase
      .from("restricted_users")
      .delete()
      .eq("creator_id", user.id)
      .eq("restricted_user_id", userId);

    if (convo) {
      await supabase
        .from("conversations")
        .update({ is_restricted: false })
        .eq("id", convo.id);
    }

    return NextResponse.json({ message: "User blocked" });
  } catch (error) {
    console.error("[Block] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// ─── DELETE /api/users/block ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from("blocked_users")
      .delete()
      .eq("creator_id", user.id)
      .eq("blocked_user_id", userId);

    if (deleteError) {
      console.error("[Unblock] Delete error:", deleteError);
      return NextResponse.json({ error: "Failed to unblock user" }, { status: 500 });
    }

    const { data: convo } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(creator_id.eq.${user.id},fan_id.eq.${userId}),and(creator_id.eq.${userId},fan_id.eq.${user.id})`)
      .maybeSingle();

    if (convo) {
      await supabase
        .from("conversations")
        .update({ is_blocked: false, updated_at: new Date().toISOString() })
        .eq("id", convo.id);
    }

    return NextResponse.json({ message: "User unblocked" });
  } catch (error) {
    console.error("[Unblock] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}