"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Users, Lock, BadgeCheck } from "lucide-react";
import { SavedSkeleton } from "@/components/loadscreen/SavedSkeleton";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SavedPost {
  id:            string;
  thumbnail_url: string | null;
  media_type:    "image" | "video";
  media_count?:  number;
  is_locked:     boolean;
  creator: {
    username:   string;
    name:       string;
    avatar_url: string;
  };
}

interface SavedCreator {
  id:              string;
  username:        string;
  name:            string;
  avatar_url:      string;
  banner_url:      string | null;
  isVerified:      boolean;
  subscriberCount: number;
  isSubscribed:    boolean;
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ tab }: { tab: "posts" | "creators" }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", gap: "12px", height: "100%" }}>
      <div style={{ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: "#1C1C2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {tab === "posts"
          ? <Bookmark size={24} color="#6B6B8A" strokeWidth={1.6} />
          : <Users    size={24} color="#6B6B8A" strokeWidth={1.6} />}
      </div>
      <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#C4C4D4" }}>
        {tab === "posts" ? "No saved posts yet" : "No saved creators yet"}
      </p>
      <p style={{ margin: 0, fontSize: "13px", color: "#6B6B8A", textAlign: "center", maxWidth: "220px", lineHeight: 1.6 }}>
        {tab === "posts"
          ? "Tap the bookmark icon on any post to save it here"
          : "Save creators from their profile or from any post"}
      </p>
    </div>
  );
}

// ── Post grid item ────────────────────────────────────────────────────────────
function PostGridItem({ post, onClick }: { post: SavedPost; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ position: "relative", aspectRatio: "1", backgroundColor: "#1C1C2E", cursor: "pointer", overflow: "hidden" }}
    >
      {post.thumbnail_url ? (
        <img src={post.thumbnail_url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", backgroundColor: "#1C1C2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Bookmark size={20} color="#4A4A6A" />
        </div>
      )}
      {post.media_count && post.media_count > 1 && (
        <div style={{ position: "absolute", top: "6px", right: "6px", backgroundColor: "rgba(0,0,0,0.6)", borderRadius: "6px", padding: "2px 6px" }}>
          <span style={{ fontSize: "11px", color: "#FFFFFF", fontWeight: 600 }}>1/{post.media_count}</span>
        </div>
      )}
      <div style={{ position: "absolute", bottom: "6px", right: "6px" }}>
        {post.media_type === "video"
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="white" opacity={0.9}><polygon points="5,3 19,12 5,21" /></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity={0.9}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
        }
      </div>
      {post.is_locked && (
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Lock size={20} color="#FFFFFF" />
        </div>
      )}
    </div>
  );
}

// ── Creator card ──────────────────────────────────────────────────────────────
function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

const FALLBACK_COVER = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80";

function CreatorCard({ creator, onUnsave }: { creator: SavedCreator; onUnsave: (id: string) => void }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => router.push(`/${creator.username}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderRadius: "10px", overflow: "hidden", cursor: "pointer", border: `1px solid ${hovered ? "#8B5CF6" : "#2A2A3D"}`, transition: "border-color 0.15s ease", position: "relative", height: "220px" }}
    >
      <img src={creator.banner_url || FALLBACK_COVER} alt={creator.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.85) 100%)" }} />
      <button
        onClick={(e) => { e.stopPropagation(); onUnsave(creator.id); }}
        style={{ position: "absolute", top: "8px", right: "8px", padding: "3px 9px", borderRadius: "20px", border: "none", backgroundColor: "rgba(139,92,246,0.85)", color: "#FFFFFF", fontSize: "10px", fontWeight: 700, fontFamily: "'Inter', sans-serif", cursor: "pointer", zIndex: 3 }}
      >
        Saved
      </button>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -20%)", zIndex: 2 }}>
        <div style={{ padding: "2px", borderRadius: "50%", background: "linear-gradient(to right, #8B5CF6, #EC4899)" }}>
          <div style={{ padding: "2px", borderRadius: "50%", backgroundColor: "#13131F" }}>
            <img src={creator.avatar_url || ""} alt={creator.name} loading="lazy" style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", display: "block" }} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: "28px", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", zIndex: 2, padding: "0 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "90px" }}>
            {creator.name}
          </span>
          {creator.isVerified && <BadgeCheck size={11} color="#A78BFA" />}
        </div>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)" }}>@{creator.username}</span>
      </div>
      <div style={{ position: "absolute", bottom: "8px", left: 0, right: 0, display: "flex", justifyContent: "center", gap: "10px", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <Users size={9} color="rgba(255,255,255,0.6)" />
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{formatCount(creator.subscriberCount)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function SavedPage() {
  const router = useRouter();
  const [activeTab,       setActiveTab]       = useState<"posts" | "creators">("posts");
  const [savedPosts,      setSavedPosts]      = useState<SavedPost[]>([]);
  const [savedCreators,   setSavedCreators]   = useState<SavedCreator[]>([]);
  const [loadingPosts,    setLoadingPosts]    = useState(true);
  const [loadingCreators, setLoadingCreators] = useState(true);

  useEffect(() => {
    fetch("/api/saved/posts")
      .then((r) => r.json())
      .then((d) => { if (d.posts) setSavedPosts(d.posts); })
      .catch(() => {})
      .finally(() => setLoadingPosts(false));
  }, []);

  useEffect(() => {
    fetch("/api/saved/creators")
      .then((r) => r.json())
      .then((d) => { if (d.creators) setSavedCreators(d.creators); })
      .catch(() => {})
      .finally(() => setLoadingCreators(false));
  }, []);

  const handleUnsaveCreator = useCallback(async (id: string) => {
    setSavedCreators((prev) => prev.filter((c) => c.id !== id));
    try {
      await fetch("/api/saved/creators", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ creator_id: id }),
      });
    } catch {}
  }, []);

  const handleUnsavePost = useCallback(async (id: string) => {
    setSavedPosts((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch("/api/saved/posts", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ post_id: id }),
      });
    } catch {}
  }, []);

  // Show skeleton while loading active tab
  const isLoading = activeTab === "posts" ? loadingPosts : loadingCreators;
  if (isLoading) return <SavedSkeleton tab={activeTab} />;

  return (
    <div style={{ height: "100svh", overflow: "hidden", backgroundColor: "#0D0D18", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ flexShrink: 0, backgroundColor: "#0D0D18", borderBottom: "1px solid #1A1A2E" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 16px 0" }}>
          <button
            onClick={() => router.back()}
            style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: "transparent", color: "#C4C4D4", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#FFFFFF" }}>Saved</h1>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", marginTop: "12px" }}>
          {(["posts", "creators"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: "10px", border: "none", backgroundColor: "transparent",
                fontSize: "14px", fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? "#FFFFFF" : "#6B6B8A",
                fontFamily: "'Inter', sans-serif", cursor: "pointer",
                borderBottom: activeTab === tab ? "2px solid #8B5CF6" : "2px solid transparent",
                transition: "all 0.15s ease", textTransform: "capitalize",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Posts tab */}
      {activeTab === "posts" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {savedPosts.length === 0 ? (
            <EmptyState tab="posts" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px", padding: "2px" }}>
              {savedPosts.map((post) => (
                <PostGridItem
                  key={post.id}
                  post={post}
                  onClick={() => router.push(`/posts/${post.id}?from=saved`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Creators tab */}
      {activeTab === "creators" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {savedCreators.length === 0 ? (
            <EmptyState tab="creators" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", padding: "8px" }}>
              {savedCreators.map((creator) => (
                <CreatorCard key={creator.id} creator={creator} onUnsave={handleUnsaveCreator} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}