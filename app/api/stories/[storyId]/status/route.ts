import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId: storyIdParam } = await params;
  const storyId = Number(storyIdParam);

  if (isNaN(storyId)) {
    return NextResponse.json({ error: "Invalid story ID" }, { status: 400 });
  }

  const { user, error: authError } = await getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("stories")
    .select("id, is_processing")
    .eq("id", storyId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  return NextResponse.json({ id: data.id, isProcessing: data.is_processing });
}