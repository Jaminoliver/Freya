"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Share2, MoreHorizontal } from "lucide-react";
import PostActions from "@/components/profile/PostActions";
import CommentSection from "@/components/profile/CommentSection";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import Lightbox from "@/components/profile/Lightbox";
import PostMediaViewer from "@/components/shared/PostMediaViewer";
import type { NormalizedMedia } from "@/components/shared/PostMediaViewer";
import type { LightboxPost } from "@/components/profile/Lightbox";
import { createClient } from "@/lib/supabase/client";
import { postSyncStore } from "@/lib/store/postSyncStore";
import type { CheckoutType, SubscriptionTier } from "@/lib/types/checkout";
import type { User } from "@/lib/types/profile";

interface ApiComment {
  id: string | number;
  content: string;
  gif_url?: string | null;
  created_at: string;
  like_count: number;
  user_id: string;
  viewer_has_liked?: boolean;
  profiles: { username: string; display_name: string | null; avatar_url: string | null };
}

interface PostData {
  id: number;
  creator_id: string;
  content_type: string;
  caption: string | null;
  is_free: boolean;
  is_ppv: boolean;
  ppv_price: number | null;
  like_count: number;
  comment_count: number;
  published_at: string;
  liked: boolean;
  can_access: boolean;
  locked: boolean;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
    subscription_price: number | null;
  };
  media: {
    id: number;
    media_type: string;
    file_url: string | null;
    thumbnail_url: string | null;
    raw_video_url: string | null;
    bunny_video_id: string | null;
    processing_status: string | null;
    duration_seconds: number | null;
    locked: boolean;
    display_order: number;
  }[];
}

function PostMenu({ isOwnPost, onDelete }: { isOwnPost: boolean; onDelete: () => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const items = isOwnPost
    ? [{ label: "Delete post", danger: true, action: onDelete }]
    : [
        { label: "Report post", danger: true,  action: () => console.log("report") },
        { label: "Share link",  danger: false, action: () => console.log("share") },
      ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: "none", border: "none", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "38px", zIndex: 50, backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "10px", overflow: "hidden", minWidth: "160px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          {items.map((item, i) => (
            <button
              key={item.label}
              onClick={() => { item.action(); setOpen(false); }}
              style={{ width: "100%", padding: "10px 14px", border: "none", backgroundColor: "transparent", color: item.danger ? "#EF4444" : "#C4C4D4", fontSize: "13px", textAlign: "left", cursor: "pointer", fontFamily: "'Inter', sans-serif", borderBottom: i < items.length - 1 ? "1px solid #2A2A3D" : "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SinglePostPage() {
  const rawParams = useParams();
  const router    = useRouter();
  const postId    = rawParams?.postId as string | undefined;

  const [post,        setPost]        = React.useState<PostData | null>(null);
  const [loading,     setLoading]     = React.useState(true);
  const [error,       setError]       = React.useState<string | null>(null);
  const [viewerId,    setViewerId]    = React.useState<string | null>(null);
  const [viewer,      setViewer]      = React.useState<{ username: string; display_name: string; avatar_url: string } | null>(null);
  const [comments,    setComments]    = React.useState<ApiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = React.useState(true);
  const [commentOpen, setCommentOpen] = React.useState(false);
  const [commentCount, setCommentCount] = React.useState(0);

  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [checkoutType, setCheckoutType] = React.useState<CheckoutType>("tips");
  const [checkoutTier, setCheckoutTier] = React.useState<SubscriptionTier>("monthly");

  const [lightboxOpen,     setLightboxOpen]     = React.useState(false);
  const [lightboxMediaIdx, setLightboxMediaIdx] = React.useState(0);

  const isLiking   = React.useRef(false);
  const commentRef = React.useRef<HTMLDivElement>(null);
  const postRef    = React.useRef<PostData | null>(null);
  React.useEffect(() => { postRef.current = post; }, [post]);

  React.useEffect(() => {
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  }, []);

  React.useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setViewerId(user.id);
      const { data } = await supabase.from("profiles").select("username, display_name, avatar_url").eq("id", user.id).single();
      if (data) setViewer({ username: data.username, display_name: data.display_name || data.username, avatar_url: data.avatar_url || "" });
    };
    load();
  }, []);

  React.useEffect(() => {
    if (!postId) return;
    const load = async () => {
      try {
        const res  = await fetch(`/api/posts/${postId}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Post not found"); return; }
        const cached = postSyncStore.get(postId);
        const post   = data.post as PostData;
        if (cached) {
          post.liked         = cached.liked;
          post.like_count    = cached.like_count;
          post.comment_count = cached.comment_count ?? post.comment_count;
        }
        setPost(post);
        setCommentCount(post.comment_count);
      } catch {
        setError("Failed to load post");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [postId]);

  React.useEffect(() => {
    if (!postId) return;
    return postSyncStore.subscribe((event) => {
      if (event.postId !== postId) return;
      setPost((p) =>
        p ? { ...p, liked: event.liked, like_count: event.like_count, comment_count: event.comment_count ?? p.comment_count } : p
      );
      if (event.comment_count !== undefined) setCommentCount(event.comment_count);
    });
  }, [postId]);

  const fetchComments = React.useCallback(async () => {
    if (!postId) return;
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setComments(data.comments || []);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setCommentsLoading(false);
    }
  }, [postId]);

  React.useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleLike = async () => {
    if (!post || isLiking.current) return;
    isLiking.current = true;
    const wasLiked = post.liked;
    setPost((p) => p ? { ...p, liked: !wasLiked, like_count: !wasLiked ? p.like_count + 1 : Math.max(0, p.like_count - 1) } : p);
    const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setPost((p) => {
        if (!p) return p;
        const updated = { ...p, liked: data.liked, like_count: data.like_count };
        postSyncStore.emit({ postId: String(post.id), liked: updated.liked, like_count: updated.like_count, comment_count: commentCount });
        return updated;
      });
    } else {
      setPost((p) => p ? { ...p, liked: wasLiked, like_count: wasLiked ? p.like_count + 1 : Math.max(0, p.like_count - 1) } : p);
    }
    isLiking.current = false;
  };

  const handleDoubleTapLike = async () => {
    if (!post || post.liked || isLiking.current) return;
    isLiking.current = true;
    setPost((p) => p ? { ...p, liked: true, like_count: p.like_count + 1 } : p);
    const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setPost((p) => {
        if (!p) return p;
        const updated = { ...p, liked: data.liked, like_count: data.like_count };
        postSyncStore.emit({ postId: String(post.id), liked: updated.liked, like_count: updated.like_count, comment_count: commentCount });
        return updated;
      });
    } else {
      setPost((p) => p ? { ...p, liked: false, like_count: Math.max(0, p.like_count - 1) } : p);
    }
    isLiking.current = false;
  };

  const handleDelete = async () => {
    if (!post) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) router.back();
  };

  const handleComment = () => {
    setCommentOpen((prev) => !prev);
    setTimeout(() => commentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const handleAddComment = async (
    id: string,
    text: string,
    gif_url?: string,
    parent_comment_id?: string | number,
    reply_to_username?: string | null,
    reply_to_id?: string | number | null
  ) => {
    const res = await fetch(`/api/posts/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content:            text,
        gif_url:            gif_url ?? null,
        parent_comment_id:  parent_comment_id ?? null,
        reply_to_username:  reply_to_username ?? null,
        reply_to_id:        reply_to_id ?? null,
      }),
    });
    if (res.ok) {
      const newCount = commentCount + 1;
      setCommentCount(newCount);
      setPost((p) => p ? { ...p, comment_count: newCount } : p);
      const current = postRef.current;
      if (current) {
        postSyncStore.emit({ postId: String(current.id), liked: current.liked, like_count: current.like_count, comment_count: newCount });
      }
      if (!parent_comment_id) await fetchComments();
    }
  };

  const openTip    = () => { setCheckoutType("tips");        setCheckoutOpen(true); };
  const openUnlock = () => { setCheckoutType("locked_post"); setCheckoutOpen(true); };

  if (!postId) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
        <p style={{ color: "#F1F5F9", fontSize: "18px", fontWeight: 700 }}>Post not found</p>
        <button onClick={() => router.back()} style={{ color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>Go back</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "3px solid #1F1F2A", borderTop: "3px solid #8B5CF6", animation: "spin 0.9s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
        <p style={{ color: "#F1F5F9", fontSize: "18px", fontWeight: 700 }}>Post not found</p>
        <button onClick={() => router.back()} style={{ color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>Go back</button>
      </div>
    );
  }

  const isOwnPost  = viewerId === post.creator_id;
  const photoMedia = post.media?.filter((m) => !m.locked && m.media_type !== "video") ?? [];

  const normalizedMedia: NormalizedMedia[] = post.locked
    ? post.media.slice(0, 1).map((m) => ({
        type:             m.media_type === "video" ? "video" : "image",
        url:              m.file_url,
        bunnyVideoId:     m.bunny_video_id,
        thumbnailUrl:     m.thumbnail_url,
        processingStatus: m.processing_status,
        rawVideoUrl:      m.raw_video_url,
      }))
    : post.media.filter((m) => !m.locked).map((m) => ({
        type:             m.media_type === "video" ? "video" : "image",
        url:              m.file_url,
        bunnyVideoId:     m.bunny_video_id,
        thumbnailUrl:     m.thumbnail_url,
        processingStatus: m.processing_status,
        rawVideoUrl:      m.raw_video_url,
      }));

  const lightboxPost: LightboxPost = {
    id: post.id,
    media: photoMedia.map((m) => ({
      id:                m.id,
      media_type:        m.media_type,
      file_url:          m.file_url,
      thumbnail_url:     m.thumbnail_url,
      raw_video_url:     m.raw_video_url,
      locked:            m.locked,
      display_order:     m.display_order,
      processing_status: m.processing_status,
      bunny_video_id:    m.bunny_video_id,
    })),
  };

  const creatorForCheckout = {
    id: post.creator_id,
    username: post.profiles?.username || "",
    display_name: post.profiles?.display_name || post.profiles?.username || "",
    avatar_url: post.profiles?.avatar_url || "",
    role: "creator",
    subscriptionPrice: post.profiles?.subscription_price ?? 0,
  } as unknown as User;

  return (
    <div style={{ width: "100%", fontFamily: "'Inter', sans-serif" }}>

      {lightboxOpen && lightboxPost.media.length > 0 && (
        <Lightbox
          post={lightboxPost}
          allPosts={[lightboxPost]}
          initialMediaIndex={lightboxMediaIdx}
          onClose={() => setLightboxOpen(false)}
          onNavigate={() => {}}
        />
      )}

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        type={checkoutType}
        creator={creatorForCheckout}
        monthlyPrice={post.profiles?.subscription_price ?? 0}
        initialTier={checkoutTier}
        postPrice={post.ppv_price ? post.ppv_price / 100 : 0}
        onViewContent={() => setCheckoutOpen(false)}
        onGoToSubscriptions={() => router.push("/settings?panel=subscriptions")}
      />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", paddingTop: "calc(16px + env(safe-area-inset-top))", borderBottom: "1px solid #1E1E2E", position: "sticky", top: 0, backgroundColor: "#0D0D16", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#C4C4D4", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 0" }}>
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <span style={{ fontSize: "17px", fontWeight: 800, color: "#F1F5F9", letterSpacing: "0.06em", textTransform: "uppercase" }}>Post</span>
        </div>
        <button
          onClick={() => console.log("share")}
          style={{ background: "none", border: "none", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "8px" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Creator info */}
      <div style={{ margin: "12px 16px 0", backgroundColor: "#13131F", borderRadius: "14px", padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ position: "relative" }}>
              {post.profiles?.avatar_url
                ? <img src={post.profiles.avatar_url} alt="" style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", display: "block" }} />
                : <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#2A2A3D", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "18px", fontWeight: 700, color: "#8B5CF6" }}>{(post.profiles?.display_name || post.profiles?.username || "?").charAt(0).toUpperCase()}</span>
                  </div>
              }
              <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22C55E", border: "2px solid #13131F" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#F1F5F9" }}>{post.profiles?.display_name || post.profiles?.username}</span>
              {post.profiles?.is_verified && <span style={{ fontSize: "14px" }}>✓</span>}
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#8B5CF6", display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: "13px", color: "#6B6B8A" }}>@{post.profiles?.username}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <span style={{ fontSize: "12px", color: "#6B6B8A" }}>
              {new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <PostMenu isOwnPost={isOwnPost} onDelete={handleDelete} />
          </div>
        </div>
        {post.caption && (
          <p style={{ margin: "14px 0 0", fontSize: "14px", color: "#C4C4D4", lineHeight: 1.7 }}>{post.caption}</p>
        )}
      </div>

      {/* Media */}
      <div style={{ marginTop: "12px" }}>
        <PostMediaViewer
          media={normalizedMedia}
          isLocked={post.locked}
          price={post.ppv_price}
          onDoubleTap={handleDoubleTapLike}
          onSingleTap={(index) => { setLightboxMediaIdx(index); setLightboxOpen(true); }}
          onUnlock={openUnlock}
        />
      </div>

      {/* Actions */}
      <div style={{ margin: "0 16px" }}>
        <PostActions
          likes={post.like_count}
          comments={commentCount}
          liked={post.liked}
          isSubscribed={post.can_access}
          isOwnProfile={isOwnPost}
          onLike={handleLike}
          onComment={handleComment}
          onTip={openTip}
          onBookmark={() => console.log("bookmarked")}
        />
      </div>

      {/* Comments */}
      <div ref={commentRef} style={{ margin: "8px 16px 48px" }}>
        <CommentSection
          postId={String(post.id)}
          comments={comments}
          viewer={viewer || { username: "", display_name: "", avatar_url: "" }}
          viewerUserId={viewerId || undefined}
          isOpen={commentOpen}
          isLoading={commentsLoading}
          totalCommentCount={commentCount}
          onClose={() => setCommentOpen(false)}
          onAddComment={handleAddComment}
        />
      </div>
    </div>
  );
}