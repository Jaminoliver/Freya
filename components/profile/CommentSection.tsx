"use client";

import * as React from "react";
import { Send, Heart, Trash2, MoreHorizontal } from "lucide-react";

const QUICK_EMOJIS = ["😊", "😄", "🤣", "😜", "😆", "😝", "😂", "😁", "🥰", "🤩", "💋"];

interface ApiComment {
  id: string | number;
  content: string;
  created_at: string;
  like_count: number;
  user_id: string;
  viewer_has_liked?: boolean; // ← new: backend should return this
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface CommentSectionProps {
  postId: string;
  comments: ApiComment[];
  viewer?: { username: string; display_name: string; avatar_url?: string } | null;
  viewerUserId?: string;
  onAddComment?: (postId: string, text: string) => Promise<void>;
  isOpen?: boolean;
}

function getRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs  < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

function Avatar({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, backgroundColor: "#2A2A3D", overflow: "hidden", border: "1.5px solid #1E1E2E" }}>
      {src
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: size * 0.38, fontWeight: 700, color: "#8B5CF6" }}>{name.charAt(0).toUpperCase()}</span>
          </div>
      }
    </div>
  );
}

// localStorage helpers for like persistence fallback
function getLikeKey(postId: string, commentId: string | number) {
  return `comment_liked:${postId}:${commentId}`;
}
function getStoredLike(postId: string, commentId: string | number): boolean | null {
  try {
    const val = localStorage.getItem(getLikeKey(postId, commentId));
    if (val === null) return null;
    return val === "1";
  } catch { return null; }
}
function setStoredLike(postId: string, commentId: string | number, liked: boolean) {
  try {
    localStorage.setItem(getLikeKey(postId, commentId), liked ? "1" : "0");
  } catch { /* ignore */ }
}

function CommentRow({
  comment, postId, viewerUserId, onDeleted,
}: {
  comment: ApiComment;
  postId: string;
  viewerUserId?: string;
  onDeleted?: (id: string | number) => void;
}) {
  // Determine initial liked state:
  // 1. Use viewer_has_liked from API if present
  // 2. Fall back to localStorage
  // 3. Default false
  const initialLiked = React.useMemo(() => {
    if (comment.viewer_has_liked !== undefined) return comment.viewer_has_liked;
    const stored = getStoredLike(postId, comment.id);
    return stored !== null ? stored : false;
  }, [comment.id, comment.viewer_has_liked, postId]);

  const [liked,     setLiked]     = React.useState(initialLiked);
  const [likeCount, setLikeCount] = React.useState(comment.like_count);
  const [deleting,  setDeleting]  = React.useState(false);
  const [menuOpen,  setMenuOpen]  = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const displayName = comment.profiles?.display_name || comment.profiles?.username || "User";
  const isOwner     = viewerUserId && comment.user_id === viewerUserId;

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => newLiked ? c + 1 : Math.max(0, c - 1));
    setStoredLike(postId, comment.id, newLiked); // persist immediately
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${comment.id}/like`, { method: "POST" });
      if (!res.ok) {
        setLiked(!newLiked);
        setLikeCount((c) => newLiked ? Math.max(0, c - 1) : c + 1);
        setStoredLike(postId, comment.id, !newLiked); // revert stored
      }
    } catch {
      setLiked(!newLiked);
      setLikeCount((c) => newLiked ? Math.max(0, c - 1) : c + 1);
      setStoredLike(postId, comment.id, !newLiked); // revert stored
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setMenuOpen(false);
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${comment.id}/delete`, { method: "DELETE" });
      if (res.ok) onDeleted?.(comment.id);
    } catch (err) {
      console.error("Delete comment error:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "10px", padding: "10px 0", borderBottom: "1px solid #13131F" }}>
      <Avatar src={comment.profiles?.avatar_url} name={displayName} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>{displayName}</span>
            <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#C4C4D4", lineHeight: 1.5, fontFamily: "'Inter', sans-serif", wordBreak: "break-word" }}>{comment.content}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "6px" }}>
              <span style={{ fontSize: "11px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>{getRelativeTime(comment.created_at)}</span>
              <button style={{ fontSize: "11px", color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 600, padding: 0 }}>Reply</button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {/* Like button */}
            <button onClick={handleLike} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
              <Heart size={16} fill={liked ? "#EF4444" : "none"} color={liked ? "#EF4444" : "#6B6B8A"} strokeWidth={1.8} />
              {likeCount > 0 && <span style={{ fontSize: "10px", color: liked ? "#EF4444" : "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>{likeCount}</span>}
            </button>
            {/* ••• menu for owner */}
            {isOwner && (
              <div ref={menuRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  style={{ width: "28px", height: "28px", borderRadius: "6px", border: "none", background: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <MoreHorizontal size={15} />
                </button>
                {menuOpen && (
                  <div style={{ position: "absolute", right: 0, top: "32px", zIndex: 50, backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "10px", overflow: "hidden", minWidth: "130px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{ width: "100%", padding: "10px 14px", border: "none", backgroundColor: "transparent", color: "#EF4444", fontSize: "13px", textAlign: "left", cursor: deleting ? "default" : "pointer", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: "8px", opacity: deleting ? 0.5 : 1 }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommentSection({ postId, comments: propComments, viewer, viewerUserId, onAddComment, isOpen = false }: CommentSectionProps) {
  const PREVIEW_COUNT = 3;
  const [showAll,       setShowAll]       = React.useState(false);
  const [hidden,        setHidden]        = React.useState(false);
  const [text,          setText]          = React.useState("");
  const [localComments, setLocalComments] = React.useState<ApiComment[]>(propComments);

  React.useEffect(() => {
    setLocalComments(propComments);
  }, [propComments]);

  if (!isOpen) return null;

  const displayed = hidden ? [] : showAll ? localComments : localComments.slice(0, PREVIEW_COUNT);
  const hasMore   = localComments.length > PREVIEW_COUNT;

  const handleDeleted = (id: string | number) => {
    setLocalComments((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !viewer) return;
    const optimistic: ApiComment = {
      id: `local-${Date.now()}`,
      content: trimmed,
      created_at: new Date().toISOString(),
      like_count: 0,
      user_id: viewerUserId || "",
      viewer_has_liked: false,
      profiles: { username: viewer.username, display_name: viewer.display_name, avatar_url: viewer.avatar_url || null },
    };
    setLocalComments((prev) => [optimistic, ...prev]);
    setText("");
    setShowAll(true);
    setHidden(false);
    await onAddComment?.(postId, trimmed);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", marginTop: "4px" }}>
      {/* Emoji row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 0 10px", overflowX: "auto", scrollbarWidth: "none" }}>
        <button style={{ padding: "5px 10px", borderRadius: "8px", border: "1px solid #2A2A3D", backgroundColor: "#1C1C2E", color: "#8A8AA0", fontSize: "12px", fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "'Inter', sans-serif" }}>GIF</button>
        {QUICK_EMOJIS.map((emoji) => (
          <button key={emoji} onClick={() => setText((p) => p + emoji)} style={{ fontSize: "22px", background: "none", border: "none", cursor: "pointer", flexShrink: 0, lineHeight: 1, padding: "2px", borderRadius: "6px", transition: "transform 0.1s" }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >{emoji}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <Avatar src={viewer?.avatar_url} name={viewer?.display_name || "You"} size={36} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", backgroundColor: "#13131F", border: "1px solid #2A2A3D", borderRadius: "24px", padding: "10px 14px", gap: "8px" }}>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKey} placeholder="Add a comment…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "13px", color: "#E2E8F0", fontFamily: "'Inter', sans-serif", caretColor: "#8B5CF6" }}
          />
          <button onClick={handleSend} disabled={!text.trim()}
            style={{ background: "none", border: "none", cursor: text.trim() ? "pointer" : "default", color: text.trim() ? "#8B5CF6" : "#3A3A4D", display: "flex", alignItems: "center", justifyContent: "center", padding: "2px", transition: "color 0.15s" }}
          >
            <Send size={17} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Comment list */}
      {!hidden && displayed.map((c) => (
        <CommentRow
          key={c.id}
          comment={c}
          postId={postId}
          viewerUserId={viewerUserId}
          onDeleted={handleDeleted}
        />
      ))}

      {/* No comments */}
      {!hidden && localComments.length === 0 && (
        <p style={{ fontSize: "13px", color: "#4A4A6A", textAlign: "center", padding: "12px 0" }}>No comments yet. Be the first!</p>
      )}

      {/* View more / Hide */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "10px" }}>
        {hasMore && !hidden && !showAll && (
          <button onClick={() => setShowAll(true)} style={{ fontSize: "13px", color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
            View more comments
          </button>
        )}
        <button onClick={() => { setHidden(!hidden); if (hidden) setShowAll(false); }}
          style={{ fontSize: "13px", color: "#6B6B8A", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          {hidden ? "Show comments" : "Hide comments"}
        </button>
      </div>
    </div>
  );
}