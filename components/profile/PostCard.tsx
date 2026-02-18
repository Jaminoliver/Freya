import * as React from "react";
import { getRelativeTime } from "@/lib/utils/profile";
import type { Post } from "@/lib/types/profile";

export interface PostCardProps {
  post: Post;
  isLocked?: boolean;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onTip?: (postId: string) => void;
  onUnlock?: (postId: string) => void;
  className?: string;
}

export function PostCard({
  post,
  isLocked = false,
  onLike,
  onComment,
  onTip,
  onUnlock,
  className,
}: PostCardProps) {
  const [isLiked, setIsLiked] = React.useState(false);
  const [showFullContent, setShowFullContent] = React.useState(false);

  const contentPreview = post.content.length > 200
    ? post.content.slice(0, 200) + "..."
    : post.content;

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.(post.id);
  };

  const firstLetter = (post.author.display_name || post.author.username || "?").charAt(0).toUpperCase();

  return (
    <div
      style={{
        backgroundColor: "#13131F",
        borderRadius: "12px",
        border: "1px solid #1E1E2E",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
        marginBottom: "16px",
      }}
      className={className}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Avatar */}
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: post.author.avatar_url
                ? `url(${post.author.avatar_url}) center/cover no-repeat`
                : "linear-gradient(135deg, #8B5CF6, #EC4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              fontWeight: 700,
              color: "#FFFFFF",
              flexShrink: 0,
            }}
          >
            {!post.author.avatar_url && firstLetter}
          </div>

          {/* Name + dot + timestamp */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "15px", fontWeight: 600, color: "#F1F5F9" }}>
                {post.author.display_name || post.author.username}
              </span>
              {/* Online dot */}
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#8B5CF6", flexShrink: 0 }} />
            </div>
            <span style={{ fontSize: "13px", color: "#64748B" }}>
              {getRelativeTime(post.created_at)}
            </span>
          </div>
        </div>

        {/* Right: three dots */}
        <button
          style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", padding: "4px", display: "flex", alignItems: "center" }}
          aria-label="More options"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Post Text */}
      <div style={{ padding: "0 16px 12px" }}>
        <p style={{ fontSize: "15px", color: "#E2E8F0", lineHeight: "1.6", margin: 0, whiteSpace: "pre-wrap" }}>
          {showFullContent ? post.content : contentPreview}
        </p>
        {post.content.length > 200 && (
          <button
            onClick={() => setShowFullContent(!showFullContent)}
            style={{ fontSize: "13px", color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", padding: "4px 0 0", fontFamily: "'Inter', sans-serif" }}
          >
            {showFullContent ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      {/* Pin icon row */}
      {post.is_pinned && (
        <div style={{ padding: "0 16px 8px", display: "flex", justifyContent: "flex-end" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5">
            <path d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7z" />
          </svg>
        </div>
      )}

      {/* Media - full width */}
      {post.media && post.media.length > 0 && !isLocked && (
        <div style={{
          display: "grid",
          gridTemplateColumns: post.media.length === 1 ? "1fr" : "1fr 1fr",
          gap: "2px",
        }}>
          {post.media.map((mediaItem, index) => (
            <div
              key={index}
              style={{
                position: "relative",
                aspectRatio: post.media!.length === 1 ? "4/3" : "1",
                overflow: "hidden",
                gridColumn: post.media!.length === 3 && index === 0 ? "span 2" : undefined,
              }}
            >
              {mediaItem.type === "image" ? (
                <img
                  src={mediaItem.url}
                  alt={`Post media ${index + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <video
                  src={mediaItem.url}
                  controls
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Locked overlay */}
      {isLocked && (
        <div style={{ margin: "0 16px 12px", padding: "32px", backgroundColor: "#1F1F2A", borderRadius: "10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <svg width="28" height="28" fill="none" stroke="#64748B" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span style={{ fontSize: "14px", color: "#64748B" }}>Subscribe to unlock this post</span>
          <button
            onClick={() => onUnlock?.(post.id)}
            style={{ padding: "8px 20px", borderRadius: "8px", backgroundColor: "#8B5CF6", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
          >
            Unlock
          </button>
        </div>
      )}

      {/* Engagement Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #1E1E2E" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* Like */}
          <button
            onClick={handleLike}
            disabled={isLocked}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: isLocked ? "default" : "pointer", color: isLiked ? "#EC4899" : "#64748B", fontFamily: "'Inter', sans-serif" }}
          >
            <svg width="18" height="18" fill={isLiked ? "#EC4899" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span style={{ fontSize: "13px" }}>{post.likes}</span>
          </button>

          {/* Comment */}
          <button
            onClick={() => onComment?.(post.id)}
            disabled={isLocked}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: isLocked ? "default" : "pointer", color: "#64748B", fontFamily: "'Inter', sans-serif" }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span style={{ fontSize: "13px" }}>{post.comments}</span>
          </button>

          {/* Tip */}
          <button
            onClick={() => onTip?.(post.id)}
            disabled={isLocked}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: isLocked ? "default" : "pointer", color: "#64748B", fontFamily: "'Inter', sans-serif" }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {/* Share */}
        <button
          style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", display: "flex", alignItems: "center" }}
          aria-label="Share"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>
    </div>
  );
}