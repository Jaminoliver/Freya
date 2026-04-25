"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Lock } from "lucide-react";

export interface SavedPost {
  id:            string;
  thumbnail_url: string | null;
  media_type:    "image" | "video";
  media_count?:  number;
  is_locked:     boolean;
  creator: {
    username:   string;
    name:       string;
    avatar_url: string;
  };
}

interface SavedPostGridProps {
  posts:          SavedPost[];
  onUnsave:       (ids: string[]) => void;
  selectMode:     boolean;
  selectedIds:    Set<string>;
  onToggleSelect: (id: string) => void;
  onLongPress:    (id: string) => void;
}

export default function SavedPostGrid({ posts, onUnsave, selectMode, selectedIds, onToggleSelect, onLongPress }: SavedPostGridProps) {
  const router = useRouter();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressStart = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      onLongPress(id);
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleItemClick = (id: string) => {
    if (selectMode) { onToggleSelect(id); return; }
    router.push(`/posts/${id}?from=saved`);
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px", padding: "2px" }}>
        {posts.map((post) => {
          const isSelected = selectedIds.has(post.id);
          return (
            <div
              key={post.id}
              onClick={() => handleItemClick(post.id)}
              onContextMenu={(e) => { e.preventDefault(); if (!selectMode) { onLongPress(post.id); } else { onToggleSelect(post.id); } }}
              onMouseDown={() => handlePressStart(post.id)}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={() => handlePressStart(post.id)}
              onTouchEnd={handlePressEnd}
              onTouchCancel={handlePressEnd}
              style={{
                position:                "relative",
                aspectRatio:             "1",
                backgroundColor:         "#1C1C2E",
                cursor:                  "pointer",
                overflow:                "hidden",
                outline:                 isSelected ? "3px solid #8B5CF6" : "none",
                outlineOffset:           "-3px",
                transition:              "outline 0.1s",
                userSelect:              "none",
                WebkitUserSelect:        "none",
                WebkitTouchCallout:      "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {post.thumbnail_url ? (
                <img
                  src={post.thumbnail_url}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    width:              "100%",
                    height:             "100%",
                    objectFit:          "cover",
                    transition:         "opacity 0.15s",
                    opacity:            selectMode && !isSelected ? 0.4 : 1,
                    filter:             post.is_locked && !selectMode ? "blur(12px)" : "none",
                    pointerEvents:      "none",
                    WebkitTouchCallout: "none",
                    WebkitUserSelect:   "none",
                    userSelect:         "none",
                  }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", backgroundColor: "#1C1C2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Bookmark size={20} color="#4A4A6A" />
                </div>
              )}

              {/* Lock overlay */}
              {post.is_locked && !selectMode && (
                <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Lock size={16} color="#fff" />
                </div>
              )}

              {/* Checkbox — top right, always in select mode */}
              {selectMode && (
                <div style={{
                  position:        "absolute",
                  top:             "6px",
                  right:           "6px",
                  width:           "24px",
                  height:          "24px",
                  borderRadius:    "50%",
                  backgroundColor: isSelected ? "#8B5CF6" : "rgba(0,0,0,0.55)",
                  border:          `2.5px solid ${isSelected ? "#8B5CF6" : "rgba(255,255,255,0.8)"}`,
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  transition:      "all 0.15s",
                  boxShadow:       "0 1px 4px rgba(0,0,0,0.4)",
                }}>
                  {isSelected && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              )}

              {/* Media count badge */}
              {!selectMode && post.media_count && post.media_count > 1 && (
                <div style={{ position: "absolute", top: "6px", right: "6px", backgroundColor: "rgba(0,0,0,0.6)", borderRadius: "6px", padding: "2px 6px" }}>
                  <span style={{ fontSize: "11px", color: "#FFFFFF", fontWeight: 600 }}>1/{post.media_count}</span>
                </div>
              )}

              {/* Media type icon */}
              {!selectMode && (
                <div style={{ position: "absolute", bottom: "6px", right: "6px" }}>
                  {post.media_type === "video"
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="white" opacity={0.9}><polygon points="5,3 19,12 5,21" /></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity={0.9}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}