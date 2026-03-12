import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/stories/complete
// Body: { storyId: number }
// NOTE: is_processing stays true here — it is flipped to false only by the
// Bunny webhook (/api/webhooks/bunny-story) when transcoding finishes.
export async function POST(req: NextRequest) {
  try {
    const { user, error: authErr } = await getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceSupabaseClient();
    const body     = await req.json();
    const storyId  = Number(body.storyId);

    if (!storyId || isNaN(storyId)) {
      return NextResponse.json({ error: "Invalid storyId" }, { status: 400 });
    }

    const { data: story } = await supabase
      .from("stories")
      .select("id, creator_id")
      .eq("id", storyId)
      .single();

    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
    if (story.creator_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[POST /api/stories/complete] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}