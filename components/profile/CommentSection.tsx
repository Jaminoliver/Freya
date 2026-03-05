"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Send, Heart, Trash2, MoreHorizontal, X, Star, ChevronDown, ChevronUp } from "lucide-react";
import { postSyncStore } from "@/lib/store/postSyncStore";
import { GifItem, GifPicker } from "@/components/gif/GifComponents";

const QUICK_EMOJIS = ["😊", "😄", "🤣", "😜", "😆", "😝", "😂", "😁", "🥰", "🤩", "💋"];

interface ApiComment {
  id: string | number;
  content: string;
  gif_url?: string | null;
  created_at: string;
  like_count: number;
  user_id: string;
  viewer_has_liked?: boolean;
  reply_count?: number;
  reply_to_username?: string | null;
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
  onAddComment?: (postId: string, text: string, gif_url?: string, parent_comment_id?: string | number, reply_to_username?: string | null) => Promise<void>;
  isOpen?: boolean;
  onClose?: () => void;
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

// ── GIF Comment Sheet ─────────────────────────────────────────────────────────
function GifCommentSheet({ gifUrl, onSave, onClose }: {
  gifUrl: string;
  onSave: () => void;
  onClose: () => void;
}) {
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", backgroundColor: "#13131F", borderRadius: "20px 20px 0 0", padding: "20px 20px 36px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2A2A3D", marginBottom: "4px" }} />
        <img src={gifUrl} alt="GIF" style={{ width: "200px", borderRadius: "12px", display: "block" }} />
        <span style={{ fontSize: "11px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>GIF by KLIPY</span>
        <div style={{ display: "flex", gap: "12px", width: "100%" }}>
          <button
            onClick={() => { navigator.share?.({ url: gifUrl }); onClose(); }}
            style={{ flex: 1, padding: "14px", borderRadius: "14px", border: "1px solid #2A2A3D", backgroundColor: "#1C1C2E", color: "#C4C4D4", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
          >Share</button>
          <button
            onClick={() => { onSave(); onClose(); }}
            style={{ flex: 1, padding: "14px", borderRadius: "14px", border: "1px solid #FACC15", backgroundColor: "rgba(250,204,21,0.1)", color: "#FACC15", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <Star size={15} fill="#FACC15" color="#FACC15" /> Save ⭐
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Reply Row (smaller, indented) ─────────────────────────────────────────────
function ReplyRow({ reply, postId, viewerUserId, onDeleted, onReply }: {
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
                style={{ marginTop: "6px", borderRadius: "10px", overflow: "hidden", maxWidth: "160px", cursor: "pointer" }}
              >
                <img src={reply.gif_url} alt="GIF" style={{ width: "100%", display: "block", borderRadius: "10px" }} />
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

// ── Comment Row ───────────────────────────────────────────────────────────────
function CommentRow({ comment, postId, viewerUserId, onDeleted, onReply }: {
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
                <div onClick={() => setGifSheetOpen(true)} style={{ marginTop: "6px", borderRadius: "10px", overflow: "hidden", maxWidth: "200px", cursor: "pointer" }}>
                  <img src={comment.gif_url} alt="GIF" style={{ width: "100%", display: "block", borderRadius: "10px" }} />
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function CommentSection({ postId, comments: propComments, viewer, viewerUserId, onAddComment, isOpen = false, onClose }: CommentSectionProps) {
  const [text,          setText]          = React.useState("");
  const [selectedGif,   setSelectedGif]   = React.useState<GifItem | null>(null);
  const [gifPickerOpen, setGifPickerOpen] = React.useState(false);
  const [localComments, setLocalComments] = React.useState<ApiComment[]>(propComments);
  const [visible,       setVisible]       = React.useState(false);
  const [animateIn,     setAnimateIn]     = React.useState(false);
  const [mounted,       setMounted]       = React.useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = React.useState<ApiComment | null>(null);

  const inputRef     = React.useRef<HTMLInputElement>(null);
  const sheetRef     = React.useRef<HTMLDivElement>(null);
  const inputAreaRef = React.useRef<HTMLDivElement>(null);
  const commentsRef  = React.useRef<HTMLDivElement>(null);
  const dragStartY   = React.useRef(0);
  const dragDeltaY   = React.useRef(0);
  const isDragging   = React.useRef(false);

  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => { setLocalComments(propComments); }, [propComments]);

  React.useEffect(() => {
    if (isOpen) {
      setVisible(true);
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => {
        setAnimateIn(true);
        setTimeout(() => inputRef.current?.focus(), 350);
      }, 16);
      return () => clearTimeout(t);
    } else {
      setAnimateIn(false);
      document.body.style.overflow = "";
      const t = setTimeout(() => setVisible(false), 320);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  React.useEffect(() => { return () => { document.body.style.overflow = ""; }; }, []);

  React.useEffect(() => {
    if (!gifPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (inputAreaRef.current && !inputAreaRef.current.contains(e.target as Node)) setGifPickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [gifPickerOpen]);

  const handleClose = React.useCallback(() => {
    setAnimateIn(false);
    document.body.style.overflow = "";
    setTimeout(() => { setVisible(false); onClose?.(); }, 320);
  }, [onClose]);

  const onTouchStart = (e: React.TouchEvent) => { dragStartY.current = e.touches[0].clientY; dragDeltaY.current = 0; isDragging.current = true; };
  const onTouchMove  = (e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    dragDeltaY.current = delta;
    if (delta > 0) sheetRef.current.style.transform = `translateY(${delta}px)`;
  };
  const onTouchEnd = () => {
    isDragging.current = false;
    if (dragDeltaY.current > 120) handleClose();
    else if (sheetRef.current) sheetRef.current.style.transform = "translateY(0)";
    dragDeltaY.current = 0;
  };

  const handleDeleted   = (id: string | number) => setLocalComments((prev) => prev.filter((c) => c.id !== id));
  const handleGifSelect = (gif: GifItem) => { setSelectedGif(gif); setGifPickerOpen(false); setText(""); };

  const handleReply = (comment: ApiComment) => {
    setReplyingTo(comment);
    setText("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };


  const cancelReply = () => {
    setReplyingTo(null);
    setText("");
    setSelectedGif(null);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !selectedGif) return;
    if (!viewer) return;

    const isReply = replyingTo !== null;
    const parentId = replyingTo?.id;

    if (isReply && parentId !== undefined) {
      // Optimistic reply — inject into the parent comment's reply list
      const optimisticReply: ApiComment = {
        id:               `local-reply-${Date.now()}`,
        content:          trimmed,
        gif_url:          selectedGif?.url ?? null,
        created_at:       new Date().toISOString(),
        like_count:       0,
        user_id:          viewerUserId || "",
        viewer_has_liked: false,
        reply_to_username: replyingTo.reply_to_username ?? null,
        profiles:         { username: viewer.username, display_name: viewer.display_name, avatar_url: viewer.avatar_url || null },
      };

      // Call _addReply on the parent comment object (optimistic)
      const parentComment = localComments.find((c) => c.id === parentId);
      if (parentComment && typeof (parentComment as any)._addReply === "function") {
        (parentComment as any)._addReply(optimisticReply);
      }

      const gifUrl = selectedGif?.url;
      const replyToUsername = replyingTo.reply_to_username ?? null;
      setText("");
      setSelectedGif(null);
      setReplyingTo(null);
      // Post to API with reply_to_username
      await onAddComment?.(postId, trimmed, gifUrl, parentId, replyToUsername);
      // Refetch replies to replace optimistic ID with real DB ID — enables liking immediately
      if (parentComment && typeof (parentComment as any)._refetchReplies === "function") {
        (parentComment as any)._refetchReplies();
      }

    } else {
      // Normal top-level comment
      const optimistic: ApiComment = {
        id:               `local-${Date.now()}`,
        content:          trimmed,
        gif_url:          selectedGif?.url ?? null,
        created_at:       new Date().toISOString(),
        like_count:       0,
        user_id:          viewerUserId || "",
        viewer_has_liked: false,
        profiles:         { username: viewer.username, display_name: viewer.display_name, avatar_url: viewer.avatar_url || null },
      };

      setLocalComments((prev) => [optimistic, ...prev]);
      commentsRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      const gifUrl = selectedGif?.url;
      setText("");
      setSelectedGif(null);
      await onAddComment?.(postId, trimmed, gifUrl);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const canSend   = text.trim().length > 0 || selectedGif !== null;

  if (!mounted || !visible) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={handleClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", opacity: animateIn ? 1 : 0, transition: "opacity 0.32s cubic-bezier(0.32, 0.72, 0, 1)" }} />

      <div ref={sheetRef} style={{ position: "relative", backgroundColor: "#0F0F1A", borderRadius: "20px 20px 0 0", maxHeight: "80vh", display: "flex", flexDirection: "column", transform: animateIn ? "translateY(0)" : "translateY(100%)", transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)", boxShadow: "0 -4px 40px rgba(0,0,0,0.6)" }}>

        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ padding: "12px 16px 0", userSelect: "none", touchAction: "none" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2A2A3D", margin: "0 auto 14px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>Comments {localComments.length > 0 ? `· ${localComments.length}` : ""}</span>
            <button onClick={handleClose} style={{ width: "30px", height: "30px", borderRadius: "50%", border: "none", backgroundColor: "#1C1C2E", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={15} /></button>
          </div>
        </div>

        <div ref={commentsRef} style={{ flex: 1, overflowY: "auto", padding: "0 16px", scrollbarWidth: "none" }}>
          {localComments.length === 0 && <p style={{ fontSize: "13px", color: "#4A4A6A", textAlign: "center", padding: "32px 0", fontFamily: "'Inter', sans-serif" }}>No comments yet. Be the first!</p>}
          {localComments.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              postId={postId}
              viewerUserId={viewerUserId}
              onDeleted={handleDeleted}
              onReply={handleReply}
            />
          ))}
        </div>

        <div ref={inputAreaRef} style={{ padding: "12px 16px 20px", borderTop: "1px solid #13131F", backgroundColor: "#0F0F1A", position: "relative" }}>
          {gifPickerOpen && (
            <GifPicker onSelect={handleGifSelect} onClose={() => setGifPickerOpen(false)} viewerUserId={viewerUserId} />
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", overflowX: "auto", scrollbarWidth: "none" }}>
            <button
              onClick={() => setGifPickerOpen((o) => !o)}
              style={{ padding: "5px 10px", borderRadius: "8px", border: `1px solid ${gifPickerOpen ? "#8B5CF6" : "#2A2A3D"}`, backgroundColor: gifPickerOpen ? "#2D1F4E" : "#1C1C2E", color: gifPickerOpen ? "#8B5CF6" : "#8A8AA0", fontSize: "12px", fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "'Inter', sans-serif", transition: "all 0.15s" }}
            >GIF</button>
            {QUICK_EMOJIS.map((emoji) => (
              <button key={emoji} onClick={() => { setText((p) => p + emoji); }}
                style={{ fontSize: "22px", background: "none", border: "none", cursor: "pointer", flexShrink: 0, lineHeight: 1, padding: "2px", borderRadius: "6px", transition: "transform 0.1s" }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.25)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >{emoji}</button>
            ))}
          </div>

          {selectedGif && (
            <div style={{ position: "relative", display: "inline-block", marginBottom: "8px" }}>
              <img src={selectedGif.preview_url || selectedGif.url} alt="Selected GIF" style={{ height: "80px", borderRadius: "8px", display: "block" }} />
              <button onClick={() => setSelectedGif(null)} style={{ position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", borderRadius: "50%", border: "none", backgroundColor: "rgba(0,0,0,0.7)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                <X size={11} />
              </button>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Avatar src={viewer?.avatar_url} name={viewer?.display_name || "You"} size={34} />
            <div style={{ flex: 1, display: "flex", alignItems: "center", backgroundColor: "#13131F", border: "1px solid #2A2A3D", borderRadius: "24px", padding: "10px 14px", gap: "8px" }}>
              <input
                ref={inputRef} type="text" value={text}
                onChange={(e) => { setText(e.target.value); }}
                onKeyDown={handleKey}
                placeholder={replyingTo ? `Replying to @${replyingTo.profiles?.username || replyingTo.reply_to_username || "user"}…` : selectedGif ? "Add a caption… (optional)" : "Add a comment…"}
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "13px", color: "#E2E8F0", fontFamily: "'Inter', sans-serif", caretColor: "#8B5CF6" }}
              />
              <button onClick={handleSend} disabled={!canSend}
                style={{ background: "none", border: "none", cursor: canSend ? "pointer" : "default", color: canSend ? "#8B5CF6" : "#3A3A4D", display: "flex", alignItems: "center", justifyContent: "center", padding: "2px", transition: "color 0.15s" }}
              >
                <Send size={17} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}