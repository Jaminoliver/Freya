// app/api/vault/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { error } = await supabase
    .from("vault_items")
    .delete()
    .eq("id", itemId)
    .eq("creator_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Touch usage — bumps last_used_at + use_count when item is sent/attached
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  // Read current count, increment, write back
  const { data: existing, error: readErr } = await supabase
    .from("vault_items")
    .select("use_count")
    .eq("id", itemId)
    .eq("creator_id", user.id)
    .single();

  if (readErr || !existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("vault_items")
    .update({
      last_used_at: new Date().toISOString(),
      use_count:    (existing.use_count ?? 0) + 1,
    })
    .eq("id", itemId)
    .eq("creator_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}