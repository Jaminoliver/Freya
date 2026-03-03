"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { StoryBar } from "@/components/feed/StoryBar";
import { FeedSkeleton } from "@/components/loadscreen/FeedSkeleton";
import { postSyncStore } from "@/lib/store/postSyncStore";
import { useAppStore, isStale } from "@/lib/store/appStore";

const SCROLL_KEY = "home_feed_scroll";
const SLIDES_KEY = "home_feed_slides";

interface FeedPost {
  id: number;
  creator_id: string;
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
    bunny_video_id: string | null;
    processing_status: string | null;
    raw_video_url: string | null;
    locked: boolean;
    display_order: number;
  }[];
}

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

function adaptPost(p: FeedPost) {
  return {
    id: String(p.id),
    creator: {
      name:       p.profiles?.display_name || p.profiles?.username || "Creator",
      username:   p.profiles?.username || "",
      avatar_url: p.profiles?.avatar_url || "",
      isVerified: p.profiles?.is_verified || false,
    },
    timestamp: getRelativeTime(p.published_at),
    caption:   p.caption || "",
    media: (p.media || []).map((m) => ({
      type:             (m.media_type === "video" ? "video" : "image") as "image" | "video",
      url:              m.file_url || "",
      thumbnailUrl:     m.thumbnail_url || null,
      bunnyVideoId:     m.bunny_video_id || null,
      processingStatus: m.processing_status || null,
      rawVideoUrl:      m.raw_video_url || null,
    })),
    isLocked:       p.locked,
    price:          p.is_ppv ? p.ppv_price : null,
    likes:          p.like_count,
    comments:       p.comment_count,
    liked:          p.liked,
    taggedCreators: [],
  };
}

function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          if (!url) { resolve(); return; }
          const img = new Image();
          img.onload  = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        })
    )
  );
}

function collectFirstMediaUrls(posts: FeedPost[], n: number): string[] {
  const urls: string[] = [];
  for (const post of posts) {
    if (urls.length >= n) break;
    for (const m of post.media ?? []) {
      if (urls.length >= n) break;
      const url = m.thumbnail_url || m.file_url;
      if (url) urls.push(url);
    }
  }
  return urls;
}

// ── sessionStorage helpers ──────────────────────────────────────────────────
function saveScroll(y: number) {
  try { sessionStorage.setItem(SCROLL_KEY, String(y)); } catch {}
}
function loadScroll(): number {
  try { return Number(sessionStorage.getItem(SCROLL_KEY) ?? 0); } catch { return 0; }
}
function saveSlides(map: Record<string, number>) {
  try { sessionStorage.setItem(SLIDES_KEY, JSON.stringify(map)); } catch {}
}
function loadSlides(): Record<string, number> {
  try { return JSON.parse(sessionStorage.getItem(SLIDES_KEY) ?? "{}"); } catch { return {}; }
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"feed" | "spotlight">("feed");
  const { feed, setFeed, updateFeedPost } = useAppStore();

  const [posts,       setPosts]       = useState(feed?.posts ?? []);
  const [apiLoading,  setApiLoading]  = useState(!feed || isStale(feed.fetchedAt));
  const [imgLoading,  setImgLoading]  = useState(false);
  const [revealed,    setRevealed]    = useState(!!feed && !isStale(feed.fetchedAt));
  const [nextCursor,  setNextCursor]  = useState<string | null>(feed?.nextCursor ?? null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Per-post carousel slide indices  { postId: slideIndex }
  const [slideMap, setSlideMap] = useState<Record<string, number>>(loadSlides);

  const scrollRestoredRef = useRef(false);
  const showSkeleton = apiLoading || imgLoading;

  // ── Save scroll on scroll + right before navigation ────────────────────
  useEffect(() => {
    const onScroll = () => saveScroll(window.scrollY);
    const onHide   = () => saveScroll(window.scrollY);
    const onVis    = () => { if (document.visibilityState === "hidden") saveScroll(window.scrollY); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // ── Restore scroll after feed reveals ──────────────────────────────────
  useEffect(() => {
    if (!revealed || scrollRestoredRef.current) return;
    scrollRestoredRef.current = true;
    const saved = loadScroll();
    if (saved > 0) {
      // setTimeout beats Next.js's own scroll-to-top which fires after paint
      setTimeout(() => {
        window.scrollTo({ top: saved, behavior: "instant" as ScrollBehavior });
      }, 80);
    }
  }, [revealed]);

  // ── Carousel slide change handler ───────────────────────────────────────
  const handleSlideChange = useCallback((postId: string, index: number) => {
    setSlideMap((prev) => {
      const next = { ...prev, [postId]: index };
      saveSlides(next);
      return next;
    });
  }, []);

  const fetchFeed = useCallback(async (cursor?: string) => {
    try {
      const url  = cursor ? `/api/posts/feed?cursor=${cursor}` : "/api/posts/feed";
      const res  = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load feed");
        setApiLoading(false);
        return;
      }

      const merged: FeedPost[] = data.posts.map((p: FeedPost) => {
        const cached = postSyncStore.get(String(p.id));
        if (!cached) return p;
        return { ...p, liked: cached.liked, like_count: cached.like_count };
      });

      if (cursor) {
        const updated = [...posts, ...merged];
        setPosts(updated);
        setNextCursor(data.nextCursor);
        setFeed({ posts: updated, nextCursor: data.nextCursor, fetchedAt: Date.now() });
        setLoadingMore(false);
        return;
      }

      setPosts(merged);
      setNextCursor(data.nextCursor);
      setApiLoading(false);
      setImgLoading(true);

      const urls = collectFirstMediaUrls(merged, 6);
      await preloadImages(urls);

      setFeed({ posts: merged, nextCursor: data.nextCursor, fetchedAt: Date.now() });
      setImgLoading(false);
      requestAnimationFrame(() => setRevealed(true));

    } catch {
      setError("Failed to load feed");
      setApiLoading(false);
      setImgLoading(false);
    }
  }, [posts, setFeed]);

  useEffect(() => {
    if (feed && !isStale(feed.fetchedAt)) {
      setPosts(feed.posts);
      setNextCursor(feed.nextCursor);
      setRevealed(true);
      return;
    }
    fetchFeed();
  }, []);

  useEffect(() => {
    return postSyncStore.subscribe((event) => {
      setPosts((prev) =>
        prev.map((p) =>
          String(p.id) === event.postId
            ? { ...p, liked: event.liked, like_count: event.like_count, comment_count: event.comment_count ?? p.comment_count }
            : p
        )
      );
      updateFeedPost(event.postId, { liked: event.liked, like_count: event.like_count, comment_count: event.comment_count });
    });
  }, [updateFeedPost]);

  const handleLoadMore = () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    fetchFeed(nextCursor);
  };

  const handleLikeToggle = (_postId: string) => {};

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0" }}>

      <style>{`
        .feed-desktop-header { display: flex; }
        @media (max-width: 767px) { .feed-desktop-header { display: none !important; } }

        @keyframes feedFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .feed-revealed {
          animation: feedFadeIn 0.35s ease forwards;
        }
      `}</style>

      {/* Sticky header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        backgroundColor: "rgba(10,10,15,0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1F1F2A",
        padding: "0 16px",
      }}>
        <div className="feed-desktop-header" style={{ alignItems: "center", padding: "14px 0 10px" }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>Feed</span>
        </div>
      </div>

      {/* Story bar */}
      <div style={{ padding: "0 16px", borderBottom: "1px solid #1F1F2A", backgroundColor: "#0A0A0F" }}>
        <StoryBar />
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid #1F1F2A", padding: "0 16px", backgroundColor: "#0A0A0F" }}>
        <div style={{ display: "flex" }}>
          {(["feed", "spotlight"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: "12px 0", background: "none", border: "none",
                borderBottom: activeTab === tab ? "2px solid #8B5CF6" : "2px solid transparent",
                color: activeTab === tab ? "#FFFFFF" : "#6B6B8A",
                fontSize: "14px", fontWeight: activeTab === tab ? 700 : 400,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s", letterSpacing: "0.01em",
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Feed content */}
      <div style={{ padding: "0 0 40px" }}>
        {activeTab === "feed" ? (
          <>
            {showSkeleton && <FeedSkeleton count={5} />}

            {!showSkeleton && (
              <div className={revealed ? "feed-revealed" : ""} style={{ opacity: revealed ? 1 : 0 }}>

                {error && (
                  <div style={{ textAlign: "center", padding: "48px 24px", color: "#6B6B8A", fontSize: "14px" }}>
                    {error}
                  </div>
                )}

                {!error && posts.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 24px" }}>
                    <p style={{ color: "#6B6B8A", fontSize: "15px", marginBottom: "8px" }}>Your feed is empty</p>
                    <p style={{ color: "#4A4A6A", fontSize: "13px" }}>Subscribe to creators to see their posts here</p>
                  </div>
                )}

                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={adaptPost(post)}
                    onLike={handleLikeToggle}
                    initialSlide={slideMap[String(post.id)] ?? 0}
                    onSlideChange={handleSlideChange}
                  />
                ))}

                {nextCursor && !loadingMore && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                    <button
                      onClick={handleLoadMore}
                      style={{ padding: "10px 24px", borderRadius: "20px", border: "1.5px solid #2A2A3D", backgroundColor: "transparent", color: "#8B5CF6", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                    >
                      Load more
                    </button>
                  </div>
                )}

                {loadingMore && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #1F1F2A", borderTop: "2px solid #8B5CF6", animation: "spin 0.9s linear infinite" }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px", color: "#4A4A6A", fontSize: "14px" }}>
            Spotlight coming soon ✨
          </div>
        )}
      </div>
    </div>
  );
}