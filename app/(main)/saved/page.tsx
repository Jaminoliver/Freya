"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Grid3X3, List } from "lucide-react";
import { SavedSkeleton } from "@/components/loadscreen/SavedSkeleton";
import SavedPostGrid   from "@/components/saved/SavedPostGrid";
import SavedPostFeed   from "@/components/saved/SavedPostFeed";
import SavedCreatorGrid from "@/components/saved/SavedCreatorGrid";
import type { SavedPost }    from "@/components/saved/SavedPostGrid";
import type { SavedCreator } from "@/components/saved/SavedCreatorGrid";

export default function SavedPage() {
  const router = useRouter();

  const [activeTab,       setActiveTab]       = useState<"posts" | "creators">("posts");
  const [viewMode,        setViewMode]        = useState<"grid" | "feed">("grid");
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

  const handleUnsavePosts = useCallback(async (ids: string[]) => {
    setSavedPosts((prev) => prev.filter((p) => !ids.includes(p.id)));
    await Promise.allSettled(
      ids.map((id) =>
        fetch("/api/saved/posts", {
          method:  "DELETE",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ post_id: id }),
        })
      )
    );
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

  const isLoading = activeTab === "posts" ? loadingPosts : loadingCreators;
  if (isLoading) return <SavedSkeleton tab={activeTab} />;

  const postIds = savedPosts.map((p) => p.id);

  return (
    <div style={{ minHeight: "100svh", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{
        flexShrink:      0,
        backgroundColor: "#0A0A0F",
        borderBottom:    "1px solid #1E1E2E",
        position:        "sticky",
        top:             0,
        zIndex:          10,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: "56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => router.back()}
              style={{ background: "none", border: "none", color: "#A3A3C2", cursor: "pointer", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
            >
              <ArrowLeft size={20} strokeWidth={1.8} />
            </button>
            <span style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>Saved</span>
          </div>

          {/* View toggle — only on posts tab */}
          {activeTab === "posts" && savedPosts.length > 0 && (
            <button
              onClick={() => setViewMode((v) => v === "grid" ? "feed" : "grid")}
              style={{ background: "none", border: "none", color: "#A3A3C2", cursor: "pointer", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
            >
              {viewMode === "grid"
                ? <List size={20} strokeWidth={1.8} />
                : <Grid3X3 size={20} strokeWidth={1.8} />
              }
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", width: "100%", borderBottom: "1px solid #1E1E2E" }}>
          {(["posts", "creators"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex:            1,
                padding:         "14px 4px",
                border:          "none",
                backgroundColor: "transparent",
                fontSize:        "14px",
                fontWeight:      activeTab === tab ? 700 : 500,
                color:           activeTab === tab ? "#8B5CF6" : "#64748B",
                fontFamily:      "'Inter', sans-serif",
                cursor:          "pointer",
                borderBottom:    activeTab === tab ? "2px solid #8B5CF6" : "2px solid transparent",
                marginBottom:    "-1px",
                transition:      "all 0.15s",
                textTransform:   "uppercase",
                letterSpacing:   "0.5px",
                whiteSpace:      "nowrap",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
              }}
            >
              {tab === "posts"
                ? `${savedPosts.length} Posts`
                : `${savedCreators.length} Creators`
              }
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" as any, paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>

        {activeTab === "posts" && (
          savedPosts.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: "12px" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: "#1C1C2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="1.6"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </div>
              <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#C4C4D4" }}>No saved posts yet</p>
              <p style={{ margin: 0, fontSize: "13px", color: "#6B6B8A", textAlign: "center", maxWidth: "220px", lineHeight: 1.6 }}>
                Tap the bookmark icon on any post to save it here
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <SavedPostGrid posts={savedPosts} onUnsave={handleUnsavePosts} />
          ) : (
            <SavedPostFeed postIds={postIds} onUnsave={handleUnsavePosts} />
          )
        )}

        {activeTab === "creators" && (
          <SavedCreatorGrid creators={savedCreators} onUnsave={handleUnsaveCreator} />
        )}
      </div>
    </div>
  );
}