// app/api/vault/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url    = new URL(req.url);
  const type   = url.searchParams.get("type");                  // photo | video | audio | gif | null (all)
  const limit  = Math.min(parseInt(url.searchParams.get("limit") ?? `${PAGE_SIZE}`, 10), 100);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const sort   = url.searchParams.get("sort") === "recent" ? "last_used_at" : "created_at";

  let q = supabase
    .from("vault_items")
    .select("*", { count: "exact" })
    .eq("creator_id", user.id)
    .neq("source_type", "mass_message")
    .order(sort, { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (type && ["photo", "video", "audio", "gif"].includes(type)) {
    q = q.eq("media_type", type);
  }

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items:    data ?? [],
    total:    count ?? 0,
    has_more: (offset + (data?.length ?? 0)) < (count ?? 0),
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    media_type, file_url, thumbnail_url,
    width, height, duration_seconds, file_size_bytes,
    mime_type, bunny_video_id, blur_hash, aspect_ratio,
    source_type, source_id,
  } = body;

  if (!media_type || !file_url) {
    return NextResponse.json({ error: "media_type and file_url are required" }, { status: 400 });
  }
  if (!["photo", "video", "audio", "gif"].includes(media_type)) {
    return NextResponse.json({ error: "Invalid media_type" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("vault_items")
    .insert({
      creator_id:       user.id,
      media_type,
      file_url,
      thumbnail_url:    thumbnail_url    ?? null,
      width:            width            ?? null,
      height:           height           ?? null,
      duration_seconds: duration_seconds ?? null,
      file_size_bytes:  file_size_bytes  ?? null,
      mime_type:        mime_type        ?? null,
      bunny_video_id:   bunny_video_id   ?? null,
      blur_hash:        blur_hash        ?? null,
      aspect_ratio:     aspect_ratio     ?? null,
      source_type:      source_type      ?? "manual",
      source_id:        source_id        ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}