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
  onBookmark?:    () => void;
  onTipDetails?:  () => void;
}

export default function PostActions({
  likes, comments, tips,
  liked = false,
  bookmarked: bookmarkedProp = false,
  isSubscribed, isFree = false, isOwnProfile = false,
  onLike, onComment, onTip, onBookmark, onTipDetails,
}: PostActionsProps) {
  const bookmarked = bookmarkedProp;

  // canLike removed — guard handled by parent

  const handleLike = () => {
    onLike?.();
  };

  const handleBookmark = () => {
    onBookmark?.();
  };

  const tipsNaira      = (tips ?? 0) / 100;
  const showTipsEarned = tips !== undefined && tips > 0;
  const tipsFormatted  = tipsNaira.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const compact = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 10_000)    return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return n.toString();
  };
  const compactNaira = (n: number) => {
    if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 10_000)    return `₦${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return `₦${n.toLocaleString("en-NG")}`;
  };

  return (
    <div style={{ padding: "0", fontFamily: "'Inter', sans-serif" }}>

      <div ref={(el) => { if (el) console.log('[PostActions] actions left:', el.getBoundingClientRect().left); }} style={{ display: "flex", alignItems: "center", gap: "20px", paddingLeft: "5px" }}>

        {/* Like */}
        <button
          onClick={handleLike}
          
          style={{
  display: "flex", alignItems: "center", gap: "6px",
  background: "none", border: "none", padding: 0,
  color: "#C4C4D4", fontSize: "14px", fontWeight: 300,
  fontFamily: "'Inter', sans-serif",
  cursor: "pointer",
  transition: "color 0.15s",
}}
        >
          <Heart size={22} fill={liked ? "#EC4899" : "none"} strokeWidth={1.0} />
          <span>{compact(likes)}</span>
        </button>

        {/* Comment */}
        <button
          onClick={onComment}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "none", border: "none", padding: 0,
            color: "#C4C4D4",
            fontSize: "14px", fontWeight: 300,
            fontFamily: "'Inter', sans-serif",
            cursor: "pointer",
            transition: "color 0.15s",
          }}
        >
          <MessageCircle size={22} strokeWidth={1.0} />
          <span>{compact(comments)}</span>
        </button>

        {isOwnProfile && showTipsEarned && (
          <button onClick={onTipDetails} style={{ fontSize: "12px", color: "#9D8FBF", background: "rgba(139,92,246,0.10)", borderRadius: "999px", padding: "2px 8px", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>{compactNaira(tipsNaira)} tipped</button>
        )}
        {/* Tip — hidden on own profile */}
        {!isOwnProfile && (
          <button
            onClick={onTip}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "none", border: "none", padding: 0,
              color: "#C4C4D4", fontSize: "14px", fontWeight: 300,
              fontFamily: "'Inter', sans-serif",
              cursor: "pointer", transition: "color 0.15s",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.0" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 12 20 22 4 22 4 12"/>
              <rect x="2" y="7" width="20" height="5"/>
              <line x1="12" y1="22" x2="12" y2="7"/>
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
            {showTipsEarned && (
  <span style={{ fontSize: "12px", color: "#9D8FBF", background: "rgba(139,92,246,0.10)", borderRadius: "999px", padding: "2px 8px" }}>{compactNaira(tipsNaira)} tipped</span>
)}
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
          <Bookmark size={22} fill={bookmarked ? "#8B5CF6" : "none"} strokeWidth={1.0} />
        </button>
      </div>

      {/* Tips earned — creator + subscribers only, when > 0 */}
      
    <div style={{
        marginTop: "12px",
        height: "1px",
        background: "#1A1A2E",
        borderRadius: "0 0 12px 12px",
        marginLeft: "-20px",
        marginRight: "-20px",
      }} />
    </div>
  );
}