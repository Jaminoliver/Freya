"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Grid3X3, List, Eye, EyeOff } from "lucide-react";
import { SavedSkeleton } from "@/components/loadscreen/SavedSkeleton";
import SavedPostGrid     from "@/components/saved/SavedPostGrid";
import SavedPostFeed     from "@/components/saved/SavedPostFeed";
import SavedCreatorGrid  from "@/components/saved/SavedCreatorGrid";
import SavedUnlockedGrid from "@/components/saved/SavedUnlockedGrid";
import SavedUnlockedFeed from "@/components/saved/SavedUnlockedFeed";
import type { SavedPost }     from "@/components/saved/SavedPostGrid";
import type { SavedCreator }  from "@/components/saved/SavedCreatorGrid";
import type { UnlockedItem }  from "@/components/saved/SavedUnlockedGrid";

export default function SavedPage() {
  const router = useRouter();

  const [activeTab,        setActiveTab]        = useState<"posts" | "creators" | "unlocked">("posts");
  const [viewMode,         setViewMode]         = useState<"grid" | "feed">("grid");
  const [savedPosts,       setSavedPosts]       = useState<SavedPost[]>([]);
  const [savedCreators,    setSavedCreators]    = useState<SavedCreator[]>([]);
  const [unlockedItems,    setUnlockedItems]    = useState<UnlockedItem[]>([]);
  const [loadingPosts,     setLoadingPosts]     = useState(true);
  const [loadingCreators,  setLoadingCreators]  = useState(true);
  const [loadingUnlocked,  setLoadingUnlocked]  = useState(true);
  const [showHidden,       setShowHidden]       = useState(false);

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

  useEffect(() => {
    setLoadingUnlocked(true);
    const url = `/api/saved/unlocked${showHidden ? "?hidden=1" : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setUnlockedItems(d.unlocked ?? []); })
      .catch(() => { setUnlockedItems([]); })
      .finally(() => setLoadingUnlocked(false));
  }, [showHidden]);

  const handleToggleUnlockedHide = useCallback(async (picked: UnlockedItem[], hidden: boolean) => {
    const pickedIds = new Set(picked.map((p) => p.unlock_id));
    // Optimistic: remove from current view
    setUnlockedItems((prev) => prev.filter((i) => !pickedIds.has(i.unlock_id)));
    try {
      await fetch("/api/saved/unlocked/hide", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          items:  picked.map((p) => ({ source: p.source, unlock_id: p.unlock_id })),
          hidden,
        }),
      });
      // Refetch to refresh both lists with the new is_hidden state
      const url = `/api/saved/unlocked${showHidden ? "?hidden=1" : ""}`;
      void fetch(url).then((r) => r.json()).then((d) => { if (d.unlocked) setUnlockedItems(d.unlocked); });
    } catch {
      // On failure, refetch so the optimistic remove is reconciled
      void fetch("/api/saved/unlocked").then((r) => r.json()).then((d) => { if (d.unlocked) setUnlockedItems(d.unlocked); });
    }
  }, [showHidden]);

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

  const isLoading =
    activeTab === "posts"    ? loadingPosts    :
    activeTab === "creators" ? loadingCreators :
                                loadingUnlocked;
  if (isLoading) return <SavedSkeleton tab={activeTab === "unlocked" ? "posts" : activeTab} />;

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

          {/* Right-side controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {/* Hidden toggle — only on unlocked tab */}
            {activeTab === "unlocked" && (
              <button
                onClick={() => setShowHidden((s) => !s)}
                title={showHidden ? "Show visible" : "Show hidden"}
                style={{ background: "none", border: "none", color: showHidden ? "#8B5CF6" : "#A3A3C2", cursor: "pointer", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px" }}
                onMouseEnter={(e) => { if (!showHidden) e.currentTarget.style.color = "#FFFFFF"; }}
                onMouseLeave={(e) => { if (!showHidden) e.currentTarget.style.color = "#A3A3C2"; }}
              >
                {showHidden
                  ? <Eye size={20} strokeWidth={1.8} />
                  : <EyeOff size={20} strokeWidth={1.8} />
                }
              </button>
            )}

            {/* View toggle — posts tab and unlocked tab */}
            {((activeTab === "posts"    && savedPosts.length    > 0) ||
              (activeTab === "unlocked" && unlockedItems.length > 0)) && (
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
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", width: "100%", borderBottom: "1px solid #1E1E2E" }}>
          {(["posts", "creators", "unlocked"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex:            1,
                padding:         "14px 4px",
                border:          "none",
                backgroundColor: "transparent",
                fontSize:        "13px",
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
              {tab === "posts"    ? `${savedPosts.length} Posts`       :
               tab === "creators" ? `${savedCreators.length} Creators` :
                                    `${unlockedItems.length} Unlocked`}
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

        {activeTab === "unlocked" && (
          unlockedItems.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: "12px" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: "#1C1C2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="1.6"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </div>
              <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#C4C4D4" }}>
                {showHidden ? "No hidden items" : "No unlocked content yet"}
              </p>
              <p style={{ margin: 0, fontSize: "13px", color: "#6B6B8A", textAlign: "center", maxWidth: "240px", lineHeight: 1.6 }}>
                {showHidden
                  ? "Items you hide from your unlocked list will appear here"
                  : "PPV posts and messages you unlock will appear here"
                }
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <SavedUnlockedGrid
              items={unlockedItems}
              hidden={showHidden}
              onToggle={handleToggleUnlockedHide}
            />
          ) : (
            <SavedUnlockedFeed items={unlockedItems} />
          )
        )}
      </div>
    </div>
  );
}