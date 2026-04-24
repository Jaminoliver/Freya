"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Share2, MoreHorizontal } from "lucide-react";
import PostActions from "@/components/profile/PostActions";
import PostHeader from "@/components/shared/PostHeader";
import CommentSection from "@/components/profile/CommentSection";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import Lightbox from "@/components/profile/Lightbox";
import PostMediaViewer from "@/components/shared/PostMediaViewer";
import PostTextViewer from "@/components/shared/PostTextViewer";
import { PollDisplay } from "@/components/feed/PollDisplay";
import type { PollData } from "@/components/feed/PollDisplay";
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
  id:              number;
  creator_id:      string;
  content_type:    string;
  caption:         string | null;
  text_background?: string | null;
  is_free:         boolean;
  is_ppv:          boolean;
  ppv_price:       number | null;
  like_count:      number;
  comment_count:   number;
  published_at:    string;
  liked:           boolean;
  can_access:      boolean;
  locked:          boolean;
  poll_data:       PollData | null;
  profiles: {
    username:           string;
    display_name:       string | null;
    avatar_url:         string | null;
    is_verified:        boolean;
    subscription_price: number | null;
  };
  media: {
    id:                number;
    media_type:        string;
    file_url:          string | null;
    thumbnail_url:     string | null;
    raw_video_url:     string | null;
    bunny_video_id:    string | null;
    processing_status: string | null;
    duration_seconds:  number | null;
    locked:            boolean;
    display_order:     number;
    blur_hash?:        string | null;
    width?:            number | null;
    height?:           number | null;
  }[];
}

function PostMenu({ isOwnPost, onDelete }: { isOwnPost: boolean; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", color: "#E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "38px", zIndex: 50, backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "10px", overflow: "hidden", minWidth: "160px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          {items.map((item, i) => (
            <button key={item.label} onClick={() => { item.action(); setOpen(false); }} style={{ width: "100%", padding: "10px 14px", border: "none", backgroundColor: "transparent", color: item.danger ? "#EF4444" : "#C4C4D4", fontSize: "13px", textAlign: "left", cursor: "pointer", fontFamily: "'Inter', sans-serif", borderBottom: i < items.length - 1 ? "1px solid #2A2A3D" : "none" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SinglePostPage() {
  const rawParams    = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const postId       = rawParams?.postId as string | undefined;
  const fromSaved    = searchParams?.get("from") === "saved";

  const [post,            setPost]            = useState<PostData | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [viewerId,        setViewerId]        = useState<string | null>(null);
  const [viewer,          setViewer]          = useState<{ username: string; display_name: string; avatar_url: string } | null>(null);
  const [comments,        setComments]        = useState<ApiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentOpen,     setCommentOpen]     = useState(false);
  const [commentCount,    setCommentCount]    = useState(0);
  const [savedPost,       setSavedPost]       = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutType, setCheckoutType] = useState<CheckoutType>("tips");
  const [checkoutTier, setCheckoutTier] = useState<SubscriptionTier>("monthly");

  const [lightboxOpen,     setLightboxOpen]     = useState(false);
  const [lightboxMediaIdx, setLightboxMediaIdx] = useState(0);

  const isLiking   = useRef(false);
  const commentRef = useRef<HTMLDivElement>(null);
  const postRef    = useRef<PostData | null>(null);
  useEffect(() => { postRef.current = post; }, [post]);

  useEffect(() => {
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  }, []);

  useEffect(() => {
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

  const loadPost = useCallback(async () => {
    if (!postId) return;
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
  }, [postId]);

  useEffect(() => { loadPost(); }, [loadPost]);

  useEffect(() => {
    if (!postId || !post) return;
    fetch(`/api/saved/posts?post_id=${postId}`)
      .then((r) => r.json())
      .then((d) => { if (d) setSavedPost(d.saved ?? false); })
      .catch(() => {});
  }, [postId, post?.id]);

  useEffect(() => {
    if (!postId) return;
    return postSyncStore.subscribe((event) => {
      if (event.postId !== postId) return;
      setPost((p) => p ? { ...p, liked: event.liked, like_count: event.like_count, comment_count: event.comment_count ?? p.comment_count } : p);
      if (event.comment_count !== undefined) setCommentCount(event.comment_count);
    });
  }, [postId]);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    if (post?.content_type === "poll") { setCommentsLoading(false); return; }
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

  useEffect(() => { fetchComments(); }, [fetchComments]);

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
    id: string, text: string, gif_url?: string,
    parent_comment_id?: string | number,
    reply_to_username?: string | null,
    reply_to_id?: string | number | null
  ) => {
    const res = await fetch(`/api/posts/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, gif_url: gif_url ?? null, parent_comment_id: parent_comment_id ?? null, reply_to_username: reply_to_username ?? null, reply_to_id: reply_to_id ?? null }),
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

  const handleBookmark = useCallback(async () => {
    if (!post) return;
    const next = !savedPost;
    setSavedPost(next);
    try {
      await fetch("/api/saved/posts", { method: next ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: post.id }) });
    } catch { setSavedPost(!next); }
  }, [savedPost, post]);

  const openTip    = () => { setCheckoutType("tips");        setCheckoutOpen(true); };
  const openUnlock = () => { setCheckoutType("locked_post"); setCheckoutOpen(true); };

  const handleViewContent = useCallback(async () => {
    setCheckoutOpen(false);
    await loadPost();
  }, [loadPost]);

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
  const isTextPost = post.content_type === "text";
  const photoMedia = post.media?.filter((m) => !m.locked && m.media_type !== "video") ?? [];

  const normalizedMedia: NormalizedMedia[] = post.locked
    ? post.media.slice(0, 1).map((m) => ({ type: m.media_type === "video" ? "video" : "image", url: m.file_url, bunnyVideoId: m.bunny_video_id, thumbnailUrl: m.thumbnail_url, processingStatus: m.processing_status, rawVideoUrl: m.raw_video_url, blurHash: m.blur_hash ?? null, width: m.width ?? null, height: m.height ?? null }))
    : post.media.filter((m) => !m.locked).map((m) => ({ type: m.media_type === "video" ? "video" : "image", url: m.file_url, bunnyVideoId: m.bunny_video_id, thumbnailUrl: m.thumbnail_url, processingStatus: m.processing_status, rawVideoUrl: m.raw_video_url, blurHash: m.blur_hash ?? null, width: m.width ?? null, height: m.height ?? null }));

  const lightboxPost: LightboxPost = {
    id: post.id,
    media: photoMedia.map((m) => ({ id: m.id, media_type: m.media_type, file_url: m.file_url, thumbnail_url: m.thumbnail_url, raw_video_url: m.raw_video_url, locked: m.locked, display_order: m.display_order, processing_status: m.processing_status, bunny_video_id: m.bunny_video_id })),
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
        <Lightbox post={lightboxPost} allPosts={[lightboxPost]} initialMediaIndex={lightboxMediaIdx} onClose={() => setLightboxOpen(false)} onNavigate={() => {}} />
      )}

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        type={checkoutType}
        creator={creatorForCheckout}
        monthlyPrice={post.profiles?.subscription_price ?? 0}
        initialTier={checkoutTier}
        postPrice={post.ppv_price ? post.ppv_price / 100 : 0}
        postId={post.id}
        onViewContent={handleViewContent}
        onGoToSubscriptions={() => router.push("/settings?panel=subscriptions")}
      />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", paddingTop: "env(safe-area-inset-top)", height: "56px", borderBottom: "1px solid #1E1E2E", position: "sticky", top: 0, backgroundColor: "#0A0A0F", zIndex: 10, boxSizing: "content-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => fromSaved ? router.push("/saved") : router.back()} style={{ background: "none", border: "none", color: "#A3A3C2", cursor: "pointer", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")} onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}>
            <ArrowLeft size={20} strokeWidth={1.8} />
          </button>
          <span style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px", fontFamily: "'Inter', sans-serif" }}>Post</span>
        </div>
        <button onClick={() => console.log("share")} style={{ background: "none", border: "none", color: "#A3A3C2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", borderRadius: "8px" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")} onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}>
          <Share2 size={18} strokeWidth={1.8} />
        </button>
      </div>

      <PostHeader
        avatarUrl={post.profiles?.avatar_url ?? null}
        displayName={post.profiles?.display_name || post.profiles?.username || ""}
        username={post.profiles?.username || ""}
        isVerified={!!post.profiles?.is_verified}
        timestamp={new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        rightSlot={<PostMenu isOwnPost={isOwnPost} onDelete={handleDelete} />}
      />

      {post.caption && !isTextPost && (
        <p style={{ margin: "0", fontSize: "14px", color: "#FFFFFF", lineHeight: 1.7, padding: "0 16px 10px", whiteSpace: "pre-wrap" }}>{post.caption}</p>
      )}

      {/* Text post viewer — outside the card, full bleed style */}
      {isTextPost && post.caption && (
        <div style={{ margin: "12px 0 0" }}>
          <PostTextViewer caption={post.caption} textBackground={post.text_background} />
        </div>
      )}

      {/* Poll */}
      {post.poll_data && (
        <div style={{ margin: "12px 16px 0", backgroundColor: "#13131F", borderRadius: "14px" }}>
          <PollDisplay poll={post.poll_data} postId={String(post.id)} isCreator={isOwnPost} onVoted={(updated) => setPost((p) => p ? { ...p, poll_data: updated } : p)} />
        </div>
      )}

      {/* Media */}
      {normalizedMedia.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <PostMediaViewer media={normalizedMedia} isLocked={post.locked} price={post.ppv_price} isPPV={post.is_ppv} isFreeSubscription={(post.profiles?.subscription_price ?? 0) === 0} isUnlockedPPV={post.is_ppv && !post.locked} onDoubleTap={handleDoubleTapLike} onSingleTap={(index) => { setLightboxMediaIdx(index); setLightboxOpen(true); }} onUnlock={openUnlock} />
        </div>
      )}

      {/* Actions */}
      {!post.locked && (
        <div style={{ margin: "0 16px" }}>
          <PostActions likes={post.like_count} comments={commentCount} liked={post.liked} bookmarked={savedPost} isSubscribed={post.can_access} isOwnProfile={isOwnPost} onLike={handleLike} onComment={handleComment} onTip={openTip} onBookmark={handleBookmark} />
        </div>
      )}

      {/* Comments */}
      {!post.locked && (
        <div ref={commentRef} style={{ margin: "8px 16px 48px" }}>
          <CommentSection postId={String(post.id)} comments={comments} viewer={viewer || { username: "", display_name: "", avatar_url: "" }} viewerUserId={viewerId || undefined} isOpen={commentOpen} isLoading={commentsLoading} totalCommentCount={commentCount} onClose={() => setCommentOpen(false)} onAddComment={handleAddComment} />
        </div>
      )}
    </div>
  );
}