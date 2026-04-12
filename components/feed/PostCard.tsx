"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import PostActions from "@/components/profile/PostActions";
import CommentSection from "@/components/profile/CommentSection";
import Lightbox from "@/components/profile/Lightbox";
import PostMediaViewer from "@/components/shared/PostMediaViewer";
import PostTextViewer from "@/components/shared/PostTextViewer";
import PostOptionsSheet from "@/components/feed/PostOptionsSheet";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import { ReportModal } from "@/components/messages/ReportModal";
import BlockConfirmModal from "@/components/ui/BlockConfirmModal";
import { useBlockRestrict } from "@/lib/hooks/useBlockRestrict";
import type { NormalizedMedia } from "@/components/shared/PostMediaViewer";
import type { LightboxPost } from "@/components/profile/Lightbox";
import { createClient } from "@/lib/supabase/client";
import { postSyncStore } from "@/lib/store/postSyncStore";
import { PollDisplay } from "@/components/feed/PollDisplay";
import type { PollData } from "@/components/feed/PollDisplay";
import type { User } from "@/lib/types/profile";
import { useNav } from "@/lib/hooks/useNav";
import { useCreatorStory } from "@/lib/hooks/useCreatorStory";
import StoryViewer from "@/components/story/StoryViewer";
import { AvatarWithStoryRing } from "@/components/ui/AvatarWithStoryRing";
import type { CreatorStoryGroup } from "@/components/story/StoryBar";

interface MediaItem {
  type:              "image" | "video";
  url:               string;
  bunnyVideoId?:     string | null;
  thumbnailUrl?:     string | null;
  processingStatus?: string | null;
  rawVideoUrl?:      string | null;
  blurHash?:         string | null;
  width?:            number | null;
  height?:           number | null;
  aspectRatio?:      number | null;
}

interface TaggedCreator {
  name: string; username: string; avatar_url: string; isVerified: boolean; isFree: boolean;
}

interface Post {
  id:               string;
  content_type?:    string;
  text_background?: string | null;
  creator: {
    id:         string;
    name:       string;
    username:   string;
    avatar_url: string;
    isVerified: boolean;
  };
  timestamp:       string;
  caption:         string;
  media:           MediaItem[];
  isLocked:        boolean;
  is_ppv:          boolean;
  price:           number | null;
  likes:           number;
  comments:        number;
  liked:           boolean;
  poll?:           PollData | null;
  taggedCreators?: TaggedCreator[];
}

interface Viewer {
  id: string; username: string; display_name: string; avatar_url: string;
}

let cachedViewer: Viewer | null = null;
let viewerPromise: Promise<Viewer | null> | null = null;

function fetchViewer(): Promise<Viewer | null> {
  if (cachedViewer) return Promise.resolve(cachedViewer);
  if (viewerPromise) return viewerPromise;
  viewerPromise = (async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) {
        cachedViewer = { id: user.id, username: data.username, display_name: data.display_name || data.username, avatar_url: data.avatar_url || "" };
        return cachedViewer;
      }
      return null;
    } catch { return null; }
    finally { viewerPromise = null; }
  })();
  return viewerPromise;
}

function useViewer() {
  const [viewer, setViewer] = useState<Viewer | null>(cachedViewer);
  useEffect(() => {
    if (cachedViewer) return;
    fetchViewer().then((v) => { if (v) setViewer(v); });
  }, []);
  return viewer;
}

function toLightboxPost(post: Post): LightboxPost {
  return {
    id: Number(post.id),
    media: post.media
      .filter((m) => m.type === "image" && m.url)
      .map((m, i) => ({
        id: i, media_type: "image", file_url: m.url,
        thumbnail_url: m.thumbnailUrl ?? null, raw_video_url: null,
        locked: false, display_order: i, processing_status: null, bunny_video_id: null,
      })),
  };
}

export function PostCard({
  post,
  onLike,
  onUnlock,
  initialSlide = 0,
  onSlideChange,
  showSubscribeBanner = false,
  onSubscribed,
  subscriptionPrice,
  isSubscribedExternal = false,
}: {
  post:                 Post;
  onLike?:              (postId: string) => void;
  onUnlock?:            (postId: string) => void;
  initialSlide?:        number;
  onSlideChange?:       (postId: string, index: number) => void;
  showSubscribeBanner?: boolean;
  onSubscribed?:        (creatorId: string) => void;
  subscriptionPrice?:   number;
  isSubscribedExternal?: boolean;
}) {
  const { navigate } = useNav();
  const router  = useRouter();
  const viewer  = useViewer();

  const { group: storyGroup, hasUnviewed, refresh } = useCreatorStory(post.creator.id);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);

  const [commentOpen,       setCommentOpen]       = useState(false);
  const [sheetOpen,         setSheetOpen]         = useState(false);
  const [tipOpen,           setTipOpen]           = useState(false);
  const [subOpen,           setSubOpen]           = useState(false);
  const [subMonthly,        setSubMonthly]        = useState(0);
  const [subThreeMonth,     setSubThreeMonth]     = useState<number | undefined>(undefined);
  const [subSixMonth,       setSubSixMonth]       = useState<number | undefined>(undefined);
  const [subLoading,        setSubLoading]        = useState(false);
  const [subscribed,        setSubscribed]        = useState(isSubscribedExternal);
  const [freeSubbing,       setFreeSubbing]       = useState(false);
  const [liked,             setLiked]             = useState(post.liked);
  const [likeCount,         setLikeCount]         = useState(post.likes);
  const [commentCount,      setCommentCount]      = useState(post.comments);
  const [comments,          setComments]          = useState<any[]>([]);
  const [commentsLoading,   setCommentsLoading]   = useState(false);
  const [commentsFetched,   setCommentsFetched]   = useState(false);
  const [lightboxOpen,      setLightboxOpen]      = useState(false);
  const [lightboxMediaIdx,  setLightboxMediaIdx]  = useState(0);
  const [pollData,          setPollData]          = useState<PollData | null>(post.poll ?? null);
  const [savedPost,         setSavedPost]         = useState(false);
  const [savedCreator,      setSavedCreator]      = useState(false);
  const [sheetDataFetched,  setSheetDataFetched]  = useState(false);
  const [timestamp,         setTimestamp]         = useState("");
  const [reportOpen,        setReportOpen]        = useState(false);
  const [blockConfirm,      setBlockConfirm]      = useState(false);
  const [unblockConfirm,    setUnblockConfirm]    = useState(false);
  const [restrictConfirm,   setRestrictConfirm]   = useState(false);
  const [unrestrictConfirm, setUnrestrictConfirm] = useState(false);

  const {
    isBlocked, isRestricted,
    block, unblock, restrict, unrestrict,
    fetchStatus,
  } = useBlockRestrict({ userId: post.creator.id });

  useEffect(() => {
    if (isSubscribedExternal) setSubscribed(true);
  }, [isSubscribedExternal]);

  useEffect(() => {
    fetch(`/api/saved/posts?post_id=${post.id}`)
      .then((r) => r.json()).then((d) => setSavedPost(d.saved ?? false)).catch(() => {});
    fetch(`/api/saved/creators?creator_id=${post.creator.id}`)
      .then((r) => r.json()).then((d) => setSavedCreator(d.saved ?? false)).catch(() => {});
  }, [post.id, post.creator.id]);

  useEffect(() => {
    const unsub = postSyncStore.subscribe((event) => {
      if (event.postId !== post.id) return;
      setLiked(event.liked);
      setLikeCount(event.like_count);
      if (event.comment_count !== undefined) setCommentCount(event.comment_count);
    });
    return unsub;
  }, [post.id]);

  const handleOpenSheet = useCallback(async () => {
    setSheetOpen(true);
    if (sheetDataFetched) return;
    setSheetDataFetched(true);
    await fetchStatus();
  }, [sheetDataFetched, fetchStatus]);

  const handleToggleComment = useCallback(async () => {
    setCommentOpen((prev) => {
      const next = !prev;
      if (next && !commentsFetched) {
        setCommentsLoading(true);
        setCommentsFetched(true);
        fetch(`/api/posts/${post.id}/comments`)
          .then((r) => r.json())
          .then((d) => { if (d.comments) setComments(d.comments); })
          .catch(() => {})
          .finally(() => setCommentsLoading(false));
      }
      return next;
    });
  }, [commentsFetched, post.id]);

  useEffect(() => {
    function getRelativeTime(dateStr: string): string {
      const diff  = Date.now() - new Date(dateStr).getTime();
      const mins  = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days  = Math.floor(diff / 86400000);
      if (mins  < 1)  return "just now";
      if (mins  < 60) return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days  < 7)  return `${days}d ago`;
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    setTimestamp(getRelativeTime(post.timestamp));
    const interval = setInterval(() => setTimestamp(getRelativeTime(post.timestamp)), 60000);
    return () => clearInterval(interval);
  }, [post.timestamp]);

  const isLiking   = useRef(false);
  const prevPostId = useRef(post.id);

  useEffect(() => {
    if (prevPostId.current !== post.id) {
      prevPostId.current = post.id;
      setLiked(post.liked);
      setLikeCount(post.likes);
      setCommentCount(post.comments);
      setPollData(post.poll ?? null);
    }
  }, [post.id, post.liked, post.likes, post.comments, post.poll]);

  const handleLike = async () => {
    if (isLiking.current) return;
    isLiking.current = true;
    const wasLiked = liked;
    const oldCount = likeCount;
    const newLiked = !wasLiked;
    const newCount = newLiked ? oldCount + 1 : Math.max(0, oldCount - 1);
    setLiked(newLiked);
    setLikeCount(newCount);
    postSyncStore.emit({ postId: post.id, liked: newLiked, like_count: newCount, comment_count: commentCount });
    try {
      const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLiked(data.liked);
        setLikeCount(data.like_count);
        postSyncStore.emit({ postId: post.id, liked: data.liked, like_count: data.like_count, comment_count: commentCount });
        onLike?.(post.id);
      } else {
        setLiked(wasLiked);
        setLikeCount(oldCount);
        postSyncStore.emit({ postId: post.id, liked: wasLiked, like_count: oldCount, comment_count: commentCount });
      }
    } catch {
      setLiked(wasLiked);
      setLikeCount(oldCount);
      postSyncStore.emit({ postId: post.id, liked: wasLiked, like_count: oldCount, comment_count: commentCount });
    }
    isLiking.current = false;
  };

  const handleDoubleTapLike = async () => {
    if (liked || isLiking.current) return;
    isLiking.current = true;
    const oldCount = likeCount;
    setLiked(true);
    setLikeCount(oldCount + 1);
    postSyncStore.emit({ postId: post.id, liked: true, like_count: oldCount + 1, comment_count: commentCount });
    try {
      const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLiked(data.liked);
        setLikeCount(data.like_count);
        postSyncStore.emit({ postId: post.id, liked: data.liked, like_count: data.like_count, comment_count: commentCount });
        onLike?.(post.id);
      } else {
        setLiked(false);
        setLikeCount(oldCount);
        postSyncStore.emit({ postId: post.id, liked: false, like_count: oldCount, comment_count: commentCount });
      }
    } catch {
      setLiked(false);
      setLikeCount(oldCount);
      postSyncStore.emit({ postId: post.id, liked: false, like_count: oldCount, comment_count: commentCount });
    }
    isLiking.current = false;
  };

  const handleAddComment = useCallback(async (
    id: string, text: string, gif_url?: string,
    parent_comment_id?: string | number,
    reply_to_username?: string | null,
    reply_to_id?: string | number | null
  ) => {
    await fetch(`/api/posts/${id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, gif_url: gif_url ?? null, parent_comment_id: parent_comment_id ?? null, reply_to_username: reply_to_username ?? null, reply_to_id: reply_to_id ?? null }),
    });
    setCommentCount((c) => {
      const newCount = c + 1;
      postSyncStore.emit({ postId: id, liked, like_count: likeCount, comment_count: newCount });
      return newCount;
    });
    if (!parent_comment_id) {
      const d = await fetch(`/api/posts/${id}/comments`).then((r) => r.json());
      if (d.comments) setComments(d.comments);
    }
  }, [liked, likeCount]);

  const handleSavePost = useCallback(async () => {
    const next = !savedPost;
    setSavedPost(next);
    try {
      await fetch("/api/saved/posts", { method: next ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: post.id }) });
    } catch { setSavedPost(!next); }
  }, [savedPost, post.id]);

  const handleSaveCreator = useCallback(async () => {
    const next = !savedCreator;
    setSavedCreator(next);
    try {
      await fetch("/api/saved/creators", { method: next ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creator_id: post.creator.id }) });
    } catch { setSavedCreator(!next); }
  }, [savedCreator, post.creator.id]);

  const handleAvatarClick = useCallback(() => {
    if (hasUnviewed && storyGroup) {
      setStoryViewerOpen(true);
    } else {
      navigate(`/${post.creator.username}`);
    }
  }, [hasUnviewed, storyGroup, navigate, post.creator.username]);

  const handleStoryViewerClose = useCallback((updatedGroups: CreatorStoryGroup[]) => {
    setStoryViewerOpen(false);
    refresh();
  }, [refresh]);

  const handleSubscribeBannerClick = useCallback(async () => {
    if (subscribed) return;
    const isFree = (subscriptionPrice ?? 0) === 0;
    if (isFree) {
      setFreeSubbing(true);
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "subscription", amount: 0, creatorId: post.creator.id, selectedTier: "monthly" }),
        });
        if (res.ok) { setSubscribed(true); onSubscribed?.(post.creator.id); }
      } catch (err) {
        console.error("[PostCard] free subscribe error:", err);
      } finally {
        setFreeSubbing(false);
      }
      return;
    }
    setSubLoading(true);
    try {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_price, bundle_price_3_months, bundle_price_6_months")
        .eq("id", post.creator.id)
        .single();
      if (profile) {
        setSubMonthly(profile.subscription_price ?? 0);
        setSubThreeMonth(profile.bundle_price_3_months ?? undefined);
        setSubSixMonth(profile.bundle_price_6_months ?? undefined);
      } else {
        setSubMonthly(0); setSubThreeMonth(undefined); setSubSixMonth(undefined);
      }
      setSubOpen(true);
    } catch (err) {
      console.error("[PostCard] handleSubscribeBannerClick error:", err);
    } finally {
      setSubLoading(false);
    }
  }, [subscribed, subscriptionPrice, post.creator.id, onSubscribed]);

  const handleSubscriptionSuccess = useCallback(() => {
    setSubscribed(true);
    onSubscribed?.(post.creator.id);
  }, [onSubscribed, post.creator.id]);

  const creatorAsUser: User = {
    id: post.creator.id, username: post.creator.username,
    display_name: post.creator.name, avatar_url: post.creator.avatar_url, role: "creator",
  } as User;

  const normalizedMedia: NormalizedMedia[] = post.media.map((m) => ({
    type: m.type, url: m.url, bunnyVideoId: m.bunnyVideoId, thumbnailUrl: m.thumbnailUrl,
    processingStatus: m.processingStatus, rawVideoUrl: m.rawVideoUrl,
    blurHash: m.blurHash ?? null, width: m.width ?? null, height: m.height ?? null, aspectRatio: m.aspectRatio ?? null,
  }));

  const lightboxPost = toLightboxPost(post);
  const isTextPost   = post.content_type === "text";
  const isPollPost   = post.content_type === "poll";

  if (isBlocked) return null;

  return (
    <div style={{ borderBottom: "1px solid #1A1A2E", fontFamily: "'Inter', sans-serif" }}>

      {storyViewerOpen && storyGroup && (
        <StoryViewer groups={[storyGroup]} startGroupIndex={0} onClose={handleStoryViewerClose} />
      )}

      <CheckoutModal isOpen={tipOpen} onClose={() => setTipOpen(false)} type="tips" creator={creatorAsUser} postId={Number(post.id)} />

      <CheckoutModal
        isOpen={subOpen}
        onClose={() => setSubOpen(false)}
        type="subscription"
        creator={creatorAsUser}
        monthlyPrice={subMonthly}
        threeMonthPrice={subThreeMonth}
        sixMonthPrice={subSixMonth}
        onSuccess={handleSubscriptionSuccess}
        onSubscriptionSuccess={handleSubscriptionSuccess}
        onViewContent={() => { setSubOpen(false); navigate(`/${post.creator.username}`); }}
        onGoToSubscriptions={() => { setSubOpen(false); navigate("/subscriptions"); }}
        autoCloseOnSuccess={showSubscribeBanner}
      />

      {lightboxOpen && lightboxPost.media.length > 0 && (
        <Lightbox post={lightboxPost} allPosts={[lightboxPost]} initialMediaIndex={lightboxMediaIdx} onClose={() => setLightboxOpen(false)} onNavigate={() => {}} />
      )}

      {reportOpen && (
        <ReportModal context="user" username={post.creator.username} reportedUserId={post.creator.id} onClose={() => setReportOpen(false)} onBlockUser={block} />
      )}

      <BlockConfirmModal isOpen={blockConfirm}      onClose={() => setBlockConfirm(false)}      onConfirm={block}      type="block"    username={post.creator.username} />
      <BlockConfirmModal isOpen={unblockConfirm}    onClose={() => setUnblockConfirm(false)}    onConfirm={unblock}    type="block"    username={post.creator.username} />
      <BlockConfirmModal isOpen={restrictConfirm}   onClose={() => setRestrictConfirm(false)}   onConfirm={restrict}   type="restrict" username={post.creator.username} />
      <BlockConfirmModal isOpen={unrestrictConfirm} onClose={() => setUnrestrictConfirm(false)} onConfirm={unrestrict} type="restrict" username={post.creator.username} />

      <PostOptionsSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSavePost={handleSavePost}
        onSaveCreator={handleSaveCreator}
        onNotInterested={() => {}}
        onReport={() => { setSheetOpen(false); setReportOpen(true); }}
        onBlockCreator={() => { setSheetOpen(false); setBlockConfirm(true); }}
        onUnblockCreator={() => { setSheetOpen(false); setUnblockConfirm(true); }}
        onRestrictCreator={() => { setSheetOpen(false); setRestrictConfirm(true); }}
        onUnrestrictCreator={() => { setSheetOpen(false); setUnrestrictConfirm(true); }}
        savedPost={savedPost}
        savedCreator={savedCreator}
        isBlocked={isBlocked}
        isRestricted={isRestricted}
      />

      {/* Header */}
      <div style={{ padding: "16px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <AvatarWithStoryRing
            src={post.creator.avatar_url || ""}
            alt={post.creator.name}
            size={48}
            hasStory={!!storyGroup}
            hasUnviewed={hasUnviewed}
            onClick={handleAvatarClick}
          />
          <div style={{ cursor: "pointer" }} onClick={() => navigate(`/${post.creator.username}`)}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>{post.creator.name}</span>
              {post.creator.isVerified && <BadgeCheck size={14} color="#8B5CF6" />}
            </div>
            <span style={{ fontSize: "12px", color: "#6B6B8A" }}>@{post.creator.username}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#6B6B8A" }}>{timestamp}</span>
          <button onClick={handleOpenSheet} style={{ width: "30px", height: "30px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "#C4C4D4", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
          </button>
        </div>
      </div>

      {/* Caption — plain text for non-text posts */}
      {post.caption && !isTextPost && (
        <p style={{ fontSize: "14px", color: "#C4C4D4", lineHeight: 1.6, margin: "0", padding: "0 16px 10px", whiteSpace: "pre-wrap" }}>
          {post.caption}
        </p>
      )}

      {/* Text post viewer */}
      {isTextPost && post.caption && (
        <PostTextViewer caption={post.caption} textBackground={post.text_background} />
      )}

      {/* Subscribe banner */}
      {showSubscribeBanner && (
        <div style={{ margin: "0 0 10px", padding: "12px 16px", background: subscribed ? "linear-gradient(135deg, #22C55E, #16A34A)" : "linear-gradient(135deg, #8B5CF6, #EC4899)", display: "flex", alignItems: "center", gap: "12px", transition: "background 0.5s ease, opacity 0.15s", opacity: (subLoading || freeSubbing) ? 0.7 : 1 }}>
          <div onClick={() => navigate(`/${post.creator.username}`)} style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
            <img src={post.creator.avatar_url || ""} alt={post.creator.name} style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#FFFFFF" }}>{post.creator.name}</span>
                {post.creator.isVerified && <BadgeCheck size={14} color="#FFFFFF" />}
              </div>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>@{post.creator.username}</span>
            </div>
          </div>
          <>
            <style>{`
              @keyframes subscribePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
              @keyframes subscribedPop  { 0% { transform: scale(1); } 40% { transform: scale(1.15); } 100% { transform: scale(1); } }
            `}</style>
            <div onClick={handleSubscribeBannerClick} style={{ marginLeft: "auto", padding: "8px 20px", borderRadius: "8px", backgroundColor: subscribed ? "#22C55E" : "#FFFFFF", fontSize: "14px", fontWeight: 700, color: subscribed ? "#FFFFFF" : "#8B5CF6", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "'Inter', sans-serif", cursor: subscribed ? "default" : (subLoading || freeSubbing) ? "wait" : "pointer", animation: subscribed ? "subscribedPop 0.4s ease-out" : "subscribePulse 2s ease-in-out infinite", transition: "background-color 0.3s ease, color 0.3s ease" }}>
              {subscribed ? "Subscribed ✓" : freeSubbing ? "Subscribing..." : (subscriptionPrice ?? 0) === 0 ? "Subscribe for Free" : "Subscribe"}
            </div>
          </>
        </div>
      )}

      {isPollPost && pollData && (
        <PollDisplay poll={pollData} postId={post.id} onVoted={(updated) => setPollData(updated)} />
      )}

      {!isTextPost && !isPollPost && (
        <PostMediaViewer
          media={normalizedMedia} isLocked={post.isLocked} price={post.price}
          isUnlockedPPV={post.is_ppv && !post.isLocked}
          onDoubleTap={handleDoubleTapLike}
          onSingleTap={(index) => { setLightboxMediaIdx(index); setLightboxOpen(true); }}
          onUnlock={() => onUnlock?.(post.id)}
          initialSlide={initialSlide}
          onSlideChange={(index) => onSlideChange?.(post.id, index)}
        />
      )}

      {post.taggedCreators && post.taggedCreators.length > 0 && (
        <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginTop: "10px" }}>
          {post.taggedCreators.map((tc) => (
            <TaggedCreatorCard key={tc.username} creator={tc} onClick={() => navigate(`/${tc.username}`)} />
          ))}
        </div>
      )}

      {!post.isLocked && (
        <div style={{ padding: "0 16px" }}>
          <PostActions likes={likeCount} comments={commentCount} liked={liked} bookmarked={savedPost} isSubscribed={true} isOwnProfile={false} onLike={handleLike} onComment={handleToggleComment} onTip={() => setTipOpen(true)} onBookmark={handleSavePost} />
          <CommentSection postId={post.id} comments={comments} viewer={viewer ? { username: viewer.username, display_name: viewer.display_name, avatar_url: viewer.avatar_url } : null} viewerUserId={viewer?.id} isOpen={commentOpen} onAddComment={handleAddComment} isLoading={commentsLoading} totalCommentCount={commentCount} onClose={() => setCommentOpen(false)} />
        </div>
      )}
    </div>
  );
}

function TaggedCreatorCard({ creator, onClick }: { creator: TaggedCreator; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "12px", border: "1px solid #2A2A3D", backgroundColor: "#0D0D18", cursor: "pointer" }} onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#1C1C2E"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#0D0D18"; }}>
      <div style={{ padding: "2.5px", borderRadius: "50%", background: "linear-gradient(to right, #8B5CF6, #EC4899)", flexShrink: 0 }}>
        <div style={{ padding: "2px", borderRadius: "50%", backgroundColor: "#0D0D18" }}>
          <img src={creator.avatar_url} alt={creator.name} loading="lazy" style={{ width: "52px", height: "52px", borderRadius: "50%", objectFit: "cover", display: "block" }} />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{creator.name}</span>
          {creator.isVerified && <BadgeCheck size={13} color="#8B5CF6" />}
          {creator.isFree && <span style={{ padding: "1px 7px", borderRadius: "20px", backgroundColor: "rgba(139,92,246,0.15)", border: "1px solid #8B5CF6", fontSize: "10px", fontWeight: 700, color: "#8B5CF6" }}>Free</span>}
        </div>
        <span style={{ fontSize: "12px", color: "#6B6B8A" }}>@{creator.username}</span>
      </div>
    </div>
  );
}