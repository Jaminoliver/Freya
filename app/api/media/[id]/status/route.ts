import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = createServiceSupabaseClient();

    const { data, error } = await service
      .from("media")
      .select("processing_status")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ status: "unknown" }, { status: 404 });
    }

    return NextResponse.json({ status: data.processing_status });

  } catch (err) {
    return NextResponse.json({ status: "unknown" }, { status: 500 });
  }
}