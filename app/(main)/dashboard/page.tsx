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

const SCROLL_KEY       = "home_feed_scroll";
const SLIDES_KEY       = "home_feed_slides";
const SUGGESTIONS_EVERY = 5;

interface FeedPost {
  id:            number;
  creator_id:    string;
  content_type:  string;
  caption:       string | null;
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
  is_renewal:    boolean;
  is_subscribed: boolean;
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
  console.log("[adaptPost] id:", p.id, "type:", typeof p.id, "String(id):", String(p.id));
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

function mergeSync(p: FeedPost): FeedPost {
  const cached = postSyncStore.get(String(p.id));
  if (!cached) return p;
  return { ...p, liked: cached.liked, like_count: cached.like_count, comment_count: cached.comment_count ?? p.comment_count };
}

function saveScroll(y: number)          { try { sessionStorage.setItem(SCROLL_KEY, String(y)); } catch {} }
function loadScroll(): number           { try { return Number(sessionStorage.getItem(SCROLL_KEY) ?? 0); } catch { return 0; } }
function saveSlides(m: Record<string, number>) { try { sessionStorage.setItem(SLIDES_KEY, JSON.stringify(m)); } catch {} }
function loadSlides(): Record<string, number>  { try { return JSON.parse(sessionStorage.getItem(SLIDES_KEY) ?? "{}"); } catch { return {}; } }

export default function HomePage() {
  const { feed, setFeed, updateFeedPost } = useAppStore();

  const [posts,       setPosts]       = useState<FeedPost[]>([]);
  const [apiLoading,  setApiLoading]  = useState(true);
  const [nextPage,    setNextPage]    = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [slideMap,    setSlideMap]    = useState<Record<string, number>>({});

  const [subscribedCreatorIds, setSubscribedCreatorIds] = useState<Set<string>>(new Set());

  const [ppvOpen,    setPpvOpen]    = useState(false);
  const [ppvPrice,   setPpvPrice]   = useState(0);
  const [ppvPostId,  setPpvPostId]  = useState<number | undefined>(undefined);
  const [ppvCreator, setPpvCreator] = useState<User | null>(null);

  const [storyGroups,     setStoryGroups]     = useState<CreatorStoryGroup[]>([]);
  const [storyStartIdx,   setStoryStartIdx]   = useState(0);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [externalGroups,  setExternalGroups]  = useState<CreatorStoryGroup[]>([]);

  useEffect(() => { setSlideMap(loadSlides()); }, []);

  const scrollRestoredRef = useRef(false);
  const sentinelRef       = useRef<HTMLDivElement>(null);
  const nextPageRef       = useRef<number | null>(null);
  const loadingMoreRef    = useRef(false);
  const postsRef          = useRef<FeedPost[]>(posts);

  useEffect(() => { nextPageRef.current    = nextPage;    }, [nextPage]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);
  useEffect(() => { postsRef.current       = posts;       }, [posts]);

  // ── Scroll save ────────────────────────────────────────────────────────
  useEffect(() => {
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => { saveScroll(window.scrollY); rafId = null; });
    };
    const onHide = () => saveScroll(window.scrollY);
    const onVis  = () => { if (document.visibilityState === "hidden") saveScroll(window.scrollY); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // ── Scroll restore ─────────────────────────────────────────────────────
  useEffect(() => {
    if (apiLoading || scrollRestoredRef.current) return;
    scrollRestoredRef.current = true;
    const saved = loadScroll();
    if (saved > 0) setTimeout(() => window.scrollTo({ top: saved, behavior: "instant" as ScrollBehavior }), 80);
  }, [apiLoading]);

  const handleSlideChange = useCallback((postId: string, index: number) => {
    setSlideMap((prev) => { const next = { ...prev, [postId]: index }; saveSlides(next); return next; });
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchFeed = useCallback(async (page?: number) => {
    try {
      const url  = page ? `/api/posts/feed?page=${page}` : "/api/posts/feed";
      const res  = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load feed");
        setApiLoading(false);
        setLoadingMore(false);
        return;
      }

      console.log("[HomePage] raw posts from API:", data.posts?.map((p: any) => ({ id: p.id, type: typeof p.id, creator: p.creator_id })));
const merged: FeedPost[] = data.posts.map(mergeSync);

      if (page && page > 1) {
        const updated = [...postsRef.current, ...merged];
        setPosts(updated);
        setNextPage(data.nextPage ?? null);
        setFeed({ posts: updated, nextCursor: String(data.nextPage ?? ""), fetchedAt: Date.now() });
        setLoadingMore(false);
      } else {
        setPosts(merged);
        setNextPage(data.nextPage ?? null);
        setFeed({ posts: merged, nextCursor: String(data.nextPage ?? ""), fetchedAt: Date.now() });
        setApiLoading(false);
      }
    } catch {
      setError("Failed to load feed");
      setApiLoading(false);
      setLoadingMore(false);
    }
  }, [setFeed]);

  // ── Initial load (use cache if fresh) ─────────────────────────────────
  useEffect(() => {
    if (feed && !isStale(feed.fetchedAt)) {
      const merged = feed.posts.map(mergeSync);
      setPosts(merged);
      setNextPage(feed.nextCursor ? Number(feed.nextCursor) : null);
      setApiLoading(false);
      return;
    }
    fetchFeed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Infinite scroll ────────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && nextPageRef.current && !loadingMoreRef.current) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
        fetchFeed(nextPageRef.current);
      }
    }, { rootMargin: "600px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchFeed, apiLoading]);

  // ── Post sync ──────────────────────────────────────────────────────────
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

  // ── PPV unlock ─────────────────────────────────────────────────────────
  const handleUnlock = useCallback((postId: string) => {
    const post = postsRef.current.find((p) => String(p.id) === postId);
    if (!post) return;
    const creator: User = {
      id: post.creator_id, username: post.profiles?.username || "",
      display_name: post.profiles?.display_name || post.profiles?.username || "",
      avatar_url: post.profiles?.avatar_url || "", role: "creator",
    } as User;
    setPpvCreator(creator);
    setPpvPostId(post.id);
    setPpvPrice((post.ppv_price ?? 0) / 100);
    setPpvOpen(true);
  }, []);

  const handlePpvSuccess = useCallback(() => {
    setPosts((prev) => prev.map((p) => p.id === ppvPostId ? { ...p, locked: false, can_access: true } : p));
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
          map.set(g.creatorId, { ...g, hasUnviewed: g.items.some((s) => !s.viewed && !s.isProcessing) });
        } else {
          map.delete(g.creatorId);
        }
      }
      return Array.from(map.values());
    });
  }, []);

  const handleGroupFullyViewed = useCallback((creatorId: string) => {
    setExternalGroups((prev) => prev.map((g) => g.creatorId === creatorId ? { ...g, hasUnviewed: false } : g));
  }, []);

  const handleSubscribed = useCallback((creatorId: string) => {
    setSubscribedCreatorIds((prev) => { const next = new Set(prev); next.add(creatorId); return next; });
  }, []);

  // ── Render posts ───────────────────────────────────────────────────────
  function buildFeedItems(feedPosts: FeedPost[]) {
    const items: React.ReactNode[] = [];
    console.log("[HomePage] buildFeedItems called with", feedPosts.length, "posts:", feedPosts.map(p => ({ id: p.id, type: typeof p.id })));
    feedPosts.forEach((post, index) => {
      const showBanner   = !post.is_subscribed || post.is_renewal;
      const subPrice     = post.profiles?.subscription_price ?? undefined;
      items.push(
        <PostCard
          key={post.id}
          post={adaptPost(post)}
          onLike={() => {}}
          onUnlock={handleUnlock}
          initialSlide={slideMap[String(post.id)] ?? 0}
          onSlideChange={handleSlideChange}
          showSubscribeBanner={showBanner}
          is_renewal={post.is_renewal}
          onSubscribed={showBanner ? handleSubscribed : undefined}
          subscriptionPrice={showBanner ? subPrice : undefined}
          isSubscribedExternal={subscribedCreatorIds.has(post.creator_id)}
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
          isOpen={ppvOpen} onClose={() => setPpvOpen(false)}
          type="ppv" creator={ppvCreator}
          postPrice={ppvPrice} postId={ppvPostId}
          onSuccess={handlePpvSuccess}
        />
      )}

      {storyViewerOpen && (
        <StoryViewer
          groups={storyGroups} startGroupIndex={storyStartIdx}
          onClose={handleViewerClose} onGroupFullyViewed={handleGroupFullyViewed}
        />
      )}

      <div style={{ padding: "0 16px", backgroundColor: "#0A0A0F" }}>
        <StoryBar onOpenViewer={handleOpenViewer} externalGroups={externalGroups} />
      </div>

      <div style={{ padding: "0 0 40px", minHeight: "200px" }}>
        {apiLoading && <FeedSkeleton count={5} />}
        {!apiLoading && (
          <>
            {error && (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "#6B6B8A", fontSize: "14px" }}>{error}</div>
            )}
            {!error && posts.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 24px" }}>
                <p style={{ color: "#6B6B8A", fontSize: "15px", marginBottom: "8px" }}>Nothing here yet</p>
                <p style={{ color: "#4A4A6A", fontSize: "13px" }}>Follow creators to see their posts here</p>
              </div>
            )}
            {buildFeedItems(posts)}
            <div ref={sentinelRef} style={{ height: "1px", marginTop: "1px" }} />
            {loadingMore && (
              <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                <div className="feed-spinner" />
              </div>
            )}
            {!nextPage && !loadingMore && posts.length > 0 && (
              <div style={{ textAlign: "center", padding: "24px", color: "#4A4A6A", fontSize: "13px" }}>
                You&apos;re all caught up ✓
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}