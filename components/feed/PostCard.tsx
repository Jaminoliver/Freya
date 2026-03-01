"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MoreHorizontal, BadgeCheck, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import PostActions from "@/components/profile/PostActions";
import CommentSection from "@/components/profile/CommentSection";
import VideoPlayer, { getBunnyThumbnail } from "@/components/video/VideoPlayer";
import ImageCarousel from "@/components/profile/ImageCarousel";
import Lightbox from "@/components/profile/Lightbox";
import type { LightboxPost } from "@/components/profile/Lightbox";
import { createClient } from "@/lib/supabase/client";
import { postSyncStore } from "@/lib/store/postSyncStore";

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
  creator:         { name: string; username: string; avatar_url: string; isVerified: boolean };
  timestamp:       string;
  caption:         string;
  media:           MediaItem[];
  isLocked:        boolean;
  price:           number | null;
  likes:           number;
  comments:        number;
  liked:           boolean;
  taggedCreators?: TaggedCreator[];
}

interface Viewer {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

function useMediaHeight() {
  const [height, setHeight] = useState("auto");
  useEffect(() => {
    const update = () => setHeight(window.innerWidth >= 768 ? "460px" : "auto");
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return height;
}

let cachedViewer: Viewer | null = null;

function useViewer() {
  const [viewer, setViewer] = useState<Viewer | null>(cachedViewer);
  useEffect(() => {
    if (cachedViewer) return;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
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
        setViewer(cachedViewer);
      }
    })();
  }, []);
  return viewer;
}

/** Convert home feed MediaItem[] into the LightboxPost shape */
function toLightboxPost(post: Post): LightboxPost {
  return {
    id: Number(post.id),
    media: post.media
      .filter((m) => m.type === "image" && m.url)
      .map((m, i) => ({
        id:                i,
        media_type:        "image",
        file_url:          m.url,
        thumbnail_url:     m.thumbnailUrl ?? null,
        raw_video_url:     null,
        locked:            false,
        display_order:     i,
        processing_status: null,
        bunny_video_id:    null,
      })),
  };
}

/** Scroll-aware tap handler hook — only fires onTap if finger didn't scroll */
function useTapWithScrollGuard(onTap: () => void) {
  const startX  = useRef<number>(0);
  const startY  = useRef<number>(0);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const movedX = Math.abs(e.changedTouches[0].clientX - startX.current);
    const movedY = Math.abs(e.changedTouches[0].clientY - startY.current);
    // If finger moved more than 10px in any direction it's a scroll — ignore
    if (movedX > 10 || movedY > 10) return;
    onTap();
  };

  return { onTouchStart, onTouchEnd };
}

// ── PostCard ──────────────────────────────────────────────────────────────────
export function PostCard({ post, onLike }: { post: Post; onLike?: (postId: string) => void }) {
  const router      = useRouter();
  const mediaHeight = useMediaHeight();
  const viewer      = useViewer();

  const [commentOpen,       setCommentOpen]       = useState(false);
  const [menuOpen,          setMenuOpen]          = useState(false);
  const [liked,             setLiked]             = useState(post.liked);
  const [likeCount,         setLikeCount]         = useState(post.likes);
  const [commentCount,      setCommentCount]      = useState(post.comments);
  const [comments,          setComments]          = useState<any[]>([]);
  const [thumbReady,        setThumbReady]        = useState(!post.media[0]);
  const [lightboxOpen,      setLightboxOpen]      = useState(false);
  const [lightboxMediaIdx,  setLightboxMediaIdx]  = useState(0);

  const prevPostId = useRef(post.id);
  useEffect(() => {
    if (prevPostId.current !== post.id) {
      prevPostId.current = post.id;
      setLiked(post.liked);
      setLikeCount(post.likes);
      setCommentCount(post.comments);
    }
  }, [post.id, post.liked, post.likes, post.comments]);

  useEffect(() => {
    if (!commentOpen) return;
    fetch(`/api/posts/${post.id}/comments`)
      .then((r) => r.json())
      .then((d) => {
        if (d.comments) { setComments(d.comments); setCommentCount(d.comments.length); }
      });
  }, [commentOpen, post.id]);

  const handleLike = async () => {
    const res  = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setLiked(data.liked);
      setLikeCount(data.like_count);
      postSyncStore.emit({ postId: post.id, liked: data.liked, like_count: data.like_count, comment_count: commentCount });
      onLike?.(post.id);
    }
  };

  const handleAddComment = useCallback(async (id: string, text: string) => {
    await fetch(`/api/posts/${id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    const d = await fetch(`/api/posts/${id}/comments`).then((r) => r.json());
    if (d.comments) {
      setComments(d.comments);
      setCommentCount(d.comments.length);
      postSyncStore.emit({ postId: id, liked, like_count: likeCount, comment_count: d.comments.length });
    }
  }, [liked, likeCount]);

  const openLightbox = (index: number) => {
    setLightboxMediaIdx(index);
    setLightboxOpen(true);
  };

  // Scroll-aware tap handlers for the single photo div
  const singlePhotoTap = useTapWithScrollGuard(() => openLightbox(0));

  const firstMedia   = post.media[0];
  const isVideoPost  = firstMedia?.type === "video";
  const isMultiPhoto = !isVideoPost && post.media.length > 1;

  const lockedThumb: string | null = firstMedia
    ? firstMedia.type === "video" && firstMedia.bunnyVideoId
      ? getBunnyThumbnail(firstMedia.bunnyVideoId)
      : (firstMedia.thumbnailUrl || null)
    : null;

  const carouselMedia = post.media
    .filter((m) => m.type === "image")
    .map((m, i) => ({
      id:                i,
      media_type:        "image" as const,
      file_url:          m.url,
      thumbnail_url:     m.thumbnailUrl ?? null,
      raw_video_url:     null,
      locked:            false,
      display_order:     i,
      processing_status: null,
      bunny_video_id:    null,
    }));

  const lightboxPost = toLightboxPost(post);

  return (
    <div style={{ borderBottom: "1px solid #1A1A2E", fontFamily: "'Inter', sans-serif" }}>

      {/* Lightbox */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => router.push(`/${post.creator.username}`)}>
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
          <span style={{ fontSize: "12px", color: "#6B6B8A" }}>{post.timestamp}</span>
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
        <p style={{ fontSize: "14px", color: "#C4C4D4", lineHeight: 1.6, margin: "0", padding: "0 16px 10px" }}>
          {post.caption}
        </p>
      )}

      {/* Media */}
      {firstMedia && (
        post.isLocked ? (
          <div style={{ position: "relative", overflow: "hidden", width: "100%" }}>
            <img
              src={lockedThumb ?? undefined}
              alt=""
              onLoad={() => setThumbReady(true)}
              onError={() => setThumbReady(true)}
              style={{ width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", filter: "blur(16px)", transform: "scale(1.05)", display: lockedThumb ? "block" : "none" }}
            />
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(10,10,15,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", minHeight: lockedThumb ? undefined : "280px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(139,92,246,0.2)", border: "1.5px solid #8B5CF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lock size={18} color="#8B5CF6" />
              </div>
              <button style={{ padding: "8px 20px", borderRadius: "8px", backgroundColor: "#8B5CF6", border: "none", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                {post.price ? `Unlock for ₦${(post.price / 100).toLocaleString("en-NG")}` : "Subscribe to unlock"}
              </button>
            </div>
          </div>

        ) : isVideoPost ? (
          <div style={{ height: mediaHeight === "auto" ? undefined : mediaHeight, aspectRatio: mediaHeight === "auto" ? "9/16" : undefined, maxHeight: "75vh", overflow: "hidden", position: "relative", backgroundColor: "#000", width: "100%" }}>
            {mediaHeight === "auto" && (
              <>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "28px", backgroundImage: `url(${firstMedia.bunnyVideoId ? getBunnyThumbnail(firstMedia.bunnyVideoId) : (firstMedia.thumbnailUrl || "")})`, backgroundSize: "cover", backgroundPosition: "left center", filter: "blur(14px)", transform: "scaleX(1.3)", opacity: 0.7 }} />
                <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "28px", backgroundImage: `url(${firstMedia.bunnyVideoId ? getBunnyThumbnail(firstMedia.bunnyVideoId) : (firstMedia.thumbnailUrl || "")})`, backgroundSize: "cover", backgroundPosition: "right center", filter: "blur(14px)", transform: "scaleX(1.3)", opacity: 0.7 }} />
              </>
            )}
            {!thumbReady && (
              <img
                src={firstMedia.bunnyVideoId ? getBunnyThumbnail(firstMedia.bunnyVideoId) : (firstMedia.thumbnailUrl || "")}
                alt=""
                onLoad={() => setThumbReady(true)}
                onError={() => setThumbReady(true)}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
              />
            )}
            <div style={{ position: "absolute", inset: mediaHeight === "auto" ? "0 28px" : 0, zIndex: 1 }}>
              <VideoPlayer
                bunnyVideoId={firstMedia.bunnyVideoId ?? null}
                thumbnailUrl={firstMedia.thumbnailUrl ?? null}
                processingStatus={firstMedia.processingStatus ?? null}
                rawVideoUrl={firstMedia.rawVideoUrl ?? null}
                fillParent={true}
              />
            </div>
          </div>

        ) : isMultiPhoto ? (
          <ImageCarousel
            media={carouselMedia}
            onImageClick={(index) => openLightbox(index)}
          />

        ) : (
          // Single photo — scroll-aware tap handler prevents lightbox opening during page scroll
          <div
            onTouchStart={singlePhotoTap.onTouchStart}
            onTouchEnd={singlePhotoTap.onTouchEnd}
            onClick={() => openLightbox(0)}  // desktop fallback
            style={{ position: "relative", overflow: "hidden", backgroundColor: "#000", width: "100%", cursor: "zoom-in" }}
          >
            <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "80px", backgroundImage: `url(${firstMedia.url})`, backgroundSize: "cover", backgroundPosition: "left center", filter: "blur(16px) brightness(0.7)", transform: "scaleX(1.3)", opacity: 0.9 }} />
            <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "80px", backgroundImage: `url(${firstMedia.url})`, backgroundSize: "cover", backgroundPosition: "right center", filter: "blur(16px) brightness(0.7)", transform: "scaleX(1.3)", opacity: 0.9 }} />
            <img
              src={firstMedia.url}
              alt=""
              onLoad={() => setThumbReady(true)}
              onError={() => setThumbReady(true)}
              style={{ position: "relative", zIndex: 1, width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", display: "block" }}
            />
          </div>
        )
      )}

      {/* Tagged creators */}
      {post.taggedCreators && post.taggedCreators.length > 0 && (
        <>
          <style>{`.tagged-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 10px; } @media (max-width: 480px) { .tagged-grid { grid-template-columns: 1fr !important; } }`}</style>
          <div className="tagged-grid" style={{ padding: "0 16px" }}>
            {post.taggedCreators.map((tc) => (
              <TaggedCreatorCard key={tc.username} creator={tc} onClick={() => router.push(`/${tc.username}`)} />
            ))}
          </div>
        </>
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
          {creator.isFree && <span style={{ padding: "1px 7px", borderRadius: "20px", backgroundColor: "rgba(139,92,246,0.15)", border: "1px solid #8B5CF6", fontSize: "10px", fontWeight: 700, color: "#8B5CF6" }}>Free</span>}
        </div>
        <span style={{ fontSize: "12px", color: "#6B6B8A" }}>@{creator.username}</span>
      </div>
    </div>
  );
}