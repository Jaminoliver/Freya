import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [convRes, favsRes, subsRes, fansRes] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, is_archived:conversation_user_settings(is_archived)")
      .or(`creator_id.eq.${user.id},fan_id.eq.${user.id}`),

    supabase
      .from("chatlist_items")
      .select("conversation_id")
      .eq("user_id", user.id),

    supabase
      .from("subscriptions")
      .select("creator_id, profiles!subscriptions_creator_id_fkey(id, username, display_name, avatar_url, is_verified)")
      .eq("fan_id", user.id)
      .eq("status", "active"),

    supabase
      .from("subscriptions")
      .select("fan_id, profiles!subscriptions_fan_id_fkey(id, username, display_name, avatar_url)")
      .eq("creator_id", user.id)
      .eq("status", "active"),
  ]);

  const archivedCount = (convRes.data ?? []).filter((c: any) =>
    c.is_archived?.some?.((s: any) => s.is_archived)
  ).length;

  const favouriteIds = (favsRes.data ?? []).map((f: any) => f.conversation_id);

  const subscriptions = (subsRes.data ?? []).map((s: any) => ({
    creatorId:   s.profiles?.id,
    creatorName: s.profiles?.display_name ?? s.profiles?.username,
    username:    s.profiles?.username,
    avatar_url:  s.profiles?.avatar_url ?? null,
    isVerified:  s.profiles?.is_verified ?? false,
  }));

  const fans = (fansRes.data ?? []).map((f: any) => ({
    id:          f.profiles?.id,
    display_name: f.profiles?.display_name ?? f.profiles?.username,
    username:    f.profiles?.username,
    avatar_url:  f.profiles?.avatar_url ?? null,
  }));

  return NextResponse.json({ archivedCount, favouriteIds, subscriptions, fans });
}