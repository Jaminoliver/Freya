"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Grid3X3, List, ImageIcon, Film, Lock } from "lucide-react";
import type { Post } from "@/lib/types/profile";
import PostRow from "@/components/profile/PostRow";
import type { ApiPost } from "@/components/profile/PostRow";
import Lightbox from "@/components/profile/Lightbox";
import type { LightboxPost } from "@/components/profile/Lightbox";
import { getBunnyThumbnail } from "@/components/video/VideoPlayer";
import { useUpload } from "@/lib/context/UploadContext";

export interface ContentFeedProps {
  posts: Post[];
  isSubscribed: boolean;
  isOwnProfile?: boolean;
  creatorUsername?: string;
  creatorId?: string;
  initialApiPosts?: ApiPost[]; // passed from ProfilePage — skips internal fetch
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onTip?: (postId: string) => void;
  onUnlock?: (postId: string) => void;
  emptyState?: React.ReactNode;
  className?: string;
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

function TabBar({ postCount, mediaCount, active, onChange }: {
  postCount: number; mediaCount: number; active: string; onChange: (key: string) => void;
}) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", width: "100%", backgroundColor: "#0A0A0F", borderBottom: "1px solid #1E1E2E" }}>
      {[{ key: "posts", label: "POSTS", count: postCount }, { key: "media", label: "MEDIA", count: mediaCount }].map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{ flex: 1, padding: "14px 8px", fontSize: "14px", fontWeight: active === tab.key ? 700 : 400, fontFamily: "'Inter', sans-serif", background: "none", border: "none", cursor: "pointer", color: active === tab.key ? "#8B5CF6" : "#64748B", borderBottom: active === tab.key ? "2px solid #8B5CF6" : "2px solid transparent", marginBottom: "-1px", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}
        >
          {tab.count} {tab.label}
        </button>
      ))}
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
        <button onClick={() => setIsMediaGridView(!isMediaGridView)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: "rgba(139,92,246,0.15)", color: "#8B5CF6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isMediaGridView ? <List size={15} /> : <Grid3X3 size={15} />}
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

// Module-level cache
const feedLayoutCache = new Map<string, { activeTab: string; isPostsGridView: boolean; isMediaGridView: boolean }>();
const feedPostsCache  = new Map<string, { posts: ApiPost[]; media: ApiMedia[] }>();

function buildMediaFromPosts(fetchedPosts: ApiPost[]): ApiMedia[] {
  const allMedia: ApiMedia[] = [];
  for (const p of fetchedPosts) {
    for (const m of p.media || []) {
      if (!p.locked) allMedia.push({ ...m, post_id: p.id });
    }
  }
  return allMedia;
}

export default function ContentFeed({
  posts, isSubscribed, isOwnProfile = false,
  creatorUsername, initialApiPosts,
  onLike, onComment, onTip, onUnlock, emptyState, className,
}: ContentFeedProps) {
  const router = useRouter();
  const { uploads } = useUpload();

  const cacheKey = creatorUsername ?? "default";
  const cached   = feedLayoutCache.get(cacheKey);

  const [activeTab,       setActiveTab]       = React.useState(cached?.activeTab ?? "posts");

  // If ProfilePage already fetched posts, seed state directly — no spinner needed
  const cachedPosts    = feedPostsCache.get(cacheKey);
  const seedPosts      = initialApiPosts ?? cachedPosts?.posts ?? [];
  const seedMedia      = cachedPosts?.media ?? (initialApiPosts ? buildMediaFromPosts(initialApiPosts) : []);

  const [apiPosts,        setApiPosts]        = React.useState<ApiPost[]>(seedPosts);
  const [apiMedia,        setApiMedia]        = React.useState<ApiMedia[]>(seedMedia);
  // Only show internal loading spinner when we have no data at all and must fetch ourselves
  const [loading,         setLoading]         = React.useState(!initialApiPosts && !cachedPosts);
  const [mediaFilter,     setMediaFilter]     = React.useState<"all" | "photo" | "video">("all");
  const [isPostsGridView, setIsPostsGridView] = React.useState(cached?.isPostsGridView ?? false);
  const [isMediaGridView, setIsMediaGridView] = React.useState(cached?.isMediaGridView ?? true);
  const [showSearch,      setShowSearch]      = React.useState(false);
  const [searchQuery,     setSearchQuery]     = React.useState("");
  const [viewer,          setViewer]          = React.useState<{ id: string; username: string; display_name: string; avatar_url: string } | null>(null);
  const [lightboxPost,       setLightboxPost]       = React.useState<LightboxPost | null>(null);
  const [lightboxMediaIndex, setLightboxMediaIndex] = React.useState(0);

  // Seed cache if initialApiPosts provided and cache is empty
  React.useEffect(() => {
    if (initialApiPosts && !feedPostsCache.has(cacheKey)) {
      feedPostsCache.set(cacheKey, {
        posts: initialApiPosts,
        media: buildMediaFromPosts(initialApiPosts),
      });
    }
  }, [cacheKey, initialApiPosts]);

  React.useEffect(() => {
    feedLayoutCache.set(cacheKey, { activeTab, isPostsGridView, isMediaGridView });
  }, [cacheKey, activeTab, isPostsGridView, isMediaGridView]);

  const imagePosts = React.useMemo(
    () => apiPosts.filter((p) => !p.locked && p.media?.[0]?.media_type !== "video"),
    [apiPosts]
  );

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
    // Skip fetch if ProfilePage already provided posts and no force refresh
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

  const openLightbox = (p: LightboxPost, index: number) => {
    setLightboxMediaIndex(index);
    setLightboxPost(p);
  };

  const filteredPosts = apiPosts.filter((p) => searchQuery ? p.caption?.toLowerCase().includes(searchQuery.toLowerCase()) : true);
  const filteredMedia = apiMedia.filter((m) => mediaFilter === "all" ? true : mediaFilter === "photo" ? m.media_type !== "video" : m.media_type === "video");
  const photoCount    = apiMedia.filter((m) => m.media_type !== "video").length;
  const videoCount    = apiMedia.filter((m) => m.media_type === "video").length;

  return (
    <div className={className} style={{ fontFamily: "'Inter', sans-serif" }}>
      {lightboxPost && (
        <Lightbox
          post={lightboxPost}
          allPosts={imagePosts}
          initialMediaIndex={lightboxMediaIndex}
          onClose={() => setLightboxPost(null)}
          onNavigate={(p, mediaIndex) => { setLightboxMediaIndex(mediaIndex ?? 0); setLightboxPost(p); }}
        />
      )}

      <TabBar
        postCount={apiPosts.length}
        mediaCount={apiMedia.length}
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
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px 8px 32px", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "8px", color: "#E2E8F0", fontSize: "13px", outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", caretColor: "#8B5CF6" }}
                />
              </div>
            )}
          </div>

          {filteredPosts.length === 0 && (emptyState || (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#4A4A6A", fontSize: "14px" }}>No posts yet</div>
          ))}

          {isPostsGridView ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", padding: "0 16px" }}>
              {filteredPosts.map((post) => {
                const m     = post.media?.[0];
                const thumb = m
                  ? m.media_type === "video" && m.bunny_video_id
                    ? getBunnyThumbnail(m.bunny_video_id)
                    : (m.thumbnail_url || m.file_url || undefined)
                  : undefined;
                return (
                  <div key={post.id} onClick={() => router.push(`/posts/${post.id}`)} style={{ aspectRatio: "1", overflow: "hidden", borderRadius: "4px", backgroundColor: "#1C1C2E", position: "relative", cursor: "pointer" }}>
                    {thumb && <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                    {post.locked && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
                        <Lock size={16} color="#fff" />
                      </div>
                    )}
                    {!post.locked && (post.media?.length ?? 0) > 1 && (
                      <div style={{ position: "absolute", top: "5px", right: "5px", backgroundColor: "rgba(0,0,0,0.6)", borderRadius: "4px", padding: "2px 6px", fontSize: "10px", fontWeight: 700, color: "#fff" }}>
                        1/{post.media.length}
                      </div>
                    )}
                    <div style={{ position: "absolute", bottom: "6px", right: "6px" }}>
                      {m?.media_type === "video"
                        ? <Film size={13} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />
                        : <ImageIcon size={13} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />
                      }
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
                onImageClick={(p, index) => openLightbox(p, index)}
              />
            ))
          )}
        </>
      )}

      {/* Media tab */}
      {!loading && activeTab === "media" && (
        <>
          <MediaToolbar
            apiMediaCount={apiMedia.length}
            photoCount={photoCount}
            videoCount={videoCount}
            mediaFilter={mediaFilter}
            setMediaFilter={setMediaFilter}
            showSearch={showSearch}
            setShowSearch={setShowSearch}
            isMediaGridView={isMediaGridView}
            setIsMediaGridView={setIsMediaGridView}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
          {isMediaGridView ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px", padding: "0 16px" }}>
              {filteredMedia.map((item) => {
                const thumb = item.media_type === "video" && item.bunny_video_id
                  ? getBunnyThumbnail(item.bunny_video_id)
                  : (item.thumbnail_url || item.file_url || undefined);
                const parentPost = apiPosts.find((p) => p.id === item.post_id);
                return (
                  <div key={item.id} onClick={() => parentPost ? router.push(`/posts/${parentPost.id}`) : undefined} style={{ aspectRatio: "1", overflow: "hidden", borderRadius: "4px", backgroundColor: "#1C1C2E", position: "relative", cursor: "pointer" }}>
                    {thumb && <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                    <div style={{ position: "absolute", bottom: "6px", right: "6px" }}>
                      {item.media_type === "video"
                        ? <Film size={14} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />
                        : <ImageIcon size={14} color="#fff" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }} />
                      }
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
                  : (item.thumbnail_url || item.file_url || undefined);
                const parentPost = apiPosts.find((p) => p.id === item.post_id);
                return (
                  <div key={item.id} onClick={() => parentPost ? router.push(`/posts/${parentPost.id}`) : undefined} style={{ borderBottom: "1px solid #1A1A2E", cursor: "pointer" }}>
                    <div style={{ position: "relative" }}>
                      {thumb && <img src={thumb} alt="" style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block" }} />}
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
        </>
      )}
    </div>
  );
}