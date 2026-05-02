import { NextRequest, NextResponse } from "next/server";
import { getUser, createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  uploadPhotoToBunny,
  createBunnyStoryVideo,
  uploadBunnyStoryVideo,
  getBunnyStoryStreamUrls,
} from "@/lib/utils/bunny";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 300;

// GET /api/stories
export async function GET(req: NextRequest) {
  try {
    const t0 = Date.now();
    const { user, error: authErr } = await getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.log(`[stories] auth: ${Date.now() - t0}ms`);

    const supabase = createServiceSupabaseClient();

    const t1 = Date.now();
    const [{ data: viewerProfile }, { data: subs }] = await Promise.all([
      supabase.from("profiles").select("id, role").eq("id", user.id).single(),
      supabase.from("subscriptions").select("creator_id").eq("fan_id", user.id).eq("status", "active"),
    ]);
    console.log(`[stories] profile+subs: ${Date.now() - t1}ms`);

    if (!viewerProfile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const now            = new Date().toISOString();
    const subscribedIds  = (subs ?? []).map((s: any) => s.creator_id);
    const creatorIds     = [...new Set([
      ...(viewerProfile.role === "creator" ? [viewerProfile.id] : []),
      ...subscribedIds,
    ])];

    if (creatorIds.length === 0) return NextResponse.json({ groups: [] });

    const t2 = Date.now();
    let query = supabase
      .from("stories")
      .select("id, creator_id, media_type, media_url, thumbnail_url, caption, duration_seconds, view_count, cta_type, cta_message, cta_position_y, text_content, text_background, created_at, expires_at, is_processing, display_order, is_muted")
      .in("creator_id", creatorIds)
      .eq("is_expired", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: true });

    if (viewerProfile.role !== "creator") {
      query = query.eq("is_processing", false);
    }

    const { data: stories, error: storiesErr } = await query;
    console.log(`[stories] stories query: ${Date.now() - t2}ms | count: ${stories?.length ?? 0}`);

    if (storiesErr) {
      console.error("[GET /api/stories] stories error:", storiesErr);
      return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
    }

    if (!stories || stories.length === 0) return NextResponse.json({ groups: [] });

    const uniqueCreatorIds = [...new Set(stories.map((s: any) => s.creator_id))];
    const storyIds         = stories.map((s: any) => s.id);

    const t3 = Date.now();
    const [{ data: profiles }, { data: views }] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, avatar_url, subscription_price, bundle_price_3_months, bundle_price_6_months").in("id", uniqueCreatorIds),
      supabase.from("story_views").select("story_id").eq("user_id", user.id).in("story_id", storyIds),
    ]);
    console.log(`[stories] profiles+views: ${Date.now() - t3}ms`);
    console.log(`[stories] TOTAL: ${Date.now() - t0}ms`);

    const profileMap: Record<string, any> = {};
    for (const p of profiles ?? []) profileMap[p.id] = p;

    const viewedSet = new Set((views ?? []).map((v: any) => v.story_id));

    const groupMap: Record<string, any> = {};
    for (const story of stories as any[]) {
      const cId = story.creator_id;
      if (!groupMap[cId]) {
        const profile = profileMap[cId] ?? {};
        groupMap[cId] = {
          creatorId:         cId,
          username:          profile.username               ?? "unknown",
          displayName:       profile.display_name           ?? profile.username ?? "unknown",
          avatarUrl:         profile.avatar_url             ?? null,
          subscriptionPrice: profile.subscription_price     ?? 0,
          threeMonthPrice:   profile.bundle_price_3_months  ?? undefined,
          sixMonthPrice:     profile.bundle_price_6_months  ?? undefined,
          hasUnviewed:       false,
          latestStoryAt:     null,
          latestThumbnail:   null,
          items:             [],
        };
      }

      const isViewed = viewedSet.has(story.id);
      if (!isViewed) groupMap[cId].hasUnviewed = true;

      // Track the newest story timestamp (stories are ordered asc, so last wins)
      groupMap[cId].latestStoryAt = story.created_at;

      // Always overwrite so the most recent story's thumbnail wins
      const thumb = story.thumbnail_url ?? (story.media_type === "photo" ? story.media_url : null);
      if (thumb) groupMap[cId].latestThumbnail = thumb;

      groupMap[cId].items.push({
        id:           story.id,
        mediaUrl:     story.media_url,
        mediaType:    story.media_type,
        thumbnailUrl: story.thumbnail_url ?? null,
        caption:      story.caption       ?? null,
        createdAt:    story.created_at,
        expiresAt:    story.expires_at,
        viewed:       isViewed,
        isProcessing: story.is_processing ?? false,
        viewCount:    story.view_count    ?? 0,
        ctaType:      story.cta_type      ?? null,
        ctaMessage:      story.cta_message    ?? null,
        ctaPositionY:    story.cta_position_y ?? 0.75,
        textContent:     story.text_content   ?? null,
        textBackground:  story.text_background ?? null,
        displayOrder:    story.display_order   ?? 0,
        isMuted:         story.is_muted        ?? false,
      });
    }

    // Split into unviewed / viewed buckets, each sorted by latestStoryAt desc (most recent first)
    for (const group of Object.values(groupMap) as any[]) {
      group.items.sort((a: any, b: any) => a.displayOrder - b.displayOrder);
    }
    const allGroups = Object.values(groupMap) as any[];
    const unviewed  = allGroups.filter((g) =>  g.hasUnviewed).sort((a, b) => b.latestStoryAt.localeCompare(a.latestStoryAt));
    const viewed    = allGroups.filter((g) => !g.hasUnviewed).sort((a, b) => b.latestStoryAt.localeCompare(a.latestStoryAt));
    const groups    = [...unviewed, ...viewed];

    return NextResponse.json({ groups });

  } catch (err) {
    console.error("[GET /api/stories] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/stories
export async function POST(req: NextRequest) {
  try {
    const { user, error: authErr } = await getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceSupabaseClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "creator") {
      return NextResponse.json({ error: "Only creators can post stories" }, { status: 403 });
    }

    const formData  = await req.formData();
    const file      = formData.get("file")       as File   | null;
    const mediaType = (formData.get("mediaType") as string) ?? "photo";
    const caption   = (formData.get("caption")   as string) ?? null;
    const clipStart = parseFloat((formData.get("clipStart") as string) ?? "0") || 0;
    const clipEnd   = parseFloat((formData.get("clipEnd")   as string) ?? "0") || 0;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!["photo", "video"].includes(mediaType)) {
      return NextResponse.json({ error: "Invalid mediaType" }, { status: 400 });
    }

    const MAX_IMAGE = 50 * 1024 * 1024;
    if (mediaType === "photo" && file.size > MAX_IMAGE) {
      return NextResponse.json({ error: "Image too large (max 50MB)" }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: placeholder, error: placeholderErr } = await supabase
      .from("stories")
      .insert({
        creator_id:    user.id,
        media_type:    mediaType,
        media_url:     "",
        thumbnail_url: null,
        caption:       caption || null,
        clip_start:    clipStart > 0 ? clipStart : null,
        clip_end:      clipEnd   > 0 ? clipEnd   : null,
        expires_at:    expiresAt,
        is_expired:    false,
        is_processing: true,
      })
      .select("id")
      .single();

    if (placeholderErr || !placeholder) {
      console.error("[POST /api/stories] placeholder insert error:", placeholderErr);
      return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
    }

    const storyId = placeholder.id;
    const buffer  = Buffer.from(await file.arrayBuffer());

    let mediaUrl     = "";
    let thumbnailUrl: string | null = null;

    try {
      if (mediaType === "photo") {
        const { url } = await uploadPhotoToBunny(buffer, user.id, file.name, file.type);
        mediaUrl = url;
      } else {
        const videoId = await createBunnyStoryVideo(`story-${user.id}-${Date.now()}`);
        await uploadBunnyStoryVideo(buffer, videoId);
        const { hlsUrl, thumbnailUrl: thumb } = getBunnyStoryStreamUrls(videoId);
        mediaUrl     = hlsUrl;
        thumbnailUrl = thumb;
      }
    } catch (uploadErr) {
      await supabase.from("stories").delete().eq("id", storyId);
      console.error("[POST /api/stories] bunny upload error:", uploadErr);
      return NextResponse.json({ error: "Media upload failed" }, { status: 500 });
    }

    const { data: finalStory, error: updateErr } = await supabase
      .from("stories")
      .update({ media_url: mediaUrl, thumbnail_url: thumbnailUrl, is_processing: false })
      .eq("id", storyId)
      .select("id, media_url, thumbnail_url, media_type, caption, created_at, expires_at")
      .single();

    if (updateErr) {
      console.error("[POST /api/stories] update error:", updateErr);
      return NextResponse.json({ error: "Failed to finalise story" }, { status: 500 });
    }

    return NextResponse.json({ story: finalStory }, { status: 201 });

  } catch (err) {
    console.error("[POST /api/stories] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}