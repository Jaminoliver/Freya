"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getRelativeTime } from "@/lib/utils/profile";
import { MoreHorizontal, Lock } from "lucide-react";
import PostActions from "@/components/profile/PostActions";
import CommentSection from "@/components/profile/CommentSection";
import VideoPlayer, { getBunnyThumbnail } from "@/components/video/VideoPlayer";
import ImageCarousel from "@/components/profile/ImageCarousel";
import DoubleTapLike from "@/components/shared/DoubleTapLike";
import type { LightboxPost } from "@/components/profile/Lightbox";

export interface ApiPost {
  id: number;
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
  };
  media: {
    id: number;
    media_type: string;
    file_url: string | null;
    thumbnail_url: string | null;
    raw_video_url: string | null;
    locked: boolean;
    display_order: number;
    processing_status: string | null;
    bunny_video_id: string | null;
    width?: number | null;
    height?: number | null;
  }[];
}

function useMediaHeight() {
  const [height, setHeight] = React.useState("auto");
  React.useEffect(() => {
    const update = () => setHeight(window.innerWidth >= 768 ? "460px" : "auto");
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return height;
}

function useThumbAspectRatio(src: string | undefined): { ratio: string; isPortrait: boolean } {
  const [ratio,      setRatio]      = React.useState("9/16");
  const [isPortrait, setIsPortrait] = React.useState(true);

  React.useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w && h) {
        setRatio(`${w}/${h}`);
        setIsPortrait(h > w);
      }
    };
    img.src = src;
  }, [src]);

  return { ratio, isPortrait };
}

function PostMenu({ onEdit, onDelete, onShare }: {
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
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

export default function PostRow({ post, isOwnProfile, isSubscribed, onLike, onComment, onTip, onUnlock, viewer, onDelete, onImageClick }: {
  post: ApiPost;
  isOwnProfile?: boolean;
  isSubscribed: boolean;
  onLike?: (id: string) => void;
  onComment?: (id: string) => void;
  onTip?: (id: string) => void;
  onUnlock?: (id: string) => void;
  viewer: { id: string; username: string; display_name: string; avatar_url: string } | null;
  onDelete?: (id: string) => void;
  onImageClick?: (post: LightboxPost, index: number) => void;
}) {
  const mediaHeight  = useMediaHeight();
  const router       = useRouter();
  const [commentOpen,  setCommentOpen]  = React.useState(false);
  const [liked,        setLiked]        = React.useState(post.liked);
  const [likeCount,    setLikeCount]    = React.useState(post.like_count);
  const [comments,     setComments]     = React.useState<any[]>([]);
  const [commentCount, setCommentCount] = React.useState(post.comment_count);
  const [thumbReady,   setThumbReady]   = React.useState(!post.media?.[0]);
  const isLiking = React.useRef(false);

  const firstMedia   = post.media?.[0];
  const isLocked     = post.locked;
  const isVideo      = firstMedia?.media_type === "video";
  const isMultiPhoto = !isVideo && (post.media?.length ?? 0) > 1;
  const photoMedia   = post.media?.filter((m) => !m.locked && m.media_type !== "video") ?? [];

  const videoThumbUrl: string | undefined = firstMedia?.bunny_video_id
    ? getBunnyThumbnail(firstMedia.bunny_video_id)
    : (firstMedia?.thumbnail_url ?? undefined);

  const lockedThumb: string | undefined = firstMedia
    ? firstMedia.media_type === "video" && firstMedia.bunny_video_id
      ? getBunnyThumbnail(firstMedia.bunny_video_id)
      : ((firstMedia as any).locked_preview_url ?? undefined)
    : undefined;

  const { ratio: videoRatio, isPortrait } = useThumbAspectRatio(videoThumbUrl);

  React.useEffect(() => {
    setLiked(post.liked);
    setLikeCount(post.like_count);
    setCommentCount(post.comment_count);
  }, [post.liked, post.like_count, post.comment_count]);

  React.useEffect(() => {
    if (!commentOpen) return;
    fetch(`/api/posts/${post.id}/comments`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { if (d.comments) { setComments(d.comments); setCommentCount(d.comments.length); } })
      .catch((err) => console.error("[Comments] Fetch error:", err));
  }, [commentOpen, post.id]);

  const handleAddComment = React.useCallback(async (id: string, text: string) => {
    await fetch(`/api/posts/${id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text }) });
    const d = await fetch(`/api/posts/${id}/comments`).then((r) => r.json());
    if (d.comments) { setComments(d.comments); setCommentCount(d.comments.length); }
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

  const videoContainerStyle: React.CSSProperties = isPortrait
    ? {
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#000",
        width: "100%",
        aspectRatio: "9/16",
        maxHeight: "min(75svh, 520px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }
    : {
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#000",
        width: "100%",
        aspectRatio: "16/9",
        maxHeight: "520px",
      };

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
        <p style={{ fontSize: "14px", color: "#C4C4D4", lineHeight: 1.6, margin: "0", padding: "0 16px 10px" }}>
          {post.caption}
        </p>
      )}

      {/* Media */}
      {firstMedia && (
        isLocked ? (
          <div style={{ position: "relative", overflow: "hidden", width: "100%", minHeight: lockedThumb ? undefined : "220px", backgroundColor: "#0A0A0F" }}>
            {lockedThumb && (
              <img
                src={lockedThumb}
                alt=""
                onLoad={() => setThumbReady(true)}
                onError={() => setThumbReady(true)}
                style={{ width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", filter: "blur(16px)", transform: "scale(1.05)", display: "block" }}
              />
            )}
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(10,10,15,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", minHeight: lockedThumb ? undefined : "220px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(139,92,246,0.2)", border: "1.5px solid #8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lock size={18} color="#8B5CF6" />
              </div>
              <button
                onClick={() => onUnlock?.(String(post.id))}
                style={{ padding: "8px 20px", borderRadius: "8px", backgroundColor: "#8B5CF6", border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
              >
                {post.ppv_price ? `Unlock for ₦${(post.ppv_price / 100).toLocaleString("en-NG")}` : "Subscribe to unlock"}
              </button>
            </div>
          </div>

        ) : isVideo ? (
          <DoubleTapLike onDoubleTap={handleDoubleTapLike} style={{ width: "100%" }}>
            <div style={videoContainerStyle}>
              <VideoPlayer
                bunnyVideoId={firstMedia.bunny_video_id ?? null}
                thumbnailUrl={firstMedia.thumbnail_url ?? null}
                processingStatus={firstMedia.processing_status ?? null}
                rawVideoUrl={firstMedia.raw_video_url ?? null}
                fillParent={isPortrait}
              />
            </div>
          </DoubleTapLike>

        ) : isMultiPhoto ? (
          <DoubleTapLike onDoubleTap={handleDoubleTapLike} style={{ width: "100%" }}>
            <ImageCarousel
              media={photoMedia}
              onImageClick={(index) => onImageClick?.(post, index)}
            />
          </DoubleTapLike>

        ) : (
          <DoubleTapLike onSingleTap={() => onImageClick?.(post, 0)} onDoubleTap={handleDoubleTapLike} style={{ width: "100%" }}>
            <div style={{ position: "relative", overflow: "hidden", backgroundColor: "#000", width: "100%", cursor: "zoom-in" }}>
              {firstMedia.file_url && (
                <>
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "80px", backgroundImage: `url(${firstMedia.file_url})`, backgroundSize: "cover", backgroundPosition: "left center", filter: "blur(16px) brightness(0.7)", transform: "scaleX(1.3)", opacity: 0.9 }} />
                  <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "80px", backgroundImage: `url(${firstMedia.file_url})`, backgroundSize: "cover", backgroundPosition: "right center", filter: "blur(16px) brightness(0.7)", transform: "scaleX(1.3)", opacity: 0.9 }} />
                  <img
                    src={firstMedia.file_url}
                    alt=""
                    onLoad={() => setThumbReady(true)}
                    onError={() => setThumbReady(true)}
                    style={{ position: "relative", zIndex: 1, width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", display: "block" }}
                  />
                </>
              )}
            </div>
          </DoubleTapLike>
        )
      )}

      {/* Actions */}
      {!isLocked && (
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