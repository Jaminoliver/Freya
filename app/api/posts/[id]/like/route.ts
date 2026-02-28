import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }   = await params;
    const postId   = Number(id);
    if (isNaN(postId)) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceSupabaseClient();

    // Check if already liked
    const { data: existing, error: existingError } = await service
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();
    if (existingError) console.error("[Like] Check existing error:", existingError);

    // Get current like_count
    const { data: post, error: postError } = await service
      .from("posts")
      .select("like_count")
      .eq("id", postId)
      .single();
    if (postError) console.error("[Like] Fetch post error:", postError);

    const currentCount = post?.like_count ?? 0;
    console.log("[Like] State:", { postId, userId: user.id, existing, currentCount });

    if (existing) {
      const { error: deleteError } = await service.from("likes").delete().eq("id", existing.id);
      if (deleteError) console.error("[Like] Delete error:", deleteError);

      const { error: updateError } = await service
        .from("posts")
        .update({ like_count: Math.max(0, currentCount - 1) })
        .eq("id", postId);
      if (updateError) console.error("[Like] Decrement update error:", updateError);
    } else {
      const { error: insertError } = await service
        .from("likes")
        .insert({ user_id: user.id, post_id: postId });
      if (insertError) console.error("[Like] Insert error:", insertError);

      const { error: updateError } = await service
        .from("posts")
        .update({ like_count: currentCount + 1 })
        .eq("id", postId);
      if (updateError) console.error("[Like] Increment update error:", updateError);
    }

    // Fetch final count
    const { data: updated, error: finalError } = await service
      .from("posts")
      .select("like_count")
      .eq("id", postId)
      .single();
    if (finalError) console.error("[Like] Final fetch error:", finalError);

    console.log("[Like] Done:", { postId, liked: !existing, like_count: updated?.like_count });

    return NextResponse.json({
      liked:      !existing,
      like_count: updated?.like_count ?? 0,
    });

  } catch (err) {
    console.error("[Like Post] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}