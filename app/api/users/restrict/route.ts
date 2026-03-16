import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("restricted_users")
    .select(`
      id,
      restricted_user_id,
      reason,
      created_at,
      restricted_user:profiles!restricted_users_restricted_user_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ restrictedUsers: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { userId, reason } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  if (userId === user.id) {
    return NextResponse.json({ error: "Cannot restrict yourself" }, { status: 400 });
  }

  const { error } = await supabase
    .from("restricted_users")
    .upsert(
      { creator_id: user.id, restricted_user_id: userId, reason: reason ?? null },
      { onConflict: "creator_id,restricted_user_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mark conversation as restricted
  await supabase
    .from("conversations")
    .update({ is_restricted: true })
    .or(
      `and(creator_id.eq.${user.id},fan_id.eq.${userId}),and(creator_id.eq.${userId},fan_id.eq.${user.id})`
    );

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("restricted_users")
    .delete()
    .eq("creator_id", user.id)
    .eq("restricted_user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Remove restriction from conversation
  await supabase
    .from("conversations")
    .update({ is_restricted: false })
    .or(
      `and(creator_id.eq.${user.id},fan_id.eq.${userId}),and(creator_id.eq.${userId},fan_id.eq.${user.id})`
    );

  return NextResponse.json({ success: true });
}