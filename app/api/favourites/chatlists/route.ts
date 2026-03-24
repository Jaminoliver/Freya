import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("favourite_chat_lists")
    .select("id, name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ lists: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = (body.name ?? "").trim();

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (name.length > 50) return NextResponse.json({ error: "Name too long (max 50)" }, { status: 400 });

  // Check for duplicate name
  const { data: existing } = await supabase
    .from("favourite_chat_lists")
    .select("id")
    .eq("user_id", user.id)
    .ilike("name", name)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "A list with this name already exists" }, { status: 409 });

  const { data, error } = await supabase
    .from("favourite_chat_lists")
    .insert({ user_id: user.id, name })
    .select("id, name, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ list: data }, { status: 201 });
}