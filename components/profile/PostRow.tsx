"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getRelativeTime } from "@/lib/utils/profile";
import { MoreHorizontal } from "lucide-react";
import PostActions from "@/components/profile/PostActions";
import CommentSection from "@/components/profile/CommentSection";
import PostMediaViewer from "@/components/shared/PostMediaViewer";
import type { LightboxPost } from "@/components/profile/Lightbox";
import { PollDisplay } from "@/components/feed/PollDisplay";
import type { PollData } from "@/components/feed/PollDisplay";

export interface ApiPost {
  id:           number;
  content_type: string;
  caption:      string | null;
  is_free:      boolean;
  is_ppv:       boolean;
  ppv_price:    number | null;
  like_count:   number;
  comment_count: number;
  published_at: string;
  liked:        boolean;
  can_access:   boolean;
  locked:       boolean;
  poll?:        PollData | null;
  profiles: {
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
  }[];
}

// ── Post menu ─────────────────────────────────────────────────────────────────
function PostMenu({ onEdit, onDelete, onShare }: {
  onEdit:   () => void;
  onDelete: () => void;
  onShare:  () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: "30px", height: "30px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "36px", zIndex: 50, backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "10px", overflow: "hidden", minWidth: "160px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
          {[
            { label: "Edit caption", action: onEdit,   danger: false },
            { label: "Share post",   action: onShare,  danger: false },
            { label: "Delete post",  action: onDelete, danger: true  },
          ].map((item, i, arr) => (
            <button
              key={item.label}
              onClick={() => { item.action(); setOpen(false); }}
              style={{ width: "100%", padding: "10px 14px", border: "none", backgroundColor: "transparent", color: item.danger ? "#EF4444" : "#C4C4D4", fontSize: "13px", textAlign: "left", cursor: "pointer", fontFamily: "'Inter', sans-serif", borderBottom: i < arr.length - 1 ? "1px solid #2A2A3D" : "none" }}
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

// ── Main PostRow ──────────────────────────────────────────────────────────────
export default function PostRow({
  post,
  isOwnProfile,
  isSubscribed,
  onLike,
  onComment,
  onTip,
  onUnlock,
  viewer,
  onDelete,
  onImageClick,
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
}) {
  const router = useRouter();

  const [commentOpen,  setCommentOpen]  = React.useState(false);
  const [liked,        setLiked]        = React.useState(post.liked);
  const [likeCount,    setLikeCount]    = React.useState(post.like_count);
  const [comments,     setComments]     = React.useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = React.useState(true);
  const [commentCount, setCommentCount] = React.useState(post.comment_count);
  const [pollData,     setPollData]     = React.useState<PollData | null>(post.poll ?? null);
  const isLiking = React.useRef(false);

  const firstMedia = post.media?.[0];

  const viewerMedia = React.useMemo(() => {
    if (!post.media?.length) return [];
    return post.media.map((m) => ({
      type:             m.media_type as "video" | "image",
      url:              m.file_url ?? null,
      bunnyVideoId:     m.bunny_video_id ?? null,
      thumbnailUrl:     m.thumbnail_url ?? null,
      processingStatus: m.processing_status ?? null,
      rawVideoUrl:      m.raw_video_url ?? null,
    }));
  }, [post.media]);

  React.useEffect(() => {
    setLiked(post.liked);
    setLikeCount(post.like_count);
    setCommentCount(post.comment_count);
    setPollData(post.poll ?? null);
  }, [post.liked, post.like_count, post.comment_count, post.poll]);

  // Pre-fetch comments on mount so sheet opens instantly
  React.useEffect(() => {
    fetch(`/api/posts/${post.id}/comments`)
      .then((r) => r.json())
      .then((d) => { if (d.comments) setComments(d.comments); })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [post.id]);

  // ── Updated: passes parent_comment_id for replies ─────────────────────────
  const handleAddComment = React.useCallback(async (
    id: string,
    text: string,
    gif_url?: string,
    parent_comment_id?: string | number,
    reply_to_username?: string | null
  ) => {
    await fetch(`/api/posts/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content:            text,
        gif_url:            gif_url ?? null,
        parent_comment_id:  parent_comment_id ?? null,
        reply_to_username:  reply_to_username ?? null,
      }),
    });
    // Only refresh top-level comments (replies handled inside CommentSection)
    if (!parent_comment_id) {
      setCommentCount((c) => c + 1);
      const d = await fetch(`/api/posts/${id}/comments`).then((r) => r.json());
      if (d.comments) setComments(d.comments);
    }
  }, []);

  const handleLike = async () => {
    if (isLiking.current) return;
    isLiking.current = true;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => newLiked ? c + 1 : Math.max(0, c - 1));
    const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    const data = await res.json();
    if (res.ok) { setLiked(data.liked); setLikeCount(data.like_count); onLike?.(String(post.id)); }
    isLiking.current = false;
  };

  const handleDoubleTapLike = async () => {
    if (liked || isLiking.current) return;
    isLiking.current = true;
    setLiked(true);
    setLikeCount((c) => c + 1);
    const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    const data = await res.json();
    if (res.ok) { setLiked(data.liked); setLikeCount(data.like_count); onLike?.(String(post.id)); }
    isLiking.current = false;
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) onDelete?.(String(post.id));
  };

  const handleSingleTap = () => {
    if (firstMedia?.media_type !== "video") {
      onImageClick?.(post, 0);
    }
  };

  const isTextPost = post.content_type === "text";
  const isPollPost = post.content_type === "poll";

  return (
    <div style={{ borderBottom: "1px solid #1A1A2E" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {post.profiles?.avatar_url
            ? <img src={post.profiles.avatar_url} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} />
            : <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#2A2A3D", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#8B5CF6" }}>
                  {(post.profiles?.display_name || post.profiles?.username || "?").charAt(0).toUpperCase()}
                </span>
              </div>
          }
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>{post.profiles?.display_name || post.profiles?.username}</div>
            <div style={{ fontSize: "12px", color: "#6B6B8A" }}>@{post.profiles?.username}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#6B6B8A" }}>{getRelativeTime(post.published_at)}</span>
          {isOwnProfile
            ? <PostMenu onEdit={() => {}} onDelete={handleDelete} onShare={() => {}} />
            : <button style={{ width: "30px", height: "30px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MoreHorizontal size={16} />
              </button>
          }
        </div>
      </div>

      {/* Caption */}
      {post.caption && (
        <p style={{
          fontSize:   isTextPost ? "15px" : "14px",
          color:      "#C4C4D4",
          lineHeight: isTextPost ? 1.7 : 1.6,
          margin:     "0",
          padding:    isTextPost ? "0 16px 14px" : "0 16px 10px",
          whiteSpace: "pre-wrap",
        }}>
          {post.caption}
        </p>
      )}

      {isTextPost && (
        <div style={{ margin: "0 16px 4px", height: "1px", backgroundColor: "#1A1A2E" }} />
      )}

      {isPollPost && pollData && (
        <PollDisplay
          poll={pollData}
          postId={String(post.id)}
          onVoted={(updated) => setPollData(updated)}
        />
      )}

      {viewerMedia.length > 0 && (
        <PostMediaViewer
          media={viewerMedia}
          isLocked={post.locked}
          price={post.ppv_price}
          onDoubleTap={handleDoubleTapLike}
          onSingleTap={handleSingleTap}
          onUnlock={() => onUnlock?.(String(post.id))}
        />
      )}

      {!post.locked && (
        <div style={{ padding: "0 16px" }}>
          <PostActions
            likes={likeCount}
            comments={commentCount}
            liked={liked}
            isSubscribed={isSubscribed}
            isOwnProfile={isOwnProfile}
            onLike={handleLike}
            onComment={() => setCommentOpen((p) => !p)}
            onTip={() => onTip?.(String(post.id))}
            onBookmark={() => {}}
          />
        </div>
      )}

      <CommentSection
        postId={String(post.id)}
        comments={comments}
        viewer={viewer ? { username: viewer.username, display_name: viewer.display_name, avatar_url: viewer.avatar_url } : { username: "", display_name: "", avatar_url: "" }}
        viewerUserId={viewer?.id}
        isOpen={commentOpen}
        onAddComment={handleAddComment}
        onClose={() => setCommentOpen(false)}
      />
    </div>
  );
}