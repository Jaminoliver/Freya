"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MoreHorizontal, BadgeCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import PostActions from "@/components/profile/PostActions";
import CommentSection from "@/components/profile/CommentSection";
import Lightbox from "@/components/profile/Lightbox";
import PostMediaViewer from "@/components/shared/PostMediaViewer";
import type { NormalizedMedia } from "@/components/shared/PostMediaViewer";
import type { LightboxPost } from "@/components/profile/Lightbox";
import { createClient } from "@/lib/supabase/client";
import { postSyncStore } from "@/lib/store/postSyncStore";
import { PollDisplay } from "@/components/feed/PollDisplay";
import type { PollData } from "@/components/feed/PollDisplay";

interface MediaItem {
  type:              "image" | "video";
  url:               string;
  bunnyVideoId?:     string | null;
  thumbnailUrl?:     string | null;
  processingStatus?: string | null;
  rawVideoUrl?:      string | null;
}

interface TaggedCreator {
  name: string; username: string; avatar_url: string; isVerified: boolean; isFree: boolean;
}

interface Post {
  id:              string;
  content_type?:   string;
  creator:         { name: string; username: string; avatar_url: string; isVerified: boolean };
  timestamp:       string;
  caption:         string;
  media:           MediaItem[];
  isLocked:        boolean;
  price:           number | null;
  likes:           number;
  comments:        number;
  liked:           boolean;
  poll?:           PollData | null;
  taggedCreators?: TaggedCreator[];
}

interface Viewer {
  id: string; username: string; display_name: string; avatar_url: string;
}

let cachedViewer: Viewer | null = null;
let viewerPromise: Promise<Viewer | null> | null = null;

function fetchViewer(): Promise<Viewer | null> {
  if (cachedViewer) return Promise.resolve(cachedViewer);
  if (viewerPromise) return viewerPromise;

  viewerPromise = (async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) {
        cachedViewer = {
          id:           user.id,
          username:     data.username,
          display_name: data.display_name || data.username,
          avatar_url:   data.avatar_url || "",
        };
        return cachedViewer;
      }
      return null;
    } catch {
      return null;
    } finally {
      viewerPromise = null;
    }
  })();

  return viewerPromise;
}

function useViewer() {
  const [viewer, setViewer] = useState<Viewer | null>(cachedViewer);
  useEffect(() => {
    if (cachedViewer) return;
    fetchViewer().then((v) => { if (v) setViewer(v); });
  }, []);
  return viewer;
}

function toLightboxPost(post: Post): LightboxPost {
  return {
    id: Number(post.id),
    media: post.media
      .filter((m) => m.type === "image" && m.url)
      .map((m, i) => ({
        id: i, media_type: "image", file_url: m.url,
        thumbnail_url: m.thumbnailUrl ?? null, raw_video_url: null,
        locked: false, display_order: i, processing_status: null, bunny_video_id: null,
      })),
  };
}

// ── Main PostCard ─────────────────────────────────────────────────────────────
export function PostCard({
  post,
  onLike,
  initialSlide = 0,
  onSlideChange,
}: {
  post:           Post;
  onLike?:        (postId: string) => void;
  initialSlide?:  number;
  onSlideChange?: (postId: string, index: number) => void;
}) {
  const router = useRouter();
  const viewer = useViewer();

  const [commentOpen,      setCommentOpen]      = useState(false);
  const [menuOpen,         setMenuOpen]         = useState(false);
  const [liked,            setLiked]            = useState(post.liked);
  const [likeCount,        setLikeCount]        = useState(post.likes);
  const [commentCount,     setCommentCount]     = useState(post.comments);
  const [comments,         setComments]         = useState<any[]>([]);
  const [lightboxOpen,     setLightboxOpen]     = useState(false);
  const [lightboxMediaIdx, setLightboxMediaIdx] = useState(0);
  const [pollData,         setPollData]         = useState<PollData | null>(post.poll ?? null);

  const [timestamp, setTimestamp] = useState("");
  useEffect(() => {
    function getRelativeTime(dateStr: string): string {
      const diff  = Date.now() - new Date(dateStr).getTime();
      const mins  = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days  = Math.floor(diff / 86400000);
      if (mins  < 1)  return "just now";
      if (mins  < 60) return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days  < 7)  return `${days}d ago`;
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    setTimestamp(getRelativeTime(post.timestamp));
    const interval = setInterval(() => setTimestamp(getRelativeTime(post.timestamp)), 60000);
    return () => clearInterval(interval);
  }, [post.timestamp]);

  const isLiking   = useRef(false);
  const prevPostId = useRef(post.id);

  useEffect(() => {
    if (prevPostId.current !== post.id) {
      prevPostId.current = post.id;
      setLiked(post.liked);
      setLikeCount(post.likes);
      setCommentCount(post.comments);
      setPollData(post.poll ?? null);
    }
  }, [post.id, post.liked, post.likes, post.comments, post.poll]);

  useEffect(() => {
    if (!commentOpen) return;
    fetch(`/api/posts/${post.id}/comments`)
      .then((r) => r.json())
      .then((d) => {
        if (d.comments) { setComments(d.comments); setCommentCount(d.comments.length); }
      });
  }, [commentOpen, post.id]);

  const handleLike = async () => {
    if (isLiking.current) return;
    isLiking.current = true;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => newLiked ? c + 1 : Math.max(0, c - 1));
    const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setLiked(data.liked);
      setLikeCount(data.like_count);
      postSyncStore.emit({ postId: post.id, liked: data.liked, like_count: data.like_count, comment_count: commentCount });
      onLike?.(post.id);
    }
    isLiking.current = false;
  };

  const handleDoubleTapLike = async () => {
    if (liked || isLiking.current) return;
    isLiking.current = true;
    setLiked(true);
    setLikeCount((c) => c + 1);
    const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setLiked(data.liked);
      setLikeCount(data.like_count);
      postSyncStore.emit({ postId: post.id, liked: data.liked, like_count: data.like_count, comment_count: commentCount });
      onLike?.(post.id);
    }
    isLiking.current = false;
  };

  const handleAddComment = useCallback(async (id: string, text: string, gif_url?: string) => {
    await fetch(`/api/posts/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, gif_url: gif_url ?? null }),
    });
    const d = await fetch(`/api/posts/${id}/comments`).then((r) => r.json());
    if (d.comments) {
      setComments(d.comments);
      setCommentCount(d.comments.length);
      postSyncStore.emit({ postId: id, liked, like_count: likeCount, comment_count: d.comments.length });
    }
  }, [liked, likeCount]);

  const handleSlideChange = useCallback((index: number) => {
    onSlideChange?.(post.id, index);
  }, [post.id, onSlideChange]);

  const handleCreatorMouseEnter = useCallback(() => {
    router.prefetch(`/${post.creator.username}`);
  }, [router, post.creator.username]);

  const normalizedMedia: NormalizedMedia[] = post.media.map((m) => ({
    type:             m.type,
    url:              m.url,
    bunnyVideoId:     m.bunnyVideoId,
    thumbnailUrl:     m.thumbnailUrl,
    processingStatus: m.processingStatus,
    rawVideoUrl:      m.rawVideoUrl,
  }));

  const lightboxPost = toLightboxPost(post);

  const isTextPost = post.content_type === "text";
  const isPollPost = post.content_type === "poll";

  return (
    <div style={{ borderBottom: "1px solid #1A1A2E", fontFamily: "'Inter', sans-serif" }}>

      {lightboxOpen && lightboxPost.media.length > 0 && (
        <Lightbox
          post={lightboxPost}
          allPosts={[lightboxPost]}
          initialMediaIndex={lightboxMediaIdx}
          onClose={() => setLightboxOpen(false)}
          onNavigate={() => {}}
        />
      )}

      {/* Header */}
      <div style={{ padding: "16px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
          onClick={() => router.push(`/${post.creator.username}`)}
          onMouseEnter={handleCreatorMouseEnter}
        >
          <img src={post.creator.avatar_url || ""} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>{post.creator.name}</span>
              {post.creator.isVerified && <BadgeCheck size={14} color="#8B5CF6" />}
            </div>
            <span style={{ fontSize: "12px", color: "#6B6B8A" }}>@{post.creator.username}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#6B6B8A" }}>{timestamp}</span>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ width: "30px", height: "30px", borderRadius: "6px", border: "none", backgroundColor: "transparent", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "36px", zIndex: 50, backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "10px", overflow: "hidden", minWidth: "160px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                {["Add to list", "Hide post", "Report", "Block creator"].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setMenuOpen(false)}
                    style={{ width: "100%", padding: "10px 14px", border: "none", backgroundColor: "transparent", color: i === 3 ? "#EF4444" : "#C4C4D4", fontSize: "13px", textAlign: "left", cursor: "pointer", fontFamily: "'Inter', sans-serif", borderBottom: i < 3 ? "1px solid #2A2A3D" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Caption */}
      {post.caption && (
        <p style={{
          fontSize:   isTextPost ? "15px" : "14px",
          color:      "#C4C4D4",
          lineHeight: isTextPost ? 1.7 : 1.6,
          margin:     "0",
          padding:    isTextPost ? "0 16px 14px" : "0 16px 10px",
          whiteSpace: "pre-wrap",
        }}>
          {post.caption}
        </p>
      )}

      {/* Text post separator */}
      {isTextPost && (
        <div style={{ margin: "0 16px 4px", height: "1px", backgroundColor: "#1A1A2E" }} />
      )}

      {/* Poll */}
      {isPollPost && pollData && (
        <PollDisplay
          poll={pollData}
          postId={post.id}
          onVoted={(updated) => setPollData(updated)}
        />
      )}

      {/* Media */}
      {!isTextPost && !isPollPost && (
        <PostMediaViewer
          media={normalizedMedia}
          isLocked={post.isLocked}
          price={post.price}
          onDoubleTap={handleDoubleTapLike}
          onSingleTap={(index) => { setLightboxMediaIdx(index); setLightboxOpen(true); }}
          onUnlock={() => {}}
          initialSlide={initialSlide}
          onSlideChange={handleSlideChange}
        />
      )}

      {/* Tagged creators */}
      {post.taggedCreators && post.taggedCreators.length > 0 && (
        <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginTop: "10px" }}>
          {post.taggedCreators.map((tc) => (
            <TaggedCreatorCard key={tc.username} creator={tc} onClick={() => router.push(`/${tc.username}`)} />
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: "0 16px" }}>
        <PostActions
          likes={likeCount}
          comments={commentCount}
          liked={liked}
          isSubscribed={true}
          isOwnProfile={false}
          onLike={handleLike}
          onComment={() => setCommentOpen((prev) => !prev)}
          onTip={() => console.log("tip", post.id)}
          onBookmark={() => console.log("bookmarked", post.id)}
        />
        <CommentSection
          postId={post.id}
          comments={comments}
          viewer={viewer ? { username: viewer.username, display_name: viewer.display_name, avatar_url: viewer.avatar_url } : null}
          viewerUserId={viewer?.id}
          isOpen={commentOpen}
          onAddComment={handleAddComment}
          onClose={() => setCommentOpen(false)}
        />
      </div>
    </div>
  );
}

function TaggedCreatorCard({ creator, onClick }: { creator: TaggedCreator; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "12px", border: "1px solid #2A2A3D", backgroundColor: "#0D0D18", cursor: "pointer" }}
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
          {creator.isFree && <span style={{ padding: "1px 7px", borderRadius: "20px", backgroundColor: "rgba(139,92,246,0.15)", border: "1px solid #8B5CF6", fontSize: "10px", fontWeight: 700, color: "#8B5CF6" }}>Free</span>}
        </div>
        <span style={{ fontSize: "12px", color: "#6B6B8A" }}>@{creator.username}</span>
      </div>
    </div>
  );
}