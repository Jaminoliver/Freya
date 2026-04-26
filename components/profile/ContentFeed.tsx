"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Grid3X3, List, ImageIcon, Film, Lock, Images } from "lucide-react";
import dynamic from "next/dynamic";
import type { Post } from "@/lib/types/profile";
import PostRow from "@/components/profile/PostRow";
import type { ApiPost } from "@/components/profile/PostRow";
import type { LightboxPost } from "@/components/profile/Lightbox";
import { getBunnyThumbnail } from "@/components/video/VideoPlayer";
import { useAppStore } from "@/lib/store/appStore";
import { ContentFeedSkeleton } from "@/components/loadscreen/ContentFeedSkeleton";


export interface ContentFeedProps {
  posts: Post[];
  isSubscribed: boolean;
  isOwnProfile?: boolean;
  creatorUsername?: string;
  creatorId?: string;
  initialApiPosts?: ApiPost[];
  refreshKey?: number;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onTip?: (postId: string) => void;
  onUnlock?: (postId: string) => void;
  onSubscribe?: () => void;
  emptyState?: React.ReactNode;
  className?: string;
  extraTab?: string;
  extraTabContent?: React.ReactNode;
  onOpenPost?:    (postId: string) => void;
  onImageClick?:  (post: LightboxPost, index: number) => void;

}

interface PostMediaSummary {
  post_id: number;
  thumbnail_url: string | null;
  bunny_video_id: string | null;
  media_count: number;
  has_image: boolean;
  has_video: boolean;
  locked: boolean;
}

function TabBar({ postCount, mediaCount, active, onChange, extraTab }: {
  postCount: number; mediaCount: number; active: string; onChange: (key: string) => void; extraTab?: string;
}) {
  const tabs = [
    { key: "posts", label: "POSTS", count: postCount },
    { key: "media", label: "MEDIA", count: mediaCount },
    ...(extraTab ? [{ key: "extra", label: extraTab.toUpperCase(), count: null }] : []),
  ];
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", width: "100%", backgroundColor: "#0A0A0F", borderBottom: "1px solid #1E1E2E" }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            flex: 1, padding: "14px 4px",
            fontSize: "12px",
            fontWeight: active === tab.key ? 700 : 400,
            fontFamily: "'Inter', sans-serif",
            background: "none", border: "none", cursor: "pointer",
            color: active === tab.key ? "#8B5CF6" : "#64748B",
            borderBottom: active === tab.key ? "2px solid #8B5CF6" : "2px solid transparent",
            marginBottom: "-1px", transition: "all 0.15s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
            textTransform: "uppercase", letterSpacing: "0.5px",
            whiteSpace: "nowrap",
          }}
        >
          {tab.count !== null ? `${tab.count} ${tab.label}` : tab.label}
        </button>
      ))}
    </div>
  );
}

function MediaToolbar({ totalCount, photoCount, videoCount, mediaFilter, setMediaFilter, showSearch, setShowSearch, isMediaGridView, setIsMediaGridView, searchQuery, setSearchQuery }: {
  totalCount: number; photoCount: number; videoCount: number;
  mediaFilter: "all" | "photo" | "video"; setMediaFilter: (f: "all" | "photo" | "video") => void;
  showSearch: boolean; setShowSearch: (v: boolean) => void;
  isMediaGridView: boolean; setIsMediaGridView: (v: boolean) => void;
  searchQuery: string; setSearchQuery: (v: string) => void;
}) {
  return (
    <div style={{ padding: "12px 16px 0" }}>
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", scrollbarWidth: "none", marginBottom: "8px" }}>
        {([{ key: "all", label: `All ${totalCount}`, show: true }, { key: "photo", label: `Photo ${photoCount}`, show: photoCount > 0 }, { key: "video", label: `Video ${videoCount}`, show: videoCount > 0 }] as const).filter((f) => f.show).map((f) => (
          <button
            key={f.key}
            onClick={() => setMediaFilter(f.key)}
            style={{ padding: "5px 14px", borderRadius: "20px", border: "none", backgroundColor: mediaFilter === f.key ? "#8B5CF6" : "#1C1C2E", color: mediaFilter === f.key ? "#fff" : "#8A8AA0", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s" }}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
        <button onClick={() => setShowSearch(!showSearch)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: showSearch ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: showSearch ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Search size={15} />
        </button>
        <button style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: "#1C1C2E", color: "#3A3A4D", cursor: "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
  <Grid3X3 size={15} />
</button>
      </div>
      {showSearch && (
        <div style={{ marginBottom: "10px", position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#6B6B8A" }} />
          <input
            type="text"
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 32px", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "8px", color: "#E2E8F0", fontSize: "13px", outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", caretColor: "#8B5CF6" }}
          />
        </div>
      )}
    </div>
  );
}

function SubscribeDivider({ onSubscribe }: { onSubscribe?: () => void }) {
  return (
    <div style={{ margin: "8px 16px", borderRadius: "14px", backgroundColor: "#0D0D18", border: "1.5px solid #2A2A3D", padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center" }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(139,92,246,0.12)", border: "1.5px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Lock size={20} color="#8B5CF6" />
      </div>
      <div>
        <p style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>Subscribe to see all posts</p>
        <p style={{ margin: 0, fontSize: "13px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>Subscribers get full access to exclusive content</p>
      </div>
      {onSubscribe && (
        <button onClick={onSubscribe} style={{ padding: "10px 28px", borderRadius: "10px", background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", border: "none", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
          Subscribe
        </button>
      )}
    </div>
  );
}

const feedLayoutCache = new Map<string, { activeTab: string; isPostsGridView: boolean; isMediaGridView: boolean }>();
const feedPostsCache  = new Map<string, { posts: ApiPost[]; media: PostMediaSummary[] }>();

if (typeof window !== "undefined") {
  window.addEventListener("freya:clear-caches", () => {
    feedLayoutCache.clear();
    feedPostsCache.clear();
  });
}

function buildMediaFromPosts(fetchedPosts: ApiPost[]): PostMediaSummary[] {
  const summaries: PostMediaSummary[] = [];
  for (const p of fetchedPosts) {
    if (!p.media?.length) continue;
    if (p.content_type === "text" || p.content_type === "poll") continue;
    const firstMedia = p.media[0];
    const hasImage = p.media.some((m) => m.media_type !== "video");
    const hasVideo = p.media.some((m) => m.media_type === "video");
    let thumbnail: string | null = null;
    if (firstMedia.media_type === "video") {
      thumbnail = firstMedia.thumbnail_url || (firstMedia.bunny_video_id ? getBunnyThumbnail(firstMedia.bunny_video_id) : null);
    } else {
      thumbnail = firstMedia.thumbnail_url || firstMedia.file_url || null;
    }
    summaries.push({ post_id: p.id, thumbnail_url: thumbnail, bunny_video_id: firstMedia.bunny_video_id || null, media_count: p.media.length, has_image: hasImage, has_video: hasVideo, locked: p.locked });
  }
  return summaries;
}

function mergeApiPosts(existing: ApiPost[], incoming: ApiPost[]): ApiPost[] {
  const existingMap = new Map(existing.map((p) => [p.id, p]));
  return incoming.map((incomingPost) => {
    const existingPost = existingMap.get(incomingPost.id);
    if (!existingPost) return incomingPost;
    return { ...incomingPost, locked: existingPost.locked === false ? false : incomingPost.locked, can_access: existingPost.can_access === true ? true : incomingPost.can_access };
  });
}

export default function ContentFeed({
  posts, isSubscribed, isOwnProfile = false,
  creatorUsername, initialApiPosts,
  refreshKey,
  onLike, onComment, onTip, onUnlock, onSubscribe, emptyState, className,
  extraTab, extraTabContent, onOpenPost, onImageClick,
}: ContentFeedProps) {
  const router = useRouter();

  const globalViewer = useAppStore((s) => s.viewer);
  const viewer = globalViewer
    ? { id: globalViewer.id, username: globalViewer.username, display_name: globalViewer.display_name, avatar_url: globalViewer.avatar_url ?? "" }
    : null;

  const cacheKey = creatorUsername ?? "default";
  const cached   = feedLayoutCache.get(cacheKey);

  const [activeTab,       setActiveTab]       = React.useState(cached?.activeTab ?? "posts");
  const cachedPosts = feedPostsCache.get(cacheKey);
  const seedPosts   = initialApiPosts ?? cachedPosts?.posts ?? [];
  const seedMedia   = cachedPosts?.media ?? (initialApiPosts ? buildMediaFromPosts(initialApiPosts) : []);

  const [apiPosts,        setApiPosts]        = React.useState<ApiPost[]>(seedPosts);
  const [apiMedia,        setApiMedia]        = React.useState<PostMediaSummary[]>(seedMedia);

  // Immediately toggle locked state when subscription changes — no API roundtrip needed
  const prevIsSubscribed = React.useRef(isSubscribed);
  React.useEffect(() => {
    if (prevIsSubscribed.current === isSubscribed) return;
    prevIsSubscribed.current = isSubscribed;
    setApiPosts((prev) => {
      const updated = prev.map((p) => {
        if (p.is_ppv || (p.ppv_price != null && p.ppv_price > 0)) return p;
        if (isSubscribed) return { ...p, locked: false, can_access: true };
        return { ...p, locked: true, can_access: false };
      });
      const updatedMedia = buildMediaFromPosts(updated);
      setApiMedia(updatedMedia);
      feedPostsCache.set(cacheKey, { posts: updated, media: updatedMedia });
      return updated;
    });
  }, [isSubscribed, cacheKey]);

  const [loading,         setLoading]         = React.useState(!initialApiPosts && !cachedPosts);
  const [mediaFilter,     setMediaFilter]     = React.useState<"all" | "photo" | "video">("all");
  const [isPostsGridView, setIsPostsGridView] = React.useState(cached?.isPostsGridView ?? false);
  const [isMediaGridView, setIsMediaGridView] = React.useState(cached?.isMediaGridView ?? true);
  const [showSearch,      setShowSearch]      = React.useState(false);
  const [searchQuery,     setSearchQuery]     = React.useState("");
  
  const prevRefreshKey = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    if (refreshKey === undefined) return;
    if (prevRefreshKey.current === undefined) { prevRefreshKey.current = refreshKey; return; }
    if (refreshKey !== prevRefreshKey.current) {
      prevRefreshKey.current = refreshKey;
      feedPostsCache.delete(cacheKey);
      if (initialApiPosts) {
        setApiPosts(initialApiPosts);
        const freshMedia = buildMediaFromPosts(initialApiPosts);
        setApiMedia(freshMedia);
        feedPostsCache.set(cacheKey, { posts: initialApiPosts, media: freshMedia });
      }
    }
  }, [refreshKey, cacheKey, initialApiPosts]);

  React.useEffect(() => {
    if (initialApiPosts && !feedPostsCache.has(cacheKey)) {
      feedPostsCache.set(cacheKey, { posts: initialApiPosts, media: buildMediaFromPosts(initialApiPosts) });
    }
  }, [cacheKey, initialApiPosts]);

  const prevInitialPostsRef = React.useRef<ApiPost[] | undefined>(undefined);
  React.useEffect(() => {
    if (!initialApiPosts) return;
    if (prevInitialPostsRef.current === initialApiPosts) return;
    prevInitialPostsRef.current = initialApiPosts;
    setApiPosts(initialApiPosts);
    const freshMedia = buildMediaFromPosts(initialApiPosts);
    setApiMedia(freshMedia);
    feedPostsCache.set(cacheKey, { posts: initialApiPosts, media: freshMedia });
  }, [initialApiPosts, cacheKey]);

  React.useEffect(() => {
    feedLayoutCache.set(cacheKey, { activeTab, isPostsGridView, isMediaGridView });
  }, [cacheKey, activeTab, isPostsGridView, isMediaGridView]);

  const imagePosts = React.useMemo(() => apiPosts.filter((p) => !p.locked && p.media?.[0]?.media_type !== "video"), [apiPosts]);
  const postById   = React.useMemo(() => new Map(apiPosts.map((p) => [p.id, p])), [apiPosts]);

  const filteredPosts = React.useMemo(
    () => apiPosts.filter((p) => searchQuery ? p.caption?.toLowerCase().includes(searchQuery.toLowerCase()) : true),
    [apiPosts, searchQuery]
  );

  const { freePosts, lockedPosts } = React.useMemo(() => {
    if (isSubscribed || isOwnProfile) return { freePosts: filteredPosts, lockedPosts: [] };
    return { freePosts: filteredPosts.filter((p) => !p.locked), lockedPosts: filteredPosts.filter((p) => p.locked) };
  }, [filteredPosts, isSubscribed, isOwnProfile]);

  const filteredMedia = React.useMemo(
    () => apiMedia.filter((m) => {
      if (mediaFilter === "photo") return m.has_image;
      if (mediaFilter === "video") return m.has_video;
      return true;
    }),
    [apiMedia, mediaFilter]
  );

  const photoCount = React.useMemo(() => apiMedia.filter((m) => m.has_image).length, [apiMedia]);
  const videoCount = React.useMemo(() => apiMedia.filter((m) => m.has_video).length, [apiMedia]);

  const fetchPosts = React.useCallback(async (force = false) => {
    if (!creatorUsername) return;
    if (!force && (feedPostsCache.has(cacheKey) || initialApiPosts)) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/posts/creator/${creatorUsername}`);
      const data = await res.json();
      if (res.ok) {
        const fetchedPosts: ApiPost[] = data.posts || [];
        const fetchedMedia = buildMediaFromPosts(fetchedPosts);
        setApiPosts(fetchedPosts);
        setApiMedia(fetchedMedia);
        feedPostsCache.set(cacheKey, { posts: fetchedPosts, media: fetchedMedia });
      }
    } catch (err) { console.error("[ContentFeed]", err); }
    finally { setLoading(false); }
  }, [creatorUsername, cacheKey, initialApiPosts]);

  React.useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDeletePost = (id: string) => {
    setApiPosts((prev) => {
      const updatedPosts = prev.filter((p) => String(p.id) !== id);
      const updatedMedia = buildMediaFromPosts(updatedPosts);
      setApiMedia(updatedMedia);
      feedPostsCache.set(cacheKey, { posts: updatedPosts, media: updatedMedia });
      return updatedPosts;
    });
  };

  const handlePPVUpdated = React.useCallback((id: string, priceKobo: number) => {
    setApiPosts((prev) => {
      const updated = prev.map((p) =>
        String(p.id) === id ? { ...p, is_ppv: priceKobo > 0, ppv_price: priceKobo > 0 ? priceKobo : null } : p
      );
      const c = feedPostsCache.get(cacheKey);
      if (c) feedPostsCache.set(cacheKey, { ...c, posts: updated });
      return updated;
    });
  }, [cacheKey]);

  

  const renderPostRow = (post: ApiPost) => (
    <div key={post.id} style={{ margin: "10px 12px", borderRadius: "14px", border: "1px solid #1E1E2E", overflow: "hidden" }}>
      <PostRow
        post={post} isOwnProfile={isOwnProfile} isSubscribed={isSubscribed}
        viewer={viewer} onLike={onLike} onComment={onComment} onTip={onTip} onUnlock={onUnlock}
        onDelete={handleDeletePost} onImageClick={(p, index) => { console.log("[ContentFeed] onImageClick called", { postId: p.id, index }); onImageClick?.(p, index); }} onPPVUpdated={handlePPVUpdated}
      />
    </div>
  );

  const renderGridPost = (post: ApiPost) => {
    const m      = post.media?.[0];
    const thumb  = m ? m.media_type === "video" ? (m.thumbnail_url || (m.bunny_video_id ? getBunnyThumbnail(m.bunny_video_id) : undefined)) : (m.thumbnail_url || m.file_url || undefined) : undefined;
    const locked = post.locked && !isOwnProfile;
    return (
      <div key={post.id} onClick={() => onOpenPost ? onOpenPost(String(post.id)) : router.push(`/posts/${post.id}`)} style={{ aspectRatio: "1", overflow: "hidden", borderRadius: "4px", backgroundColor: "#1C1C2E", position: "relative", cursor: "pointer" }}>
        {thumb && <img src={thumb} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: locked ? "blur(12px)" : "none" }} />}
        {locked && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}><Lock size={16} color="#fff" /></div>}
        {!locked && (post.media?.length ?? 0) > 1 && (
          <div style={{ position: "absolute", top: "5px", right: "5px", backgroundColor: "rgba(0,0,0,0.6)", borderRadius: "4px", padding: "2px 6px", fontSize: "10px", fontWeight: 700, color: "#fff" }}>1/{post.media.length}</div>
        )}
        <div style={{ position: "absolute", bottom: "6px", right: "6px" }}>
          {m?.media_type === "video" ? <Film size={13} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} /> : <ImageIcon size={13} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />}
        </div>
      </div>
    );
  };

  const renderMediaGridItem = (item: PostMediaSummary) => {
    const thumb  = item.thumbnail_url || undefined;
    const locked = item.locked && !isOwnProfile;
    return (
      <div key={item.post_id} onClick={() => onOpenPost ? onOpenPost(String(item.post_id)) : router.push(`/posts/${item.post_id}`)} style={{ aspectRatio: "1", overflow: "hidden", borderRadius: "4px", backgroundColor: "#1C1C2E", position: "relative", cursor: "pointer" }}>
        {thumb && <img src={thumb} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: locked ? "blur(12px)" : "none" }} />}
        {locked && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}><Lock size={16} color="#fff" /></div>}
        {item.media_count > 1 && (
          <div style={{ position: "absolute", top: "5px", right: "5px", backgroundColor: "rgba(0,0,0,0.6)", borderRadius: "4px", padding: "2px 6px", display: "flex", alignItems: "center", gap: "3px" }}>
            <Images size={10} color="#fff" />
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#fff" }}>{item.media_count}</span>
          </div>
        )}
        <div style={{ position: "absolute", bottom: "6px", right: "6px" }}>
          {item.has_video ? <Film size={14} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} /> : <ImageIcon size={14} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />}
        </div>
      </div>
    );
  };

  const renderMediaListItem = (item: PostMediaSummary) => {
    const thumb  = item.thumbnail_url || undefined;
    const locked = item.locked && !isSubscribed && !isOwnProfile;
    return (
      <div key={item.post_id} onClick={() => router.push(`/posts/${item.post_id}`)} style={{ borderBottom: "1px solid #1A1A2E", cursor: "pointer" }}>
        <div style={{ position: "relative" }}>
          {thumb && <img src={thumb} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block", filter: locked ? "blur(12px)" : "none" }} />}
          {locked && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" }}><Lock size={24} color="#fff" /></div>}
          {item.has_video && !locked && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" }}><Film size={32} color="#fff" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }} /></div>}
          {item.media_count > 1 && (
            <div style={{ position: "absolute", top: "8px", right: "8px", backgroundColor: "rgba(0,0,0,0.6)", borderRadius: "6px", padding: "3px 8px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Images size={12} color="#fff" />
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>{item.media_count}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <ContentFeedSkeleton tab={activeTab as "posts" | "media"} />;

  return (
    <div className={className} style={{ fontFamily: "'Inter', sans-serif" }}>
      ss

      <TabBar
        postCount={apiPosts.length} mediaCount={apiMedia.length}
        active={activeTab} extraTab={extraTab}
        onChange={(key) => { setActiveTab(key); setShowSearch(false); setSearchQuery(""); }}
      />

      {activeTab === "posts" && (
        <>
          <div style={{ padding: "12px 16px 4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <button onClick={() => setShowSearch(!showSearch)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: showSearch ? "rgba(139,92,246,0.15)" : "#1C1C2E", color: showSearch ? "#8B5CF6" : "#8A8AA0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Search size={15} />
              </button>
              <button onClick={() => setIsPostsGridView(!isPostsGridView)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: "rgba(139,92,246,0.15)", color: "#8B5CF6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isPostsGridView ? <List size={15} /> : <Grid3X3 size={15} />}
              </button>
            </div>
            {showSearch && (
              <div style={{ marginBottom: "8px", position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#6B6B8A" }} />
                <input type="text" placeholder="Search posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px 8px 32px", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "8px", color: "#E2E8F0", fontSize: "13px", outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", caretColor: "#8B5CF6" }}
                />
              </div>
            )}
          </div>

          {filteredPosts.length === 0 && (emptyState || <div style={{ textAlign: "center", padding: "40px 0", color: "#4A4A6A", fontSize: "14px" }}>No posts yet</div>)}

          {(isSubscribed || isOwnProfile) && (
            isPostsGridView
              ? <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", padding: "0 16px" }}>{filteredPosts.map(renderGridPost)}</div>
              : filteredPosts.map(renderPostRow)
          )}

          {!isSubscribed && !isOwnProfile && (
            <>
              {isPostsGridView ? (
                <>
                  {freePosts.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", padding: "0 16px" }}>{freePosts.map(renderGridPost)}</div>}
                  {lockedPosts.length > 0 && (<><SubscribeDivider onSubscribe={onSubscribe} /><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", padding: "0 16px" }}>{lockedPosts.map(renderGridPost)}</div></>)}
                  {lockedPosts.length === 0 && freePosts.length > 0 && <SubscribeDivider onSubscribe={onSubscribe} />}
                </>
              ) : (
                <>
                  {freePosts.map(renderPostRow)}
                  {lockedPosts.length > 0 && (<><SubscribeDivider onSubscribe={onSubscribe} />{lockedPosts.map(renderPostRow)}</>)}
                  {lockedPosts.length === 0 && freePosts.length > 0 && <SubscribeDivider onSubscribe={onSubscribe} />}
                </>
              )}
            </>
          )}
        </>
      )}

      {activeTab === "media" && (
        <>
          <MediaToolbar totalCount={apiMedia.length} photoCount={photoCount} videoCount={videoCount}
            mediaFilter={mediaFilter} setMediaFilter={setMediaFilter} showSearch={showSearch}
            setShowSearch={setShowSearch} isMediaGridView={isMediaGridView} setIsMediaGridView={setIsMediaGridView}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          />
          {isMediaGridView ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", padding: "0 16px" }}>
              {filteredMedia.map(renderMediaGridItem)}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredMedia.map(renderMediaListItem)}
            </div>
          )}
          {filteredMedia.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#4A4A6A", fontSize: "14px" }}>No media yet</div>}
        </>
      )}

      {activeTab === "extra" && extraTabContent && (
        <div style={{ padding: "16px" }}>
          {extraTabContent}
        </div>
      )}
    </div>
  );
}