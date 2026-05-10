import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listId = parseInt(id, 10);
  if (isNaN(listId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const service = createServiceSupabaseClient();

  const { data: list } = await service
    .from("fan_lists")
    .select("creator_id")
    .eq("id", listId)
    .single();

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (list.creator_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await service.from("fan_lists").delete().eq("id", listId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}