"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getRelativeTime } from "@/lib/utils/profile";
import { Search, Grid3X3, List, MoreHorizontal, ImageIcon, Film, Lock, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Post } from "@/lib/types/profile";
import PostActions from "@/components/profile/PostActions";
import CommentSection from "@/components/profile/CommentSection";
import VideoPlayer, { getBunnyThumbnail } from "@/components/video/VideoPlayer";
import { useUpload } from "@/lib/context/UploadContext";

export interface ContentFeedProps {
  posts: Post[];
  isSubscribed: boolean;
  isOwnProfile?: boolean;
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
  profiles: { username: string; display_name: string | null; avatar_url: string | null; is_verified: boolean };
  media: {
    id: number; media_type: string; file_url: string | null; thumbnail_url: string | null;
    raw_video_url: string | null; locked: boolean; display_order: number;
    processing_status: string | null; bunny_video_id: string | null;
  }[];
}

interface ApiMedia {
  id: number; media_type: string; file_url: string | null; thumbnail_url: string | null;
  raw_video_url: string | null; post_id: number; processing_status: string | null; bunny_video_id: string | null;
}

function useMediaHeight() {
  const [height, setHeight] = React.useState("auto");
  React.useEffect(() => {
    const update = () => setHeight(window.innerWidth >= 768 ? "460px" : "auto");
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return height;
}

function TabBar({ postCount, mediaCount, active, onChange }: {
  postCount: number; mediaCount: number; active: string; onChange: (key: string) => void;
}) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", width: "100%", backgroundColor: "#0A0A0F", borderBottom: "1px solid #1E1E2E" }}>
      {[{ key: "posts", label: "POSTS", count: postCount }, { key: "media", label: "MEDIA", count: mediaCount }].map((tab) => (
        <button key={tab.key} onClick={() => onChange(tab.key)} style={{ flex: 1, padding: "14px 8px", fontSize: "14px", fontWeight: active === tab.key ? 700 : 400, fontFamily: "'Inter', sans-serif", background: "none", border: "none", cursor: "pointer", color: active === tab.key ? "#8B5CF6" : "#64748B", borderBottom: active === tab.key ? "2px solid #8B5CF6" : "2px solid transparent", marginBottom: "-1px", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {tab.count} {tab.label}
        </button>
      ))}
    </div>
  );
}

function PostMenu({ onEdit, onDelete, onShare }: { onEdit: () => void; onDelete: () => void; onShare: () => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "30px", height: "30px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "36px", zIndex: 50, backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "10px", overflow: "hidden", minWidth: "160px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
          {[{ label: "Edit caption", action: onEdit, danger: false }, { label: "Share post", action: onShare, danger: false }, { label: "Delete post", action: onDelete, danger: true }].map((item, i, arr) => (
            <button key={item.label} onClick={() => { item.action(); setOpen(false); }} style={{ width: "100%", padding: "10px 14px", border: "none", backgroundColor: "transparent", color: item.danger ? "#EF4444" : "#C4C4D4", fontSize: "13px", textAlign: "left", cursor: "pointer", fontFamily: "'Inter', sans-serif", borderBottom: i < arr.length - 1 ? "1px solid #2A2A3D" : "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >{item.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function MediaToolbar({ apiMediaCount, photoCount, videoCount, mediaFilter, setMediaFilter, showSearch, setShowSearch, isMediaGridView, setIsMediaGridView, searchQuery, setSearchQuery }: {
  apiMediaCount: number; photoCount: number; videoCount: number;
  mediaFilter: "all" | "photo" | "video"; setMediaFilter: (f: "all" | "photo" | "video") => void;
  showSearch: boolean; setShowSearch: (v: boolean) => void;
  isMediaGridView: boolean; setIsMediaGridView: (v: boolean) => void;
  searchQuery: string; setSearchQuery: (v: string) => void;
}) {
  return (
    <div style={{ padding: "12px 16px 0" }}>
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", scrollbarWidth: "none", marginBottom: "8px" }}>
        {([{ key: "all", label: `All ${apiMediaCount}` }, { key: "photo", label: `Photo ${photoCount}` }, { key: "video", label: `Video ${videoCount}` }] as const).map((f) => (
          <button key={f.key} onClick={() => setMediaFilter(f.key)} style={{ padding: "5px 14px", borderRadius: "20px", border: "none", backgroundColor: mediaFilter === f.key ? "#8B5CF6" : "#1C1C2E", color: mediaFilter === f.key ? "#fff" : "#8A8AA0", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s" }}>{f.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
        <button onClick={() => setShowSearch(!showSearch)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: showSearch ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: showSearch ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Search size={15} /></button>
        <button onClick={() => setIsMediaGridView(!isMediaGridView)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: "rgba(139,92,246,0.15)", color: "#8B5CF6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{isMediaGridView ? <List size={15} /> : <Grid3X3 size={15} />}</button>
      </div>
      {showSearch && (
        <div style={{ marginBottom: "10px", position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#6B6B8A" }} />
          <input type="text" placeholder="Search media..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 32px", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "8px", color: "#E2E8F0", fontSize: "13px", outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", caretColor: "#8B5CF6" }} />
        </div>
      )}
    </div>
  );
}

function Lightbox({ post, allPosts, onClose, onNavigate }: {
  post: ApiPost; allPosts: ApiPost[];
  onClose: () => void; onNavigate: (post: ApiPost) => void;
}) {
  const currentIdx = allPosts.findIndex((p) => p.id === post.id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < allPosts.length - 1;
  const firstMedia = post.media?.[0];
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(allPosts[currentIdx - 1]);
      if (e.key === "ArrowRight" && hasNext) onNavigate(allPosts[currentIdx + 1]);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [hasPrev, hasNext, currentIdx, allPosts, onClose, onNavigate]);

  if (isMobile) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, display: "flex", justifyContent: "flex-end", padding: "16px" }}>
          <button onClick={onClose} style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          {firstMedia && <img src={firstMedia.file_url || ""} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />}
          {hasPrev && <button onClick={() => onNavigate(allPosts[currentIdx - 1])} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronLeft size={20} /></button>}
          {hasNext && <button onClick={() => onNavigate(allPosts[currentIdx + 1])} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={20} /></button>}
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingTop: "40px" }}>
      <button onClick={onClose} style={{ position: "absolute", top: "20px", right: "24px", background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", zIndex: 10 }}>
        <X size={24} strokeWidth={2} />
      </button>
      {hasPrev && <button onClick={(e) => { e.stopPropagation(); onNavigate(allPosts[currentIdx - 1]); }} style={{ position: "absolute", left: "16px", bottom: "50%", transform: "translateY(50%)", width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(30,30,46,0.9)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}><ChevronLeft size={20} /></button>}
      {hasNext && <button onClick={(e) => { e.stopPropagation(); onNavigate(allPosts[currentIdx + 1]); }} style={{ position: "absolute", right: "16px", bottom: "50%", transform: "translateY(50%)", width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(30,30,46,0.9)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}><ChevronRight size={20} /></button>}
      {firstMedia && <img src={firstMedia.file_url || ""} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px", width: "100%", maxHeight: "calc(100vh - 40px)", objectFit: "contain", display: "block", objectPosition: "bottom" }} />}
    </div>
  );
}

function PostRow({ post, isOwnProfile, isSubscribed, onLike, onComment, onTip, onUnlock, viewer, onDelete, onImageClick }: {
  post: ApiPost; isOwnProfile?: boolean; isSubscribed: boolean;
  onLike?: (id: string) => void; onComment?: (id: string) => void;
  onTip?: (id: string) => void; onUnlock?: (id: string) => void;
  viewer: { id: string; username: string; display_name: string; avatar_url: string } | null;
  onDelete?: (id: string) => void;
  onImageClick?: (post: ApiPost) => void;
}) {
  const mediaHeight  = useMediaHeight();
  const router       = useRouter();
  const [commentOpen,  setCommentOpen]  = React.useState(false);
  const [liked,        setLiked]        = React.useState(post.liked);
  const [likeCount,    setLikeCount]    = React.useState(post.like_count);
  const [comments,     setComments]     = React.useState<any[]>([]);
  const [commentCount, setCommentCount] = React.useState(post.comment_count);
  const [thumbReady,   setThumbReady]   = React.useState(!post.media?.[0]);

  React.useEffect(() => {
    setLiked(post.liked);
    setLikeCount(post.like_count);
    setCommentCount(post.comment_count);
  }, [post.liked, post.like_count, post.comment_count]);

  React.useEffect(() => {
    fetch(`/api/posts/${post.id}/comments`)
      .then((r) => r.json())
      .then((d) => { if (d.comments) { setComments(d.comments); setCommentCount(d.comments.length); } });
  }, [post.id]);

  const handleAddComment = React.useCallback(async (id: string, text: string) => {
    await fetch(`/api/posts/${id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text }) });
    const d = await fetch(`/api/posts/${id}/comments`).then((r) => r.json());
    if (d.comments) { setComments(d.comments); setCommentCount(d.comments.length); }
  }, []);

  const handleLike = async () => {
    const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    const data = await res.json();
    if (res.ok) { setLiked(data.liked); setLikeCount((c) => data.liked ? c + 1 : Math.max(0, c - 1)); onLike?.(String(post.id)); }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) onDelete?.(String(post.id));
  };

  const firstMedia  = post.media?.[0];
  const isLocked    = post.locked;
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
            ? <PostMenu onEdit={() => {}} onDelete={handleDelete} onShare={() => {}} />
            : <button style={{ width: "30px", height: "30px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><MoreHorizontal size={16} /></button>
          }
        </div>
      </div>

      {/* Caption */}
      {post.caption && (
        <p style={{ fontSize: "14px", color: "#C4C4D4", lineHeight: 1.6, margin: "0", padding: "0 16px 10px", cursor: "default" }}>
          {post.caption}
        </p>
      )}

      {/* Media */}
      {firstMedia && (
        isLocked ? (
          <div style={{ position: "relative", overflow: "hidden", width: "100%" }}>
            <img src={lockedThumb} alt="" onLoad={() => setThumbReady(true)} onError={() => setThumbReady(true)} style={{ width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", filter: "blur(16px)", transform: "scale(1.05)", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(10,10,15,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(139,92,246,0.2)", border: "1.5px solid #8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lock size={18} color="#8B5CF6" />
              </div>
              <button onClick={() => onUnlock?.(String(post.id))} style={{ padding: "8px 20px", borderRadius: "8px", backgroundColor: "#8B5CF6", border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                {post.ppv_price ? `Unlock for ₦${(post.ppv_price / 100).toLocaleString("en-NG")}` : "Subscribe to unlock"}
              </button>
            </div>
          </div>
        ) : firstMedia.media_type === "video" ? (
          <div style={{ height: mediaHeight === "auto" ? undefined : mediaHeight, aspectRatio: mediaHeight === "auto" ? "9/16" : undefined, maxHeight: "75vh", overflow: "hidden", position: "relative", backgroundColor: "#000", width: "100%" }}>
            {mediaHeight === "auto" && (
              <>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "28px", backgroundImage: `url(${firstMedia.bunny_video_id ? getBunnyThumbnail(firstMedia.bunny_video_id) : (firstMedia.thumbnail_url || "")})`, backgroundSize: "cover", backgroundPosition: "left center", filter: "blur(14px)", transform: "scaleX(1.3)", opacity: 0.7 }} />
                <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "28px", backgroundImage: `url(${firstMedia.bunny_video_id ? getBunnyThumbnail(firstMedia.bunny_video_id) : (firstMedia.thumbnail_url || "")})`, backgroundSize: "cover", backgroundPosition: "right center", filter: "blur(14px)", transform: "scaleX(1.3)", opacity: 0.7 }} />
              </>
            )}
            {!thumbReady && (
              <img src={firstMedia.bunny_video_id ? getBunnyThumbnail(firstMedia.bunny_video_id) : (firstMedia.thumbnail_url || "")} alt="" onLoad={() => setThumbReady(true)} onError={() => setThumbReady(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
            )}
            <div style={{ position: "absolute", inset: mediaHeight === "auto" ? "0 28px" : 0, zIndex: 1 }}>
              <VideoPlayer bunnyVideoId={firstMedia.bunny_video_id ?? null} thumbnailUrl={firstMedia.thumbnail_url ?? null} processingStatus={firstMedia.processing_status ?? null} rawVideoUrl={firstMedia.raw_video_url ?? null} fillParent={true} />
            </div>
          </div>
        ) : (
          <div onClick={() => onImageClick?.(post)} style={{ position: "relative", overflow: "hidden", backgroundColor: "#000", width: "100%", cursor: "zoom-in" }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "80px", backgroundImage: `url(${firstMedia.file_url || ""})`, backgroundSize: "cover", backgroundPosition: "left center", filter: "blur(16px) brightness(0.7)", transform: "scaleX(1.3)", opacity: 0.9 }} />
            <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "80px", backgroundImage: `url(${firstMedia.file_url || ""})`, backgroundSize: "cover", backgroundPosition: "right center", filter: "blur(16px) brightness(0.7)", transform: "scaleX(1.3)", opacity: 0.9 }} />
            <img src={firstMedia.file_url || ""} alt="" onLoad={() => setThumbReady(true)} onError={() => setThumbReady(true)} style={{ position: "relative", zIndex: 1, width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", display: "block" }} />
          </div>
        )
      )}

      {/* Actions */}
      {!isLocked && (
        <div style={{ padding: "0 16px" }}>
          <PostActions
            likes={likeCount} comments={commentCount} liked={liked}
            isSubscribed={isSubscribed} isOwnProfile={isOwnProfile}
            onLike={handleLike}
            onComment={() => setCommentOpen((p) => !p)}
            onTip={() => onTip?.(String(post.id))}
            onBookmark={() => {}}
          />
        </div>
      )}

      <CommentSection
        postId={String(post.id)}
        comments={comments}
        viewer={viewer ? { username: viewer.username, display_name: viewer.display_name, avatar_url: viewer.avatar_url } : { username: "", display_name: "", avatar_url: "" }}
        viewerUserId={viewer?.id}
        isOpen={commentOpen}
        onAddComment={handleAddComment}
        onClose={() => setCommentOpen(false)}
      />
    </div>
  );
}

// Module-level cache — survives back navigation
const feedLayoutCache = new Map<string, { activeTab: string; isPostsGridView: boolean; isMediaGridView: boolean }>();
const feedPostsCache  = new Map<string, { posts: ApiPost[]; media: ApiMedia[] }>();

export default function ContentFeed({
  posts, isSubscribed, isOwnProfile = false,
  creatorUsername, onLike, onComment, onTip, onUnlock, emptyState, className,
}: ContentFeedProps) {
  const router = useRouter();
  const { uploads } = useUpload();

  const cacheKey = creatorUsername ?? "default";
  const cached   = feedLayoutCache.get(cacheKey);

  const [activeTab,       setActiveTab]       = React.useState(cached?.activeTab ?? "posts");
  const cachedPosts = feedPostsCache.get(cacheKey);
  const [apiPosts,        setApiPosts]        = React.useState<ApiPost[]>(cachedPosts?.posts ?? []);
  const [apiMedia,        setApiMedia]        = React.useState<ApiMedia[]>(cachedPosts?.media ?? []);
  const [loading,         setLoading]         = React.useState(!cachedPosts);
  const [mediaFilter,     setMediaFilter]     = React.useState<"all" | "photo" | "video">("all");
  const [isPostsGridView, setIsPostsGridView] = React.useState(cached?.isPostsGridView ?? false);
  const [isMediaGridView, setIsMediaGridView] = React.useState(cached?.isMediaGridView ?? true);
  const [showSearch,      setShowSearch]      = React.useState(false);
  const [searchQuery,     setSearchQuery]     = React.useState("");
  const [viewer,          setViewer]          = React.useState<{ id: string; username: string; display_name: string; avatar_url: string } | null>(null);
  const [lightboxPost,    setLightboxPost]    = React.useState<ApiPost | null>(null);

  // Persist layout state whenever it changes
  React.useEffect(() => {
    feedLayoutCache.set(cacheKey, { activeTab, isPostsGridView, isMediaGridView });
  }, [cacheKey, activeTab, isPostsGridView, isMediaGridView]);

  const imagePosts = React.useMemo(() => apiPosts.filter((p) => !p.locked && p.media?.[0]?.media_type !== "video"), [apiPosts]);

  React.useEffect(() => {
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("username, display_name, avatar_url").eq("id", user.id).single();
      if (data) setViewer({ id: user.id, username: data.username, display_name: data.display_name || data.username, avatar_url: data.avatar_url || "" });
    })();
  }, []);

  const fetchPosts = React.useCallback(async (force = false) => {
    if (!creatorUsername) return;
    if (!force && feedPostsCache.has(cacheKey)) return; // skip if cached
    setLoading(true);
    try {
      const res  = await fetch(`/api/posts/creator/${creatorUsername}`);
      const data = await res.json();
      if (res.ok) {
        const fetchedPosts: ApiPost[] = data.posts || [];
        setApiPosts(fetchedPosts);
        const allMedia: ApiMedia[] = [];
        for (const p of fetchedPosts) {
          for (const m of p.media || []) {
            if (!p.locked) allMedia.push({ ...m, post_id: p.id });
          }
        }
        setApiMedia(allMedia);
        feedPostsCache.set(cacheKey, { posts: fetchedPosts, media: allMedia });
      }
    } catch (err) { console.error("[ContentFeed]", err); }
    finally { setLoading(false); }
  }, [creatorUsername, cacheKey]);

  React.useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const prevUploadStates = React.useRef<Record<string, string>>({});
  React.useEffect(() => {
    for (const u of uploads) {
      const prev = prevUploadStates.current[u.id];
      if (prev && prev !== "done" && u.phase === "done") { fetchPosts(true); break; }
      prevUploadStates.current[u.id] = u.phase;
    }
  }, [uploads, fetchPosts]);

  const handleDeletePost = (id: string) => {
    setApiPosts((prev) => {
      const updated = prev.filter((p) => String(p.id) !== id);
      feedPostsCache.set(cacheKey, { posts: updated, media: apiMedia.filter((m) => String(m.post_id) !== id) });
      return updated;
    });
    setApiMedia((prev) => prev.filter((m) => String(m.post_id) !== id));
  };

  const filteredPosts = apiPosts.filter((p) => searchQuery ? p.caption?.toLowerCase().includes(searchQuery.toLowerCase()) : true);
  const filteredMedia = apiMedia.filter((m) => mediaFilter === "all" ? true : mediaFilter === "photo" ? m.media_type !== "video" : m.media_type === "video");
  const photoCount = apiMedia.filter((m) => m.media_type !== "video").length;
  const videoCount = apiMedia.filter((m) => m.media_type === "video").length;

  // Use real counts derived from API data
  const realPostCount  = apiPosts.length;
  const realMediaCount = apiMedia.length;

  return (
    <div className={className} style={{ fontFamily: "'Inter', sans-serif" }}>
      {lightboxPost && (
        <Lightbox
          post={lightboxPost}
          allPosts={imagePosts}
          onClose={() => setLightboxPost(null)}
          onNavigate={(p) => setLightboxPost(p)}
        />
      )}

      <TabBar
        postCount={realPostCount}
        mediaCount={realMediaCount}
        active={activeTab}
        onChange={(key) => { setActiveTab(key); setShowSearch(false); setSearchQuery(""); }}
      />

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid #1F1F2A", borderTop: "2px solid #8B5CF6", animation: "spin 0.9s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Posts tab */}
      {!loading && activeTab === "posts" && (
        <>
          <div style={{ padding: "12px 16px 4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <button onClick={() => setShowSearch(!showSearch)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: showSearch ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: showSearch ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Search size={15} /></button>
              <button onClick={() => setIsPostsGridView(!isPostsGridView)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: "rgba(139,92,246,0.15)", color: "#8B5CF6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{isPostsGridView ? <List size={15} /> : <Grid3X3 size={15} />}</button>
            </div>
            {showSearch && (
              <div style={{ marginBottom: "8px", position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#6B6B8A" }} />
                <input type="text" placeholder="Search posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 32px", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "8px", color: "#E2E8F0", fontSize: "13px", outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", caretColor: "#8B5CF6" }} />
              </div>
            )}
          </div>

          {filteredPosts.length === 0 && (emptyState || <div style={{ textAlign: "center", padding: "40px 0", color: "#4A4A6A", fontSize: "14px" }}>No posts yet</div>)}

          {isPostsGridView ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", padding: "0 16px" }}>
              {filteredPosts.map((post) => {
                const m = post.media?.[0];
                const thumb = m ? m.media_type === "video" && m.bunny_video_id ? getBunnyThumbnail(m.bunny_video_id) : (m.thumbnail_url || m.file_url || "") : "";
                return (
                  <div
                    key={post.id}
                    onClick={() => router.push(`/posts/${post.id}`)}
                    style={{ aspectRatio: "1", overflow: "hidden", borderRadius: "4px", backgroundColor: "#1C1C2E", position: "relative", cursor: "pointer" }}
                  >
                    {thumb && <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                    {post.locked && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}><Lock size={16} color="#fff" /></div>}
                    <div style={{ position: "absolute", bottom: "6px", right: "6px" }}>
                      {m?.media_type === "video" ? <Film size={13} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} /> : <ImageIcon size={13} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            filteredPosts.map((post) => (
              <PostRow
                key={post.id} post={post} isOwnProfile={isOwnProfile} isSubscribed={isSubscribed}
                viewer={viewer} onLike={onLike} onComment={onComment} onTip={onTip}
                onUnlock={onUnlock} onDelete={handleDeletePost}
                onImageClick={(p) => setLightboxPost(p)}
              />
            ))
          )}
        </>
      )}

      {/* Media tab */}
      {!loading && activeTab === "media" && (
        <>
          <MediaToolbar apiMediaCount={apiMedia.length} photoCount={photoCount} videoCount={videoCount} mediaFilter={mediaFilter} setMediaFilter={setMediaFilter} showSearch={showSearch} setShowSearch={setShowSearch} isMediaGridView={isMediaGridView} setIsMediaGridView={setIsMediaGridView} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          {isMediaGridView ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", padding: "0 16px" }}>
              {filteredMedia.map((item) => {
                const thumb = item.media_type === "video" && item.bunny_video_id ? getBunnyThumbnail(item.bunny_video_id) : (item.thumbnail_url || item.file_url || "");
                const parentPost = apiPosts.find((p) => p.id === item.post_id);
                return (
                  <div
                    key={item.id}
                    onClick={() => parentPost ? router.push(`/posts/${parentPost.id}`) : undefined}
                    style={{ aspectRatio: "1", overflow: "hidden", borderRadius: "4px", backgroundColor: "#1C1C2E", position: "relative", cursor: "pointer" }}
                  >
                    <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <div style={{ position: "absolute", bottom: "6px", right: "6px" }}>
                      {item.media_type === "video" ? <Film size={14} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} /> : <ImageIcon size={14} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredMedia.map((item) => {
                const thumb = item.media_type === "video" && item.bunny_video_id ? getBunnyThumbnail(item.bunny_video_id) : (item.thumbnail_url || item.file_url || "");
                const parentPost = apiPosts.find((p) => p.id === item.post_id);
                return (
                  <div
                    key={item.id}
                    onClick={() => parentPost ? router.push(`/posts/${parentPost.id}`) : undefined}
                    style={{ borderBottom: "1px solid #1A1A2E", cursor: "pointer" }}
                  >
                    <div style={{ position: "relative" }}>
                      <img src={thumb} alt="" style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block" }} />
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
          {filteredMedia.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#4A4A6A", fontSize: "14px" }}>No media yet</div>}
        </>
      )}
    </div>
  );
}