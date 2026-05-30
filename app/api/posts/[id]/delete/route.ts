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

    const { data: post } = await service
      .from("posts")
      .select("creator_id")
      .eq("id", postId)
      .single();

    if (!post || post.creator_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: mediaFiles } = await service
      .from("media")
      .select("file_url, bunny_video_id")
      .eq("post_id", postId);

    if (mediaFiles && mediaFiles.length > 0) {
      await Promise.allSettled(
        mediaFiles.map(async ({ file_url, bunny_video_id }) => {
          try {
            if (bunny_video_id) {
              await fetch(
                `https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY_ID}/videos/${bunny_video_id}`,
                { method: "DELETE", headers: { AccessKey: process.env.BUNNY_STREAM_API_KEY! } }
              );
            } else if (file_url) {
              const cleanUrl = file_url.split("#")[0];
              const filePath = new URL(cleanUrl).pathname;
              await fetch(
                `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}${filePath}`,
                { method: "DELETE", headers: { AccessKey: process.env.BUNNY_STORAGE_API_KEY! } }
              );
            }
          } catch {}
        })
      );
    }

    // Soft-delete the post — keep media rows so unlockers retain access
    await service
      .from("posts")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", postId);

    await service.rpc("decrement_post_count", { user_id: user.id });

    // ✅ Likes are NOT decremented on delete.
    // profiles.likes_count only changes via like/unlike actions.

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[Delete Post] Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}