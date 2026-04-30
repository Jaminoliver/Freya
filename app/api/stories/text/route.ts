import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/stories/text
// Creates a text-only story — no media upload needed.
export async function POST(req: NextRequest) {
  try {
    const { user, error: authErr } = await getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceSupabaseClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "creator") {
      return NextResponse.json({ error: "Only creators can post stories" }, { status: 403 });
    }

    const body       = await req.json();
    const textContent = (body.textContent as string)?.trim();
    const textBg      = (body.textBg      as string) || "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";
    const ctaType     = (body.ctaType     as string) || null;
    const ctaMessage  = (body.ctaMessage  as string) || null;

    if (!textContent) {
      return NextResponse.json({ error: "Text content is required" }, { status: 400 });
    }
    if (textContent.length > 200) {
      return NextResponse.json({ error: "Text too long (max 200 chars)" }, { status: 400 });
    }
    if (ctaType && !["subscribe", "tip"].includes(ctaType)) {
      return NextResponse.json({ error: "Invalid CTA type" }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: story, error: insertErr } = await supabase
      .from("stories")
      .insert({
        creator_id:      user.id,
        media_type:      "photo",   // viewer treats text stories as photos (no video player)
        media_url:       "",         // no media
        thumbnail_url:   null,
        caption:         null,
        text_content:    textContent,
        text_background: textBg,
        cta_type:        ctaType    ?? null,
        cta_message:     ctaMessage ?? null,
        expires_at:      expiresAt,
        is_expired:      false,
        is_processing:   false,
      })
      .select("id")
      .single();

    if (insertErr || !story) {
      console.error("[POST /api/stories/text] insert error:", insertErr);
      return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
    }

    return NextResponse.json({ storyId: story.id }, { status: 201 });

  } catch (err) {
    console.error("[POST /api/stories/text] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}