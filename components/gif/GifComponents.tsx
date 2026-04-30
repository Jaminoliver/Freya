"use client";

import * as React from "react";
import { Search, Star, Clock, Flame, X } from "lucide-react";
import { getRecentGifs, addRecentGif } from "@/lib/utils/gifRecents";

export interface GifItem {
  id: string;
  title: string;
  url: string;
  preview_url: string;
}

// ── GIF Grid ──────────────────────────────────────────────────────────────────
export function GifGrid({ gifs, onSelect, favoriteIds, onFavorite, emptyText }: {
  gifs: GifItem[];
  onSelect: (gif: GifItem) => void;
  favoriteIds: Set<string>;
  onFavorite: (gif: GifItem) => void;
  emptyText: string;
}) {
  if (gifs.length === 0) {
    return <p style={{ textAlign: "center", color: "#4A4A6A", fontSize: "13px", padding: "32px 0", fontFamily: "'Inter', sans-serif" }}>{emptyText}</p>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
      {gifs.map((gif) => {
        const isFav = favoriteIds.has(gif.id);
        return (
          <div
            key={gif.id}
            onClick={() => onSelect(gif)}
            style={{ position: "relative", borderRadius: "8px", overflow: "hidden", cursor: "pointer", backgroundColor: "#1C1C2E", height: "90px", border: `2px solid ${isFav ? "rgba(250,204,21,0.4)" : "transparent"}`, transition: "border-color 0.15s" }}
          >
            <img
              src={gif.preview_url || gif.url}
              alt={gif.title}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              loading="lazy"
            />
            {isFav && (
              <div style={{ position: "absolute", bottom: "4px", right: "4px" }}>
                <Star size={10} fill="#FACC15" color="#FACC15" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── GIF Picker ────────────────────────────────────────────────────────────────
export function GifPicker({ onSelect, onClose, viewerUserId }: {
  onSelect: (gif: GifItem) => void;
  onClose: () => void;
  viewerUserId?: string;
}) {
  type Tab = "trending" | "recent" | "favorites" | "search";
  const [activeTab,     setActiveTab]     = React.useState<Tab>("trending");
  const [query,         setQuery]         = React.useState("");
  const [trending,      setTrending]      = React.useState<GifItem[]>([]);
  const [searchResults, setSearchResults] = React.useState<GifItem[]>([]);
  const [recents,       setRecents]       = React.useState<GifItem[]>([]);
  const [favorites,     setFavorites]     = React.useState<GifItem[]>([]);
  const [favoriteIds,   setFavoriteIds]   = React.useState<Set<string>>(new Set());
  const [loading,       setLoading]       = React.useState(true);
  const searchRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/gifs/search?per_page=24`);
        const data = await res.json();
        setTrending(data.gifs ?? []);
      } catch { setTrending([]); }
      finally  { setLoading(false); }
    })();
  }, []);

  React.useEffect(() => {
    setRecents(getRecentGifs());
  }, []);

  React.useEffect(() => {
    if (!viewerUserId) return;
    (async () => {
      try {
        const res  = await fetch("/api/gifs/favorites");
        const data = await res.json();
        const favs: GifItem[] = (data.favorites ?? []).map((f: any) => ({
          id:          f.gif_id,
          title:       f.title ?? "",
          url:         f.gif_url,
          preview_url: f.preview_url,
        }));
        setFavorites(favs);
        setFavoriteIds(new Set(favs.map((f) => f.id)));
      } catch {}
    })();
  }, [viewerUserId]);

  React.useEffect(() => {
    if (activeTab !== "search") return;
    if (!query.trim()) { setSearchResults([]); return; }
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/gifs/search?q=${encodeURIComponent(query)}&per_page=24`);
        const data = await res.json();
        setSearchResults(data.gifs ?? []);
      } catch { setSearchResults([]); }
      finally  { setLoading(false); }
    }, 400);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [query, activeTab]);

  const handleFavorite = async (gif: GifItem) => {
    const isFav = favoriteIds.has(gif.id);
    if (isFav) {
      setFavorites((prev) => prev.filter((f) => f.id !== gif.id));
      setFavoriteIds((prev) => { const s = new Set(prev); s.delete(gif.id); return s; });
      await fetch(`/api/gifs/favorites/${encodeURIComponent(gif.id)}`, { method: "DELETE" });
    } else {
      setFavorites((prev) => [gif, ...prev]);
      setFavoriteIds((prev) => new Set([...prev, gif.id]));
      await fetch("/api/gifs/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gif_id: gif.id, gif_url: gif.url, preview_url: gif.preview_url, title: gif.title }),
      });
    }
  };

  const handleSelect = (gif: GifItem) => {
    addRecentGif(gif);
    setRecents(getRecentGifs());
    onSelect(gif);
  };

  const tabs: { key: Tab; icon: React.ReactNode }[] = [
    { key: "trending",  icon: <Flame  size={16} /> },
    { key: "recent",    icon: <Clock  size={16} /> },
    { key: "favorites", icon: <Star   size={16} /> },
    { key: "search",    icon: <Search size={16} /> },
  ];

  const currentGifs =
    activeTab === "trending"  ? trending :
    activeTab === "recent"    ? recents :
    activeTab === "favorites" ? favorites :
    searchResults;

  const emptyText =
    activeTab === "recent"    ? "GIFs you send will appear here" :
    activeTab === "favorites" ? "Long press any GIF to save ⭐" :
    activeTab === "search" && !query.trim() ? "Type to search GIFs…" :
    "No GIFs found";

  return (
    <div style={{ width: "100%", backgroundColor: "#13131F", borderTop: "1px solid #2A2A3D", overflow: "hidden", boxShadow: "0 -8px 32px rgba(0,0,0,0.5)" }}>

      <div style={{ display: "flex", borderBottom: "1px solid #1F1F2E" }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{ flex: 1, padding: "10px 0", border: "none", backgroundColor: "transparent", color: isActive ? "#8B5CF6" : "#4A4A6A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: isActive ? "2px solid #8B5CF6" : "2px solid transparent", marginBottom: "-1px", transition: "all 0.15s" }}
            >
              {tab.key === "favorites"
                ? <Star size={16} fill={isActive ? "#8B5CF6" : "none"} color={isActive ? "#8B5CF6" : "#4A4A6A"} />
                : tab.icon
              }
            </button>
          );
        })}
      </div>

      {activeTab === "search" && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #1F1F2E" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#1C1C2E", borderRadius: "10px", padding: "8px 12px" }}>
            <Search size={13} color="#6B6B8A" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search GIFs…"
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "13px", color: "#E2E8F0", fontFamily: "'Inter', sans-serif", caretColor: "#8B5CF6" }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex", padding: 0 }}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ height: "204px", overflowY: "auto", padding: "8px", scrollbarWidth: "none" }}>
        {loading && (activeTab === "trending" || (activeTab === "search" && query.trim())) ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ height: "80px", backgroundColor: "#1C1C2E", borderRadius: "8px" }} />
            ))}
          </div>
        ) : (
          <GifGrid
            gifs={currentGifs}
            onSelect={handleSelect}
            favoriteIds={favoriteIds}
            onFavorite={handleFavorite}
            emptyText={emptyText}
          />
        )}
      </div>

      <div style={{ padding: "6px 12px", borderTop: "1px solid #1F1F2E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "10px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>Tap a GIF to Send or ⭐ Save</span>
        <span style={{ fontSize: "10px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>Powered by KLIPY</span>
      </div>
    </div>
  );
}