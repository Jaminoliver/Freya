"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getRelativeTime } from "@/lib/utils/profile";
import { Search, Grid3X3, List, MoreHorizontal, ImageIcon, Film, Lock } from "lucide-react";
import type { Post } from "@/lib/types/profile";
import PostActions from "@/components/profile/PostActions";
import CommentSection from "@/components/profile/CommentSection";
import VideoPlayer, { getBunnyThumbnail } from "@/components/video/VideoPlayer";
import { useUpload } from "@/lib/context/UploadContext";

export interface ContentFeedProps {
  posts: Post[];
  isSubscribed: boolean;
  isOwnProfile?: boolean;
  activeTab?: string;
  creatorUsername?: string;
  creatorId?: string;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onTip?: (postId: string) => void;
  onUnlock?: (postId: string) => void;
  emptyState?: React.ReactNode;
  className?: string;
}

interface ApiPost {
  id: number;
  content_type: string;
  caption: string | null;
  is_free: boolean;
  is_ppv: boolean;
  ppv_price: number | null;
  like_count: number;
  comment_count: number;
  published_at: string;
  liked: boolean;
  can_access: boolean;
  locked: boolean;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
  media: {
    id: number;
    media_type: string;
    file_url: string | null;
    thumbnail_url: string | null;
    raw_video_url: string | null;
    locked: boolean;
    display_order: number;
    processing_status: string | null;
    bunny_video_id: string | null;
  }[];
}

interface ApiMedia {
  id: number;
  media_type: string;
  file_url: string | null;
  thumbnail_url: string | null;
  raw_video_url: string | null;
  post_id: number;
  processing_status: string | null;
  bunny_video_id: string | null;
}

const CATEGORIES = ["All", "TV", "Coffee Break", "Eye to Eye", "Routine", "Kittens"];

// ── PostMenu ─────────────────────────────────────────────────────────────────
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
      <button
        onClick={() => setOpen(!open)}
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
            <button
              key={item.label}
              onClick={() => { item.action(); setOpen(false); }}
              style={{ width: "100%", padding: "10px 14px", border: "none", backgroundColor: "transparent", color: item.danger ? "#EF4444" : "#C4C4D4", fontSize: "13px", textAlign: "left", cursor: "pointer", fontFamily: "'Inter', sans-serif", borderBottom: i < arr.length - 1 ? "1px solid #2A2A3D" : "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PostRow ───────────────────────────────────────────────────────────────────
function PostRow({
  post, isOwnProfile, isSubscribed,
  onLike, onComment, onTip, onUnlock, viewer, onDelete,
}: {
  post: ApiPost;
  isOwnProfile?: boolean;
  isSubscribed: boolean;
  onLike?: (id: string) => void;
  onComment?: (id: string) => void;
  onTip?: (id: string) => void;
  onUnlock?: (id: string) => void;
  viewer: { username: string; display_name: string; avatar_url: string } | null;
  onDelete?: (id: string) => void;
}) {
  const isLocked = post.locked;
  const [commentOpen, setCommentOpen] = React.useState(false);
  const [liked, setLiked] = React.useState(post.liked);
  const [likeCount, setLikeCount] = React.useState(post.like_count);
  const router = useRouter();

  const navigateToPost = () => router.push(`/posts/${post.id}`);

  const handleLike = async () => {
    const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setLiked(data.liked);
      setLikeCount((c) => data.liked ? c + 1 : Math.max(0, c - 1));
      onLike?.(String(post.id));
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) onDelete?.(String(post.id));
  };

  const firstMedia = post.media?.[0];

  const lockedThumb = firstMedia
    ? firstMedia.media_type === "video" && firstMedia.bunny_video_id
      ? getBunnyThumbnail(firstMedia.bunny_video_id)
      : (firstMedia.thumbnail_url || "")
    : "";

  return (
    <div style={{ borderBottom: "1px solid #1A1A2E" }}>

      {/* Header */}
      <div style={{ padding: "16px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src={post.profiles?.avatar_url || ""} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} />
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>{post.profiles?.display_name || post.profiles?.username}</div>
            <div style={{ fontSize: "12px", color: "#6B6B8A" }}>@{post.profiles?.username}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#6B6B8A" }}>{getRelativeTime(post.published_at)}</span>
          {isOwnProfile
            ? <PostMenu onEdit={() => console.log("Edit", post.id)} onDelete={handleDelete} onShare={() => console.log("Share", post.id)} />
            : <button style={{ width: "30px", height: "30px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><MoreHorizontal size={16} /></button>
          }
        </div>
      </div>

      {/* Caption */}
      {post.caption && (
        <p
          onClick={navigateToPost}
          style={{ fontSize: "14px", color: "#C4C4D4", lineHeight: 1.6, margin: "0", padding: "0 16px 10px", cursor: "pointer" }}
        >
          {post.caption}
        </p>
      )}

      {/* Media */}
      {firstMedia && (
        isLocked ? (
          <div style={{ position: "relative", overflow: "hidden", width: "100%" }}>
            <img
              src={lockedThumb}
              alt=""
              style={{ width: "100%", height: "480px", objectFit: "cover", filter: "blur(16px)", transform: "scale(1.05)", display: "block" }}
            />
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(10,10,15,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(139,92,246,0.2)", border: "1.5px solid #8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lock size={18} color="#8B5CF6" />
              </div>
              {post.ppv_price ? (
                <button onClick={() => onUnlock?.(String(post.id))} style={{ padding: "8px 20px", borderRadius: "8px", backgroundColor: "#8B5CF6", border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                  Unlock for ₦{(post.ppv_price / 100).toLocaleString("en-NG")}
                </button>
              ) : (
                <button onClick={() => onUnlock?.(String(post.id))} style={{ padding: "8px 20px", borderRadius: "8px", backgroundColor: "#8B5CF6", border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                  Subscribe to unlock
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            onClick={firstMedia.media_type !== "video" ? navigateToPost : undefined}
            style={{ width: "100%", cursor: firstMedia.media_type !== "video" ? "pointer" : "default" }}
          >
            {firstMedia.media_type === "video" ? (
              <VideoPlayer
                bunnyVideoId={firstMedia.bunny_video_id ?? null}
                thumbnailUrl={firstMedia.thumbnail_url ?? null}
                processingStatus={firstMedia.processing_status ?? null}
                rawVideoUrl={firstMedia.raw_video_url ?? null}
              />
            ) : (
              <img
                src={firstMedia.file_url || ""}
                alt=""
                style={{ width: "100%", height: "480px", objectFit: "cover", display: "block" }}
              />
            )}
          </div>
        )
      )}

      {/* Actions */}
      {!isLocked && (
        <div style={{ padding: "4px 16px" }}>
          <PostActions
            likes={likeCount}
            comments={post.comment_count}
            isSubscribed={isSubscribed}
            isOwnProfile={isOwnProfile}
            onLike={handleLike}
            onComment={() => setCommentOpen((prev) => !prev)}
            onTip={() => onTip?.(String(post.id))}
            onBookmark={() => console.log("bookmarked", post.id)}
          />
        </div>
      )}

      {/* Comments */}
      <div style={{ padding: "0 16px" }}>
        <CommentSection
          postId={String(post.id)}
          comments={[]}
          viewer={viewer || { username: "", display_name: "", avatar_url: "" }}
          isOpen={commentOpen}
          onAddComment={async (id, text) => {
            await fetch(`/api/posts/${id}/comments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: text }),
            });
          }}
        />
      </div>
    </div>
  );
}

// ── ContentFeed ───────────────────────────────────────────────────────────────
export default function ContentFeed({
  posts,
  isSubscribed,
  isOwnProfile = false,
  activeTab = "posts",
  creatorUsername,
  creatorId,
  onLike,
  onComment,
  onTip,
  onUnlock,
  emptyState,
  className,
}: ContentFeedProps) {
  const router = useRouter();
  const { uploads } = useUpload();

  const [apiPosts,        setApiPosts]        = React.useState<ApiPost[]>([]);
  const [apiMedia,        setApiMedia]        = React.useState<ApiMedia[]>([]);
  const [loading,         setLoading]         = React.useState(false);
  const [categoryFilter,  setCategoryFilter]  = React.useState("All");
  const [mediaFilter,     setMediaFilter]     = React.useState<"all" | "photo" | "video">("all");
  const [isPostsGridView, setIsPostsGridView] = React.useState(false);
  const [isMediaGridView, setIsMediaGridView] = React.useState(true);
  const [showSearch,      setShowSearch]      = React.useState(false);
  const [searchQuery,     setSearchQuery]     = React.useState("");
  const [viewer,          setViewer]          = React.useState<{ username: string; display_name: string; avatar_url: string } | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("username, display_name, avatar_url").eq("id", user.id).single();
      if (data) setViewer({ username: data.username, display_name: data.display_name || data.username, avatar_url: data.avatar_url || "" });
    };
    load();
  }, []);

  const fetchPosts = React.useCallback(async () => {
    if (!creatorUsername) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/posts/creator/${creatorUsername}`);
      const data = await res.json();
      if (res.ok) {
        setApiPosts(data.posts || []);
        const allMedia: ApiMedia[] = [];
        for (const p of (data.posts || []) as ApiPost[]) {
          for (const m of p.media || []) {
            if (!p.locked) allMedia.push({ ...m, post_id: p.id });
          }
        }
        setApiMedia(allMedia);
      }
    } catch (err) {
      console.error("[ContentFeed] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [creatorUsername]);

  // Initial fetch
  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Re-fetch when any upload finishes processing
  const prevUploadStates = React.useRef<Record<string, string>>({});
  React.useEffect(() => {
    for (const u of uploads) {
      const prev = prevUploadStates.current[u.id];
      if (prev && prev !== "done" && u.phase === "done") {
        fetchPosts();
        break;
      }
      prevUploadStates.current[u.id] = u.phase;
    }
  }, [uploads, fetchPosts]);

  const handleDeletePost = (id: string) => {
    setApiPosts((prev) => prev.filter((p) => String(p.id) !== id));
  };

  const filteredPosts = apiPosts.filter((p) => {
    if (searchQuery) return p.caption?.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  const filteredMedia = apiMedia.filter((m) =>
    mediaFilter === "all" ? true : mediaFilter === "photo" ? m.media_type !== "video" : m.media_type === "video"
  );

  const photoCount = apiMedia.filter((m) => m.media_type !== "video").length;
  const videoCount = apiMedia.filter((m) => m.media_type === "video").length;

  const MediaToolbar = () => (
    <div style={{ padding: "12px 16px 0" }}>
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", scrollbarWidth: "none", marginBottom: "8px" }}>
        {([
          { key: "all",   label: `All ${apiMedia.length}` },
          { key: "photo", label: `Photo ${photoCount}` },
          { key: "video", label: `Video ${videoCount}` },
        ] as const).map((f) => (
          <button key={f.key} onClick={() => setMediaFilter(f.key)} style={{ padding: "5px 14px", borderRadius: "20px", border: "none", backgroundColor: mediaFilter === f.key ? "#8B5CF6" : "#1C1C2E", color: mediaFilter === f.key ? "#fff" : "#8A8AA0", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s" }}>
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
        <button onClick={() => setShowSearch(!showSearch)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: showSearch ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: showSearch ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Search size={15} /></button>
        <button onClick={() => setIsMediaGridView(true)}  style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: isMediaGridView  ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: isMediaGridView  ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Grid3X3 size={15} /></button>
        <button onClick={() => setIsMediaGridView(false)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: !isMediaGridView ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: !isMediaGridView ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><List size={15} /></button>
      </div>
      {showSearch && (
        <div style={{ marginBottom: "10px", position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#6B6B8A" }} />
          <input type="text" placeholder="Search media..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 32px", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "8px", color: "#E2E8F0", fontSize: "13px", outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", caretColor: "#8B5CF6" }} />
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
        <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid #1F1F2A", borderTop: "2px solid #8B5CF6", animation: "spin 0.9s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Posts tab ──────────────────────────────────────────────────────────────
  if (activeTab === "posts") {
    return (
      <div className={className} style={{ fontFamily: "'Inter', sans-serif" }}>
        <div style={{ padding: "12px 16px 4px" }}>
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", scrollbarWidth: "none", marginBottom: "8px" }}>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} style={{ padding: "5px 14px", borderRadius: "20px", border: "none", backgroundColor: categoryFilter === cat ? "#8B5CF6" : "#1C1C2E", color: categoryFilter === cat ? "#fff" : "#8A8AA0", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s" }}>
                {cat}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <button onClick={() => setShowSearch(!showSearch)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: showSearch ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: showSearch ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Search size={15} /></button>
            <button onClick={() => setIsPostsGridView(false)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: !isPostsGridView ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: !isPostsGridView ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><List size={15} /></button>
            <button onClick={() => setIsPostsGridView(true)}  style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: isPostsGridView  ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: isPostsGridView  ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Grid3X3 size={15} /></button>
            <button style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: "#1C1C2E", color: "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><MoreHorizontal size={15} /></button>
          </div>
          {showSearch && (
            <div style={{ marginBottom: "8px", position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#6B6B8A" }} />
              <input type="text" placeholder="Search posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 32px", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "8px", color: "#E2E8F0", fontSize: "13px", outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", caretColor: "#8B5CF6" }} />
            </div>
          )}
        </div>

        {filteredPosts.length === 0 && (
          emptyState || (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#4A4A6A", fontSize: "14px" }}>No posts yet</div>
          )
        )}

        {isPostsGridView ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", padding: "0 16px" }}>
            {filteredPosts.map((post) => {
              const firstMedia = post.media?.[0];
              const thumb = firstMedia
                ? firstMedia.media_type === "video" && firstMedia.bunny_video_id
                  ? getBunnyThumbnail(firstMedia.bunny_video_id)
                  : (firstMedia.thumbnail_url || firstMedia.file_url || "")
                : "";
              return (
                <div key={post.id} onClick={() => router.push(`/posts/${post.id}`)} style={{ aspectRatio: "1", overflow: "hidden", borderRadius: "4px", backgroundColor: "#1C1C2E", position: "relative", cursor: "pointer" }}>
                  {thumb && <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                  {post.locked && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}><Lock size={16} color="#fff" /></div>}
                  <div style={{ position: "absolute", bottom: "6px", right: "6px" }}>
                    {firstMedia?.media_type === "video"
                      ? <Film size={13} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />
                      : <ImageIcon size={13} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              isOwnProfile={isOwnProfile}
              isSubscribed={isSubscribed}
              viewer={viewer}
              onLike={onLike}
              onComment={onComment}
              onTip={onTip}
              onUnlock={onUnlock}
              onDelete={handleDeletePost}
            />
          ))
        )}
      </div>
    );
  }

  // ── Media tab ──────────────────────────────────────────────────────────────
  if (activeTab === "media") {
    return (
      <div className={className} style={{ fontFamily: "'Inter', sans-serif" }}>
        <MediaToolbar />
        {isMediaGridView ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", padding: "0 16px" }}>
            {filteredMedia.map((item) => {
              const thumb = item.media_type === "video" && item.bunny_video_id
                ? getBunnyThumbnail(item.bunny_video_id)
                : (item.thumbnail_url || item.file_url || "");
              return (
                <div key={item.id} style={{ aspectRatio: "1", overflow: "hidden", borderRadius: "4px", backgroundColor: "#1C1C2E", position: "relative", cursor: "pointer" }}>
                  <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", bottom: "6px", right: "6px" }}>
                    {item.media_type === "video"
                      ? <Film size={14} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />
                      : <ImageIcon size={14} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filteredMedia.map((item) => {
              const thumb = item.media_type === "video" && item.bunny_video_id
                ? getBunnyThumbnail(item.bunny_video_id)
                : (item.thumbnail_url || item.file_url || "");
              return (
                <div key={item.id} style={{ borderBottom: "1px solid #1A1A2E", cursor: "pointer" }}>
                  <div style={{ position: "relative" }}>
                    <img src={thumb} alt="" style={{ width: "100%", maxHeight: "300px", objectFit: "cover", display: "block" }} />
                    {item.media_type === "video" && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" }}>
                        <Film size={32} color="#fff" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {filteredMedia.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#4A4A6A", fontSize: "14px" }}>No media yet</div>
        )}
      </div>
    );
  }

  return null;
}