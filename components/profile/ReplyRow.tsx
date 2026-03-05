"use client";

import * as React from "react";
import { Heart, Trash2, MoreHorizontal } from "lucide-react";
import { getRelativeTime } from "@/lib/utils/profile";
import { postSyncStore } from "@/lib/store/postSyncStore";
import { GifCommentSheet } from "@/components/profile/GifCommentSheet";
import { Avatar } from "@/components/profile/CommentAvatar";
import type { ApiComment } from "@/components/profile/CommentSection";

export function ReplyRow({ reply, postId, viewerUserId, onDeleted, onReply }: {
  reply: ApiComment; postId: string; viewerUserId?: string; onDeleted?: (id: string | number) => void; onReply?: (reply: ApiComment) => void;
}) {
  const cached      = postSyncStore.getCommentLike(postId, reply.id);
  const [liked,     setLiked]     = React.useState(cached?.liked      ?? reply.viewer_has_liked ?? false);
  const [likeCount, setLikeCount] = React.useState(cached?.like_count ?? reply.like_count);
  const [deleting,  setDeleting]  = React.useState(false);
  const [menuOpen,  setMenuOpen]  = React.useState(false);
  const [gifSheetOpen, setGifSheetOpen] = React.useState(false);
  const menuRef     = React.useRef<HTMLDivElement>(null);
  const displayName = reply.profiles?.username || "user";
  const isOwner     = viewerUserId && reply.user_id === viewerUserId;

  React.useEffect(() => {
    return postSyncStore.subscribeCommentLike((event) => {
      if (event.postId === postId && event.commentId === reply.id) {
        setLiked(event.liked);
        setLikeCount(event.like_count);
      }
    });
  }, [postId, reply.id]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLike = async () => {
    const newLiked     = !liked;
    const newLikeCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
    setLiked(newLiked);
    setLikeCount(newLikeCount);
    postSyncStore.emitCommentLike({ postId, commentId: reply.id, liked: newLiked, like_count: newLikeCount });
    try {
      const res  = await fetch(`/api/posts/${postId}/comments/${reply.id}/like`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setLiked(!newLiked); setLikeCount(likeCount);
        postSyncStore.emitCommentLike({ postId, commentId: reply.id, liked: !newLiked, like_count: likeCount });
        return;
      }
      setLiked(data.liked); setLikeCount(data.like_count);
      postSyncStore.emitCommentLike({ postId, commentId: reply.id, liked: data.liked, like_count: data.like_count });
    } catch {
      setLiked(!newLiked); setLikeCount(likeCount);
      postSyncStore.emitCommentLike({ postId, commentId: reply.id, liked: !newLiked, like_count: likeCount });
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setMenuOpen(false);
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${reply.id}/delete`, { method: "DELETE" });
      if (res.ok) onDeleted?.(reply.id);
    } catch (err) { console.error("Delete reply error:", err); }
    finally { setDeleting(false); }
  };

  return (
    <div style={{ display: "flex", gap: "8px", padding: "8px 0", borderBottom: "1px solid #0F0F1A" }}>
      {/* smaller avatar for replies */}
      <Avatar src={reply.profiles?.avatar_url} name={displayName} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>@{displayName}</span>
              {reply.reply_to_username && (
                <span style={{ fontSize: "11px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: "3px" }}>
                  <span style={{ color: "#4A4A6A" }}>▶</span>
                  <span style={{ color: "#8B5CF6" }}>@{reply.reply_to_username}</span>
                </span>
              )}
            </div>
            {reply.content && (
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#C4C4D4", lineHeight: 1.5, fontFamily: "'Inter', sans-serif", wordBreak: "break-word" }}>{reply.content}</p>
            )}
            {reply.gif_url && (
              <div
                onClick={() => setGifSheetOpen(true)}
                style={{ marginTop: "6px", borderRadius: "10px", overflow: "hidden", maxWidth: "160px", cursor: "pointer", backgroundColor: "#1C1C2E", minHeight: "60px" }}
              >
                <img src={reply.gif_url} alt="GIF" loading="eager" onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }} style={{ width: "100%", display: "block", borderRadius: "10px", opacity: 0, transition: "opacity 0.2s ease" }} />
              </div>
            )}
            {gifSheetOpen && reply.gif_url && (
              <GifCommentSheet
                gifUrl={reply.gif_url}
                onSave={async () => {
                  await fetch("/api/gifs/favorites", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ gif_id: reply.gif_url, gif_url: reply.gif_url, preview_url: reply.gif_url, title: "" }),
                  });
                }}
                onClose={() => setGifSheetOpen(false)}
              />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
              <span style={{ fontSize: "10px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>{getRelativeTime(reply.created_at)}</span>
              <button onClick={() => onReply?.(reply)} style={{ fontSize: "11px", color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 600, padding: 0 }}>Reply</button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <button onClick={handleLike} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
              <Heart size={14} fill={liked ? "#EF4444" : "none"} color={liked ? "#EF4444" : "#6B6B8A"} strokeWidth={1.8} />
              {likeCount > 0 && <span style={{ fontSize: "9px", color: liked ? "#EF4444" : "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>{likeCount}</span>}
            </button>
            {isOwner && (
              <div ref={menuRef} style={{ position: "relative" }}>
                <button onClick={() => setMenuOpen((o) => !o)} style={{ width: "24px", height: "24px", borderRadius: "6px", border: "none", background: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MoreHorizontal size={13} />
                </button>
                {menuOpen && (
                  <div style={{ position: "absolute", right: 0, top: "28px", zIndex: 9999, backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "10px", overflow: "hidden", minWidth: "130px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                    <button onClick={handleDelete} disabled={deleting}
                      style={{ width: "100%", padding: "10px 14px", border: "none", backgroundColor: "transparent", color: "#EF4444", fontSize: "13px", textAlign: "left", cursor: deleting ? "default" : "pointer", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: "8px", opacity: deleting ? 0.5 : 1 }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <Trash2 size={13} /> Delete
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