"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { StoryBar } from "@/components/story/StoryBar";
import StoryViewer from "@/components/story/StoryViewer";
import { FeedSkeleton } from "@/components/loadscreen/FeedSkeleton";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import { FeedSuggestions } from "@/components/feed/FeedSuggestions";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, staleTimes } from "@/lib/query/keys";
import type { PollData } from "@/components/feed/PollDisplay";
import { type CreatorStoryGroup, applyLocalViewed } from "@/components/story/StoryBar";
import type { User } from "@/lib/types/profile";
import { useAppStore } from "@/lib/store/appStore";

const SCROLL_KEY       = "home_feed_scroll";
const SLIDES_KEY       = "home_feed_slides";
const SUGGESTIONS_EVERY = 5;

interface FeedCursors {
  subOffset:   number;
  freshOffset: number;
  hotOffset:   number;
}

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

function parseCursors(raw: string | undefined | null): FeedCursors | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.subOffset === "number" && typeof parsed.freshOffset === "number" && typeof parsed.hotOffset === "number") {
      return parsed as FeedCursors;
    }
    return null;
  } catch {
    return null;
  }
}

function saveScroll(y: number)          { try { sessionStorage.setItem(SCROLL_KEY, String(y)); } catch {} }
function loadScroll(): number           { try { return Number(sessionStorage.getItem(SCROLL_KEY) ?? 0); } catch { return 0; } }
function saveSlides(m: Record<string, number>) { try { sessionStorage.setItem(SLIDES_KEY, JSON.stringify(m)); } catch {} }
function loadSlides(): Record<string, number>  { try { return JSON.parse(sessionStorage.getItem(SLIDES_KEY) ?? "{}"); } catch { return {}; } }

export default function HomePage() {
  const queryClient = useQueryClient();
  const viewerReady = useAppStore((s) => s.viewerReady);

  const [slideMap, setSlideMap] = useState<Record<string, number>>({});
  const [subscribedCreatorIds, setSubscribedCreatorIds] = useState<Set<string>>(new Set());
  const [visiblePostIndex, setVisiblePostIndex] = useState<number>(-1);

  // Scroll velocity tracking — skip prewarm if user is flying through the feed
  const lastScrollY   = useRef(0);
  const lastScrollT   = useRef(Date.now());
  const scrollVelocity = useRef(0); // px/ms

  const [ppvOpen,    setPpvOpen]    = useState(false);
  const [ppvPrice,   setPpvPrice]   = useState(0);
  const [ppvPostId,  setPpvPostId]  = useState<number | undefined>(undefined);
  const [ppvCreator, setPpvCreator] = useState<User | null>(null);

  const [storyGroups,     setStoryGroups]     = useState<CreatorStoryGroup[]>([]);
  const [storyStartIdx,   setStoryStartIdx]   = useState(0);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [externalGroups,  setExternalGroups]  = useState<CreatorStoryGroup[]>([]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: queryKeys.feed(),
    queryFn:  async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) {
        const c = pageParam as FeedCursors;
        params.set("subOffset",   String(c.subOffset));
        params.set("freshOffset", String(c.freshOffset));
        params.set("hotOffset",   String(c.hotOffset));
      }
      const qs  = params.toString();
      const url = `/api/posts/feed${qs ? `?${qs}` : ""}`;
      const res = await fetch(url);
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to load feed");
      return d;
    },
    initialPageParam: null as FeedCursors | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore
        ? { subOffset: lastPage.nextSubOffset ?? 0, freshOffset: lastPage.nextFreshOffset ?? 0, hotOffset: lastPage.nextHotOffset ?? 0 }
        : undefined,
    staleTime: staleTimes.feed,
    enabled: viewerReady,
  });

  const storiesFromFeed = data?.pages?.[0]?.stories ?? null;
const { data: storiesData, isLoading: storiesLoading } = useQuery({
  queryKey: ["stories"],
  enabled: storiesFromFeed === null,
    queryFn: async () => {
      const res  = await fetch("/api/stories");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load stories");
      const fetchedGroups: CreatorStoryGroup[] = applyLocalViewed(data.groups ?? []);
      const visibleGroups = fetchedGroups.slice(0, 3);
      for (const g of visibleGroups) {
        if (g.latestThumbnail) { const img = new Image(); img.src = g.latestThumbnail; }
      }
      return fetchedGroups;
    },
    staleTime: staleTimes.feed,
  });

  const posts: FeedPost[] = useMemo(
    () => (data?.pages ?? []).flatMap((page) => page.posts as FeedPost[]),
    [data?.pages]
  );

  useEffect(() => { setSlideMap(loadSlides()); }, []);

  const scrollRestoredRef = useRef(false);
  const sentinelRef       = useRef<HTMLDivElement>(null);
  const postsRef          = useRef<FeedPost[]>(posts);

  useEffect(() => { postsRef.current = posts; }, [posts]);

  // ── Scroll save ────────────────────────────────────────────────────────
  useEffect(() => {
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        const now = Date.now();
        const dy  = Math.abs(window.scrollY - lastScrollY.current);
        const dt  = now - lastScrollT.current;
        scrollVelocity.current = dt > 0 ? dy / dt : 0;
        lastScrollY.current    = window.scrollY;
        lastScrollT.current    = now;
        saveScroll(window.scrollY);
        rafId = null;
      });
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

  // ── Scroll restore (double rAF for reliable paint timing) ──────────────
  useEffect(() => {
    if (isLoading || scrollRestoredRef.current) return;
    scrollRestoredRef.current = true;
    const saved = loadScroll();
    if (saved > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: saved, behavior: "instant" as ScrollBehavior });
        });
      });
    }
  }, [isLoading]);

  // ── Visible post index tracker ─────────────────────────────────────────
  // Watches each post's DOM node via IntersectionObserver to know which
  // index is currently most visible. Used to decide prewarm window.
  const postNodeRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const registerPostNode = useCallback((index: number, node: HTMLDivElement | null) => {
    if (node) postNodeRefs.current.set(index, node);
    else postNodeRefs.current.delete(index);
  }, []);

  useEffect(() => {
    if (!posts.length) return;
    const observers: IntersectionObserver[] = [];
    postNodeRefs.current.forEach((node, index) => {
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.intersectionRatio >= 0.5) {
          setVisiblePostIndex(index);
        }
      }, { threshold: [0.5] });
      obs.observe(node);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [posts]);

  const handleSlideChange = useCallback((postId: string, index: number) => {
    setSlideMap((prev) => { const next = { ...prev, [postId]: index }; saveSlides(next); return next; });
  }, []);

  // ── Infinite scroll ────────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, { rootMargin: "600px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

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

  const handlePpvSuccess = useCallback(async () => {
    if (!ppvPostId) return;
    try {
      const res  = await fetch(`/api/posts/${ppvPostId}`);
      const data = await res.json();
      if (res.ok && data.post) {
        queryClient.setQueryData(queryKeys.feed(), (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              posts: page.posts.map((p: FeedPost) => {
                if (p.id !== ppvPostId) return p;
                return {
                  ...p, locked: false, can_access: true,
                  media: (data.post.media ?? []).map((m: any) => ({ ...m, locked: false })),
                };
              }),
            })),
          };
        });
      }
    } catch {
      queryClient.setQueryData(queryKeys.feed(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: FeedPost) =>
              p.id === ppvPostId ? { ...p, locked: false, can_access: true } : p
            ),
          })),
        };
      });
    }
  }, [ppvPostId, queryClient]);

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

  // Returns the first video bunnyVideoId for a post, or null
  const getPostVideoId = useCallback((post: FeedPost): string | null => {
    const vid = post.media.find((m) => m.media_type === "video" && m.bunny_video_id);
    return vid?.bunny_video_id ?? null;
  }, []);

  // ── Retry handler ──────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
  }, [queryClient]);

  // ── Memoized feed items ────────────────────────────────────────────────
  // Prewarm window (adaptive):
  //   4g/wifi  → prewarm next 2 video posts ahead
  //   3g       → prewarm next 1 video post ahead
  //   slow/2g  → no prewarm (VideoPlayer handles this too, belt+suspenders)
  const conn = typeof navigator !== "undefined" ? (navigator as any).connection : null;
  const ect: string = conn?.effectiveType ?? "4g";
  const preWarmWindow = ect === "slow-2g" || ect === "2g" ? 0 : ect === "3g" ? 1 : 2;

  const feedItems = useMemo(() => {
    const items: React.ReactNode[] = [];

    // Build index map of video posts so we can find "Nth video ahead"
    const videoPosts: number[] = [];
    posts.forEach((post, i) => {
      if (post.content_type !== "text" && post.content_type !== "poll") {
        if (post.media.some((m) => m.media_type === "video" && m.bunny_video_id)) {
          videoPosts.push(i);
        }
      }
    });

    posts.forEach((post, index) => {
      const showBanner = !post.is_subscribed && !post.is_renewal;
      const subPrice   = post.profiles?.subscription_price ?? undefined;

      // Is this post within the prewarm window ahead of the current visible post?
      const videoIdx      = videoPosts.indexOf(index);
      const visVideoIdx   = (() => {
        // Find which video-post slot the visible post occupies
        for (let i = videoPosts.length - 1; i >= 0; i--) {
          if (videoPosts[i] <= visiblePostIndex) return i;
        }
        return -1;
      })();
      const isPreWarm = preWarmWindow > 0
        && videoIdx > -1
        && videoIdx > visVideoIdx
        && videoIdx <= visVideoIdx + preWarmWindow
        // Don't prewarm if user is scrolling fast (>2px/ms = flying through feed)
        && scrollVelocity.current < 2;

      items.push(
        <div
          key={post.id}
          ref={(node) => registerPostNode(index, node)}
          style={{ margin: "10px 12px", borderRadius: "14px", overflow: "hidden" }}
        >
          {index === 0 && (
            <div style={{ height: "1px", background: "#1A1A2E", borderRadius: "12px 12px 0 0", marginBottom: "0" }} />
          )}
          <PostCard
            post={adaptPost(post)}
            onLike={() => {}}
            onUnlock={handleUnlock}
            initialSlide={slideMap[String(post.id)] ?? 0}
            onSlideChange={handleSlideChange}
            showSubscribeBanner={showBanner}
            is_renewal={post.is_renewal}
            onSubscribed={showBanner ? handleSubscribed : undefined}
            subscriptionPrice={showBanner ? subPrice : undefined}
            isSubscribedExternal={post.is_subscribed || subscribedCreatorIds.has(post.creator_id)}
            initialSavedPost={post.saved_post ?? false}
            initialSavedCreator={post.saved_creator ?? false}
            eager={index < 2}
            autoplayOnVisible={true}
            preWarmVideoId={isPreWarm ? getPostVideoId(post) : null}
          />
        </div>
      );
      if ((index + 1) % SUGGESTIONS_EVERY === 0 && index < posts.length - 1) {
        items.push(<FeedSuggestions key={`suggestions-${index}`} />);
      }
    });
    return items;
  }, [posts, slideMap, subscribedCreatorIds, visiblePostIndex, handleUnlock, handleSlideChange, handleSubscribed, registerPostNode, getPostVideoId, preWarmWindow]);

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0" }}>

      {ppvCreator && (
        <CheckoutModal
          isOpen={ppvOpen} onClose={() => setPpvOpen(false)}
          type="ppv" creator={ppvCreator}
          postPrice={ppvPrice} postId={ppvPostId}
          onSuccess={handlePpvSuccess}
          autoCloseOnSuccess
        />
      )}

      {storyViewerOpen && (
        <StoryViewer
          groups={storyGroups} startGroupIndex={storyStartIdx}
          onClose={handleViewerClose} onGroupFullyViewed={handleGroupFullyViewed}
        />
      )}

      <div style={{ padding: "0 16px", backgroundColor: "#0A0A0F" }}>
        <StoryBar onOpenViewer={handleOpenViewer} externalGroups={externalGroups} initialGroups={storiesFromFeed ?? storiesData} storiesLoading={storiesFromFeed ? false : storiesLoading} />
      </div>

      <div style={{ padding: "0 0 40px", minHeight: "200px" }}>
        {(!viewerReady || isLoading) && <FeedSkeleton count={5} />}
        {viewerReady && !isLoading && (
          <>
            {error && (
              <div style={{ textAlign: "center", padding: "48px 24px" }}>
                <p style={{ color: "#6B6B8A", fontSize: "14px", marginBottom: "16px" }}>{(error as Error).message}</p>
                <button
                  onClick={handleRetry}
                  style={{
                    padding: "10px 24px", borderRadius: "8px", border: "1px solid #2A2A3D",
                    backgroundColor: "#1A1A2E", color: "#FFFFFF", fontSize: "14px", fontWeight: 600,
                    cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Retry
                </button>
              </div>
            )}
            {!error && posts.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 24px" }}>
                <p style={{ color: "#6B6B8A", fontSize: "15px", marginBottom: "8px" }}>Nothing here yet</p>
                <p style={{ color: "#4A4A6A", fontSize: "13px" }}>Follow creators to see their posts here</p>
              </div>
            )}
            {feedItems}
            <div ref={sentinelRef} style={{ height: "1px", marginTop: "1px" }} />
            {isFetchingNextPage && (
              <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                <div className="feed-spinner" />
              </div>
            )}
            {!hasNextPage && !isFetchingNextPage && posts.length > 0 && (
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