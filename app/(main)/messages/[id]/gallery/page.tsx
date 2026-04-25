"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import MessageGalleryGrid, { type MediaItem } from "@/components/messages/MessageGalleryGrid";

type Filter = "all" | "images" | "videos" | "unlocked";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",      label: "All"      },
  { key: "unlocked", label: "Unlocked" },
  { key: "images",   label: "Images"   },
  { key: "videos",   label: "Videos"   },
];

export default function GalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();

  const [filter,      setFilter]      = useState<Filter>("all");
  const [items,       setItems]       = useState<MediaItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor,  setNextCursor]  = useState<string | null>(null);
  const [hasMore,     setHasMore]     = useState(true);

  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchMedia = useCallback(async (cursor: string | null, currentFilter: Filter, reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const p = new URLSearchParams({ filter: currentFilter });
      if (cursor) p.set("cursor", cursor);
      const res  = await fetch(`/api/conversations/${id}/media?${p}`);
      if (!res.ok) return;
      const data = await res.json();
      setItems((prev) => reset ? (data.mediaItems ?? []) : [...prev, ...(data.mediaItems ?? [])]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(!!data.nextCursor);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [id]);

  useEffect(() => {
    setItems([]); setNextCursor(null); setHasMore(true);
    fetchMedia(null, filter, true);
  }, [filter, fetchMedia]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) fetchMedia(nextCursor, filter); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, nextCursor, filter, fetchMedia]);

  const handleDelete = useCallback(async (itemIds: number[], messageIds: number[]) => {
    console.log("handleDelete", { itemIds, messageIds });
    const res = await fetch(`/api/conversations/${id}/media`, {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ messageIds, itemIds }),
    });
    const json = await res.json();
    console.log("DELETE response", json);
    const deletedSet = new Set(itemIds);
    setItems((prev) => prev.filter((i) => !deletedSet.has(i.id)));
  }, [id]);

  return (
    <div style={{
      minHeight:       "100svh",
      backgroundColor: "#0A0A0F",
      fontFamily:      "'Inter', sans-serif",
      display:         "flex",
      flexDirection:   "column",
    }}>

      {/* Header — matches saved page */}
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
            <span style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>Gallery</span>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", width: "100%", borderBottom: "1px solid #1E1E2E", overflowX: "auto", scrollbarWidth: "none" }}>
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                flex:            1,
                padding:         "14px 4px",
                border:          "none",
                backgroundColor: "transparent",
                fontSize:        "14px",
                fontWeight:      filter === key ? 700 : 500,
                color:           filter === key ? "#8B5CF6" : "#64748B",
                fontFamily:      "'Inter', sans-serif",
                cursor:          "pointer",
                borderBottom:    filter === key ? "2px solid #8B5CF6" : "2px solid transparent",
                marginBottom:    "-1px",
                transition:      "all 0.15s",
                textTransform:   "uppercase",
                letterSpacing:   "0.5px",
                whiteSpace:      "nowrap",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                flexShrink:      0,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" as any, paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
        <MessageGalleryGrid
          conversationId={id}
          items={items}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          loaderRef={loaderRef}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}