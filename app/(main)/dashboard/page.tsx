"use client";

import { useState, useEffect, useCallback } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { StoryBar } from "@/components/feed/StoryBar";

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
    locked: boolean;
    display_order: number;
  }[];
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return "just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function adaptPost(p: FeedPost) {
  return {
    id:        String(p.id),
    creator: {
      name:       p.profiles?.display_name || p.profiles?.username || "Creator",
      username:   p.profiles?.username || "",
      avatar_url: p.profiles?.avatar_url || "",
      isVerified: p.profiles?.is_verified || false,
    },
    timestamp: getRelativeTime(p.published_at),
    caption:   p.caption || "",
    media:     (p.media || []).map((m) => ({
      type: (m.media_type === "video" ? "video" : "image") as "image" | "video",
      url:  m.file_url || "",
    })),
    isLocked:        p.locked,
    price:           p.is_ppv ? p.ppv_price : null,
    likes:           p.like_count,
    comments:        p.comment_count,
    liked:           p.liked,
    taggedCreators:  [],
  };
}

export default function HomePage() {
  const [activeTab,  setActiveTab]  = useState<"feed" | "spotlight">("feed");
  const [posts,      setPosts]      = useState<FeedPost[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const fetchFeed = useCallback(async (cursor?: string) => {
    try {
      const url = cursor ? `/api/posts/feed?cursor=${cursor}` : "/api/posts/feed";
      const res  = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load feed");
        return;
      }

      setPosts((prev) => cursor ? [...prev, ...data.posts] : data.posts);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError("Failed to load feed");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const handleLoadMore = () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    fetchFeed(nextCursor);
  };

  const handleLikeToggle = async (postId: string) => {
    const res  = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setPosts((prev) => prev.map((p) =>
        String(p.id) === postId
          ? { ...p, liked: data.liked, like_count: data.liked ? p.like_count + 1 : Math.max(0, p.like_count - 1) }
          : p
      ));
    }
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0" }}>

      <style>{`
        .feed-desktop-header { display: flex; }
        @media (max-width: 767px) { .feed-desktop-header { display: none !important; } }
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
            {loading && (
              <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "3px solid #1F1F2A", borderTop: "3px solid #8B5CF6", animation: "spin 0.9s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {!loading && error && (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "#6B6B8A", fontSize: "14px" }}>
                {error}
              </div>
            )}

            {!loading && !error && posts.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 24px" }}>
                <p style={{ color: "#6B6B8A", fontSize: "15px", marginBottom: "8px" }}>Your feed is empty</p>
                <p style={{ color: "#4A4A6A", fontSize: "13px" }}>Subscribe to creators to see their posts here</p>
              </div>
            )}

            {!loading && posts.map((post) => (
              <PostCard
                key={post.id}
                post={adaptPost(post)}
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