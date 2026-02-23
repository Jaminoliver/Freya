import * as React from "react";
import { LockedContent } from "./LockedContent";
import { getRelativeTime } from "@/lib/utils/profile";
import { Search, Grid3X3, List, MoreHorizontal, ImageIcon, Film, Lock, Heart, MessageCircle, Share2, DollarSign } from "lucide-react";
import type { Post } from "@/lib/types/profile";

export interface ContentFeedProps {
  posts: Post[];
  isSubscribed: boolean;
  isOwnProfile?: boolean;
  activeTab?: string;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onTip?: (postId: string) => void;
  onUnlock?: (postId: string) => void;
  emptyState?: React.ReactNode;
  className?: string;
}

// Fix: use string type instead of "image" as const so "video" comparison is valid
const DUMMY_POSTS = [
  { id: "dp1", category: "Routine",      author: { username: "freya", display_name: "Freya", avatar_url: "https://i.pravatar.cc/150?img=47", is_verified: true }, content: "Lagos nights hit different when you're with the right people ✨🌙", media: [{ type: "image" as string, url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80" }], is_locked: false, price: null, likes: 89,  comments: 14, created_at: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: "dp2", category: "Coffee Break", author: { username: "freya", display_name: "Freya", avatar_url: "https://i.pravatar.cc/150?img=47", is_verified: true }, content: "Sunday vibes and good energy only 🧘🏽‍♀️☀️",                      media: [{ type: "image" as string, url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80" }], is_locked: false, price: null, likes: 312, comments: 45, created_at: new Date(Date.now() - 3600000 * 48).toISOString() },
  { id: "dp3", category: "TV",           author: { username: "freya", display_name: "Freya", avatar_url: "https://i.pravatar.cc/150?img=47", is_verified: true }, content: "Just dropped something special 🔥",                                   media: [{ type: "image" as string, url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80" }], is_locked: false, price: null, likes: 176, comments: 22, created_at: new Date(Date.now() - 3600000 * 60).toISOString() },
  { id: "dp4", category: "Eye to Eye",   author: { username: "freya", display_name: "Freya", avatar_url: "https://i.pravatar.cc/150?img=47", is_verified: true }, content: "New exclusive content 🔒",                                             media: [{ type: "video" as string, url: "https://images.unsplash.com/photo-1502323703110-f849b5b2f8a2?w=800&q=80" }], is_locked: true,  price: 2500, likes: 204, comments: 31, created_at: new Date(Date.now() - 3600000 * 72).toISOString() },
  { id: "dp5", category: "Routine",      author: { username: "freya", display_name: "Freya", avatar_url: "https://i.pravatar.cc/150?img=47", is_verified: true }, content: "Morning routine drop 🌅",                                              media: [{ type: "image" as string, url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80" }], is_locked: false, price: null, likes: 98,  comments: 11, created_at: new Date(Date.now() - 3600000 * 96).toISOString() },
];

const DUMMY_MEDIA = [
  { id: "m1",  type: "image", url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80" },
  { id: "m2",  type: "video", url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80" },
  { id: "m3",  type: "image", url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&q=80" },
  { id: "m4",  type: "image", url: "https://images.unsplash.com/photo-1502323703110-f849b5b2f8a2?w=400&q=80" },
  { id: "m5",  type: "image", url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&q=80" },
  { id: "m6",  type: "video", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80" },
  { id: "m7",  type: "image", url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80" },
  { id: "m8",  type: "image", url: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&q=80" },
  { id: "m9",  type: "video", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80" },
  { id: "m10", type: "image", url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80" },
  { id: "m11", type: "image", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80" },
  { id: "m12", type: "image", url: "https://images.unsplash.com/photo-1519742866993-66d3cfef4bbd?w=400&q=80" },
];

const CATEGORIES = ["All", "TV", "Coffee Break", "Eye to Eye", "Routine", "Kittens"];
const photoCount  = DUMMY_MEDIA.filter((m) => m.type === "image").length;
const videoCount  = DUMMY_MEDIA.filter((m) => m.type === "video").length;

// ── Creator post dropdown ─────────────────────────────────────────────────────
function PostMenu({ onEdit, onDelete, onShare }: { onEdit: () => void; onDelete: () => void; onShare: () => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "30px", height: "30px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "36px", zIndex: 50, backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "10px", overflow: "hidden", minWidth: "160px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
          {[
            { label: "Edit caption", action: onEdit,   danger: false },
            { label: "Share post",   action: onShare,  danger: false },
            { label: "Delete post",  action: onDelete, danger: true  },
          ].map((item, i, arr) => (
            <button key={item.label} onClick={() => { item.action(); setOpen(false); }}
              style={{ width: "100%", padding: "10px 14px", border: "none", backgroundColor: "transparent", color: item.danger ? "#EF4444" : "#C4C4D4", fontSize: "13px", textAlign: "left", cursor: "pointer", fontFamily: "'Inter', sans-serif", borderBottom: i < arr.length - 1 ? "1px solid #2A2A3D" : "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >{item.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single post row ───────────────────────────────────────────────────────────
function PostRow({ post, isOwnProfile, isSubscribed, onLike, onComment, onTip, onUnlock }: {
  post: typeof DUMMY_POSTS[0]; isOwnProfile?: boolean; isSubscribed: boolean;
  onLike?: (id: string) => void; onComment?: (id: string) => void;
  onTip?: (id: string) => void; onUnlock?: (id: string) => void;
}) {
  const isLocked = post.is_locked && !isSubscribed;
  const [liked, setLiked] = React.useState(false);

  return (
    <div style={{ borderBottom: "1px solid #1A1A2E", padding: "16px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src={post.author.avatar_url} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} />
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>{post.author.display_name}</div>
            <div style={{ fontSize: "12px", color: "#6B6B8A" }}>@{post.author.username}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#6B6B8A" }}>{getRelativeTime(post.created_at)}</span>
          {isOwnProfile
            ? <PostMenu onEdit={() => console.log("Edit", post.id)} onDelete={() => console.log("Delete", post.id)} onShare={() => console.log("Share", post.id)} />
            : <button style={{ width: "30px", height: "30px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><MoreHorizontal size={16} /></button>
          }
        </div>
      </div>

      {/* Caption */}
      {post.content && <p style={{ fontSize: "14px", color: "#C4C4D4", lineHeight: 1.6, margin: "0 0 10px" }}>{post.content}</p>}

      {/* Media */}
      {post.media.length > 0 && (
        isLocked ? (
          <div style={{ borderRadius: "10px", overflow: "hidden", position: "relative" }}>
            <img src={post.media[0].url} alt="" style={{ width: "100%", maxHeight: "340px", objectFit: "cover", filter: "blur(16px)", transform: "scale(1.05)", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(10,10,15,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(139,92,246,0.2)", border: "1.5px solid #8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lock size={18} color="#8B5CF6" />
              </div>
              {post.price && <button onClick={() => onUnlock?.(post.id)} style={{ padding: "8px 20px", borderRadius: "8px", backgroundColor: "#8B5CF6", border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Unlock for ₦{post.price.toLocaleString("en-NG")}</button>}
            </div>
          </div>
        ) : (
          <div style={{ borderRadius: "10px", overflow: "hidden" }}>
            <img src={post.media[0].url} alt="" style={{ width: "100%", maxHeight: "380px", objectFit: "cover", display: "block" }} />
          </div>
        )
      )}

      {/* ── Action bar ── */}
      {!isLocked && (
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "12px" }}>

          {/* Like */}
          <button
            onClick={() => { setLiked(!liked); onLike?.(post.id); }}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "10px", border: "none", background: liked ? "rgba(239,68,68,0.1)" : "transparent", color: liked ? "#EF4444" : "#6B6B8A", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s" }}
            onMouseEnter={(e) => { if (!liked) e.currentTarget.style.backgroundColor = "#1C1C2E"; }}
            onMouseLeave={(e) => { if (!liked) e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Heart size={22} fill={liked ? "#EF4444" : "none"} strokeWidth={1.8} />
            <span>{liked ? post.likes + 1 : post.likes}</span>
          </button>

          {/* Comment */}
          <button
            onClick={() => onComment?.(post.id)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "10px", border: "none", background: "transparent", color: "#6B6B8A", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <MessageCircle size={22} strokeWidth={1.8} />
            <span>{post.comments}</span>
          </button>

          {/* Share */}
          <button
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "10px", border: "none", background: "transparent", color: "#6B6B8A", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Share2 size={22} strokeWidth={1.8} />
          </button>

          {/* Send Tip — pushed to the right */}
          <button
            onClick={() => onTip?.(post.id)}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px", border: "1px solid #2A2A3D", background: "transparent", color: "#8B5CF6", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <DollarSign size={16} strokeWidth={2} />
            Send tip
          </button>

        </div>
      )}
    </div>
  );
}

export default function ContentFeed({ posts, isSubscribed, isOwnProfile = false, activeTab = "posts", onLike, onComment, onTip, onUnlock, emptyState, className }: ContentFeedProps) {
  const [categoryFilter, setCategoryFilter] = React.useState("All");
  const [mediaFilter,    setMediaFilter]    = React.useState<"all" | "photo" | "video">("all");
  const [isGridView,     setIsGridView]     = React.useState(true);
  const [showSearch,     setShowSearch]     = React.useState(false);
  const [searchQuery,    setSearchQuery]    = React.useState("");

  const filteredPosts = categoryFilter === "All" ? DUMMY_POSTS : DUMMY_POSTS.filter((p) => p.category === categoryFilter);
  const filteredMedia = DUMMY_MEDIA.filter((m) => mediaFilter === "all" ? true : mediaFilter === "photo" ? m.type === "image" : m.type === "video");

  const MediaToolbar = () => (
    <div style={{ paddingTop: "12px" }}>
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", scrollbarWidth: "none", marginBottom: "8px" }}>
        {([{ key: "all", label: `All ${DUMMY_MEDIA.length}` }, { key: "photo", label: `Photo ${photoCount}` }, { key: "video", label: `Video ${videoCount}` }] as const).map((f) => (
          <button key={f.key} onClick={() => setMediaFilter(f.key)} style={{ padding: "5px 14px", borderRadius: "20px", border: "none", backgroundColor: mediaFilter === f.key ? "#8B5CF6" : "#1C1C2E", color: mediaFilter === f.key ? "#fff" : "#8A8AA0", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s" }}>{f.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
        <button onClick={() => setShowSearch(!showSearch)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: showSearch ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: showSearch ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Search size={15} /></button>
        <button onClick={() => setIsGridView(true)}  style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: isGridView  ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: isGridView  ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Grid3X3 size={15} /></button>
        <button onClick={() => setIsGridView(false)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: !isGridView ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: !isGridView ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><List size={15} /></button>
      </div>
      {showSearch && (
        <div style={{ marginBottom: "10px", position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#6B6B8A" }} />
          <input type="text" placeholder="Search media..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 32px", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "8px", color: "#E2E8F0", fontSize: "13px", outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", caretColor: "#8B5CF6" }} />
        </div>
      )}
    </div>
  );

  const MediaGrid = () => (
    isGridView ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px" }}>
        {filteredMedia.map((item) => (
          <div key={item.id} style={{ aspectRatio: "1", overflow: "hidden", borderRadius: "4px", backgroundColor: "#1C1C2E", position: "relative", cursor: "pointer" }}>
            <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", bottom: "6px", right: "6px" }}>
              {item.type === "video" ? <Film size={14} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} /> : <ImageIcon size={14} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {filteredMedia.map((item) => (
          <div key={item.id} style={{ borderBottom: "1px solid #1A1A2E", padding: "10px 0", cursor: "pointer" }}>
            <div style={{ borderRadius: "10px", overflow: "hidden", position: "relative" }}>
              <img src={item.url} alt="" style={{ width: "100%", maxHeight: "300px", objectFit: "cover", display: "block" }} />
              {item.type === "video" && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" }}>
                  <Film size={32} color="#fff" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  );

  // ── Posts tab ─────────────────────────────────────────────────────────────
  if (activeTab === "posts") {
    return (
      <div className={className} style={{ fontFamily: "'Inter', sans-serif" }}>
        <div style={{ paddingTop: "12px", marginBottom: "4px" }}>
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", scrollbarWidth: "none", marginBottom: "8px" }}>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} style={{ padding: "5px 14px", borderRadius: "20px", border: "none", backgroundColor: categoryFilter === cat ? "#8B5CF6" : "#1C1C2E", color: categoryFilter === cat ? "#fff" : "#8A8AA0", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s" }}>{cat}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <button onClick={() => setShowSearch(!showSearch)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: showSearch ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: showSearch ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Search size={15} /></button>
            <button onClick={() => setIsGridView(false)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: !isGridView ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: !isGridView ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><List size={15} /></button>
            <button onClick={() => setIsGridView(true)}  style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: isGridView  ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: isGridView  ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Grid3X3 size={15} /></button>
            <button style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: "#1C1C2E", color: "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><MoreHorizontal size={15} /></button>
          </div>
          {showSearch && (
            <div style={{ marginBottom: "8px", position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#6B6B8A" }} />
              <input type="text" placeholder="Search posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 32px", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "8px", color: "#E2E8F0", fontSize: "13px", outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", caretColor: "#8B5CF6" }} />
            </div>
          )}
        </div>
        {isGridView ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px" }}>
            {filteredPosts.map((post) => (
              <div key={post.id} style={{ aspectRatio: "1", overflow: "hidden", borderRadius: "4px", backgroundColor: "#1C1C2E", position: "relative", cursor: "pointer" }}>
                {post.media[0] && <img src={post.media[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                {post.is_locked && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}><Lock size={16} color="#fff" /></div>}
                <div style={{ position: "absolute", bottom: "6px", right: "6px" }}>
                  {/* Fix: type is now string so comparison to "video" is valid */}
                  {post.media[0]?.type === "video" ? <Film size={13} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} /> : <ImageIcon size={13} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />}
                </div>
              </div>
            ))}
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostRow key={post.id} post={post} isOwnProfile={isOwnProfile} isSubscribed={isSubscribed} onLike={onLike} onComment={onComment} onTip={onTip} onUnlock={onUnlock} />
          ))
        )}
      </div>
    );
  }

  if (activeTab === "media" || activeTab === "vault") {
    return (
      <div className={className} style={{ fontFamily: "'Inter', sans-serif" }}>
        <MediaToolbar />
        <MediaGrid />
      </div>
    );
  }

  if (activeTab === "subscriptions") {
    return (
      <div className={className} style={{ fontFamily: "'Inter', sans-serif", textAlign: "center", padding: "48px 0", color: "#4A4A6A", fontSize: "14px" }}>
        No subscriptions yet
      </div>
    );
  }

  return null;
}