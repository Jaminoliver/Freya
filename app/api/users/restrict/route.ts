import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

// ─── GET /api/users/restrict ──────────────────────────────────────────────
// With ?userId=X  → returns { isRestricted: boolean, restrictedByThem: boolean }
// Without param   → returns { restrictedUsers: [...] }

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
      const [{ data: iRestrictedThem }, { data: theyRestrictedMe }] = await Promise.all([
        supabase
          .from("restricted_users")
          .select("id")
          .eq("creator_id", user.id)
          .eq("restricted_user_id", userId)
          .maybeSingle(),
        serviceClient
          .from("restricted_users")
          .select("id")
          .eq("creator_id", userId)
          .eq("restricted_user_id", user.id)
          .maybeSingle(),
      ]);
      return NextResponse.json({
        isRestricted:    !!iRestrictedThem,
        restrictedByThem: !!theyRestrictedMe,
      });
    }

    // Full list
    const { data: restrictedUsers, error } = await supabase
      .from("restricted_users")
      .select(`
        id,
        restricted_user_id,
        reason,
        created_at,
        restricted_user:profiles!restricted_users_restricted_user_id_fkey (
          id, username, display_name, avatar_url
        )
      `)
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Restrict GET] Error:", error);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    return NextResponse.json({ restrictedUsers: restrictedUsers ?? [] });
  } catch (error) {
    console.error("[Restrict GET] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// ─── POST /api/users/restrict ────────────────────────────────────────────────
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
      return NextResponse.json({ error: "Cannot restrict yourself" }, { status: 400 });
    }

    const { data: blocked } = await supabase
      .from("blocked_users")
      .select("id")
      .eq("creator_id", user.id)
      .eq("blocked_user_id", userId)
      .maybeSingle();

    if (blocked) {
      return NextResponse.json({ error: "User is already blocked. Unblock first to restrict instead." }, { status: 409 });
    }

    const { data: existing } = await supabase
      .from("restricted_users")
      .select("id")
      .eq("creator_id", user.id)
      .eq("restricted_user_id", userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: "Already restricted" }, { status: 409 });
    }

    const { error: insertError } = await supabase
      .from("restricted_users")
      .insert({ creator_id: user.id, restricted_user_id: userId, reason: reason ?? null });

    if (insertError) {
      console.error("[Restrict] Insert error:", insertError);
      return NextResponse.json({ error: "Failed to restrict user" }, { status: 500 });
    }

    const { data: convo } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(creator_id.eq.${user.id},fan_id.eq.${userId}),and(creator_id.eq.${userId},fan_id.eq.${user.id})`)
      .maybeSingle();

    if (convo) {
      await supabase
        .from("conversations")
        .update({ is_restricted: true, updated_at: new Date().toISOString() })
        .eq("id", convo.id);
    }

    return NextResponse.json({ message: "User restricted" });
  } catch (error) {
    console.error("[Restrict] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// ─── DELETE /api/users/restrict ──────────────────────────────────────────────
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
      .from("restricted_users")
      .delete()
      .eq("creator_id", user.id)
      .eq("restricted_user_id", userId);

    if (deleteError) {
      console.error("[Unrestrict] Delete error:", deleteError);
      return NextResponse.json({ error: "Failed to unrestrict user" }, { status: 500 });
    }

    const { data: convo } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(creator_id.eq.${user.id},fan_id.eq.${userId}),and(creator_id.eq.${userId},fan_id.eq.${user.id})`)
      .maybeSingle();

    if (convo) {
      await supabase
        .from("conversations")
        .update({ is_restricted: false, updated_at: new Date().toISOString() })
        .eq("id", convo.id);
    }

    return NextResponse.json({ message: "User unrestricted" });
  } catch (error) {
    console.error("[Unrestrict] Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}