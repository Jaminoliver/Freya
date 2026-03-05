import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ gifId: string }> }
) {
  try {
    const { gifId } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceSupabaseClient();
    const { error } = await service
      .from("user_gif_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("gif_id", gifId);

    if (error) return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[GIF Favorites DELETE]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}