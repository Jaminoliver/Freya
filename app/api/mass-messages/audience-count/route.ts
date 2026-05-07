// app/api/mass-messages/audience-count/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { resolveAudience, type AudienceSegment } from "@/lib/mass-message/audienceResolver";

const VALID_SEGMENTS: AudienceSegment[] = [
  "all_subscribers", "active_subscribers", "expired_subscribers",
  "online_now", "top_spenders", "new_this_week", "followers",
];

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    audience_segment,
    exclude_active_chatters = true,
  }: {
    audience_segment: AudienceSegment;
    exclude_active_chatters?: boolean;
  } = body;

  if (!audience_segment || !VALID_SEGMENTS.includes(audience_segment)) {
    return NextResponse.json({ error: "Invalid audience_segment" }, { status: 400 });
  }

  const service = createServiceSupabaseClient();
  const result  = await resolveAudience(service, user.id, audience_segment, {
    excludeActiveChatters: exclude_active_chatters,
  });

  return NextResponse.json({ count: result.count });
}