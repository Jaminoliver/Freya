"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Grid3X3, List, EyeOff, Eye, Trash2 } from "lucide-react";
import { SavedSkeleton } from "@/components/loadscreen/SavedSkeleton";
import SavedPostGrid     from "@/components/saved/SavedPostGrid";
import SavedPostFeed     from "@/components/saved/SavedPostFeed";
import SavedCreatorGrid  from "@/components/saved/SavedCreatorGrid";
import SavedUnlockedGrid from "@/components/saved/SavedUnlockedGrid";
import SavedUnlockedFeed from "@/components/saved/SavedUnlockedFeed";
import type { SavedPost }     from "@/components/saved/SavedPostGrid";
import type { SavedCreator }  from "@/components/saved/SavedCreatorGrid";
import type { UnlockedItem }  from "@/components/saved/SavedUnlockedGrid";
import SinglePostSheet from "@/components/shared/SinglePostSheet";
type Tab = "posts" | "creators" | "unlocked";

function SavedPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab,        setActiveTab]        = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return (t === "posts" || t === "creators" || t === "unlocked") ? t : "posts";
  });
  const [hiddenView, setHiddenView] = useState(() => {
    const h = searchParams.get("hidden");
    console.log("[SavedPage] hidden param:", h);
    return h === "1";
  });
  const [viewMode,         setViewMode]         = useState<"grid" | "feed">("grid");
  const [savedPosts,       setSavedPosts]       = useState<SavedPost[]>([]);
  const [savedCreators,    setSavedCreators]    = useState<SavedCreator[]>([]);
  const [unlockedVisible,  setUnlockedVisible]  = useState<UnlockedItem[]>([]);
  const [unlockedHidden,   setUnlockedHidden]   = useState<UnlockedItem[]>([]);
  const [loadingPosts,     setLoadingPosts]     = useState(true);
  const [loadingCreators,  setLoadingCreators]  = useState(true);
  const [loadingUnlocked,  setLoadingUnlocked]  = useState(true);
  const [loadingHidden,    setLoadingHidden]    = useState(false);
  const [selectMode,       setSelectMode]       = useState(false);
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set());
  const [openPost,         setOpenPost]         = useState<{ id: string; sourceIsMessage: boolean } | null>(null);

  useEffect(() => {
    const onPop = () => { if (hiddenView) setHiddenView(false); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [hiddenView]);

  useEffect(() => {
    router.replace(`/saved?tab=${activeTab}`);
  }, []);

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchVisibleUnlocked = useCallback(() => {
    return fetch("/api/saved/unlocked")
      .then((r) => r.json())
      .then((d) => { setUnlockedVisible(d.unlocked ?? []); })
      .catch(() => { setUnlockedVisible([]); });
  }, []);

  const fetchHiddenUnlocked = useCallback(() => {
    return fetch("/api/saved/unlocked?hidden=1")
      .then((r) => r.json())
      .then((d) => { setUnlockedHidden(d.unlocked ?? []); })
      .catch(() => { setUnlockedHidden([]); });
  }, []);

  // ── Initial loads ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { postId } = (e as CustomEvent).detail;
      setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
    };
    window.addEventListener("post-unsaved", handler);
    return () => window.removeEventListener("post-unsaved", handler);
  }, []);

  useEffect(() => {
    console.log("[SavedPage] fetching posts — page mounted");
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
    Promise.all([fetchVisibleUnlocked(), fetchHiddenUnlocked()])
      .finally(() => setLoadingUnlocked(false));
  }, [fetchVisibleUnlocked, fetchHiddenUnlocked]);

  // ── Hide / Unhide ─────────────────────────────────────────────────────────
  const handleHide = useCallback(async (picked: UnlockedItem[]) => {
    const pickedIds = new Set(picked.map((p) => p.unlock_id));
    setUnlockedVisible((prev) => prev.filter((i) => !pickedIds.has(i.unlock_id)));
    try {
      await fetch("/api/saved/unlocked/hide", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          items:  picked.map((p) => ({ source: p.source, unlock_id: p.unlock_id })),
          hidden: true,
        }),
      });
      void fetchHiddenUnlocked();
    } catch {
      void fetchVisibleUnlocked();
    }
  }, [fetchVisibleUnlocked, fetchHiddenUnlocked]);

  const handleUnhide = useCallback(async (picked: UnlockedItem[]) => {
    const pickedIds = new Set(picked.map((p) => p.unlock_id));
    setUnlockedHidden((prev) => prev.filter((i) => !pickedIds.has(i.unlock_id)));
    try {
      await fetch("/api/saved/unlocked/hide", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          items:  picked.map((p) => ({ source: p.source, unlock_id: p.unlock_id })),
          hidden: false,
        }),
      });
      void fetchVisibleUnlocked();
    } catch {
      void fetchHiddenUnlocked();
    }
  }, [fetchVisibleUnlocked, fetchHiddenUnlocked]);

  // Auto-return to main view if hidden list empties out — but only after unlocked data has loaded
  useEffect(() => {
    if (hiddenView && unlockedHidden.length === 0 && !loadingHidden && !loadingUnlocked) {
      setHiddenView(false);
    }
  }, [hiddenView, unlockedHidden.length, loadingHidden, loadingUnlocked]);

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

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleLongPress = useCallback((id: string) => {
    if (!selectMode) {
      setSelectMode(true);
      setSelectedIds(new Set([id]));
    }
  }, [selectMode]);

  const handleCancelSelect = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (activeTab === "posts") {
      await handleUnsavePosts(Array.from(selectedIds));
    } else if (activeTab === "unlocked" && !hiddenView) {
      const picked = unlockedVisible.filter((i) => selectedIds.has(i.unlock_id.toString()));
      await handleHide(picked);
    } else if (activeTab === "unlocked" && hiddenView) {
      const picked = unlockedHidden.filter((i) => selectedIds.has(i.unlock_id.toString()));
      await handleUnhide(picked);
    }
    setSelectMode(false);
    setSelectedIds(new Set());
  }, [selectedIds, activeTab, hiddenView, unlockedVisible, unlockedHidden, handleUnsavePosts, handleHide, handleUnhide]);

  const isLoading =
    activeTab === "posts"    ? loadingPosts    :
    activeTab === "creators" ? loadingCreators :
                                loadingUnlocked;
  if (isLoading) return <SavedSkeleton tab={activeTab === "unlocked" ? "posts" : activeTab} />;

  const postIds = savedPosts.map((p) => p.id);

  // ── Hidden sub-view ───────────────────────────────────────────────────────
  if (hiddenView) {
    return (
      <div style={{ minHeight: "100svh", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", position: "relative" }}>

      <SinglePostSheet
        postId={openPost?.id ?? null}
        sourceIsMessage={openPost?.sourceIsMessage ?? false}
        onClose={() => { console.log("[SavedPage] setOpenPost null"); setOpenPost(null); }}
      />

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
                onClick={() => { setHiddenView(false); setSelectMode(false); setSelectedIds(new Set()); }}
                style={{ background: "none", border: "none", color: "#A3A3C2", cursor: "pointer", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px" }}
              >
                <ArrowLeft size={20} strokeWidth={1.8} />
              </button>
              <span style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>Hidden</span>
            </div>
          </div>

          {/* Lifted action bar — hidden view */}
          {selectMode && (
            <div style={{
              display:              "flex",
              alignItems:           "center",
              justifyContent:       "space-between",
              padding:              "10px 16px",
              minHeight:            "44px",
              backgroundColor:      "rgba(13,13,26,0.96)",
              backdropFilter:       "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderBottom:         "1px solid rgba(139,92,246,0.25)",
            }}>
              <button
                onClick={handleCancelSelect}
                style={{ background: "none", border: "none", color: "#A3A3C2", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", padding: "6px 0" }}
              >
                Cancel
              </button>
              <span style={{ fontSize: "13px", fontWeight: 600, color: selectedIds.size > 0 ? "#F1F5F9" : "#6B6B8A" }}>
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Tap to select"}
              </span>
              <button
                onClick={handleConfirmAction}
                disabled={selectedIds.size === 0}
                style={{
                  display:         "flex",
                  alignItems:      "center",
                  gap:             "5px",
                  padding:         "7px 14px",
                  borderRadius:    "20px",
                  border:          "none",
                  backgroundColor: selectedIds.size > 0 ? "#8B5CF6" : "rgba(139,92,246,0.2)",
                  color:           selectedIds.size > 0 ? "#FFFFFF" : "rgba(139,92,246,0.4)",
                  fontSize:        "13px",
                  fontWeight:      700,
                  cursor:          selectedIds.size > 0 ? "pointer" : "default",
                  fontFamily:      "'Inter', sans-serif",
                  transition:      "all 0.15s",
                }}
              >
                <Eye size={13} />
                Unhide{selectedIds.size > 1 ? ` (${selectedIds.size})` : ""}
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" as any, paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
          {unlockedHidden.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: "12px" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: "#1C1C2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <EyeOff size={22} color="#6B6B8A" strokeWidth={1.6} />
              </div>
              <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#C4C4D4" }}>Nothing hidden</p>
              <p style={{ margin: 0, fontSize: "13px", color: "#6B6B8A", textAlign: "center", maxWidth: "240px", lineHeight: 1.6 }}>
                Items you hide will appear here. You can always bring them back.
              </p>
            </div>
          ) : (
            <SavedUnlockedGrid
              items={unlockedHidden}
              mode="hidden"
              onAction={handleUnhide}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onLongPress={handleLongPress}
              tab="unlocked"
              onOpenPost={(id, sourceIsMessage) => setOpenPost({ id, sourceIsMessage })}
            />
          )}
        </div>
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100svh", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", position: "relative" }}>

      <SinglePostSheet
        postId={openPost?.id ?? null}
        sourceIsMessage={openPost?.sourceIsMessage ?? false}
        onClose={() => setOpenPost(null)}
      />

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

          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {(activeTab === "posts" || activeTab === "unlocked") && (
              <button
                onClick={() => selectMode ? handleCancelSelect() : setSelectMode(true)}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: selectMode ? "#8B5CF6" : "#A3A3C2" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = selectMode ? "#8B5CF6" : "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = selectMode ? "#8B5CF6" : "#A3A3C2")}
              >
                {selectMode ? "Cancel" : "Select"}
              </button>
            )}
            {activeTab === "unlocked" && unlockedHidden.length > 0 && (
              <button
                onClick={() => { setHiddenView(true); setSelectMode(false); setSelectedIds(new Set()); window.history.pushState({ savedHidden: true }, ""); }}
                style={{ background: "none", border: "none", color: "#A3A3C2", cursor: "pointer", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}
              >
                <EyeOff size={20} strokeWidth={1.8} />
              </button>
            )}
            {((activeTab === "posts"    && savedPosts.length      > 0) ||
              (activeTab === "unlocked" && unlockedVisible.length > 0)) && (
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
              onClick={() => { setActiveTab(tab); setSelectMode(false); setSelectedIds(new Set()); router.replace(`/saved?tab=${tab}`); }}
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
              {tab === "posts"    ? `${savedPosts.length} Posts`         :
               tab === "creators" ? `${savedCreators.length} Creators`   :
                                    `${unlockedVisible.length} Unlocked`}
            </button>
          ))}
        </div>

        {/* Lifted action bar */}
        {selectMode && (
          <div style={{
            display:              "flex",
            alignItems:           "center",
            justifyContent:       "space-between",
            padding:              "10px 16px",
            minHeight:            "44px",
            backgroundColor:      activeTab === "posts" ? "rgba(31,12,12,0.96)" : "rgba(13,13,26,0.96)",
            backdropFilter:       "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderBottom:         `1px solid ${activeTab === "posts" ? "rgba(239,68,68,0.25)" : "rgba(139,92,246,0.25)"}`,
          }}>
            <button
              onClick={handleCancelSelect}
              style={{ background: "none", border: "none", color: "#A3A3C2", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", padding: "6px 0" }}
            >
              Cancel
            </button>
            <span style={{ fontSize: "13px", fontWeight: 600, color: selectedIds.size > 0 ? "#F1F5F9" : "#6B6B8A" }}>
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Tap to select"}
            </span>
            <button
              onClick={handleConfirmAction}
              disabled={selectedIds.size === 0}
              style={{
                display:         "flex",
                alignItems:      "center",
                gap:             "5px",
                padding:         "7px 14px",
                borderRadius:    "20px",
                border:          "none",
                backgroundColor: selectedIds.size > 0
                  ? (activeTab === "posts" ? "#EF4444" : "#8B5CF6")
                  : (activeTab === "posts" ? "rgba(239,68,68,0.2)" : "rgba(139,92,246,0.2)"),
                color:           selectedIds.size > 0
                  ? "#FFFFFF"
                  : (activeTab === "posts" ? "rgba(239,68,68,0.4)" : "rgba(139,92,246,0.4)"),
                fontSize:        "13px",
                fontWeight:      700,
                cursor:          selectedIds.size > 0 ? "pointer" : "default",
                fontFamily:      "'Inter', sans-serif",
                transition:      "all 0.15s",
              }}
            >
              {activeTab === "posts" ? (
                <><Trash2 size={13} />Remove{selectedIds.size > 1 ? ` (${selectedIds.size})` : ""}</>
              ) : hiddenView ? (
                <><Eye size={13} />Unhide{selectedIds.size > 1 ? ` (${selectedIds.size})` : ""}</>
              ) : (
                <><EyeOff size={13} />Hide{selectedIds.size > 1 ? ` (${selectedIds.size})` : ""}</>
              )}
            </button>
          </div>
        )}
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
            <SavedPostGrid
              posts={savedPosts}
              onUnsave={handleUnsavePosts}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onLongPress={handleLongPress}
              tab="posts"
              onOpenPost={(id) => setOpenPost({ id, sourceIsMessage: false })}
            />
          ) : (
            <SavedPostFeed postIds={postIds} onUnsave={handleUnsavePosts} />
          )
        )}

        {activeTab === "creators" && (
          <SavedCreatorGrid creators={savedCreators} onUnsave={handleUnsaveCreator} />
        )}

        {activeTab === "unlocked" && (
          <>
            {/* Hidden pill — only when there are hidden items */}
            {unlockedHidden.length > 0 && viewMode === "grid" && (
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 16px 4px" }}>
                <button
                  onClick={() => { setHiddenView(true); setSelectMode(false); setSelectedIds(new Set()); window.history.pushState({ savedHidden: true }, ""); }}
                  style={{
                    display:         "inline-flex",
                    alignItems:      "center",
                    gap:             "6px",
                    padding:         "7px 14px",
                    borderRadius:    "999px",
                    border:          "1px solid #2A2A3D",
                    backgroundColor: "#13131F",
                    color:           "#C4C4D4",
                    fontSize:        "12px",
                    fontWeight:      600,
                    cursor:          "pointer",
                    fontFamily:      "'Inter', sans-serif",
                    transition:      "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1C1C2E"; e.currentTarget.style.color = "#FFFFFF"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#13131F"; e.currentTarget.style.color = "#C4C4D4"; }}
                >
                  <EyeOff size={13} strokeWidth={2} />
                  Hidden ({unlockedHidden.length})
                </button>
              </div>
            )}

            {unlockedVisible.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: "12px" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: "#1C1C2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="1.6"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
                <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#C4C4D4" }}>No unlocked content yet</p>
                <p style={{ margin: 0, fontSize: "13px", color: "#6B6B8A", textAlign: "center", maxWidth: "240px", lineHeight: 1.6 }}>
                  PPV posts and messages you unlock will appear here
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <SavedUnlockedGrid
                items={unlockedVisible}
                mode="visible"
                onAction={handleHide}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onLongPress={handleLongPress}
                tab="unlocked"
                onOpenPost={(id, sourceIsMessage) => setOpenPost({ id, sourceIsMessage })}
              />
            ) : (
              <SavedUnlockedFeed items={unlockedVisible} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SavedPage() {
  return (
    <Suspense fallback={null}>
      <SavedPageInner />
    </Suspense>
  );
}