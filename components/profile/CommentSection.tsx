"use client";

import * as React from "react";
import { Send, Heart } from "lucide-react";

const QUICK_EMOJIS = ["😊", "😄", "🤣", "😜", "😆", "😝", "😂", "😁", "🥰", "🤩", "💋"];

interface Comment {
  id: string;
  author: { username: string; display_name: string; avatar_url?: string };
  content: string;
  created_at: string;
  likes: number;
  image_url?: string;
}

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  viewer?: { username: string; display_name: string; avatar_url?: string } | null;
  onAddComment?: (postId: string, text: string) => void;
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

function Avatar({ src, name, size = 36 }: { src?: string; name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      backgroundColor: "#2A2A3D", overflow: "hidden",
      border: "1.5px solid #1E1E2E", position: "relative",
    }}>
      {src
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: size * 0.38, fontWeight: 700, color: "#8B5CF6" }}>
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
      }
      {/* Online dot */}
      <div style={{ position: "absolute", bottom: 1, right: 1, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#22C55E", border: "1.5px solid #0D0D16" }} />
    </div>
  );
}

function CommentRow({ comment }: { comment: Comment }) {
  const [liked,     setLiked]     = React.useState(false);
  const [likeCount, setLikeCount] = React.useState(comment.likes);

  return (
    <div style={{ display: "flex", gap: "10px", padding: "10px 0", borderBottom: "1px solid #13131F" }}>
      <Avatar src={comment.author.avatar_url} name={comment.author.display_name} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>
              {comment.author.display_name}
            </span>
            <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#C4C4D4", lineHeight: 1.5, fontFamily: "'Inter', sans-serif", wordBreak: "break-word" }}>
              {comment.content}
            </p>
            {comment.image_url && (
              <div style={{ marginTop: "8px", borderRadius: "8px", overflow: "hidden", maxWidth: "200px" }}>
                <img src={comment.image_url} alt="" style={{ width: "100%", display: "block" }} />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "6px" }}>
              <span style={{ fontSize: "11px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>
                {getRelativeTime(comment.created_at)}
              </span>
              <button
                style={{ fontSize: "11px", color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 600, padding: 0 }}
              >
                Reply
              </button>
            </div>
          </div>

          {/* Like button */}
          <button
            onClick={() => { setLiked(!liked); setLikeCount(liked ? likeCount - 1 : likeCount + 1); }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
              background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: "2px",
            }}
          >
            <Heart size={16} fill={liked ? "#EF4444" : "none"} color={liked ? "#EF4444" : "#6B6B8A"} strokeWidth={1.8} />
            {likeCount > 0 && (
              <span style={{ fontSize: "10px", color: liked ? "#EF4444" : "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>
                {likeCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const DUMMY_COMMENTS: Comment[] = [
  { id: "c1", author: { username: "alex_r", display_name: "Alex Rivera", avatar_url: "https://i.pravatar.cc/150?img=11" }, content: "This is so real! Love the energy here 💯", created_at: new Date(Date.now() - 3600000 * 2).toISOString(),  likes: 4 },
  { id: "c2", author: { username: "sophie_c", display_name: "Sophie Chen",  avatar_url: "https://i.pravatar.cc/150?img=23" }, content: "Always love your posts! Keep them coming 🔥", created_at: new Date(Date.now() - 3600000 * 5).toISOString(),  likes: 2 },
  { id: "c3", author: { username: "emma_w",   display_name: "Emma Wilson",   avatar_url: "https://i.pravatar.cc/150?img=32" }, content: "You're absolutely amazing! Can't wait for more content", created_at: new Date(Date.now() - 3600000 * 8).toISOString(),  likes: 7 },
  { id: "c4", author: { username: "james_k",  display_name: "James K",       avatar_url: "https://i.pravatar.cc/150?img=15" }, content: "This hits different 🤍", created_at: new Date(Date.now() - 3600000 * 12).toISOString(), likes: 1 },
  { id: "c5", author: { username: "nina_b",   display_name: "Nina Bell",     avatar_url: "https://i.pravatar.cc/150?img=44" }, content: "Obsessed with this 😍", created_at: new Date(Date.now() - 3600000 * 20).toISOString(), likes: 3 },
];

export default function CommentSection({ postId, comments: propComments, viewer, onAddComment, isOpen = false }: CommentSectionProps) {
  if (!isOpen) return null;
  const allComments = propComments.length > 0 ? propComments : DUMMY_COMMENTS;

  const PREVIEW_COUNT = 3;
  const [showAll,  setShowAll]  = React.useState(false);
  const [hidden,   setHidden]   = React.useState(false);
  const [text,     setText]     = React.useState("");
  const [localComments, setLocalComments] = React.useState<Comment[]>(allComments);

  const displayed = hidden ? [] : showAll ? localComments : localComments.slice(0, PREVIEW_COUNT);
  const hasMore   = localComments.length > PREVIEW_COUNT;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !viewer) return;
    const newComment: Comment = {
      id: `local-${Date.now()}`,
      author: viewer,
      content: trimmed,
      created_at: new Date().toISOString(),
      likes: 0,
    };
    setLocalComments([newComment, ...localComments]);
    setText("");
    onAddComment?.(postId, trimmed);
    setShowAll(true);
    setHidden(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const appendEmoji = (emoji: string) => setText((prev) => prev + emoji);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", marginTop: "4px" }}>

      {/* ── Emoji + GIF row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 0 10px", overflowX: "auto", scrollbarWidth: "none" }}>
        {/* GIF button */}
        <button style={{
          padding: "5px 10px", borderRadius: "8px", border: "1px solid #2A2A3D",
          backgroundColor: "#1C1C2E", color: "#8A8AA0", fontSize: "12px", fontWeight: 700,
          cursor: "pointer", flexShrink: 0, fontFamily: "'Inter', sans-serif",
        }}>
          GIF
        </button>
        {/* Emojis */}
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => appendEmoji(emoji)}
            style={{
              fontSize: "22px", background: "none", border: "none",
              cursor: "pointer", flexShrink: 0, lineHeight: 1,
              padding: "2px", borderRadius: "6px", transition: "transform 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* ── Comment input ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <Avatar src={viewer?.avatar_url} name={viewer?.display_name || "You"} size={36} />
        <div style={{
          flex: 1, display: "flex", alignItems: "center",
          backgroundColor: "#13131F", border: "1px solid #2A2A3D",
          borderRadius: "24px", padding: "10px 14px", gap: "8px",
        }}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Add a comment…"
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: "13px", color: "#E2E8F0", fontFamily: "'Inter', sans-serif",
              caretColor: "#8B5CF6",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            style={{
              background: "none", border: "none", cursor: text.trim() ? "pointer" : "default",
              color: text.trim() ? "#8B5CF6" : "#3A3A4D", display: "flex",
              alignItems: "center", justifyContent: "center", padding: "2px",
              transition: "color 0.15s",
            }}
          >
            <Send size={17} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Comment list ── */}
      {!hidden && displayed.map((c) => <CommentRow key={c.id} comment={c} />)}

      {/* ── View more / Hide ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "10px" }}>
        {hasMore && !hidden && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            style={{ fontSize: "13px", color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
          >
            View more comments
          </button>
        )}
        <button
          onClick={() => { setHidden(!hidden); if (hidden) setShowAll(false); }}
          style={{ fontSize: "13px", color: "#6B6B8A", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          {hidden ? "Show comments" : "Hide comments"}
        </button>
      </div>
    </div>
  );
}