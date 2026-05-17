import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    if (isNaN(postId)) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });

    const { user } = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceSupabaseClient();

    const { data: post } = await service
      .from("posts")
      .select("creator_id")
      .eq("id", postId)
      .single();

    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (post.creator_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: tips, error } = await service
      .from("tips")
      .select(`
        id,
        amount,
        created_at,
        tipper_id,
        profiles!tipper_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Post Tips] Query error:", error.message);
      return NextResponse.json({ error: "Failed to fetch tips" }, { status: 500 });
    }

    if (!tips || tips.length === 0) {
      return NextResponse.json({ tippers: [], total_kobo: 0 });
    }

    const tipperIds = [...new Set(tips.map((t: any) => t.tipper_id))];

    const { data: subs } = await service
      .from("subscriptions")
      .select("fan_id")
      .eq("creator_id", user.id)
      .eq("status", "active")
      .in("fan_id", tipperIds);

    const subscribedSet = new Set((subs ?? []).map((s: any) => s.fan_id));
    const totalKobo = tips.reduce((sum: number, t: any) => sum + (t.amount ?? 0), 0);

    const tippers = tips.map((t: any) => ({
      id:            t.tipper_id,
      username:      t.profiles?.username      ?? "",
      display_name:  t.profiles?.display_name  || t.profiles?.username || "",
      avatar_url:    t.profiles?.avatar_url    ?? null,
      amount:        t.amount,
      tipped_at:     t.created_at,
      is_subscribed: subscribedSet.has(t.tipper_id),
    }));

    return NextResponse.json({ tippers, total_kobo: totalKobo });
  } catch (err) {
    console.error("[Post Tips] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}