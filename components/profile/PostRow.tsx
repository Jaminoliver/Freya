// components/profile/PostRow.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import dynamic from "next/dynamic";

import PostActions from "@/components/profile/PostActions";
import CommentSection from "@/components/profile/CommentSection";
import PostMediaViewer from "@/components/shared/PostMediaViewer";
import PostTextViewer from "@/components/shared/PostTextViewer";
import PostOptionsSheet from "@/components/feed/PostOptionsSheet";
import CreatorPostOptionsSheet from "@/components/profile/PostOptionsSheet";
import PostHeader from "@/components/shared/PostHeader";
import EditCaptionModal from "@/components/profile/EditCaptionModal";
import EditPPVModal from "@/components/profile/EditPPVModal";
import { PollDisplay } from "@/components/feed/PollDisplay";

import { useCreatorStory } from "@/lib/hooks/useCreatorStory";
import { useRelativeTimestamp } from "@/lib/hooks/useRelativeTimestamp";
import { usePostEngagement } from "@/lib/hooks/usePostEngagement";

import type { LightboxPost } from "@/components/profile/Lightbox";
import type { PollData } from "@/components/feed/PollDisplay";

const StoryViewer = dynamic(() => import("@/components/story/StoryViewer"), { ssr: false });

export interface ApiPost {
  id:              number;
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
  audience:        "subscribers" | "everyone";
  poll?:           PollData | null;
  saved_post?:     boolean;
  saved_creator?:  boolean;
  tip_total?:      number;
  profiles: {
    id:                 string;
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
    locked:            boolean;
    display_order:     number;
    processing_status: string | null;
    bunny_video_id:    string | null;
    width?:            number | null;
    height?:           number | null;
    aspect_ratio?:     number | null;
    blur_hash?:        string | null;
  }[];
}

export default function PostRow({
  post, isOwnProfile, isSubscribed,
  onLike, onComment, onTip, onUnlock,
  viewer, onDelete, onImageClick, onPPVUpdated,
}: {
  post:          ApiPost;
  isOwnProfile?: boolean;
  isSubscribed:  boolean;
  onLike?:       (id: string) => void;
  onComment?:    (id: string) => void;
  onTip?:        (id: string) => void;
  onUnlock?:     (id: string) => void;
  viewer:        { id: string; username: string; display_name: string; avatar_url: string } | null;
  onDelete?:     (id: string) => void;
  onImageClick?: (post: LightboxPost, index: number) => void;
  onPPVUpdated?: (id: string, priceKobo: number) => void;
}) {
  const router = useRouter();

  const { group: storyGroup, hasStory, hasUnviewed, refresh } = useCreatorStory(
    isOwnProfile ? undefined : post.profiles?.id
  );
  const [storyViewerOpen, setStoryViewerOpen] = React.useState(false);

  const timestamp = useRelativeTimestamp(post.published_at);

  const engagement = usePostEngagement({
    postId:              String(post.id),
    creatorId:           post.profiles.id,
    initialLiked:        post.liked,
    initialLikeCount:    post.like_count,
    initialCommentCount: post.comment_count,
    initialSavedPost:    post.saved_post    ?? false,
    initialSavedCreator: post.saved_creator ?? false,
    onLikeSuccess:       onLike,
  });

  const [sheetOpen,        setSheetOpen]        = React.useState(false);
  const [creatorSheetOpen, setCreatorSheetOpen] = React.useState(false);
  const [pollData,         setPollData]         = React.useState<PollData | null>(post.poll ?? null);
  const [caption,          setCaption]          = React.useState<string | null>(post.caption);
  const [editOpen,         setEditOpen]         = React.useState(false);
  const [ppvEditOpen,      setPpvEditOpen]      = React.useState(false);
  const [ppvPrice,         setPpvPrice]         = React.useState<number | null>(post.ppv_price);
  const [isPPV,            setIsPPV]            = React.useState(post.is_ppv);

  React.useEffect(() => { setPpvPrice(post.ppv_price); setIsPPV(post.is_ppv); }, [post.ppv_price, post.is_ppv]);

  React.useEffect(() => {
    setPollData(post.poll ?? null);
    setCaption(post.caption);
  }, [post.poll, post.caption]);

  const handleOpenFanSheet = React.useCallback(() => { setSheetOpen(true); }, []);

  const firstMedia = post.media?.[0];
  const isFreePost = post.audience === "everyone";

  const viewerMedia = React.useMemo(() => {
    if (!post.media?.length) return [];
    return post.media.map((m) => ({
      type: m.media_type as "video" | "image", url: m.file_url ?? null,
      bunnyVideoId: m.bunny_video_id ?? null, thumbnailUrl: m.thumbnail_url ?? null,
      processingStatus: m.processing_status ?? null, rawVideoUrl: m.raw_video_url ?? null,
      blurHash: m.blur_hash ?? null, width: m.width ?? null, height: m.height ?? null, aspectRatio: m.aspect_ratio ?? null,
    }));
  }, [post.media]);

  const handleDelete = async () => {
    const res = await fetch(`/api/posts/${post.id}/delete`, { method: "POST" });
    if (!res.ok) throw new Error("Failed");
    onDelete?.(String(post.id));
  };

  const handleSaveCaption = async (newCaption: string) => {
    const res = await fetch(`/api/posts/${post.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption: newCaption }) });
    if (!res.ok) throw new Error("Failed");
    setCaption(newCaption || null);
  };

  const handleSavePPV = async (priceKobo: number) => {
    const res = await fetch(`/api/posts/${post.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_ppv: true, ppv_price: priceKobo }) });
    if (!res.ok) throw new Error("Failed");
    setPpvPrice(priceKobo); setIsPPV(true);
    onPPVUpdated?.(String(post.id), priceKobo);
  };

  const handleRemovePPV = async () => {
    const res = await fetch(`/api/posts/${post.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_ppv: false, ppv_price: null }) });
    if (!res.ok) throw new Error("Failed");
    setPpvPrice(null); setIsPPV(false);
    onPPVUpdated?.(String(post.id), 0);
  };

  const handleSingleTap = (index: number) => {
    console.log("[PostRow] handleSingleTap", { index, postId: post.id });
    const item = post.media?.filter((m) => !m.locked)[index];
    console.log("[PostRow] item at index", item);
    if (!item || item.media_type === "video") return;
    const photoMedia = post.media?.filter((m) => !m.locked && m.media_type !== "video") ?? [];
    const photoIndex = photoMedia.findIndex((p) => p.id === item.id);
    console.log("[PostRow] photoIndex", photoIndex);
    if (photoIndex >= 0) onImageClick?.(post, photoIndex);
  };

  const handleAvatarClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwnProfile && hasUnviewed && storyGroup) setStoryViewerOpen(true);
  }, [isOwnProfile, hasUnviewed, storyGroup]);

  const handleOpenMoreMenu = () => {
    if (isOwnProfile) setCreatorSheetOpen(true);
    else handleOpenFanSheet();
  };

  const isTextPost = post.content_type === "text";
  const isPollPost = post.content_type === "poll";

  // ── Header right slot: PPV badge (own profile only) + more button ──────
  const rightSlot = (
    <>
      {isOwnProfile && isPPV && ppvPrice ? (
        <span style={{
          fontSize: "11px", fontWeight: 600,
          color: "#8B5CF6",
          backgroundColor: "rgba(139, 92, 246, 0.15)",
          border: "1px solid rgba(139, 92, 246, 0.35)",
          borderRadius: "999px",
          padding: "2px 10px",
          fontFamily: "'Inter', sans-serif",
          letterSpacing: "0.02em",
        }}>
          PPV · ₦{(ppvPrice / 100).toLocaleString("en-NG")}
        </span>
      ) : null}
      <button
        onClick={handleOpenMoreMenu}
        style={{
          width: "30px", height: "30px", borderRadius: "6px", border: "none",
          backgroundColor: "transparent", color: "#C4C4D4", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <MoreHorizontal size={18} />
      </button>
    </>
  );

  return (
    <div id={`post-${post.id}`} style={{ borderBottom: "1px solid #1A1A2E" }}>

      {storyViewerOpen && storyGroup && (
        <StoryViewer groups={[storyGroup]} startGroupIndex={0} onClose={() => { setStoryViewerOpen(false); refresh(); }} />
      )}

      {editOpen && <EditCaptionModal caption={caption ?? ""} onSave={handleSaveCaption} onClose={() => setEditOpen(false)} />}
      {ppvEditOpen && <EditPPVModal currentPrice={ppvPrice != null ? ppvPrice / 100 : null} onSave={handleSavePPV} onRemove={isPPV ? handleRemovePPV : undefined} onClose={() => setPpvEditOpen(false)} />}

      {!isOwnProfile && (
        <PostOptionsSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSavePost={engagement.handleSavePost}
          onSaveCreator={engagement.handleSaveCreator}
          onNotInterested={() => console.log("not interested")}
          onReport={() => console.log("report")}
          onBlockCreator={() => console.log("block creator")}
          savedPost={engagement.savedPost}
          savedCreator={engagement.savedCreator}
        />
      )}

      {isOwnProfile && (
        <CreatorPostOptionsSheet
          isOpen={creatorSheetOpen}
          onClose={() => setCreatorSheetOpen(false)}
          onEdit={() => setEditOpen(true)}
          onDelete={handleDelete}
          onEditPPV={() => setPpvEditOpen(true)}
        />
      )}

      <PostHeader
        avatarUrl={post.profiles?.avatar_url ?? null}
        displayName={post.profiles?.display_name || post.profiles?.username || ""}
        username={post.profiles?.username || ""}
        isVerified={!!post.profiles?.is_verified}
        timestamp={timestamp}
        hasStory={!isOwnProfile && hasStory}
        hasUnviewedStory={!isOwnProfile && hasUnviewed}
        onAvatarClick={handleAvatarClick}
        rightSlot={rightSlot}
      />

      {caption && !isTextPost && (
        <p style={{ fontSize: "16px", color: "#FFFFFF", lineHeight: 1.6, margin: "0", padding: "0 16px 10px", whiteSpace: "pre-wrap" }}>
          {caption}
        </p>
      )}

      {isTextPost && caption && (
        <PostTextViewer caption={caption} textBackground={post.text_background} />
      )}

      {isPollPost && pollData && (
        <PollDisplay poll={pollData} postId={String(post.id)} isCreator={isOwnProfile} onVoted={(updated) => setPollData(updated)} />
      )}

      {viewerMedia.length > 0 && (
        <PostMediaViewer
          media={viewerMedia}
          isLocked={post.locked && !isOwnProfile}
          price={ppvPrice}
          isPPV={isPPV}
          isFreeSubscription={(post.profiles.subscription_price ?? 0) === 0}
          isUnlockedPPV={isPPV && !post.locked}
          onDoubleTap={engagement.handleDoubleTapLike}
          onSingleTap={handleSingleTap}
          onUnlock={() => onUnlock?.(String(post.id))}
        />
      )}

      {(!post.locked || (isSubscribed && !post.is_ppv) || isOwnProfile) && (
        <div style={{ padding: "0 16px" }}>
          <PostActions
            likes={engagement.likeCount}
            comments={engagement.commentCount}
            tips={(isOwnProfile || isSubscribed) ? post.tip_total : undefined}
            liked={engagement.liked}
            bookmarked={engagement.savedPost}
            isSubscribed={isSubscribed}
            isFree={isFreePost}
            isOwnProfile={isOwnProfile}
            onLike={engagement.handleLike}
            onComment={engagement.handleToggleComment}
            onTip={() => onTip?.(String(post.id))}
            onBookmark={engagement.handleSavePost}
          />
        </div>
      )}

      <CommentSection
        postId={String(post.id)}
        comments={engagement.comments}
        viewer={viewer ? { username: viewer.username, display_name: viewer.display_name, avatar_url: viewer.avatar_url } : { username: "", display_name: "", avatar_url: "" }}
        viewerUserId={viewer?.id}
        isOpen={engagement.commentOpen}
        onAddComment={engagement.handleAddComment}
        onDeleteComment={engagement.handleDeleteComment}
        isLoading={engagement.commentsLoading}
        totalCommentCount={engagement.commentCount}
        onClose={engagement.closeCommentSection}
      />
    </div>
  );
}