import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceSupabaseClient();
    const { data, error } = await service
      .from("user_gif_favorites")
      .select("gif_id, gif_url, preview_url, title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });

    return NextResponse.json({ favorites: data ?? [] });
  } catch (err) {
    console.error("[GIF Favorites GET]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { gif_id, gif_url, preview_url, title } = await req.json();
    if (!gif_id || !gif_url) return NextResponse.json({ error: "Missing gif_id or gif_url" }, { status: 400 });

    const service = createServiceSupabaseClient();
    const { error } = await service
      .from("user_gif_favorites")
      .upsert({ user_id: user.id, gif_id, gif_url, preview_url, title }, { onConflict: "user_id,gif_id" });

    if (error) return NextResponse.json({ error: "Failed to save favorite" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[GIF Favorites POST]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}