// components/profile/PostActions.tsx
"use client";

import * as React from "react";
import { Heart, MessageCircle, Bookmark } from "lucide-react";

interface PostActionsProps {
  likes:         number;
  comments:      number;
  tips?:         number; // kobo
  liked?:        boolean;
  bookmarked?:   boolean;
  isSubscribed:  boolean;
  isFree?:       boolean;
  isOwnProfile?: boolean;
  onLike?:       () => void;
  onComment?:    () => void;
  onTip?:        () => void;
  onBookmark?:   () => void;
}

export default function PostActions({
  likes, comments, tips,
  liked = false,
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

  const tipsNaira      = (tips ?? 0) / 100;
  const showTipsEarned = tips !== undefined && tips > 0;
  const tipsFormatted  = tipsNaira.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <div style={{ padding: "8px 0 20px", fontFamily: "'Inter', sans-serif" }}>

      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>

        {/* Like */}
        <button
          onClick={handleLike}
          title={canLike ? "Like" : "Subscribe to like"}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "none", border: "none", padding: 0,
            color: liked ? "#EC4899" : "#C4C4D4",
            fontSize: "14px", fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            cursor: canLike ? "pointer" : "not-allowed",
            transition: "color 0.15s",
          }}
        >
          <Heart size={22} fill={liked ? "#EC4899" : "none"} strokeWidth={1.8} />
          <span>{likes.toLocaleString()}</span>
        </button>

        {/* Comment */}
        <button
          onClick={onComment}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "none", border: "none", padding: 0,
            color: "#C4C4D4",
            fontSize: "14px", fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            cursor: "pointer",
            transition: "color 0.15s",
          }}
        >
          <MessageCircle size={22} strokeWidth={1.8} />
          <span>{comments.toLocaleString()}</span>
        </button>

        {/* Tip — hidden on own profile */}
        {!isOwnProfile && (
          <button
            onClick={onTip}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "7px 14px", borderRadius: "999px",
              background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
              border: "none",
              color: "#FFFFFF", fontSize: "13px", fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 12 20 22 4 22 4 12"/>
              <rect x="2" y="7" width="20" height="5"/>
              <line x1="12" y1="22" x2="12" y2="7"/>
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
            <span>Tip</span>
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Bookmark — far right */}
        <button
          onClick={handleBookmark}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", padding: 0,
            color: bookmarked ? "#8B5CF6" : "#C4C4D4",
            cursor: "pointer",
            transition: "color 0.15s",
          }}
        >
          <Bookmark size={22} fill={bookmarked ? "#8B5CF6" : "none"} strokeWidth={1.8} />
        </button>
      </div>

      {/* Tips earned — creator + subscribers only, when > 0 */}
      {showTipsEarned && (
  <div style={{
    marginTop: "6px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#8B5CF6",
    fontFamily: "'Inter', sans-serif",
  }}>
    Tipped ₦{tipsFormatted}
  </div>
)}
    </div>
  );
}