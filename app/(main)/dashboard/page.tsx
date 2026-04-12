"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { StoryBar } from "@/components/story/StoryBar";
import StoryViewer from "@/components/story/StoryViewer";
import { FeedSkeleton } from "@/components/loadscreen/FeedSkeleton";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import { FeedSuggestions } from "@/components/feed/FeedSuggestions";
import { postSyncStore } from "@/lib/store/postSyncStore";
import { useAppStore, isStale } from "@/lib/store/appStore";
import type { PollData } from "@/components/feed/PollDisplay";
import type { CreatorStoryGroup } from "@/components/story/StoryBar";
import type { User } from "@/lib/types/profile";

const SCROLL_KEY         = "home_feed_scroll";
const SPOTLIGHT_SCROLL_KEY = "home_spotlight_scroll";
const SLIDES_KEY         = "home_feed_slides";
const SUGGESTIONS_EVERY  = 4;

interface FeedPost {
  id:            number;
  creator_id:    string;
  content_type:  string;
  caption:          string | null;
  text_background?: string | null;
  is_free:       boolean;
  is_ppv:        boolean;
  ppv_price:     number | null;
  like_count:    number;
  comment_count: number;
  published_at:  string;
  liked:         boolean;
  can_access:    boolean;
  locked:        boolean;
  saved_post:    boolean;
  saved_creator: boolean;
  poll?:         PollData | null;
  profiles: {
    username:           string;
    display_name:       string | null;
    avatar_url:         string | null;
    is_verified:        boolean;
    subscription_price?: number | null;
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
    id:              String(p.id),
    content_type:    p.content_type,
    text_background: p.text_background ?? null,
    creator: {
      id:         p.creator_id,
      name:       p.profiles?.display_name || p.profiles?.username || "Creator",
      username:   p.profiles?.username || "",
      avatar_url: p.profiles?.avatar_url || "",
      isVerified: p.profiles?.is_verified || false,
    },
    timestamp:  p.published_at,
    caption:    p.caption || "",
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
    is_ppv:         p.is_ppv,
    price:          p.is_ppv ? p.ppv_price : null,
    likes:          p.like_count,
    comments:       p.comment_count,
    liked:          p.liked,
    poll:           p.poll ?? null,
    taggedCreators: [],
  };
}

function saveScroll(key: string, y: number) { try { sessionStorage.setItem(key, String(y)); } catch {} }
function loadScroll(key: string): number  { try { return Number(sessionStorage.getItem(key) ?? 0); } catch { return 0; } }
function saveSlides(map: Record<string, number>) { try { sessionStorage.setItem(SLIDES_KEY, JSON.stringify(map)); } catch {} }
function loadSlides(): Record<string, number>    { try { return JSON.parse(sessionStorage.getItem(SLIDES_KEY) ?? "{}"); } catch { return {}; } }

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"feed" | "spotlight">("feed");
  const { feed, setFeed, updateFeedPost } = useAppStore();

  // ── Feed state ─────────────────────────────────────────────────────────
  const [posts,       setPosts]       = useState<FeedPost[]>([]);
  const [apiLoading,  setApiLoading]  = useState(true);
  const [nextCursor,  setNextCursor]  = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [slideMap,    setSlideMap]    = useState<Record<string, number>>({});

  // ── Spotlight state ────────────────────────────────────────────────────
  const [spotPosts,       setSpotPosts]       = useState<FeedPost[]>([]);
  const [spotLoading,     setSpotLoading]     = useState(true);
  const [spotNextPage,    setSpotNextPage]    = useState<number | null>(null);
  const [spotLoadingMore, setSpotLoadingMore] = useState(false);
  const [spotError,       setSpotError]       = useState<string | null>(null);
  const [spotFetched,     setSpotFetched]     = useState(false);

  // ── Subscribed creators tracking (for syncing banner across cards) ────
  const [subscribedCreatorIds, setSubscribedCreatorIds] = useState<Set<string>>(new Set());

  // ── Shared state ───────────────────────────────────────────────────────
  const [ppvOpen,    setPpvOpen]    = useState(false);
  const [ppvPrice,   setPpvPrice]   = useState(0);
  const [ppvPostId,  setPpvPostId]  = useState<number | undefined>(undefined);
  const [ppvCreator, setPpvCreator] = useState<User | null>(null);

  const [storyGroups,     setStoryGroups]     = useState<CreatorStoryGroup[]>([]);
  const [storyStartIdx,   setStoryStartIdx]   = useState(0);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [externalGroups,  setExternalGroups]  = useState<CreatorStoryGroup[]>([]);

  useEffect(() => { setSlideMap(loadSlides()); }, []);

  const showSkeleton     = apiLoading;
  const showSpotSkeleton = spotLoading;

  const scrollRestoredRef     = useRef(false);
  const spotScrollRestoredRef = useRef(false);
  const sentinelRef           = useRef<HTMLDivElement>(null);
  const spotSentinelRef       = useRef<HTMLDivElement>(null);
  const nextCursorRef         = useRef<string | null>(null);
  const loadingMoreRef        = useRef(false);
  const spotNextPageRef       = useRef<number | null>(null);
  const spotLoadingMoreRef    = useRef(false);

  useEffect(() => { nextCursorRef.current = nextCursor; }, [nextCursor]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);
  useEffect(() => { spotNextPageRef.current = spotNextPage; }, [spotNextPage]);
  useEffect(() => { spotLoadingMoreRef.current = spotLoadingMore; }, [spotLoadingMore]);

  // ── Scroll persistence (throttled) ────────────────────────────────────
  const scrollKey = activeTab === "feed" ? SCROLL_KEY : SPOTLIGHT_SCROLL_KEY;

  useEffect(() => {
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        saveScroll(scrollKey, window.scrollY);
        rafId = null;
      });
    };
    const onHide = () => saveScroll(scrollKey, window.scrollY);
    const onVis  = () => { if (document.visibilityState === "hidden") saveScroll(scrollKey, window.scrollY); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [scrollKey]);

  // Restore feed scroll
  useEffect(() => {
    if (activeTab !== "feed" || showSkeleton || scrollRestoredRef.current) return;
    scrollRestoredRef.current = true;
    const saved = loadScroll(SCROLL_KEY);
    if (saved > 0) setTimeout(() => window.scrollTo({ top: saved, behavior: "instant" as ScrollBehavior }), 80);
  }, [showSkeleton, activeTab]);

  // Restore spotlight scroll
  useEffect(() => {
    if (activeTab !== "spotlight" || showSpotSkeleton || spotScrollRestoredRef.current) return;
    spotScrollRestoredRef.current = true;
    const saved = loadScroll(SPOTLIGHT_SCROLL_KEY);
    if (saved > 0) setTimeout(() => window.scrollTo({ top: saved, behavior: "instant" as ScrollBehavior }), 80);
  }, [showSpotSkeleton, activeTab]);

  const handleSlideChange = useCallback((postId: string, index: number) => {
    setSlideMap((prev) => { const next = { ...prev, [postId]: index }; saveSlides(next); return next; });
  }, []);

  const postsRef     = useRef<FeedPost[]>(posts);
  const spotPostsRef = useRef<FeedPost[]>(spotPosts);
  useEffect(() => { postsRef.current = posts; }, [posts]);
  useEffect(() => { spotPostsRef.current = spotPosts; }, [spotPosts]);

  // ── Feed fetch ─────────────────────────────────────────────────────────
  const fetchFeed = useCallback(async (cursor?: string) => {
    try {
      const url  = cursor ? `/api/posts/feed?cursor=${encodeURIComponent(cursor)}` : "/api/posts/feed";
      const res  = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load feed");
        setApiLoading(false);
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
      }
    } catch {
      setError("Failed to load feed");
      setApiLoading(false);
      setLoadingMore(false);
    }
  }, [setFeed]);

  useEffect(() => {
    if (feed && !isStale(feed.fetchedAt)) {
      setPosts(feed.posts);
      setNextCursor(feed.nextCursor);
      setApiLoading(false);
      return;
    }
    fetchFeed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Feed infinite scroll
  useEffect(() => {
    if (activeTab !== "feed") return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && nextCursorRef.current && !loadingMoreRef.current) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
        fetchFeed(nextCursorRef.current);
      }
    }, { rootMargin: "600px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchFeed, showSkeleton, activeTab]);

  // ── Spotlight fetch ────────────────────────────────────────────────────
  const fetchSpotlight = useCallback(async (page?: number) => {
    try {
      const url  = page ? `/api/posts/spotlight?page=${page}` : "/api/posts/spotlight";
      const res  = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setSpotError(data.error || "Failed to load spotlight");
        setSpotLoading(false);
        setSpotLoadingMore(false);
        return;
      }

      const merged: FeedPost[] = data.posts.map((p: FeedPost) => {
        const cached = postSyncStore.get(String(p.id));
        if (!cached) return p;
        return { ...p, liked: cached.liked, like_count: cached.like_count };
      });

      if (page && page > 1) {
        const updated = [...spotPostsRef.current, ...merged];
        setSpotPosts(updated);
        setSpotNextPage(data.nextPage ?? null);
        setSpotLoadingMore(false);
      } else {
        setSpotPosts(merged);
        setSpotNextPage(data.nextPage ?? null);
        setSpotLoading(false);
      }
    } catch {
      setSpotError("Failed to load spotlight");
      setSpotLoading(false);
      setSpotLoadingMore(false);
    }
  }, []);

  // Fetch spotlight on first tab switch
  useEffect(() => {
    if (activeTab === "spotlight" && !spotFetched) {
      setSpotFetched(true);
      fetchSpotlight();
    }
  }, [activeTab, spotFetched, fetchSpotlight]);

  // Spotlight infinite scroll
  useEffect(() => {
    if (activeTab !== "spotlight") return;
    const sentinel = spotSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && spotNextPageRef.current && !spotLoadingMoreRef.current) {
        spotLoadingMoreRef.current = true;
        setSpotLoadingMore(true);
        fetchSpotlight(spotNextPageRef.current);
      }
    }, { rootMargin: "600px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchSpotlight, showSpotSkeleton, activeTab]);

  // ── Post sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    return postSyncStore.subscribe((event) => {
      const update = (prev: FeedPost[]) =>
        prev.map((p) =>
          String(p.id) === event.postId
            ? { ...p, liked: event.liked, like_count: event.like_count, comment_count: event.comment_count ?? p.comment_count }
            : p
        );
      setPosts(update);
      setSpotPosts(update);
      updateFeedPost(event.postId, { liked: event.liked, like_count: event.like_count, comment_count: event.comment_count });
    });
  }, [updateFeedPost]);

  // ── PPV unlock ─────────────────────────────────────────────────────────
  const handleUnlock = useCallback((postId: string) => {
    const allPosts = [...postsRef.current, ...spotPostsRef.current];
    const post = allPosts.find((p) => String(p.id) === postId);
    if (!post) return;
    const creator: User = {
      id:           post.creator_id,
      username:     post.profiles?.username || "",
      display_name: post.profiles?.display_name || post.profiles?.username || "",
      avatar_url:   post.profiles?.avatar_url || "",
      role:         "creator",
    } as User;
    setPpvCreator(creator);
    setPpvPostId(post.id);
    setPpvPrice((post.ppv_price ?? 0) / 100);
    setPpvOpen(true);
  }, []);

  const handlePpvSuccess = useCallback(() => {
    const unlockPost = (prev: FeedPost[]) =>
      prev.map((p) => p.id === ppvPostId ? { ...p, locked: false, can_access: true } : p);
    setPosts(unlockPost);
    setSpotPosts(unlockPost);
  }, [ppvPostId]);

  // ── Stories ────────────────────────────────────────────────────────────
  const handleOpenViewer = useCallback((groups: CreatorStoryGroup[], startIndex: number) => {
    setStoryGroups(groups);
    setStoryStartIdx(startIndex);
    setStoryViewerOpen(true);
  }, []);

  const handleViewerClose = useCallback((updatedGroups: CreatorStoryGroup[]) => {
    setStoryViewerOpen(false);
    setExternalGroups((prev) => {
      const map = new Map(prev.map((g) => [g.creatorId, g]));
      for (const g of updatedGroups) {
        if (g.items.length > 0) {
          const hasUnviewed = g.items.some((s) => !s.viewed && !s.isProcessing);
          map.set(g.creatorId, { ...g, hasUnviewed });
        } else {
          map.delete(g.creatorId);
        }
      }
      return Array.from(map.values());
    });
  }, []);

  const handleGroupFullyViewed = useCallback((creatorId: string) => {
    setExternalGroups((prev) =>
      prev.map((g) => g.creatorId === creatorId ? { ...g, hasUnviewed: false } : g)
    );
  }, []);

  // ── Tab switch: save scroll, scroll to top ─────────────────────────────
  const handleTabSwitch = useCallback((tab: "feed" | "spotlight") => {
    if (tab === activeTab) return;
    // Save current scroll position before switching
    saveScroll(activeTab === "feed" ? SCROLL_KEY : SPOTLIGHT_SCROLL_KEY, window.scrollY);
    setActiveTab(tab);
    // Reset scroll restore flag for the target tab so it restores on render
    if (tab === "feed") {
      scrollRestoredRef.current = false;
    } else {
      spotScrollRestoredRef.current = false;
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [activeTab]);

  // ── Handle subscription from Spotlight banner ───────────────────────
  const handleSubscribed = useCallback((creatorId: string) => {
    setSubscribedCreatorIds((prev) => {
      const next = new Set(prev);
      next.add(creatorId);
      return next;
    });
  }, []);

  /** Build feed items: interleave <FeedSuggestions> after every N posts */
  function buildFeedItems(feedPosts: FeedPost[], isSpotlight = false) {
    const items: React.ReactNode[] = [];
    feedPosts.forEach((post, index) => {
      const subPrice = post.profiles?.subscription_price ?? undefined;
      items.push(
        <PostCard
          key={post.id}
          post={adaptPost(post)}
          onLike={() => {}}
          onUnlock={handleUnlock}
          initialSlide={slideMap[String(post.id)] ?? 0}
          onSlideChange={handleSlideChange}
          showSubscribeBanner={isSpotlight}
          onSubscribed={isSpotlight ? handleSubscribed : undefined}
          subscriptionPrice={isSpotlight ? subPrice : undefined}
          isSubscribedExternal={isSpotlight ? subscribedCreatorIds.has(post.creator_id) : false}
          initialSavedPost={post.saved_post ?? false}
          initialSavedCreator={post.saved_creator ?? false}
        />
      );
      if ((index + 1) % SUGGESTIONS_EVERY === 0 && index < feedPosts.length - 1) {
        items.push(<FeedSuggestions key={`suggestions-${index}`} />);
      }
    });
    return items;
  }

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0" }}>

      {ppvCreator && (
        <CheckoutModal
          isOpen={ppvOpen}
          onClose={() => setPpvOpen(false)}
          type="ppv"
          creator={ppvCreator}
          postPrice={ppvPrice}
          postId={ppvPostId}
          onSuccess={handlePpvSuccess}
        />
      )}

      {storyViewerOpen && (
        <StoryViewer
          groups={storyGroups}
          startGroupIndex={storyStartIdx}
          onClose={handleViewerClose}
          onGroupFullyViewed={handleGroupFullyViewed}
        />
      )}

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid #1F1F2A", padding: "0 16px", backgroundColor: "#0A0A0F" }}>
        <div style={{ display: "flex" }}>
          {(["feed", "spotlight"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabSwitch(tab)}
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

      {/* Story bar — always visible */}
      <div style={{ padding: "0 16px", backgroundColor: "#0A0A0F" }}>
        <StoryBar onOpenViewer={handleOpenViewer} externalGroups={externalGroups} />
      </div>

      <div style={{ padding: "0 0 40px" }}>
          {/* ── Feed Tab ─────────────────────────────────────────────── */}
          {activeTab === "feed" && (
            <div style={{ minHeight: "200px" }}>
              {showSkeleton && <FeedSkeleton count={5} />}

              {!showSkeleton && (
                <>
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

                  {buildFeedItems(posts)}

                  <div ref={sentinelRef} style={{ height: "1px", marginTop: "1px" }} />

                  {loadingMore && (
                    <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                      <div className="feed-spinner" />
                    </div>
                  )}

                  {!nextCursor && !loadingMore && posts.length > 0 && (
                    <div style={{ textAlign: "center", padding: "24px", color: "#4A4A6A", fontSize: "13px" }}>
                      You&apos;re all caught up ✓
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Spotlight Tab ────────────────────────────────────────── */}
          {activeTab === "spotlight" && (
            <div style={{ minHeight: "200px" }}>
              {showSpotSkeleton && <FeedSkeleton count={5} />}

              {!showSpotSkeleton && (
                <>
                  {spotError && (
                    <div style={{ textAlign: "center", padding: "48px 24px", color: "#6B6B8A", fontSize: "14px" }}>
                      {spotError}
                    </div>
                  )}

                  {!spotError && spotPosts.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 24px" }}>
                      <p style={{ color: "#6B6B8A", fontSize: "15px", marginBottom: "8px" }}>No posts in Spotlight yet</p>
                      <p style={{ color: "#4A4A6A", fontSize: "13px" }}>Check back soon for new content from creators</p>
                    </div>
                  )}

                  {buildFeedItems(spotPosts, true)}

                  <div ref={spotSentinelRef} style={{ height: "1px", marginTop: "1px" }} />

                  {spotLoadingMore && (
                    <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                      <div className="feed-spinner" />
                    </div>
                  )}

                  {!spotNextPage && !spotLoadingMore && spotPosts.length > 0 && (
                    <div style={{ textAlign: "center", padding: "24px", color: "#4A4A6A", fontSize: "13px" }}>
                      You&apos;ve seen everything ✓
                    </div>
                  )}
                </>
              )}
            </div>
          )}
      </div>
    </div>
  );
}