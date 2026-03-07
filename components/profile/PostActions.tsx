"use client";

import * as React from "react";
import { Heart, MessageCircle, Bookmark, DollarSign } from "lucide-react";

interface PostActionsProps {
  likes: number;
  comments: number;
  tips?: number;
  liked?: boolean;
  bookmarked?: boolean;
  isSubscribed: boolean;
  isOwnProfile?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onTip?: () => void;
  onBookmark?: () => void;
}

export default function PostActions({
  likes, comments, tips = 0, liked: likedProp = false,
  bookmarked: bookmarkedProp = false,
  isSubscribed, isOwnProfile = false,
  onLike, onComment, onTip, onBookmark,
}: PostActionsProps) {
  const [liked,      setLiked]      = React.useState(likedProp);
  const [bookmarked, setBookmarked] = React.useState(bookmarkedProp);
  const [likeCount,  setLikeCount]  = React.useState(likes);

  React.useEffect(() => {
    setLiked(likedProp);
    setLikeCount(likes);
  }, [likedProp, likes]);

  React.useEffect(() => {
    setBookmarked(bookmarkedProp);
  }, [bookmarkedProp]);

  const handleLike = () => {
    if (!isSubscribed && !isOwnProfile) return;
    const next = liked ? likeCount - 1 : likeCount + 1;
    setLiked(!liked);
    setLikeCount(next);
    onLike?.();
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    onBookmark?.();
  };

  const canLike = isSubscribed || isOwnProfile;

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
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 14px", borderRadius: "10px",
              border: "1px solid #2A2A3D", background: "transparent",
              color: "#8B5CF6", fontSize: "13px", fontWeight: 700,
              cursor: "pointer", transition: "all 0.15s",
              fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <DollarSign size={16} strokeWidth={2} />
            SEND TIP
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
          {likeCount.toLocaleString()} likes
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

      {/* Subscribe nudge */}
      {!isSubscribed && !isOwnProfile && (
        <p style={{ margin: "8px 0 0 4px", fontSize: "12px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>
          Subscribe to like this post
        </p>
      )}
    </div>
  );
}