"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { SinglePostSkeleton } from "@/components/loadscreen/SinglePostSkeleton";
import { useAppStore } from "@/lib/store/appStore";
import { useCreatorStory } from "@/lib/hooks/useCreatorStory";
import StoryViewer from "@/components/story/StoryViewer";
import { postSyncStore } from "@/lib/store/postSyncStore";
import type { CheckoutType, SubscriptionTier } from "@/lib/types/checkout";
import type { User } from "@/lib/types/profile";
import PostOptionsSheet from "@/components/feed/PostOptionsSheet";
import CreatorPostOptionsSheet from "@/components/profile/PostOptionsSheet";
import EditCaptionModal from "@/components/profile/EditCaptionModal";
import EditPPVModal from "@/components/profile/EditPPVModal";

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
  is_deleted?:     boolean;
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

interface PostViewProps {
  postId:          string;
  sourceIsMessage: boolean;
  onBack:          () => void;
  scrollRef?:      React.RefObject<HTMLDivElement | null>;
}

export default function PostView({ postId, sourceIsMessage, onBack, scrollRef }: PostViewProps) {
  const router = useRouter();

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
  const [sheetOpen,        setSheetOpen]        = useState(false);
  const [creatorSheetOpen, setCreatorSheetOpen] = useState(false);
  const [editCaptionOpen,  setEditCaptionOpen]  = useState(false);
  const [editPPVOpen,      setEditPPVOpen]      = useState(false);

  const { viewer: globalViewer } = useAppStore();
  const { group: storyGroup, hasStory, hasUnviewed, refresh: refreshStory } = useCreatorStory(post?.creator_id);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const isLiking   = useRef(false);
  const commentRef = useRef<HTMLDivElement>(null);
  const postRef    = useRef<PostData | null>(null);
  useEffect(() => { postRef.current = post; }, [post]);

  useEffect(() => {
    if (scrollRef?.current) {
      scrollRef.current.scrollTop = 0;
    } else {
      const main = document.querySelector("main");
      if (main) main.scrollTop = 0;
    }
  }, []);

  useEffect(() => {
    if (!globalViewer) return;
    setViewerId(globalViewer.id);
    setViewer({ username: globalViewer.username, display_name: globalViewer.display_name || globalViewer.username, avatar_url: globalViewer.avatar_url || "" });
  }, [globalViewer]);

  const loadPost = useCallback(async () => {
    if (!postId) return;
    try {
      const url = sourceIsMessage
        ? `/api/messages/ppv/${postId}`
        : `/api/posts/${postId}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (sourceIsMessage ? "Message not found" : "Post not found"));
        return;
      }

      let nextPost: PostData;

      if (sourceIsMessage) {
        const m = data.message;
        const firstMediaType = m.media?.[0]?.media_type ?? "image";
        nextPost = {
          id:              m.id,
          creator_id:      m.sender_id,
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
          poll_data:       null,
          is_deleted:      !!m.is_deleted,
          profiles: {
            username:           m.profiles?.username ?? "",
            display_name:       m.profiles?.display_name ?? null,
            avatar_url:         m.profiles?.avatar_url ?? null,
            is_verified:        !!m.profiles?.is_verified,
            subscription_price: null,
          },
          media: m.media ?? [],
        };
      } else {
        const cached = postSyncStore.get(postId);
        nextPost = data.post as PostData;
        if (cached) {
          nextPost.liked         = cached.liked;
          nextPost.like_count    = cached.like_count;
          nextPost.comment_count = cached.comment_count ?? nextPost.comment_count;
        }
      }

      setPost(nextPost);
      setCommentCount(nextPost.comment_count);
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [postId, sourceIsMessage]);

  useEffect(() => { loadPost(); }, [loadPost]);

  useEffect(() => {
    if (!postId || sourceIsMessage) return;
    fetch(`/api/saved/posts?post_id=${postId}`)
      .then((r) => r.json())
      .then((d) => { if (d) setSavedPost(d.saved ?? false); })
      .catch(() => {});
  }, [postId, sourceIsMessage]);

  useEffect(() => {
    if (!postId || sourceIsMessage) return;
    return postSyncStore.subscribe((event) => {
      if (event.postId !== postId) return;
      setPost((p) => p ? { ...p, liked: event.liked, like_count: event.like_count, comment_count: event.comment_count ?? p.comment_count } : p);
      if (event.comment_count !== undefined) setCommentCount(event.comment_count);
    });
  }, [postId, sourceIsMessage]);

  const fetchComments = useCallback(async () => {
    if (!postId || sourceIsMessage) { setCommentsLoading(false); return; }
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
  }, [postId, sourceIsMessage]);

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
    if (sourceIsMessage) return;
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
    const res = await fetch(`/api/posts/${post.id}/delete`, { method: "POST" });
    if (!res.ok) throw new Error("Failed");
    onBack();
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
    if (!post || sourceIsMessage) return;
    const next = !savedPost;
    setSavedPost(next);
    try {
      await fetch("/api/saved/posts", { method: next ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: post.id }) });
    } catch { setSavedPost(!next); }
  }, [savedPost, post, sourceIsMessage]);

  const openTip    = () => { setCheckoutType("tips"); setCheckoutOpen(true); };
  const openUnlock = () => { setCheckoutType(post?.is_ppv ? "ppv" : "subscription"); setCheckoutOpen(true); };

  const handleViewContent = useCallback(async () => {
    setCheckoutOpen(false);
    await loadPost();
  }, [loadPost]);

  if (loading) return <SinglePostSkeleton />;

  if (error || !post) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
        <p style={{ color: "#F1F5F9", fontSize: "18px", fontWeight: 700 }}>{sourceIsMessage ? "Message not found" : "Post not found"}</p>
        <button onClick={onBack} style={{ color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>Go back</button>
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
    <div style={{ width: "100%", fontFamily: "'Inter', sans-serif", minHeight: "100%" }}>

      {storyViewerOpen && storyGroup && (
        <StoryViewer groups={[storyGroup]} startGroupIndex={0} onClose={() => { setStoryViewerOpen(false); refreshStory(); }} />
      )}

      {lightboxOpen && lightboxPost.media.length > 0 && (
        <Lightbox post={lightboxPost} allPosts={[lightboxPost]} initialMediaIndex={lightboxMediaIdx} onClose={() => setLightboxOpen(false)} onNavigate={() => {}} />
      )}

      {!sourceIsMessage && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          type={checkoutType}
          creator={creatorForCheckout}
          monthlyPrice={post.profiles?.subscription_price ?? 0}
          initialTier={checkoutTier}
          postPrice={post.ppv_price ? post.ppv_price / 100 : 0}
          postId={post.id}
          autoCloseOnSuccess={checkoutType === "ppv" || checkoutType === "tips"}
          onSuccess={checkoutType === "ppv" ? loadPost : undefined}
          onViewContent={handleViewContent}
          onGoToSubscriptions={() => router.push("/settings?panel=subscriptions")}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", paddingTop: "env(safe-area-inset-top)", height: "56px", borderBottom: "1px solid #1E1E2E", position: "sticky", top: 0, backgroundColor: "#0A0A0F", zIndex: 10, boxSizing: "content-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => { console.log("[PostView] back button clicked, calling onBack"); onBack(); }} style={{ background: "none", border: "none", color: "#A3A3C2", cursor: "pointer", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")} onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}>
            <ArrowLeft size={20} strokeWidth={1.8} />
          </button>
          <span style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px", fontFamily: "'Inter', sans-serif" }}>
            {sourceIsMessage ? "Message" : "Post"}
          </span>
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
        hasStory={hasStory}
        hasUnviewedStory={hasUnviewed}
        onAvatarClick={() => { if (hasStory && storyGroup) setStoryViewerOpen(true); else router.push(`/${post.profiles?.username}`); }}
        onNameClick={() => router.push(`/${post.profiles?.username}`)}
        rightSlot={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {!sourceIsMessage && isOwnPost && post.is_ppv && post.ppv_price ? (
              <span style={{
                fontSize: "11px", fontWeight: 600, color: "#8B5CF6",
                backgroundColor: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.35)",
                borderRadius: "999px", padding: "2px 10px",
                fontFamily: "'Inter', sans-serif", letterSpacing: "0.02em",
              }}>
                PPV · ₦{(post.ppv_price / 100).toLocaleString("en-NG")}
              </span>
            ) : null}
            {!sourceIsMessage && (
              <button
                onClick={() => isOwnPost ? setCreatorSheetOpen(true) : setSheetOpen(true)}
                style={{ background: "none", border: "none", color: "#A3A3C2", cursor: "pointer", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
              >
                <MoreHorizontal size={20} strokeWidth={1.8} />
              </button>
            )}
          </div>
        }
      />

      {sourceIsMessage && post.is_deleted && (
        <div style={{ margin: "0 16px 8px", padding: "8px 12px", borderRadius: "10px", backgroundColor: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", fontSize: "12px", color: "#A3A3C2", fontFamily: "'Inter', sans-serif" }}>
          The creator removed this — you still have access because you unlocked it.
        </div>
      )}

      {post.caption && !isTextPost && (
        <p style={{ margin: "0", fontSize: "14px", color: "#FFFFFF", lineHeight: 1.7, padding: "0 16px 10px", whiteSpace: "pre-wrap" }}>{post.caption}</p>
      )}

      {isTextPost && post.caption && (
        <div style={{ margin: "12px 0 0" }}>
          <PostTextViewer caption={post.caption} textBackground={post.text_background} />
        </div>
      )}

      {!sourceIsMessage && post.poll_data && (
        <div style={{ margin: "12px 16px 0", backgroundColor: "#13131F", borderRadius: "14px" }}>
          <PollDisplay poll={post.poll_data} postId={String(post.id)} isCreator={isOwnPost} onVoted={(updated) => setPost((p) => p ? { ...p, poll_data: updated } : p)} />
        </div>
      )}

      {normalizedMedia.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <PostMediaViewer media={normalizedMedia} isLocked={post.locked} price={post.ppv_price} isPPV={post.is_ppv} isFreeSubscription={(post.profiles?.subscription_price ?? 0) === 0} isUnlockedPPV={post.is_ppv && !post.locked} onDoubleTap={handleDoubleTapLike} onSingleTap={(index) => { setLightboxMediaIdx(index); setLightboxOpen(true); }} onUnlock={openUnlock} maxHeight="none" />
        </div>
      )}

      {!sourceIsMessage && !post.locked && (
        <div style={{ margin: "0 16px" }}>
          <PostActions likes={post.like_count} comments={commentCount} liked={post.liked} bookmarked={savedPost} isSubscribed={post.can_access} isOwnProfile={isOwnPost} onLike={handleLike} onComment={handleComment} onTip={openTip} onBookmark={handleBookmark} />
        </div>
      )}

      {!sourceIsMessage && (
        <PostOptionsSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSavePost={handleBookmark}
          onSaveCreator={() => {}}
          onNotInterested={() => {}}
          onReport={() => {}}
          onBlockCreator={() => {}}
          savedPost={savedPost}
        />
      )}

      {!sourceIsMessage && (
        <CreatorPostOptionsSheet
          isOpen={creatorSheetOpen}
          onClose={() => setCreatorSheetOpen(false)}
          onEdit={() => setEditCaptionOpen(true)}
          onDelete={handleDelete}
          onEditPPV={() => setEditPPVOpen(true)}
        />
      )}

      {!sourceIsMessage && editCaptionOpen && post && (
        <EditCaptionModal
          caption={post.caption ?? ""}
          onSave={async (newCaption) => {
            const res = await fetch(`/api/posts/${post.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption: newCaption }) });
            if (!res.ok) throw new Error("Failed");
            setPost((p) => p ? { ...p, caption: newCaption || null } : p);
          }}
          onClose={() => setEditCaptionOpen(false)}
        />
      )}

      {!sourceIsMessage && editPPVOpen && post && (
        <EditPPVModal
          currentPrice={post.ppv_price != null ? post.ppv_price / 100 : null}
          onSave={async (priceKobo) => {
            const res = await fetch(`/api/posts/${post.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_ppv: true, ppv_price: priceKobo }) });
            if (!res.ok) throw new Error("Failed");
            setPost((p) => p ? { ...p, is_ppv: true, ppv_price: priceKobo } : p);
          }}
          onRemove={post.is_ppv ? async () => {
            const res = await fetch(`/api/posts/${post.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_ppv: false, ppv_price: null }) });
            if (!res.ok) throw new Error("Failed");
            setPost((p) => p ? { ...p, is_ppv: false, ppv_price: null } : p);
          } : undefined}
          onClose={() => setEditPPVOpen(false)}
        />
      )}

      {!sourceIsMessage && !post.locked && (
        <div ref={commentRef} style={{ margin: "8px 16px 48px" }}>
          <CommentSection postId={String(post.id)} comments={comments} viewer={viewer || { username: "", display_name: "", avatar_url: "" }} viewerUserId={viewerId || undefined} isOpen={commentOpen} isLoading={commentsLoading} totalCommentCount={commentCount} onClose={() => setCommentOpen(false)} onAddComment={handleAddComment} />
        </div>
      )}
    </div>
  );
}