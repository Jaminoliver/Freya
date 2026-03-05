"use client";

import * as React from "react";
import { Heart, Trash2, MoreHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { getRelativeTime } from "@/lib/utils/profile";
import { postSyncStore } from "@/lib/store/postSyncStore";
import { GifCommentSheet } from "@/components/profile/GifCommentSheet";
import { Avatar } from "@/components/profile/CommentAvatar";
import { ReplyRow } from "@/components/profile/ReplyRow";
import type { ApiComment } from "@/components/profile/CommentSection";

export function CommentRow({ comment, postId, viewerUserId, onDeleted, onReply }: {
  comment: ApiComment; postId: string; viewerUserId?: string;
  onDeleted?: (id: string | number) => void;
  onReply?: (comment: ApiComment) => void;
}) {
  const cached      = postSyncStore.getCommentLike(postId, comment.id);
  const [liked,     setLiked]     = React.useState(cached?.liked      ?? comment.viewer_has_liked ?? false);
  const [likeCount, setLikeCount] = React.useState(cached?.like_count ?? comment.like_count);
  const [deleting,  setDeleting]  = React.useState(false);
  const [menuOpen,  setMenuOpen]  = React.useState(false);
  const [gifSheetOpen, setGifSheetOpen] = React.useState(false);

  // Replies state
  const [repliesOpen,   setRepliesOpen]   = React.useState(false);
  const [replies,       setReplies]       = React.useState<ApiComment[]>([]);
  const [loadingReplies, setLoadingReplies] = React.useState(false);
  const [repliesFetched, setRepliesFetched] = React.useState(false);
  const [replyCount,    setReplyCount]    = React.useState(comment.reply_count ?? 0);

  React.useEffect(() => { setReplyCount(comment.reply_count ?? 0); }, [comment.reply_count]);

  const menuRef     = React.useRef<HTMLDivElement>(null);
  const displayName = comment.profiles?.username || "user";
  const isOwner     = viewerUserId && comment.user_id === viewerUserId;

  React.useEffect(() => {
    return postSyncStore.subscribeCommentLike((event) => {
      if (event.postId === postId && event.commentId === comment.id) {
        setLiked(event.liked);
        setLikeCount(event.like_count);
      }
    });
  }, [postId, comment.id]);

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
    postSyncStore.emitCommentLike({ postId, commentId: comment.id, liked: newLiked, like_count: newLikeCount });
    try {
      const res  = await fetch(`/api/posts/${postId}/comments/${comment.id}/like`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setLiked(!newLiked); setLikeCount(likeCount);
        postSyncStore.emitCommentLike({ postId, commentId: comment.id, liked: !newLiked, like_count: likeCount });
        return;
      }
      setLiked(data.liked); setLikeCount(data.like_count);
      postSyncStore.emitCommentLike({ postId, commentId: comment.id, liked: data.liked, like_count: data.like_count });
    } catch {
      setLiked(!newLiked); setLikeCount(likeCount);
      postSyncStore.emitCommentLike({ postId, commentId: comment.id, liked: !newLiked, like_count: likeCount });
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setMenuOpen(false);
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${comment.id}/delete`, { method: "DELETE" });
      if (res.ok) onDeleted?.(comment.id);
    } catch (err) { console.error("Delete comment error:", err); }
    finally { setDeleting(false); }
  };

  // Lazy fetch — only fires when user taps "View replies"
  const handleToggleReplies = async () => {
    if (!repliesFetched) {
      setLoadingReplies(true);
      try {
        const res  = await fetch(`/api/posts/${postId}/comments/${comment.id}/replies`);
        const data = await res.json();
        if (res.ok) {
          setReplies(data.replies ?? []);
          setReplyCount(data.replies?.length ?? replyCount);
        }
      } catch (err) { console.error("Fetch replies error:", err); }
      finally { setLoadingReplies(false); setRepliesFetched(true); }
    }
    setRepliesOpen((o) => !o);
  };

  const handleReplyDeleted = (id: string | number) => {
    setReplies((prev) => prev.filter((r) => r.id !== id));
    setReplyCount((c) => Math.max(0, c - 1));
  };

  // Called from parent when a reply is sent to this comment
  const addOptimisticReply = (reply: ApiComment) => {
    setReplies((prev) => [...prev, reply]);
    setReplyCount((c) => c + 1);
    setRepliesFetched(true);
    setRepliesOpen(true);
  };

  // Expose addOptimisticReply via ref trick so parent can call it
  const addOptimisticReplyRef = React.useRef(addOptimisticReply);
  addOptimisticReplyRef.current = addOptimisticReply;

  // Register with parent
  const refetchReplies = React.useCallback(async () => {
    try {
      const res  = await fetch(`/api/posts/${postId}/comments/${comment.id}/replies`);
      const data = await res.json();
      if (res.ok) {
        setReplies(data.replies ?? []);
        setRepliesFetched(true);
      }
    } catch (err) { console.error("Refetch replies error:", err); }
  }, [postId, comment.id]);

  React.useEffect(() => {
    (comment as any)._addReply = (reply: ApiComment) => addOptimisticReplyRef.current(reply);
    (comment as any)._refetchReplies = refetchReplies;
  }, [comment, refetchReplies]);

  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid #13131F" }}>
      <div style={{ display: "flex", gap: "10px" }}>
        <Avatar src={comment.profiles?.avatar_url} name={displayName} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>@{displayName}</span>
              {comment.content && (
                <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#C4C4D4", lineHeight: 1.5, fontFamily: "'Inter', sans-serif", wordBreak: "break-word" }}>{comment.content}</p>
              )}
              {comment.gif_url && (
                <div onClick={() => setGifSheetOpen(true)} style={{ marginTop: "6px", borderRadius: "10px", overflow: "hidden", maxWidth: "200px", cursor: "pointer", backgroundColor: "#1C1C2E", minHeight: "80px" }}>
                  <img src={comment.gif_url} alt="GIF" loading="eager" onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }} style={{ width: "100%", display: "block", borderRadius: "10px", opacity: 0, transition: "opacity 0.2s ease" }} />
                </div>
              )}
              {gifSheetOpen && comment.gif_url && (
                <GifCommentSheet
                  gifUrl={comment.gif_url}
                  onSave={async () => {
                    await fetch("/api/gifs/favorites", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ gif_id: comment.gif_url, gif_url: comment.gif_url, preview_url: comment.gif_url, title: "" }),
                    });
                  }}
                  onClose={() => setGifSheetOpen(false)}
                />
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "6px" }}>
                <span style={{ fontSize: "11px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>{getRelativeTime(comment.created_at)}</span>
                <button
                  onClick={() => onReply?.(comment)}
                  style={{ fontSize: "11px", color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 600, padding: 0 }}
                >Reply</button>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              <button onClick={handleLike} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
                <Heart size={16} fill={liked ? "#EF4444" : "none"} color={liked ? "#EF4444" : "#6B6B8A"} strokeWidth={1.8} />
                {likeCount > 0 && <span style={{ fontSize: "10px", color: liked ? "#EF4444" : "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>{likeCount}</span>}
              </button>
              {isOwner && (
                <div ref={menuRef} style={{ position: "relative" }}>
                  <button onClick={() => setMenuOpen((o) => !o)} style={{ width: "28px", height: "28px", borderRadius: "6px", border: "none", background: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MoreHorizontal size={15} />
                  </button>
                  {menuOpen && (
                    <div style={{ position: "absolute", right: 0, top: "32px", zIndex: 9999, backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "10px", overflow: "hidden", minWidth: "130px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
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

      {/* View Replies toggle — only shown if replies exist */}
      {replyCount > 0 && (
        <button
          onClick={handleToggleReplies}
          style={{ marginLeft: "46px", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: 0, color: "#8B5CF6", fontSize: "12px", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}
        >
          {loadingReplies
            ? <span style={{ color: "#4A4A6A" }}>Loading…</span>
            : <>
                {repliesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {repliesOpen ? "Hide replies" : `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
              </>
          }
        </button>
      )}

      {/* Replies — indented with left border line */}
      {repliesOpen && replies.length > 0 && (
        <div style={{ marginLeft: "46px", marginTop: "8px", paddingLeft: "12px", borderLeft: "2px solid #2A2A3D" }}>
          {replies.map((r) => (
            <ReplyRow key={r.id} reply={r} postId={postId} viewerUserId={viewerUserId} onDeleted={handleReplyDeleted}
              onReply={(reply) => {
                // Thread reply-to-reply flat under this parent comment
                // Pass reply_to_name so the ► tag shows who they're replying to
                const asParent: ApiComment = {
                  ...comment,
                  reply_to_username: reply.profiles?.username || "user",
                };
                onReply?.(asParent);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}