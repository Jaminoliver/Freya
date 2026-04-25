"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { FeedSkeleton } from "@/components/loadscreen/FeedSkeleton";
import { postSyncStore } from "@/lib/store/postSyncStore";
import { useAppStore } from "@/lib/store/appStore";
import type { ApiPost } from "@/components/profile/PostRow";
import type { CheckoutType } from "@/lib/types/checkout";
import type { User } from "@/lib/types/profile";

const PostRow      = dynamic(() => import("@/components/profile/PostRow"), { ssr: false });
const CheckoutModal = dynamic(() => import("@/components/checkout/CheckoutModal"), { ssr: false });

interface SavedPostFeedProps {
  postIds:  string[];
  onUnsave: (ids: string[]) => void;
}

export default function SavedPostFeed({ postIds, onUnsave }: SavedPostFeedProps) {
  const router = useRouter();
  const { viewer: globalViewer } = useAppStore();

  const viewer = globalViewer
    ? { id: globalViewer.id, username: globalViewer.username, display_name: globalViewer.display_name, avatar_url: globalViewer.avatar_url ?? "" }
    : null;

  const [posts,   setPosts]   = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [checkoutOpen,    setCheckoutOpen]    = useState(false);
  const [checkoutType,    setCheckoutType]    = useState<CheckoutType>("subscription");
  const [checkoutCreator, setCheckoutCreator] = useState<User | null>(null);
  const [lockedPostId,    setLockedPostId]    = useState<number | undefined>(undefined);
  const [lockedPostPrice, setLockedPostPrice] = useState(0);
  const [monthlyPrice,    setMonthlyPrice]    = useState(0);

  useEffect(() => {
    if (!postIds.length) { setLoading(false); return; }

    const fetchAll = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled(
          postIds.map((id) => fetch(`/api/posts/${id}`).then((r) => r.json()))
        );
        const fetched: ApiPost[] = [];
        for (const result of results) {
          if (result.status === "fulfilled" && result.value?.post) {
            const p = result.value.post;
            const cached = postSyncStore.get(String(p.id));
            if (cached) {
              p.liked         = cached.liked;
              p.like_count    = cached.like_count;
              p.comment_count = cached.comment_count ?? p.comment_count;
            }
            // Map to ApiPost shape
            fetched.push({
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
            });
          }
        }
        // Preserve original saved order
        const orderMap = new Map(postIds.map((id, i) => [Number(id), i]));
        fetched.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
        setPosts(fetched);
      } catch (err) {
        console.error("[SavedPostFeed] fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [postIds]);

  // Sync postSyncStore updates
  useEffect(() => {
    return postSyncStore.subscribe((event) => {
      setPosts((prev) =>
        prev.map((p) =>
          String(p.id) === event.postId
            ? { ...p, liked: event.liked, like_count: event.like_count, comment_count: event.comment_count ?? p.comment_count }
            : p
        )
      );
    });
  }, []);

  const handleUnlock = useCallback((id: string) => {
    const post = posts.find((p) => String(p.id) === id);
    if (!post) return;
    const creator: User = {
      id:               post.profiles.id,
      username:         post.profiles.username,
      display_name:     post.profiles.display_name || post.profiles.username,
      avatar_url:       post.profiles.avatar_url || "",
      role:             "creator",
      subscriptionPrice: post.profiles.subscription_price ?? 0,
    } as User;
    setCheckoutCreator(creator);
    setMonthlyPrice(post.profiles.subscription_price ?? 0);
    if (post.is_ppv) {
      setLockedPostId(post.id);
      setLockedPostPrice((post.ppv_price ?? 0) / 100);
      setCheckoutType("ppv");
    } else {
      setCheckoutType("subscription");
    }
    setCheckoutOpen(true);
  }, [posts]);

  const handleViewContent = useCallback(async (postId?: number) => {
    setCheckoutOpen(false);
    if (!postId) return;
    // Refresh the unlocked post
    try {
      const res  = await fetch(`/api/posts/${postId}`);
      const data = await res.json();
      if (res.ok && data.post) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, locked: false, can_access: true, media: data.post.media }
              : p
          )
        );
      }
    } catch {}
  }, []);

  const handleDeletePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => String(p.id) !== id));
    onUnsave([id]);
  }, [onUnsave]);

  if (loading) return <FeedSkeleton count={3} />;

  if (!posts.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: "12px" }}>
        <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#C4C4D4", fontFamily: "'Inter', sans-serif" }}>No posts to show</p>
      </div>
    );
  }

  return (
    <>
      {checkoutCreator && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          type={checkoutType}
          creator={checkoutCreator}
          monthlyPrice={monthlyPrice}
          postPrice={lockedPostPrice}
          postId={lockedPostId}
          onViewContent={() => handleViewContent(lockedPostId)}
          onGoToSubscriptions={() => { setCheckoutOpen(false); router.push("/settings?panel=subscriptions"); }}
        />
      )}

      {posts.map((post) => (
        <div key={post.id} style={{ margin: "10px 12px", borderRadius: "14px", border: "1px solid #1E1E2E", overflow: "hidden" }}>
          <PostRow
            post={post}
            isOwnProfile={false}
            isSubscribed={post.can_access}
            viewer={viewer}
            onUnlock={handleUnlock}
            onDelete={handleDeletePost}
          />
        </div>
      ))}
    </>
  );
}