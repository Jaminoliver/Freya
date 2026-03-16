import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { reportedUserId, reportedPostId, reportedCommentId, reportType, reportReason } = body;

  if (!reportType || !reportReason) {
    return NextResponse.json({ error: "reportType and reportReason are required" }, { status: 400 });
  }

  const validTypes = ["spam", "harassment", "illegal_content", "copyright", "underage", "other"];
  if (!validTypes.includes(reportType)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }

  if (!reportedUserId && !reportedPostId && !reportedCommentId) {
    return NextResponse.json({ error: "At least one of reportedUserId, reportedPostId, or reportedCommentId is required" }, { status: 400 });
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id:         user.id,
    reported_user_id:    reportedUserId    ?? null,
    reported_post_id:    reportedPostId    ?? null,
    reported_comment_id: reportedCommentId ?? null,
    report_type:         reportType,
    report_reason:       reportReason,
    status:              "pending",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}