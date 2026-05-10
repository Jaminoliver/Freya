import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from("fan_lists")
    .select("id, name, created_at, fan_list_members(fan_id)")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lists = (data ?? []).map((l: any) => ({
    id:          l.id,
    name:        l.name,
    created_at:  l.created_at,
    member_count: (l.fan_list_members ?? []).length,
    fan_ids:     (l.fan_list_members ?? []).map((m: any) => m.fan_id),
  }));

  return NextResponse.json({ lists });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, fan_ids }: { name: string; fan_ids: string[] } = await req.json();

  if (!name?.trim())        return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!fan_ids?.length)     return NextResponse.json({ error: "Select at least one fan" }, { status: 400 });

  const service = createServiceSupabaseClient();

  const { data: list, error: listErr } = await service
    .from("fan_lists")
    .insert({ creator_id: user.id, name: name.trim() })
    .select()
    .single();

  if (listErr || !list) return NextResponse.json({ error: listErr?.message ?? "Failed to create list" }, { status: 500 });

  const members = fan_ids.map((fan_id) => ({ list_id: list.id, fan_id }));
  const { error: membersErr } = await service.from("fan_list_members").insert(members);

  if (membersErr) {
    await service.from("fan_lists").delete().eq("id", list.id);
    return NextResponse.json({ error: "Failed to add members" }, { status: 500 });
  }

  return NextResponse.json({ list: { ...list, member_count: fan_ids.length, fan_ids } }, { status: 201 });
}