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

// Touch usage — atomically bumps last_used_at + use_count when item is sent/attached.
// Requires this function in Supabase:
//
//   create or replace function increment_vault_use(item_id bigint, owner_id uuid)
//   returns setof vault_items as $$
//     update vault_items
//     set use_count = coalesce(use_count, 0) + 1,
//         last_used_at = now()
//     where id = item_id and creator_id = owner_id
//     returning *;
//   $$ language sql;
//
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

  // Single atomic DB call — eliminates the read-then-write race condition
  const { data, error } = await supabase.rpc("increment_vault_use", {
    item_id:  itemId,
    owner_id: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ item: data[0] });
}