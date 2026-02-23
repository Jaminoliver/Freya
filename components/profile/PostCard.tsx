"use client";

import { useState } from "react";
import { MoreHorizontal, BadgeCheck, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import PostActions from "@/components/profile/PostActions";
import CommentSection from "@/components/profile/CommentSection";

interface MediaItem {
  type: "image" | "video";
  url: string;
}

interface TaggedCreator {
  name: string;
  username: string;
  avatar_url: string;
  isVerified: boolean;
  isFree: boolean;
}

interface Post {
  id: string;
  creator: {
    name: string;
    username: string;
    avatar_url: string;
    isVerified: boolean;
  };
  timestamp: string;
  caption: string;
  media: MediaItem[];
  isLocked: boolean;
  price: number | null;
  likes: number;
  comments: number;
  taggedCreators?: TaggedCreator[];
}

// Dummy viewer — replace with real auth user
const VIEWER = {
  username: "freya",
  display_name: "Freya",
  avatar_url: "https://i.pravatar.cc/150?img=36",
};

export function PostCard({ post }: { post: Post }) {
  const router = useRouter();
  const [commentOpen, setCommentOpen] = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);

  const renderCaption = (text: string) => {
    const parts = text.split(/(@\w+|https?:\/\/\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@"))
        return <span key={i} style={{ color: "#8B5CF6", cursor: "pointer", fontWeight: 500 }} onClick={() => router.push(`/${part.slice(1)}`)}>{part}</span>;
      if (part.startsWith("http"))
        return <span key={i} style={{ color: "#8B5CF6", cursor: "pointer" }}>{part}</span>;
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div style={{ borderBottom: "1px solid #2E2E42", padding: "14px 20px 0", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
          onClick={() => router.push(`/${post.creator.username}`)}>
          <Avatar src={post.creator.avatar_url} alt={post.creator.name} size="md" showRing showOnlineStatus isOnline />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#F1F5F9" }}>{post.creator.name}</span>
              {post.creator.isVerified && <BadgeCheck size={15} color="#8B5CF6" />}
            </div>
            <span style={{ fontSize: "13px", color: "#94A3B8" }}>@{post.creator.username}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "13px", color: "#94A3B8" }}>{post.timestamp}</span>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ width: "28px", height: "28px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <MoreHorizontal size={15} />
            </button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "36px", zIndex: 50, backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "10px", overflow: "hidden", minWidth: "160px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                {["Add to list", "Hide post", "Report", "Block creator"].map((item, i) => (
                  <button key={i} onClick={() => setMenuOpen(false)} style={{
                    width: "100%", padding: "10px 14px", border: "none",
                    backgroundColor: "transparent", color: i === 3 ? "#EF4444" : "#A3A3C2",
                    fontSize: "13px", textAlign: "left", cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    borderBottom: i < 3 ? "1px solid #2A2A3D" : "none",
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >{item}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Caption ── */}
      {post.caption && (
        <p style={{ fontSize: "15px", color: "#E2E8F0", lineHeight: 1.6, margin: "0 0 12px", wordBreak: "break-word" }}>
          {renderCaption(post.caption)}
        </p>
      )}

      {/* ── Media ── */}
      {post.media.length > 0 && (
        <div style={{ borderRadius: "12px", overflow: "hidden", position: "relative" }}>
          {post.isLocked ? (
            <div style={{ position: "relative" }}>
              <img src={post.media[0].url} alt="Locked content"
                style={{ width: "100%", maxHeight: "380px", objectFit: "cover", display: "block", filter: "blur(18px)", transform: "scale(1.05)" }} />
              <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,15,0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(139,92,246,0.2)", border: "1.5px solid #8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Lock size={18} color="#8B5CF6" />
                </div>
                {post.price && (
                  <button style={{ padding: "8px 20px", borderRadius: "8px", backgroundColor: "#8B5CF6", border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                    Unlock for ₦{post.price.toLocaleString("en-NG")}
                  </button>
                )}
              </div>
            </div>
          ) : post.media.length === 1 ? (
            <img src={post.media[0].url} alt="Post media"
              style={{ width: "100%", maxHeight: "420px", objectFit: "cover", display: "block", cursor: "pointer" }}
              onClick={() => router.push(`/posts/${post.id}`)} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" }}>
              {post.media.slice(0, 4).map((m, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={m.url} alt={`Media ${i + 1}`}
                    style={{ width: "100%", height: "200px", objectFit: "cover", display: "block", cursor: "pointer" }}
                    onClick={() => router.push(`/posts/${post.id}`)} />
                  {i === 3 && post.media.length > 4 && (
                    <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "22px", fontWeight: 700 }}>
                      +{post.media.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tagged creators ── */}
      {post.taggedCreators && post.taggedCreators.length > 0 && (
        <>
          <style>{`
            .tagged-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 10px; }
            @media (max-width: 480px) { .tagged-grid { grid-template-columns: 1fr !important; } }
          `}</style>
          <div className="tagged-grid">
            {post.taggedCreators.map((tc) => (
              <TaggedCreatorCard key={tc.username} creator={tc} onClick={() => router.push(`/${tc.username}`)} />
            ))}
          </div>
        </>
      )}

      {/* ── Shared PostActions ── */}
      <PostActions
        likes={post.likes}
        comments={post.comments}
        isSubscribed={true}
        isOwnProfile={false}
        onLike={() => console.log("liked", post.id)}
        onComment={() => setCommentOpen((prev) => !prev)}
        onTip={() => console.log("tip", post.id)}
        onBookmark={() => console.log("bookmarked", post.id)}
      />

      {/* ── Shared CommentSection (closed by default, toggled by comment icon) ── */}
      <CommentSection
        postId={post.id}
        comments={[]}
        viewer={VIEWER}
        isOpen={commentOpen}
        onAddComment={(id, text) => console.log("Comment on", id, ":", text)}
      />

    </div>
  );
}

// ── Tagged creator card ───────────────────────────────────────────────────────
function TaggedCreatorCard({ creator, onClick }: { creator: TaggedCreator; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "12px", border: "1px solid #2A2A3D", backgroundColor: "#0D0D18", cursor: "pointer", transition: "background 0.15s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#1C1C2E"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#0D0D18"; }}
    >
      <div style={{ padding: "2.5px", borderRadius: "50%", background: "linear-gradient(to right, #8B5CF6, #EC4899)", flexShrink: 0 }}>
        <div style={{ padding: "2px", borderRadius: "50%", backgroundColor: "#0D0D18" }}>
          <img src={creator.avatar_url} alt={creator.name} style={{ width: "52px", height: "52px", borderRadius: "50%", objectFit: "cover", display: "block" }} />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{creator.name}</span>
          {creator.isVerified && <BadgeCheck size={13} color="#8B5CF6" />}
          {creator.isFree && (
            <span style={{ padding: "1px 7px", borderRadius: "20px", backgroundColor: "rgba(139,92,246,0.15)", border: "1px solid #8B5CF6", fontSize: "10px", fontWeight: 700, color: "#8B5CF6" }}>Free</span>
          )}
        </div>
        <span style={{ fontSize: "12px", color: "#6B6B8A" }}>@{creator.username}</span>
      </div>
    </div>
  );
}