"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Share2, MoreHorizontal } from "lucide-react";
import VideoPlayer, { getBunnyThumbnail } from "@/components/video/VideoPlayer";
import PostActions from "@/components/profile/PostActions";
import { Lock } from "lucide-react";
import CommentSection from "@/components/profile/CommentSection";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import ImageCarousel from "@/components/profile/ImageCarousel";
import Lightbox from "@/components/profile/Lightbox";
import DoubleTapLike from "@/components/shared/DoubleTapLike";
import type { LightboxPost } from "@/components/profile/Lightbox";
import { createClient } from "@/lib/supabase/client";
import { postSyncStore } from "@/lib/store/postSyncStore";
import type { CheckoutType, SubscriptionTier } from "@/lib/types/checkout";
import type { User } from "@/lib/types/profile";

interface ApiComment {
  id: string | number;
  content: string;
  created_at: string;
  like_count: number;
  user_id: string;
  viewer_has_liked?: boolean;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
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
  const [commentOpen, setCommentOpen] = React.useState(false);

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
        postSyncStore.emit({ postId: String(post.id), liked: updated.liked, like_count: updated.like_count, comment_count: updated.comment_count });
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
        postSyncStore.emit({ postId: String(post.id), liked: updated.liked, like_count: updated.like_count, comment_count: updated.comment_count });
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

  const handleAddComment = async (id: string, text: string) => {
    const res = await fetch(`/api/posts/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    if (res.ok) {
      setPost((p) => p ? { ...p, comment_count: p.comment_count + 1 } : p);
      await fetchComments();
      const current = postRef.current;
      if (current) {
        postSyncStore.emit({ postId: String(current.id), liked: current.liked, like_count: current.like_count, comment_count: current.comment_count });
      }
    }
  };

  const openLightbox = (index: number) => {
    setLightboxMediaIdx(index);
    setLightboxOpen(true);
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

  const isOwnPost    = viewerId === post.creator_id;
  const isSubscribed = post.can_access;
  const firstMedia   = post.media?.[0];
  const isVideo      = firstMedia?.media_type === "video";
  const photoMedia   = post.media?.filter((m) => !m.locked && m.media_type !== "video") ?? [];
  const isMultiPhoto = !isVideo && photoMedia.length > 1;

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

  const carouselMedia = photoMedia.map((m) => ({
    id:                m.id,
    media_type:        m.media_type,
    file_url:          m.file_url,
    thumbnail_url:     m.thumbnail_url,
    raw_video_url:     m.raw_video_url,
    locked:            m.locked,
    display_order:     m.display_order,
    processing_status: m.processing_status,
    bunny_video_id:    m.bunny_video_id,
  }));

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

      {/* Lightbox */}
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
        <button onClick={() => console.log("share")} style={{ background: "none", border: "none", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "8px" }}
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
      {firstMedia && (
        post.locked ? (
          <div style={{ position: "relative", overflow: "hidden", margin: "12px 0 0" }}>
            {(() => {
              const lockedThumb = firstMedia.media_type === "video" && firstMedia.bunny_video_id
                ? getBunnyThumbnail(firstMedia.bunny_video_id)
                : (firstMedia.thumbnail_url || null);
              return lockedThumb ? (
                <img src={lockedThumb} alt="" style={{ width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", filter: "blur(16px)", transform: "scale(1.05)", display: "block" }} />
              ) : null;
            })()}
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(10,10,15,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", minHeight: "280px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(139,92,246,0.2)", border: "1.5px solid #8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lock size={18} color="#8B5CF6" />
              </div>
              <button onClick={openUnlock} style={{ padding: "8px 20px", borderRadius: "8px", backgroundColor: "#8B5CF6", border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                {post.ppv_price ? `Unlock for ₦${(post.ppv_price / 100).toLocaleString("en-NG")}` : "Subscribe to unlock"}
              </button>
            </div>
          </div>

        ) : isVideo ? (
          <DoubleTapLike onDoubleTap={handleDoubleTapLike} style={{ width: "100%", marginTop: "12px" }}>
            <div style={{ aspectRatio: "9/16", maxHeight: "67vh", overflow: "hidden", position: "relative", backgroundColor: "#000", width: "100%" }}>
              <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "28px", backgroundImage: `url(${firstMedia.bunny_video_id ? getBunnyThumbnail(firstMedia.bunny_video_id) : (firstMedia.thumbnail_url || "")})`, backgroundSize: "cover", backgroundPosition: "left center", filter: "blur(14px)", transform: "scaleX(1.3)", opacity: 0.7 }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "28px", backgroundImage: `url(${firstMedia.bunny_video_id ? getBunnyThumbnail(firstMedia.bunny_video_id) : (firstMedia.thumbnail_url || "")})`, backgroundSize: "cover", backgroundPosition: "right center", filter: "blur(14px)", transform: "scaleX(1.3)", opacity: 0.7 }} />
              <div style={{ position: "absolute", inset: "0 28px", zIndex: 1 }}>
                <VideoPlayer bunnyVideoId={firstMedia.bunny_video_id ?? null} thumbnailUrl={firstMedia.thumbnail_url ?? null} processingStatus={firstMedia.processing_status ?? null} rawVideoUrl={firstMedia.raw_video_url ?? null} fillParent={true} />
              </div>
            </div>
          </DoubleTapLike>

        ) : isMultiPhoto ? (
          <DoubleTapLike onDoubleTap={handleDoubleTapLike} style={{ width: "100%", marginTop: "12px" }}>
            <ImageCarousel
              media={carouselMedia}
              onImageClick={(index) => openLightbox(index)}
            />
          </DoubleTapLike>

        ) : (
          <DoubleTapLike
            onSingleTap={() => openLightbox(0)}
            onDoubleTap={handleDoubleTapLike}
            style={{ width: "100%", marginTop: "12px", cursor: "zoom-in" }}
          >
            <div style={{ overflow: "hidden", position: "relative", backgroundColor: "#000" }}>
              {firstMedia.file_url && (
                <>
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "80px", backgroundImage: `url(${firstMedia.file_url})`, backgroundSize: "cover", backgroundPosition: "left center", filter: "blur(16px) brightness(0.7)", transform: "scaleX(1.3)", opacity: 0.9 }} />
                  <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "80px", backgroundImage: `url(${firstMedia.file_url})`, backgroundSize: "cover", backgroundPosition: "right center", filter: "blur(16px) brightness(0.7)", transform: "scaleX(1.3)", opacity: 0.9 }} />
                  <img src={firstMedia.file_url} alt="" style={{ position: "relative", zIndex: 1, width: "100%", height: "auto", maxHeight: "clamp(400px, 85vh, 680px)", objectFit: "contain", display: "block" }} />
                </>
              )}
            </div>
          </DoubleTapLike>
        )
      )}

      {/* Actions */}
      <div style={{ margin: "0 16px" }}>
        <PostActions
          likes={post.like_count}
          comments={post.comment_count}
          liked={post.liked}
          isSubscribed={isSubscribed}
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
          onClose={() => setCommentOpen(false)}
          onAddComment={handleAddComment}
        />
      </div>
    </div>
  );
}