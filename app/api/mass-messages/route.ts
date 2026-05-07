// app/api/mass-messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { resolveAudience, type AudienceSegment } from "@/lib/mass-message/audienceResolver";

const VALID_SEGMENTS: AudienceSegment[] = [
  "all_subscribers", "active_subscribers", "expired_subscribers",
  "online_now", "top_spenders", "new_this_week", "followers",
];

// ── GET — list creator's mass messages ───────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url    = new URL(req.url);
  const status = url.searchParams.get("status"); // 'scheduled' | 'sent' | etc.
  const limit  = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  let q = supabase
    .from("mass_messages")
    .select("*, mass_message_media(vault_item_id, display_order)", { count: "exact" })
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) q = q.eq("status", status);

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items:    data ?? [],
    total:    count ?? 0,
    has_more: (offset + (data?.length ?? 0)) < (count ?? 0),
  });
}

// ── POST — create draft / scheduled mass message ─────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify creator role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "creator") {
    return NextResponse.json({ error: "Creators only" }, { status: 403 });
  }

  const body = await req.json();
  const {
    text,
    ppv_price_kobo,
    audience_segment,
    exclude_active_chatters = true,
    scheduled_for,
    vault_item_ids = [],
  }: {
    text?: string;
    ppv_price_kobo?: number;
    audience_segment: AudienceSegment;
    exclude_active_chatters?: boolean;
    scheduled_for?: string;
    vault_item_ids?: number[];
  } = body;

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!audience_segment || !VALID_SEGMENTS.includes(audience_segment)) {
    return NextResponse.json({ error: "Invalid audience_segment" }, { status: 400 });
  }
  if (!text?.trim() && (!vault_item_ids || vault_item_ids.length === 0)) {
    return NextResponse.json({ error: "Message must have text or media" }, { status: 400 });
  }
  if (ppv_price_kobo != null) {
    if (typeof ppv_price_kobo !== "number" || ppv_price_kobo <= 0) {
      return NextResponse.json({ error: "Invalid PPV price" }, { status: 400 });
    }
    if (!vault_item_ids || vault_item_ids.length === 0) {
      return NextResponse.json({ error: "PPV requires media" }, { status: 400 });
    }
  }

  let scheduledISO: string | null = null;
  if (scheduled_for) {
    const t = new Date(scheduled_for).getTime();
    if (isNaN(t) || t <= Date.now()) {
      return NextResponse.json({ error: "Schedule time must be in the future" }, { status: 400 });
    }
    scheduledISO = new Date(t).toISOString();
  }

  const service = createServiceSupabaseClient();

  // ── Verify vault items belong to creator (if any) ──────────────────────────
  if (vault_item_ids.length > 0) {
    const { data: owned } = await service
      .from("vault_items")
      .select("id")
      .eq("creator_id", user.id)
      .in("id", vault_item_ids);
    const ownedIds = new Set((owned ?? []).map((v: any) => Number(v.id)));
    const invalid  = vault_item_ids.filter((id) => !ownedIds.has(Number(id)));
    if (invalid.length > 0) {
      return NextResponse.json({ error: "One or more vault items are invalid" }, { status: 400 });
    }
  }

  // ── Resolve audience ───────────────────────────────────────────────────────
  const audience = await resolveAudience(service, user.id, audience_segment, {
    excludeActiveChatters: exclude_active_chatters,
  });

  if (audience.count === 0) {
    return NextResponse.json({ error: "Audience is empty — adjust your segment" }, { status: 400 });
  }

  // ── Create mass_messages row ───────────────────────────────────────────────
  const status = scheduledISO ? "scheduled" : "sending";
  const { data: mm, error: mmErr } = await service
    .from("mass_messages")
    .insert({
      creator_id:              user.id,
      text:                    text?.trim() || null,
      ppv_price_kobo:          ppv_price_kobo ?? null,
      audience_segment,
      exclude_active_chatters,
      scheduled_for:           scheduledISO,
      total_recipients:        audience.count,
      status,
    })
    .select()
    .single();

  if (mmErr || !mm) {
    return NextResponse.json({ error: mmErr?.message ?? "Failed to create mass message" }, { status: 500 });
  }

  // ── Insert media links ─────────────────────────────────────────────────────
  if (vault_item_ids.length > 0) {
    const mediaRows = vault_item_ids.map((vid, idx) => ({
      mass_message_id: mm.id,
      vault_item_id:   vid,
      display_order:   idx,
    }));
    const { error: mediaErr } = await service.from("mass_message_media").insert(mediaRows);
    if (mediaErr) {
      // Rollback: delete the mass_message row to keep state clean
      await service.from("mass_messages").delete().eq("id", mm.id);
      return NextResponse.json({ error: "Failed to attach media" }, { status: 500 });
    }
  }

  // ── Insert pending recipient rows in batches ───────────────────────────────
  const BATCH = 500;
  for (let i = 0; i < audience.fan_ids.length; i += BATCH) {
    const slice = audience.fan_ids.slice(i, i + BATCH).map((fid) => ({
      mass_message_id: mm.id,
      fan_id:          fid,
      status:          "pending",
    }));
    const { error: rErr } = await service.from("mass_message_recipients").insert(slice);
    if (rErr) {
      console.error("[mass-messages POST] recipient insert error:", rErr.message);
      // Continue — we'll have partial recipients, but mass message is created
    }
  }

  // ── Trigger send worker if not scheduled ───────────────────────────────────
  if (!scheduledISO) {
    // Fire-and-forget — actual send runs in background
    void fetch(`${req.nextUrl.origin}/api/mass-messages/${mm.id}/send`, {
      method:  "POST",
      headers: { cookie: req.headers.get("cookie") ?? "" },
    }).catch((err) => console.error("[mass-messages POST] trigger send error:", err));
  }

  return NextResponse.json({
    mass_message: mm,
    recipients:   audience.count,
  });
}