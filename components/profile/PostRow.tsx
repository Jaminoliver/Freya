"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getRelativeTime } from "@/lib/utils/profile";
import { MoreHorizontal } from "lucide-react";
import PostActions from "@/components/profile/PostActions";
import CommentSection from "@/components/profile/CommentSection";
import PostMediaViewer from "@/components/shared/PostMediaViewer";
import PostOptionsSheet from "@/components/feed/PostOptionsSheet";
import CreatorPostOptionsSheet from "@/components/profile/PostOptionsSheet";
import type { LightboxPost } from "@/components/profile/Lightbox";
import { PollDisplay } from "@/components/feed/PollDisplay";
import type { PollData } from "@/components/feed/PollDisplay";
import { useCreatorStory } from "@/lib/hooks/useCreatorStory";
import StoryViewer from "@/components/story/StoryViewer";
import { AvatarWithStoryRing } from "@/components/ui/AvatarWithStoryRing";
import type { CreatorStoryGroup } from "@/components/story/StoryBar";
import { postSyncStore } from "@/lib/store/postSyncStore";

export interface ApiPost {
  id:            number;
  content_type:  string;
  caption:       string | null;
  is_free:       boolean;
  is_ppv:        boolean;
  ppv_price:     number | null;
  like_count:    number;
  comment_count: number;
  published_at:  string;
  liked:         boolean;
  can_access:    boolean;
  locked:        boolean;
  audience:      "subscribers" | "everyone";
  poll?:         PollData | null;
  profiles: {
    id:           string;
    username:     string;
    display_name: string | null;
    avatar_url:   string | null;
    is_verified:  boolean;
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

// ── Edit Caption Modal ────────────────────────────────────────────────────────
function EditCaptionModal({ caption, onSave, onClose }: {
  caption: string;
  onSave:  (newCaption: string) => Promise<void>;
  onClose: () => void;
}) {
  const [value,  setValue]  = React.useState(caption);
  const [saving, setSaving] = React.useState(false);
  const [error,  setError]  = React.useState<string | null>(null);
  const textareaRef         = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(value.length, value.length);
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(value);
      onClose();
    } catch {
      setError("Failed to save. Try again.");
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)", padding: "16px" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: "480px", backgroundColor: "#13131F", border: "1px solid #2A2A3D", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1E1E2E", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>Edit caption</span>
          <button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <textarea ref={textareaRef} value={value} onChange={(e) => setValue(e.target.value)} rows={5} style={{ width: "100%", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "10px", color: "#E2E8F0", fontSize: "14px", lineHeight: 1.6, padding: "12px", resize: "vertical", outline: "none", fontFamily: "'Inter', sans-serif", caretColor: "#8B5CF6", boxSizing: "border-box" }} onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")} onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          {error && <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#EF4444", fontFamily: "'Inter', sans-serif" }}>{error}</p>}
        </div>
        <div style={{ padding: "0 20px 16px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #2A2A3D", backgroundColor: "transparent", color: "#94A3B8", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "9px 18px", borderRadius: "8px", border: "none", backgroundColor: saving ? "#6D4BB0" : "#8B5CF6", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Edit PPV Modal ────────────────────────────────────────────────────────────
function EditPPVModal({ currentPrice, onSave, onRemove, onClose }: {
  currentPrice: number | null;
  onSave:       (priceKobo: number) => Promise<void>;
  onRemove?:    () => Promise<void>;
  onClose:      () => void;
}) {
  const formatComma = (n: number) => n.toLocaleString("en-NG");
  const [display,  setDisplay]  = React.useState(currentPrice != null ? formatComma(currentPrice) : "");
  const [rawValue, setRawValue] = React.useState<number | null>(currentPrice);
  const [saving,   setSaving]   = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [error,    setError]    = React.useState<string | null>(null);
  const inputRef                = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "");
    const parsed = parseInt(raw, 10);
    if (raw === "") { setDisplay(""); setRawValue(null); return; }
    if (isNaN(parsed)) return;
    setRawValue(parsed);
    setDisplay(formatComma(parsed));
  };

  const handleSave = async () => {
    if (!rawValue || rawValue <= 0) { setError("Enter a valid price in ₦."); return; }
    if (saving) return;
    setSaving(true); setError(null);
    try { await onSave(Math.round(rawValue * 100)); onClose(); }
    catch { setError("Failed to save. Try again."); setSaving(false); }
  };

  const handleRemove = async () => {
    if (!onRemove || removing) return;
    setRemoving(true); setError(null);
    try { await onRemove(); onClose(); }
    catch { setError("Failed to remove. Try again."); setRemoving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)", padding: "16px" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: "480px", backgroundColor: "#13131F", border: "1px solid #2A2A3D", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1E1E2E", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>{currentPrice ? "Edit PPV price" : "Lock post & set price"}</span>
          <button onClick={onClose} style={{ width: "28px", height: "28px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>{currentPrice ? "Update the price fans pay to unlock this post." : "Set a price to lock this post as pay-per-view."}</p>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#8B5CF6", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>₦</span>
            <input ref={inputRef} type="text" inputMode="numeric" placeholder="e.g. 10,000" value={display} onChange={handleChange} style={{ width: "100%", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "10px", color: "#E2E8F0", fontSize: "14px", padding: "12px 12px 12px 28px", outline: "none", fontFamily: "'Inter', sans-serif", caretColor: "#8B5CF6", boxSizing: "border-box" }} onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")} onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
          </div>
          {error && <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#EF4444", fontFamily: "'Inter', sans-serif" }}>{error}</p>}
        </div>
        <div style={{ padding: "0 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          {currentPrice && onRemove ? (
            <button onClick={handleRemove} disabled={removing} style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #EF4444", backgroundColor: "transparent", color: "#EF4444", fontSize: "13px", fontWeight: 600, cursor: removing ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", opacity: removing ? 0.7 : 1 }}>{removing ? "Removing..." : "Make free"}</button>
          ) : <div />}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #2A2A3D", backgroundColor: "transparent", color: "#94A3B8", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: "9px 18px", borderRadius: "8px", border: "none", backgroundColor: saving ? "#6D4BB0" : "#8B5CF6", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : currentPrice ? "Update price" : "Lock post"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main PostRow ──────────────────────────────────────────────────────────────
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

  const [commentOpen,      setCommentOpen]      = React.useState(false);
  const [sheetOpen,        setSheetOpen]        = React.useState(false);
  const [creatorSheetOpen, setCreatorSheetOpen] = React.useState(false);
  const [liked,            setLiked]            = React.useState(post.liked);
  const [likeCount,        setLikeCount]        = React.useState(post.like_count);
  const [comments,         setComments]         = React.useState<any[]>([]);
  const [commentsLoading,  setCommentsLoading]  = React.useState(true);
  const [commentCount,     setCommentCount]     = React.useState(post.comment_count);
  const [pollData,         setPollData]         = React.useState<PollData | null>(post.poll ?? null);
  const [caption,          setCaption]          = React.useState<string | null>(post.caption);
  const [editOpen,         setEditOpen]         = React.useState(false);
  const [savedPost,        setSavedPost]        = React.useState(false);
  const [savedCreator,     setSavedCreator]     = React.useState(false);
  const [ppvEditOpen,      setPpvEditOpen]      = React.useState(false);
  const [ppvPrice,         setPpvPrice]         = React.useState<number | null>(post.ppv_price);
  const [isPPV,            setIsPPV]            = React.useState(post.is_ppv);

  React.useEffect(() => { setPpvPrice(post.ppv_price); setIsPPV(post.is_ppv); }, [post.ppv_price, post.is_ppv]);

  React.useEffect(() => {
    if (isOwnProfile) return;
    Promise.all([
      fetch(`/api/saved/posts?post_id=${post.id}`)
        .then((r) => r.json()).then((d) => setSavedPost(d.saved ?? false)).catch(() => {}),
      fetch(`/api/saved/creators?creator_id=${post.profiles.id}`)
        .then((r) => r.json()).then((d) => setSavedCreator(d.saved ?? false)).catch(() => {}),
    ]);
  }, [post.id, post.profiles.id, isOwnProfile]);

  // Listen to postSyncStore — sync likes from PostCard or other PostRows
  React.useEffect(() => {
    const unsub = postSyncStore.subscribe((event) => {
      if (String(event.postId) !== String(post.id)) return;
      setLiked(event.liked);
      setLikeCount(event.like_count);
      if (event.comment_count !== undefined) setCommentCount(event.comment_count);
    });
    return unsub;
  }, [post.id]);

  const handleOpenFanSheet = React.useCallback(() => {
    setSheetOpen(true);
  }, []);

  const isLiking   = React.useRef(false);
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

  // Sync caption and poll from props only
  React.useEffect(() => {
    setPollData(post.poll ?? null);
    setCaption(post.caption);
  }, [post.poll, post.caption]);

  React.useEffect(() => {
    fetch(`/api/posts/${post.id}/comments`)
      .then((r) => r.json())
      .then((d) => { if (d.comments) setComments(d.comments); })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [post.id]);

  const handleAddComment = React.useCallback(async (
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
      postSyncStore.emit({ postId: String(post.id), liked, like_count: likeCount, comment_count: newCount });
      return newCount;
    });
    if (!parent_comment_id) {
      const d = await fetch(`/api/posts/${id}/comments`).then((r) => r.json());
      if (d.comments) setComments(d.comments);
    }
  }, [post.id, liked, likeCount]);

  const handleLike = async () => {
    if (isLiking.current) return;
    isLiking.current = true;

    // Snapshot for rollback
    const wasLiked = liked;
    const oldCount = likeCount;
    const newLiked = !wasLiked;
    const newCount = newLiked ? oldCount + 1 : Math.max(0, oldCount - 1);

    // Optimistic update
    setLiked(newLiked);
    setLikeCount(newCount);
    postSyncStore.emit({ postId: String(post.id), liked: newLiked, like_count: newCount, comment_count: commentCount });

    try {
      const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setLiked(data.liked);
        setLikeCount(data.like_count);
        postSyncStore.emit({ postId: String(post.id), liked: data.liked, like_count: data.like_count, comment_count: commentCount });
        onLike?.(String(post.id));
      } else {
        // Rollback
        setLiked(wasLiked);
        setLikeCount(oldCount);
        postSyncStore.emit({ postId: String(post.id), liked: wasLiked, like_count: oldCount, comment_count: commentCount });
      }
    } catch {
      // Rollback
      setLiked(wasLiked);
      setLikeCount(oldCount);
      postSyncStore.emit({ postId: String(post.id), liked: wasLiked, like_count: oldCount, comment_count: commentCount });
    }

    isLiking.current = false;
  };

  const handleDoubleTapLike = async () => {
    if (liked || isLiking.current) return;
    isLiking.current = true;

    const oldCount = likeCount;

    setLiked(true);
    setLikeCount(oldCount + 1);
    postSyncStore.emit({ postId: String(post.id), liked: true, like_count: oldCount + 1, comment_count: commentCount });

    try {
      const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLiked(data.liked);
        setLikeCount(data.like_count);
        postSyncStore.emit({ postId: String(post.id), liked: data.liked, like_count: data.like_count, comment_count: commentCount });
        onLike?.(String(post.id));
      } else {
        setLiked(false);
        setLikeCount(oldCount);
        postSyncStore.emit({ postId: String(post.id), liked: false, like_count: oldCount, comment_count: commentCount });
      }
    } catch {
      setLiked(false);
      setLikeCount(oldCount);
      postSyncStore.emit({ postId: String(post.id), liked: false, like_count: oldCount, comment_count: commentCount });
    }

    isLiking.current = false;
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/posts/${post.id}/delete`, { method: "POST" });
    if (res.ok) onDelete?.(String(post.id));
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

  const handleSingleTap = () => {
    if (firstMedia?.media_type !== "video") onImageClick?.(post, 0);
  };

  const handleSavePost = React.useCallback(async () => {
    const next = !savedPost; setSavedPost(next);
    try { await fetch("/api/saved/posts", { method: next ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: post.id }) }); }
    catch { setSavedPost(!next); }
  }, [savedPost, post.id]);

  const handleSaveCreator = React.useCallback(async () => {
    const next = !savedCreator; setSavedCreator(next);
    try { await fetch("/api/saved/creators", { method: next ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creator_id: post.profiles.id }) }); }
    catch { setSavedCreator(!next); }
  }, [savedCreator, post.profiles.id]);

  const handleAvatarClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwnProfile && hasUnviewed && storyGroup) {
      setStoryViewerOpen(true);
    }
  }, [isOwnProfile, hasUnviewed, storyGroup]);

  const isTextPost = post.content_type === "text";
  const isPollPost = post.content_type === "poll";

  return (
    <div style={{ borderBottom: "1px solid #1A1A2E" }}>

      {storyViewerOpen && storyGroup && (
        <StoryViewer
          groups={[storyGroup]}
          startGroupIndex={0}
          onClose={() => { setStoryViewerOpen(false); refresh(); }}
        />
      )}

      {editOpen && <EditCaptionModal caption={caption ?? ""} onSave={handleSaveCaption} onClose={() => setEditOpen(false)} />}
      {ppvEditOpen && <EditPPVModal currentPrice={ppvPrice != null ? ppvPrice / 100 : null} onSave={handleSavePPV} onRemove={isPPV ? handleRemovePPV : undefined} onClose={() => setPpvEditOpen(false)} />}

      {!isOwnProfile && (
        <PostOptionsSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSavePost={handleSavePost}
          onSaveCreator={handleSaveCreator}
          onNotInterested={() => console.log("not interested")}
          onReport={() => console.log("report")}
          onBlockCreator={() => console.log("block creator")}
          savedPost={savedPost}
          savedCreator={savedCreator}
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

      {/* Header */}
      <div style={{ padding: "16px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <AvatarWithStoryRing
            src={post.profiles?.avatar_url ?? null}
            alt={post.profiles?.display_name || post.profiles?.username || ""}
            size={48}
            hasStory={!isOwnProfile && hasStory}
            hasUnviewed={!isOwnProfile && hasUnviewed}
            onClick={handleAvatarClick}
          />
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>{post.profiles?.display_name || post.profiles?.username}</div>
            <div style={{ fontSize: "12px", color: "#6B6B8A" }}>@{post.profiles?.username}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isOwnProfile && isPPV && ppvPrice ? (
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#fff", backgroundColor: "#8B5CF6", borderRadius: "6px", padding: "2px 7px", fontFamily: "'Inter', sans-serif", letterSpacing: "0.02em" }}>
              PPV · ₦{(ppvPrice / 100).toLocaleString("en-NG")}
            </span>
          ) : null}
          <span style={{ fontSize: "12px", color: "#6B6B8A" }}>{getRelativeTime(post.published_at)}</span>
          <button
            onClick={() => isOwnProfile ? setCreatorSheetOpen(true) : handleOpenFanSheet()}
            style={{ width: "30px", height: "30px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {caption && (
        <p style={{ fontSize: isTextPost ? "15px" : "14px", color: "#C4C4D4", lineHeight: isTextPost ? 1.7 : 1.6, margin: "0", padding: isTextPost ? "0 16px 14px" : "0 16px 10px", whiteSpace: "pre-wrap" }}>
          {caption}
        </p>
      )}

      {isTextPost && <div style={{ margin: "0 16px 4px", height: "1px", backgroundColor: "#1A1A2E" }} />}

      {isPollPost && pollData && (
        <PollDisplay poll={pollData} postId={String(post.id)} onVoted={(updated) => setPollData(updated)} />
      )}

      {viewerMedia.length > 0 && (
        <PostMediaViewer media={viewerMedia} isLocked={post.locked} price={ppvPrice} isUnlockedPPV={post.is_ppv && !post.locked} onDoubleTap={handleDoubleTapLike} onSingleTap={handleSingleTap} onUnlock={() => onUnlock?.(String(post.id))} />
      )}

      {!post.locked && (
        <div style={{ padding: "0 16px" }}>
          <PostActions likes={likeCount} comments={commentCount} liked={liked} bookmarked={savedPost} isSubscribed={isSubscribed} isFree={isFreePost} isOwnProfile={isOwnProfile} onLike={handleLike} onComment={() => setCommentOpen((p) => !p)} onTip={() => onTip?.(String(post.id))} onBookmark={handleSavePost} />
        </div>
      )}

      <CommentSection postId={String(post.id)} comments={comments} viewer={viewer ? { username: viewer.username, display_name: viewer.display_name, avatar_url: viewer.avatar_url } : { username: "", display_name: "", avatar_url: "" }} viewerUserId={viewer?.id} isOpen={commentOpen} onAddComment={handleAddComment} isLoading={commentsLoading} totalCommentCount={commentCount} onClose={() => setCommentOpen(false)} />
    </div>
  );
}