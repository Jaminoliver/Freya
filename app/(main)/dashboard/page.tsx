"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { StoryBar } from "@/components/feed/StoryBar";
import { FeedSkeleton } from "@/components/loadscreen/FeedSkeleton";
import { postSyncStore } from "@/lib/store/postSyncStore";
import { useAppStore, isStale } from "@/lib/store/appStore";
import type { PollData } from "@/components/feed/PollDisplay";

const SCROLL_KEY = "home_feed_scroll";
const SLIDES_KEY = "home_feed_slides";

interface FeedPost {
  id:           number;
  creator_id:   string;
  content_type: string;
  caption:      string | null;
  is_free:      boolean;
  is_ppv:       boolean;
  ppv_price:    number | null;
  like_count:   number;
  comment_count: number;
  published_at: string;
  liked:        boolean;
  can_access:   boolean;
  locked:       boolean;
  poll?:        PollData | null;
  profiles: {
    username:     string;
    display_name: string | null;
    avatar_url:   string | null;
    is_verified:  boolean;
  };
  media: {
    id:                number;
    media_type:        string;
    file_url:          string | null;
    thumbnail_url:     string | null;
    bunny_video_id:    string | null;
    processing_status: string | null;
    raw_video_url:     string | null;
    locked:            boolean;
    display_order:     number;
    width:             number | null;
    height:            number | null;
    aspect_ratio:      number | null;
    blur_hash:         string | null;
  }[];
}

function adaptPost(p: FeedPost) {
  return {
    id:           String(p.id),
    content_type: p.content_type,
    creator: {
      name:       p.profiles?.display_name || p.profiles?.username || "Creator",
      username:   p.profiles?.username || "",
      avatar_url: p.profiles?.avatar_url || "",
      isVerified: p.profiles?.is_verified || false,
    },
    timestamp: p.published_at,
    caption:   p.caption || "",
    media: (p.media || []).map((m) => ({
      type:             (m.media_type === "video" ? "video" : "image") as "image" | "video",
      url:              m.file_url || "",
      thumbnailUrl:     m.thumbnail_url || null,
      bunnyVideoId:     m.bunny_video_id || null,
      processingStatus: m.processing_status || null,
      rawVideoUrl:      m.raw_video_url || null,
      width:            m.width ?? null,
      height:           m.height ?? null,
      aspectRatio:      m.aspect_ratio ?? null,
      blurHash:         m.blur_hash ?? null,
    })),
    isLocked:       p.locked,
    price:          p.is_ppv ? p.ppv_price : null,
    likes:          p.like_count,
    comments:       p.comment_count,
    liked:          p.liked,
    poll:           p.poll ?? null,
    taggedCreators: [],
  };
}

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

// Preload thumbnail URLs for first N posts so blur shows immediately when skeleton drops
function preloadThumbnails(posts: FeedPost[], count = 3): Promise<void> {
  const urls: string[] = [];
  for (const post of posts.slice(0, count)) {
    for (const m of post.media.slice(0, 1)) {
      const src = m.thumbnail_url ?? m.file_url;
      if (src) urls.push(src);
    }
  }
  if (!urls.length) return Promise.resolve();
  return Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload  = () => resolve();
          img.onerror = () => resolve(); // never block on error
          img.src = src;
        })
    )
  ).then(() => undefined);
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"feed" | "spotlight">("feed");
  const { feed, setFeed, updateFeedPost } = useAppStore();

  const [posts,       setPosts]       = useState<FeedPost[]>([]);
  const [apiLoading,  setApiLoading]  = useState(true);
  const [thumbsReady, setThumbsReady] = useState(false);
  const [nextCursor,  setNextCursor]  = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [slideMap,    setSlideMap]    = useState<Record<string, number>>({});
  useEffect(() => { setSlideMap(loadSlides()); }, []);

  // Skeleton stays until API done AND first-post thumbnails preloaded
  const showSkeleton = apiLoading || !thumbsReady;

  const scrollRestoredRef = useRef(false);
  const sentinelRef       = useRef<HTMLDivElement>(null);
  const nextCursorRef     = useRef<string | null>(null);
  const loadingMoreRef    = useRef(false);

  useEffect(() => { nextCursorRef.current = nextCursor; }, [nextCursor]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);

  // ── Save scroll ───────────────────────────────────────────────────────────
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

  // ── Restore scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    if (showSkeleton || scrollRestoredRef.current) return;
    scrollRestoredRef.current = true;
    const saved = loadScroll();
    if (saved > 0) setTimeout(() => window.scrollTo({ top: saved, behavior: "instant" as ScrollBehavior }), 80);
  }, [showSkeleton]);

  const handleSlideChange = useCallback((postId: string, index: number) => {
    setSlideMap((prev) => {
      const next = { ...prev, [postId]: index };
      saveSlides(next);
      return next;
    });
  }, []);

  const postsRef = useRef<FeedPost[]>(posts);
  useEffect(() => { postsRef.current = posts; }, [posts]);

  const fetchFeed = useCallback(async (cursor?: string) => {
    try {
      const url  = cursor ? `/api/posts/feed?cursor=${encodeURIComponent(cursor)}` : "/api/posts/feed";
      const res  = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load feed");
        setApiLoading(false);
        setThumbsReady(true);
        setLoadingMore(false);
        return;
      }

      const merged: FeedPost[] = data.posts.map((p: FeedPost) => {
        const cached = postSyncStore.get(String(p.id));
        if (!cached) return p;
        return { ...p, liked: cached.liked, like_count: cached.like_count };
      });

      if (cursor) {
        const updated = [...postsRef.current, ...merged];
        setPosts(updated);
        setNextCursor(data.nextCursor ?? null);
        setFeed({ posts: updated, nextCursor: data.nextCursor ?? null, fetchedAt: Date.now() });
        setLoadingMore(false);
      } else {
        setPosts(merged);
        setNextCursor(data.nextCursor ?? null);
        setFeed({ posts: merged, nextCursor: data.nextCursor ?? null, fetchedAt: Date.now() });
        setApiLoading(false);
        // Preload thumbnails for first 3 posts, then reveal feed
        preloadThumbnails(merged, 5).then(() => setThumbsReady(true));
      }
    } catch {
      setError("Failed to load feed");
      setApiLoading(false);
      setThumbsReady(true);
      setLoadingMore(false);
    }
  }, [setFeed]);

  useEffect(() => {
    if (feed && !isStale(feed.fetchedAt)) {
      setPosts(feed.posts);
      setNextCursor(feed.nextCursor);
      setApiLoading(false);
      // Preload thumbnails even from cache
      preloadThumbnails(feed.posts, 5).then(() => setThumbsReady(true));
      return;
    }
    fetchFeed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Infinite scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursorRef.current && !loadingMoreRef.current) {
          loadingMoreRef.current = true;
          setLoadingMore(true);
          fetchFeed(nextCursorRef.current);
        }
      },
      { rootMargin: "600px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchFeed, showSkeleton]);

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

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0" }}>

      <div style={{ padding: "0 16px", borderBottom: "1px solid #1F1F2A", backgroundColor: "#0A0A0F" }}>
        <StoryBar />
      </div>

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

      <div style={{ padding: "0 0 40px" }}>
        {activeTab === "feed" ? (
          <>
            {showSkeleton && <FeedSkeleton count={5} />}

            {!showSkeleton && (
              <>
                {error && (
                  <div style={{ textAlign: "center", padding: "48px 24px", color: "#6B6B8A", fontSize: "14px" }}>{error}</div>
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
                    onLike={() => {}}
                    initialSlide={slideMap[String(post.id)] ?? 0}
                    onSlideChange={handleSlideChange}
                  />
                ))}

                <div ref={sentinelRef} style={{ height: "1px", marginTop: "1px" }} />

                {loadingMore && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                    <div className="feed-spinner" />
                  </div>
                )}

                {!nextCursor && !loadingMore && posts.length > 0 && (
                  <div style={{ textAlign: "center", padding: "24px", color: "#4A4A6A", fontSize: "13px" }}>
                    You're all caught up ✓
                  </div>
                )}
              </>
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