// components/feed/PostCard.tsx
"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, MoreHorizontal } from "lucide-react";
import dynamic from "next/dynamic";

import PostActions from "@/components/profile/PostActions";
import CommentSection from "@/components/profile/CommentSection";
import PostMediaViewer from "@/components/shared/PostMediaViewer";
import PostTextViewer from "@/components/shared/PostTextViewer";
import PostOptionsSheet from "@/components/feed/PostOptionsSheet";
import PostHeader from "@/components/shared/PostHeader";
import SubscribeBannerPill from "@/components/feed/SubscribeBannerPill";
import { PollDisplay } from "@/components/feed/PollDisplay";

import { useBlockRestrict } from "@/lib/hooks/useBlockRestrict";
import { useNav } from "@/lib/hooks/useNav";
import { useCreatorStory } from "@/lib/hooks/useCreatorStory";
import { useViewer } from "@/lib/hooks/useViewer";
import { useRelativeTimestamp } from "@/lib/hooks/useRelativeTimestamp";
import { usePostEngagement } from "@/lib/hooks/usePostEngagement";
import { createClient } from "@/lib/supabase/client";

import type { NormalizedMedia } from "@/components/shared/PostMediaViewer";
import type { LightboxPost } from "@/components/profile/Lightbox";
import type { PollData } from "@/components/feed/PollDisplay";
import type { User } from "@/lib/types/profile";
import type { CreatorStoryGroup } from "@/components/story/StoryBar";

const StoryViewer       = dynamic(() => import("@/components/story/StoryViewer"), { ssr: false });
const CheckoutModal     = dynamic(() => import("@/components/checkout/CheckoutModal"), { ssr: false });
const Lightbox          = dynamic(() => import("@/components/profile/Lightbox"), { ssr: false });
const ReportModal       = dynamic(() => import("@/components/messages/ReportModal").then((m) => ({ default: m.ReportModal })), { ssr: false });
const BlockConfirmModal = dynamic(() => import("@/components/ui/BlockConfirmModal"), { ssr: false });

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

function toLightboxPost(post: Post): LightboxPost {
  return {
    id: Number(post.id),
    media: post.media.filter((m) => m.type === "image" && m.url).map((m, i) => ({
      id: i, media_type: "image", file_url: m.url,
      thumbnail_url: m.thumbnailUrl ?? null, raw_video_url: null,
      locked: false, display_order: i, processing_status: null, bunny_video_id: null,
    })),
  };
}

function PostCardInner({
  post,
  onLike,
  onUnlock,
  initialSlide = 0,
  onSlideChange,
  showSubscribeBanner = false,
  is_renewal = false,
  onSubscribed,
  subscriptionPrice,
  isSubscribedExternal = false,
  initialSavedPost = false,
  initialSavedCreator = false,
}: {
  post:                  Post;
  onLike?:               (postId: string) => void;
  onUnlock?:             (postId: string) => void;
  initialSlide?:         number;
  onSlideChange?:        (postId: string, index: number) => void;
  showSubscribeBanner?:  boolean;
  is_renewal?:           boolean;
  onSubscribed?:         (creatorId: string) => void;
  subscriptionPrice?:    number;
  isSubscribedExternal?: boolean;
  initialSavedPost?:     boolean;
  initialSavedCreator?:  boolean;
}) {
  const { navigate } = useNav();
  const router  = useRouter();
  const viewer  = useViewer();

  const { group: storyGroup, hasUnviewed, refresh } = useCreatorStory(post.creator.id);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);

  const timestamp = useRelativeTimestamp(post.timestamp);

  const engagement = usePostEngagement({
    postId:              post.id,
    creatorId:           post.creator.id,
    initialLiked:        post.liked,
    initialLikeCount:    post.likes,
    initialCommentCount: post.comments,
    initialSavedPost,
    initialSavedCreator,
    onLikeSuccess:       onLike,
  });

  // ── Subscribe state ──────────────────────────────────────────────────
  const [subscribed,  setSubscribed]  = useState(isSubscribedExternal);
  const [subLoading,  setSubLoading]  = useState(false);
  const [freeSubbing, setFreeSubbing] = useState(false);

  // ── Modals ───────────────────────────────────────────────────────────
  const [sheetOpen,         setSheetOpen]         = useState(false);
  const [sheetDataFetched,  setSheetDataFetched]  = useState(false);
  const [tipOpen,           setTipOpen]           = useState(false);
  const [subOpen,           setSubOpen]           = useState(false);
  const [subMonthly,        setSubMonthly]        = useState(0);
  const [subThreeMonth,     setSubThreeMonth]     = useState<number | undefined>(undefined);
  const [subSixMonth,       setSubSixMonth]       = useState<number | undefined>(undefined);
  const [lightboxOpen,      setLightboxOpen]      = useState(false);
  const [lightboxMediaIdx,  setLightboxMediaIdx]  = useState(0);
  const [reportOpen,        setReportOpen]        = useState(false);
  const [blockConfirm,      setBlockConfirm]      = useState(false);
  const [unblockConfirm,    setUnblockConfirm]    = useState(false);
  const [restrictConfirm,   setRestrictConfirm]   = useState(false);
  const [unrestrictConfirm, setUnrestrictConfirm] = useState(false);

  const [pollData, setPollData] = useState<PollData | null>(post.poll ?? null);

  const { isBlocked, isRestricted, block, unblock, restrict, unrestrict, fetchStatus } = useBlockRestrict({ userId: post.creator.id });

  const isFree    = (subscriptionPrice ?? 0) === 0;
  const isLoading = subLoading || freeSubbing;

  useEffect(() => {
    if (isSubscribedExternal) setSubscribed(true);
  }, [isSubscribedExternal]);

  useEffect(() => {
    setPollData(post.poll ?? null);
  }, [post.poll]);

  const handleOpenSheet = useCallback(async () => {
    setSheetOpen(true);
    if (sheetDataFetched) return;
    setSheetDataFetched(true);
    await fetchStatus();
  }, [sheetDataFetched, fetchStatus]);

  const handleAvatarClick = useCallback(() => {
    if (hasUnviewed && storyGroup) setStoryViewerOpen(true);
    else navigate(`/${post.creator.username}`);
  }, [hasUnviewed, storyGroup, navigate, post.creator.username]);

  const handleStoryViewerClose = useCallback((_updatedGroups: CreatorStoryGroup[]) => {
    setStoryViewerOpen(false);
    refresh();
  }, [refresh]);

  const handleSubscribeBannerClick = useCallback(async () => {
    if (subscribed) return;
    // Free subscribe/resubscribe — no checkout needed
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
    // Paid subscribe/resubscribe — open checkout modal
    setSubLoading(true);
    try {
      const supabase = createClient();
      const { data: profile } = await supabase.from("profiles")
        .select("subscription_price, bundle_price_3_months, bundle_price_6_months")
        .eq("id", post.creator.id).single();
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
  }, [subscribed, isFree, post.creator.id, onSubscribed]);

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

  const handleSingleTap = useCallback((index: number) => {
    const tappedMedia = normalizedMedia[index];
    if (!tappedMedia || tappedMedia.type !== "image") return;
    const imageOnlyMedia = normalizedMedia.filter((m) => m.type === "image");
    const lightboxIdx = imageOnlyMedia.findIndex((m) => m.url === tappedMedia.url);
    if (lightboxIdx >= 0) {
      setLightboxMediaIdx(lightboxIdx);
      setLightboxOpen(true);
    }
  }, [normalizedMedia]);

  if (isBlocked) return null;

  // ── Header right slot ─────────────────────────────────────────────────
  const moreButton = (
    <button
      onClick={handleOpenSheet}
      style={{
        width: "30px", height: "30px", borderRadius: "6px", border: "none",
        backgroundColor: "transparent", color: "#C4C4D4",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <MoreHorizontal size={18} />
    </button>
  );

  const rightSlot = showSubscribeBanner ? (
    <>
      <SubscribeBannerPill
        isSubscribed={subscribed}
        isRenewal={is_renewal}
        isFree={isFree}
        loading={isLoading}
        onClick={handleSubscribeBannerClick}
      />
      {subscribed && moreButton}
    </>
  ) : moreButton;

  // "· Free" inline suffix only shown when there's a pill AND creator is free
  const freeSuffix = (showSubscribeBanner && isFree) ? (
    <>
      <span>·</span>
      <span style={{ color: "#22C55E", fontWeight: 500 }}>Free</span>
    </>
  ) : undefined;

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
        isOpen={sheetOpen} onClose={() => setSheetOpen(false)}
        onSavePost={engagement.handleSavePost} onSaveCreator={engagement.handleSaveCreator}
        onNotInterested={() => {}}
        onReport={() => { setSheetOpen(false); setReportOpen(true); }}
        onBlockCreator={() => { setSheetOpen(false); setBlockConfirm(true); }}
        onUnblockCreator={() => { setSheetOpen(false); setUnblockConfirm(true); }}
        onRestrictCreator={() => { setSheetOpen(false); setRestrictConfirm(true); }}
        onUnrestrictCreator={() => { setSheetOpen(false); setUnrestrictConfirm(true); }}
        savedPost={engagement.savedPost} savedCreator={engagement.savedCreator}
        isBlocked={isBlocked} isRestricted={isRestricted}
      />

      {/* Header */}
      <PostHeader
        avatarUrl={post.creator.avatar_url || null}
        displayName={post.creator.name}
        username={post.creator.username}
        isVerified={post.creator.isVerified}
        timestamp={showSubscribeBanner ? "" : timestamp}
        hasStory={!!storyGroup}
        hasUnviewedStory={hasUnviewed}
        onAvatarClick={handleAvatarClick}
        onNameClick={() => navigate(`/${post.creator.username}`)}
        suffix={freeSuffix}
        rightSlot={rightSlot}
      />

      {/* Caption */}
      {post.caption && !isTextPost && (
        <p style={{ fontSize: "16px", color: "#FFFFFF", lineHeight: 1.6, margin: "0", padding: "0 16px 10px", whiteSpace: "pre-wrap" }}>
          {post.caption}
        </p>
      )}

      {isTextPost && post.caption && (
        <PostTextViewer caption={post.caption} textBackground={post.text_background} />
      )}

      {isPollPost && pollData && (
        <PollDisplay poll={pollData} postId={post.id} onVoted={(updated) => setPollData(updated)} />
      )}

      {!isTextPost && !isPollPost && (
        <PostMediaViewer
          media={normalizedMedia} isLocked={post.isLocked} price={post.price}
          isPPV={post.is_ppv} isUnlockedPPV={post.is_ppv && !post.isLocked}
          onDoubleTap={engagement.handleDoubleTapLike}
          onSingleTap={handleSingleTap}
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
          <PostActions
            likes={engagement.likeCount} comments={engagement.commentCount} liked={engagement.liked}
            bookmarked={engagement.savedPost} isSubscribed={true} isOwnProfile={false}
            onLike={engagement.handleLike} onComment={engagement.handleToggleComment}
            onTip={() => setTipOpen(true)} onBookmark={engagement.handleSavePost}
          />
          <CommentSection
            postId={post.id} comments={engagement.comments}
            viewer={viewer ? { username: viewer.username, display_name: viewer.display_name, avatar_url: viewer.avatar_url } : null}
            viewerUserId={viewer?.id}
            isOpen={engagement.commentOpen} onAddComment={engagement.handleAddComment}
            onDeleteComment={engagement.handleDeleteComment} isLoading={engagement.commentsLoading}
            totalCommentCount={engagement.commentCount} onClose={engagement.closeCommentSection}
          />
        </div>
      )}
    </div>
  );
}

export const PostCard = memo(PostCardInner, (prev, next) => {
  if (prev.post.id              !== next.post.id)              return false;
  if (prev.post.liked           !== next.post.liked)           return false;
  if (prev.post.likes           !== next.post.likes)           return false;
  if (prev.post.comments        !== next.post.comments)        return false;
  if (prev.post.isLocked        !== next.post.isLocked)        return false;
  if (prev.initialSlide         !== next.initialSlide)         return false;
  if (prev.isSubscribedExternal !== next.isSubscribedExternal) return false;
  if (prev.initialSavedPost     !== next.initialSavedPost)     return false;
  if (prev.initialSavedCreator  !== next.initialSavedCreator)  return false;
  if (prev.is_renewal           !== next.is_renewal)           return false;
  return true;
});

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