"use client";

import * as React from "react";
import { Heart, MessageCircle, Bookmark } from "lucide-react";

interface PostActionsProps {
  likes: number;
  comments: number;
  tips?: number;
  liked?: boolean;
  bookmarked?: boolean;
  isSubscribed: boolean;
  isFree?: boolean;
  isOwnProfile?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onTip?: () => void;
  onBookmark?: () => void;
}

export default function PostActions({
  likes, comments, tips = 0, liked = false,
  bookmarked: bookmarkedProp = false,
  isSubscribed, isFree = false, isOwnProfile = false,
  onLike, onComment, onTip, onBookmark,
}: PostActionsProps) {
  const [bookmarked, setBookmarked] = React.useState(bookmarkedProp);

  React.useEffect(() => {
    setBookmarked(bookmarkedProp);
  }, [bookmarkedProp]);

  const canLike = isSubscribed || isOwnProfile || isFree;

  const handleLike = () => {
    if (!canLike) return;
    onLike?.();
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    onBookmark?.();
  };

  return (
    <div style={{ padding: "4px 0 4px", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Icon row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>

        {/* Like */}
        <button
          onClick={handleLike}
          title={canLike ? "Like" : "Subscribe to like"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "38px", height: "38px", borderRadius: "10px", border: "none",
            background: liked ? "rgba(239,68,68,0.1)" : "transparent",
            color: liked ? "#EF4444" : "#6B6B8A",
            cursor: canLike ? "pointer" : "not-allowed",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { if (canLike && !liked) e.currentTarget.style.backgroundColor = "#1C1C2E"; }}
          onMouseLeave={(e) => { if (!liked) e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <Heart size={24} fill={liked ? "#EF4444" : "none"} strokeWidth={1.8} />
        </button>

        {/* Comment */}
        <button
          onClick={onComment}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "38px", height: "38px", borderRadius: "10px", border: "none",
            background: "transparent", color: "#6B6B8A", cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <MessageCircle size={24} strokeWidth={1.8} />
        </button>

        {/* Send Tip */}
        {!isOwnProfile && (
          <button
            onClick={onTip}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "8px 16px", borderRadius: "999px",
              background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
              border: "none", cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 12 20 22 4 22 4 12"/>
              <rect x="2" y="7" width="20" height="5"/>
              <line x1="12" y1="22" x2="12" y2="7"/>
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>Send Tip</span>
          </button>
        )}

        {/* Bookmark — pushed to right */}
        <button
          onClick={handleBookmark}
          style={{
            marginLeft: "auto",
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "38px", height: "38px", borderRadius: "10px", border: "none",
            background: bookmarked ? "rgba(139,92,246,0.1)" : "transparent",
            color: bookmarked ? "#8B5CF6" : "#6B6B8A",
            cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { if (!bookmarked) e.currentTarget.style.backgroundColor = "#1C1C2E"; }}
          onMouseLeave={(e) => { if (!bookmarked) e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <Bookmark size={22} fill={bookmarked ? "#8B5CF6" : "none"} strokeWidth={1.8} />
        </button>
      </div>

      {/* ── Stats line ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", paddingLeft: "4px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#C4C4D4" }}>
          {likes.toLocaleString()} likes
        </span>
        <span style={{ fontSize: "13px", color: "#4A4A6A" }}>·</span>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#C4C4D4" }}>
          {comments.toLocaleString()} comments
        </span>
        {tips > 0 && (
          <>
            <span style={{ fontSize: "13px", color: "#4A4A6A" }}>·</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#8B5CF6" }}>
              ${tips.toFixed(2)} tips
            </span>
          </>
        )}
      </div>

      {/* Subscribe nudge — only for locked posts */}
      {!isSubscribed && !isOwnProfile && !isFree && (
        <p style={{ margin: "8px 0 0 4px", fontSize: "12px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>
          Subscribe to like this post
        </p>
      )}
    </div>
  );
}