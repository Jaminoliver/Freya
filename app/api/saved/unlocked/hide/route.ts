// app/api/saved/unlocked/hide/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface HideItem {
  source:    "post" | "message";
  unlock_id: number;
}

// PATCH /api/saved/unlocked/hide
// Body: { items: [{ source: "post" | "message", unlock_id: number }, ...], hidden: boolean }
// Toggles is_hidden on one or many unlock rows, scoped to the current user.
export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.items) || typeof body.hidden !== "boolean") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const items: HideItem[] = body.items;
  const hidden: boolean   = body.hidden;

  const postIds: number[] = [];
  const msgIds:  number[] = [];

  for (const it of items) {
    if (!it || typeof it.unlock_id !== "number") continue;
    if (it.source === "post")    postIds.push(it.unlock_id);
    if (it.source === "message") msgIds.push(it.unlock_id);
  }

  if (postIds.length === 0 && msgIds.length === 0) {
    return NextResponse.json({ error: "No valid items" }, { status: 400 });
  }

  const tasks: PromiseLike<any>[] = [];

  if (postIds.length > 0) {
    tasks.push(
      supabase
        .from("ppv_unlocks")
        .update({ is_hidden: hidden })
        .eq("fan_id", user.id)
        .in("id", postIds)
    );
  }

  if (msgIds.length > 0) {
    tasks.push(
      supabase
        .from("ppv_message_unlocks")
        .update({ is_hidden: hidden })
        .eq("fan_id", user.id)
        .in("id", msgIds)
    );
  }

  console.log("[PATCH /hide] items:", items, "hidden:", hidden, "postIds:", postIds, "msgIds:", msgIds);
  const results = await Promise.all(tasks);

  for (const r of results) {
    if (r.error) {
      console.error("[PATCH /api/saved/unlocked/hide] error:", r.error);
      return NextResponse.json({ error: r.error.message }, { status: 500 });
    }
  }

  console.log("[PATCH /hide] success, updated postIds:", postIds, "msgIds:", msgIds, "to is_hidden:", hidden);
  console.log("[PATCH /hide] success, updated postIds:", postIds, "msgIds:", msgIds, "to is_hidden:", hidden);
  return NextResponse.json({ success: true });
}