// app/api/mass-messages/audience-count/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { resolveAudience, type AudienceSegment, type CustomAudienceFilter } from "@/lib/mass-message/audienceResolver";

const VALID_SEGMENTS = [
  "all_subscribers", "active_subscribers", "expired_subscribers",
  "online_now", "top_spenders", "new_this_week", "followers", "custom",
];

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    audience_segment,
    custom_filter,
  }: {
    audience_segment: AudienceSegment;
    custom_filter?: CustomAudienceFilter;
  } = body;

  if (!audience_segment || (!VALID_SEGMENTS.includes(audience_segment) && !audience_segment.startsWith("fan_list:"))) {
    return NextResponse.json({ error: "Invalid audience_segment" }, { status: 400 });
  }

  const service = createServiceSupabaseClient();
  const result  = await resolveAudience(service, user.id, audience_segment, {
    customFilter: custom_filter,
  });

  return NextResponse.json({ count: result.count, matched: result.matched, excluded: result.excluded });
}