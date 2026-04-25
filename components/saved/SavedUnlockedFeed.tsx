"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { FeedSkeleton } from "@/components/loadscreen/FeedSkeleton";
import { useAppStore } from "@/lib/store/appStore";
import type { ApiPost } from "@/components/profile/PostRow";
import type { UnlockedItem } from "@/components/saved/SavedUnlockedGrid";

const PostRow = dynamic(() => import("@/components/profile/PostRow"), { ssr: false });

interface SavedUnlockedFeedProps {
  items: UnlockedItem[];
}

export default function SavedUnlockedFeed({ items }: SavedUnlockedFeedProps) {
  const router = useRouter();
  const { viewer: globalViewer } = useAppStore();

  const viewer = globalViewer
    ? { id: globalViewer.id, username: globalViewer.username, display_name: globalViewer.display_name, avatar_url: globalViewer.avatar_url ?? "" }
    : null;

  const [adapted, setAdapted] = useState<{ key: string; post: ApiPost; source: "post" | "message" }[]>([]);
  const [loading, setLoading] = useState(true);

  // Stable list keyed off unlock ids — prevents refetch when nothing meaningful changed
  const unlockKey = useMemo(
    () => items.map((i) => `${i.source}:${i.unlock_id}`).join(","),
    [items]
  );

  useEffect(() => {
    if (!items.length) { setAdapted([]); setLoading(false); return; }

    const fetchAll = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled(
          items.map((it) => {
            const url = it.source === "message"
              ? `/api/messages/ppv/${it.id}`
              : `/api/posts/${it.id}`;
            return fetch(url).then((r) => r.json()).then((data) => ({ it, data }));
          })
        );

        const fetched: { key: string; post: ApiPost; source: "post" | "message" }[] = [];

        for (const result of results) {
          if (result.status !== "fulfilled") continue;
          const { it, data } = result.value;

          if (it.source === "message") {
            if (!data?.message) continue;
            const m = data.message;
            const firstMediaType = m.media?.[0]?.media_type ?? "image";
            const adaptedPost: ApiPost = {
              id:              m.id,
              content_type:    firstMediaType === "video" ? "video" : "image",
              caption:         m.content ?? null,
              text_background: null,
              is_free:         false,
              is_ppv:          true,
              ppv_price:       m.ppv_price ?? 0,
              like_count:      0,
              comment_count:   0,
              published_at:    m.created_at,
              liked:           false,
              can_access:      true,
              locked:          false,
              audience:        "subscribers",
              poll:            null,
              saved_post:      true,
              profiles: {
                id:                 m.sender_id,
                username:           m.profiles?.username ?? "",
                display_name:       m.profiles?.display_name ?? null,
                avatar_url:         m.profiles?.avatar_url ?? null,
                is_verified:        !!m.profiles?.is_verified,
                subscription_price: null,
              },
              media: (m.media ?? []).map((mm: any) => ({
                id:                mm.id,
                media_type:        mm.media_type,
                file_url:          mm.file_url,
                thumbnail_url:     mm.thumbnail_url,
                raw_video_url:     mm.raw_video_url,
                locked:            false,
                display_order:     mm.display_order,
                processing_status: mm.processing_status,
                bunny_video_id:    mm.bunny_video_id,
                blur_hash:         mm.blur_hash ?? null,
                width:             mm.width ?? null,
                height:            mm.height ?? null,
                aspect_ratio:      null,
              })),
            } as ApiPost;
            fetched.push({ key: `message:${it.unlock_id}`, post: adaptedPost, source: "message" });
          } else {
            if (!data?.post) continue;
            const p = data.post;
            const adaptedPost: ApiPost = {
              id:              p.id,
              content_type:    p.content_type,
              caption:         p.caption,
              text_background: p.text_background,
              is_free:         p.is_free,
              is_ppv:          p.is_ppv,
              ppv_price:       p.ppv_price,
              like_count:      p.like_count,
              comment_count:   p.comment_count,
              published_at:    p.published_at,
              liked:           p.liked,
              can_access:      p.can_access,
              locked:          p.locked,
              audience:        p.audience ?? (p.is_free ? "everyone" : "subscribers"),
              poll:            p.poll_data ?? null,
              saved_post:      true,
              profiles: {
                id:                 p.creator_id,
                username:           p.profiles?.username ?? "",
                display_name:       p.profiles?.display_name ?? null,
                avatar_url:         p.profiles?.avatar_url ?? null,
                is_verified:        p.profiles?.is_verified ?? false,
                subscription_price: p.profiles?.subscription_price ?? null,
              },
              media: (p.media ?? []).map((m: any) => ({
                id:                m.id,
                media_type:        m.media_type,
                file_url:          m.file_url,
                thumbnail_url:     m.thumbnail_url,
                raw_video_url:     m.raw_video_url,
                locked:            m.locked,
                display_order:     m.display_order,
                processing_status: m.processing_status,
                bunny_video_id:    m.bunny_video_id,
                blur_hash:         m.blur_hash ?? null,
                width:             m.width ?? null,
                height:            m.height ?? null,
                aspect_ratio:      m.aspect_ratio ?? null,
              })),
            } as ApiPost;
            fetched.push({ key: `post:${it.unlock_id}`, post: adaptedPost, source: "post" });
          }
        }

        // Preserve order from items (newest unlock first)
        const orderMap = new Map(items.map((i, idx) => [`${i.source}:${i.unlock_id}`, idx]));
        fetched.sort((a, b) => (orderMap.get(a.key) ?? 0) - (orderMap.get(b.key) ?? 0));

        setAdapted(fetched);
      } catch (err) {
        console.error("[SavedUnlockedFeed] fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockKey]);

  if (loading) return <FeedSkeleton count={3} />;

  if (!adapted.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: "12px" }}>
        <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#C4C4D4", fontFamily: "'Inter', sans-serif" }}>No unlocked content to show</p>
      </div>
    );
  }

  return (
    <>
      {adapted.map(({ key, post, source }) => (
        <div
          key={key}
          onClick={() => {
            if (source === "message") {
              router.push(`/posts/${post.id}?source=message&from=saved`);
            } else {
              router.push(`/posts/${post.id}?from=saved`);
            }
          }}
          style={{ margin: "10px 12px", borderRadius: "14px", border: "1px solid #1E1E2E", overflow: "hidden", cursor: "pointer" }}
        >
          <PostRow
            post={post}
            isOwnProfile={false}
            isSubscribed={true}
            viewer={viewer}
            onUnlock={() => {}}
            onDelete={() => {}}
          />
        </div>
      ))}
    </>
  );
}