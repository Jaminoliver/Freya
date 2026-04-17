"use client";

import { usePathname } from "next/navigation";
import { Search, Bell, ArrowLeft, X, Plus } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNav } from "@/lib/hooks/useNav";
import { useUnreadNotificationCount } from "@/lib/notifications/store";
import { CreatorSearchRow, CreatorSearchRowSkeleton, type SearchRowCreator } from "@/components/search/CreatorSearchRow";


interface DiscoverCreator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  is_verified: boolean;
  subscriber_count: number;
  likes_count: number;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

const DISCOVER_CACHE_TTL = 5 * 60 * 1000;

// ── Creator card matching CreatorCard.tsx style exactly ──────────────────────
function MobileCreatorCard({ creator, onClick }: { creator: DiscoverCreator; onClick: () => void }) {
  const [bannerError, setBannerError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const name = creator.display_name || creator.username;
  const initials = (name[0] ?? "?").toUpperCase();

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        width: "100%",
        height: "200px",
        borderRadius: "12px",
        overflow: "hidden",
        cursor: "pointer",
        backgroundColor: "#1A1A2E",
        border: "1px solid #2A2A3D",
        transition: "border-color 0.15s ease, transform 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#8B5CF6";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#2A2A3D";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Banner */}
      {creator.banner_url && !bannerError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={creator.banner_url}
          alt=""
          loading="lazy"
          onError={() => setBannerError(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1A1A2E 0%, #2A2A3D 100%)" }} />
      )}

      {/* Gradient overlay */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 25%, rgba(0,0,0,0.92) 100%)" }} />

      {/* Avatar with conic gradient ring */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -38%)",
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            padding: "2px",
            background: "conic-gradient(#C45F8C, #8B3FBF, #C45F8C)",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid #0A0A0F",
            }}
          >
            {creator.avatar_url && !avatarError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatar_url}
                alt={name}
                loading="lazy"
                onError={() => setAvatarError(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "#8B5CF6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "20px",
                  fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {initials}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Name + username */}
      <div
        style={{
          position: "absolute",
          bottom: "36px",
          left: 0,
          right: 0,
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 10px",
          gap: "3px",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "130px",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {name}
        </span>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>
          @{creator.username}
        </span>
      </div>

      {/* Stats — crown + heart matching CreatorCard exactly */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          left: 0,
          right: 0,
          zIndex: 2,
          display: "flex",
          justifyContent: "center",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(250,192,50,0.15)" stroke="#F5C842" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 18h20" />
            <path d="M4 18L2 8l4.5 4L12 4l5.5 8L22 8l-2 10H4z" />
            <circle cx="12" cy="4" r="1.2" fill="#F5C842" stroke="none" />
            <circle cx="6.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none" />
            <circle cx="17.5" cy="12" r="1" fill="rgba(245,200,66,0.7)" stroke="none" />
          </svg>
          <span style={{ fontSize: "12px", color: "#F5C842", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
            {formatCount(creator.subscriber_count)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
            {formatCount(creator.likes_count)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MobileHeader({ headerVisible = true }: { headerVisible?: boolean }) {
  const pathname = usePathname();
  const { navigate } = useNav();

  const unreadNotificationCount = useUnreadNotificationCount();

  const showMobileHeader = pathname === "/dashboard" || pathname === "/explore";

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchRowCreator[]>([]);
  const [searching, setSearching] = useState(false);
  const [exploreData, setExploreData] = useState<DiscoverCreator[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [exploreFetchedAt, setExploreFetchedAt] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isActive = (href: string) => pathname === href;

  const fetchExplore = useCallback(async () => {
    if (exploreData.length > 0 && Date.now() - exploreFetchedAt < DISCOVER_CACHE_TTL) return;

    setExploreLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, banner_url, is_verified, subscriber_count, likes_count")
        .eq("role", "creator")
        .eq("is_active", true)
        .eq("is_suspended", false)
        .order("subscriber_count", { ascending: false })
        .limit(20);
      setExploreData((data as DiscoverCreator[]) || []);
      setExploreFetchedAt(Date.now());
    } finally {
      setExploreLoading(false);
    }
  }, [exploreData.length, exploreFetchedAt]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      fetchExplore();
    }
  }, [searchOpen, fetchExplore]);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      if (abortRef.current) abortRef.current.abort();
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearching(true);

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/search/creators?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(data.creators ?? []);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("[MobileHeader] search error:", err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    setSearchOpen(false);
    setQuery("");
    setResults([]);
  }, [pathname]);

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    setResults([]);
  };

  const navigateToCreator = (u: string) => {
    closeSearch();
    navigate(`/${u}`);
  };

  if (!showMobileHeader) return null;

  const hasQuery = query.trim().length >= 2;

  return (
    <>
      <style>{`
        @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* MOBILE TOP BAR */}
      <div
        className="md:hidden"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          backgroundColor: "#13131F", borderBottom: "1px solid #1F1F2A",
          height: "56px", fontFamily: "'Inter', sans-serif",
          transform: headerVisible ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.25s ease",
        }}
      >
        {/* Default bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: "100%", opacity: searchOpen ? 0 : 1, transform: searchOpen ? "translateY(-10px)" : "translateY(0)", transition: "all 0.2s ease", pointerEvents: searchOpen ? "none" : "auto", position: "absolute", inset: 0 }}>
  <button onClick={() => navigate("/create")} aria-label="Create post" style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px" }}>
    <Plus size={28} strokeWidth={1.8} />
  </button>
  <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}>
    <img src="/freya_logo.png" alt="Fréya" style={{ height: "110px", width: "auto", marginTop: "12px" }} />
  </div>
  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
    <button onClick={() => setSearchOpen(true)} aria-label="Search" style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px" }}>
      <Search size={27} strokeWidth={1.8} />
    </button>
    <button onClick={() => navigate("/notifications")} aria-label="Notifications" style={{ display: "flex", alignItems: "center", padding: "8px", borderRadius: "8px", color: isActive("/notifications") ? "#8B5CF6" : "#A3A3C2", background: "none", border: "none", cursor: "pointer", position: "relative" }}>
      <Bell size={24} strokeWidth={1.8} />
      {unreadNotificationCount > 0 && (
        <span style={{ position: "absolute", top: "4px", right: "4px", minWidth: "18px", height: "18px", borderRadius: "9px", backgroundColor: "#EF4444", color: "#FFFFFF", fontSize: "11px", fontWeight: 700, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", boxShadow: "0 0 0 2px #13131F" }}>
          {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
        </span>
      )}
    </button>
  </div>
</div>

        {/* Search bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 12px", height: "100%", opacity: searchOpen ? 1 : 0, transform: searchOpen ? "translateY(0)" : "translateY(-10px)", transition: "all 0.2s ease", pointerEvents: searchOpen ? "auto" : "none", position: "absolute", inset: 0 }}>
          <button onClick={closeSearch} aria-label="Close search" style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", flexShrink: 0 }}>
            <ArrowLeft size={27} strokeWidth={1.8} />
          </button>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search creators..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: "100%", borderRadius: "10px", padding: "10px 36px 10px 14px", fontSize: "14px", outline: "none", backgroundColor: "#1E1E2E", border: "1.5px solid #2A2A3D", color: "#FFFFFF", boxSizing: "border-box", fontFamily: "'Inter', sans-serif" }}
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex", padding: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH OVERLAY */}
      {searchOpen && (
        <div className="md:hidden" style={{ position: "fixed", top: "56px", left: 0, right: 0, bottom: "calc(64px + env(safe-area-inset-bottom))", backgroundColor: "#0A0A0F", zIndex: 99, display: "flex", flexDirection: "column", animation: "fadeIn 0.2s ease", fontFamily: "'Inter', sans-serif" }}>
  <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>

          {/* Discover grid — when no query */}
          {!hasQuery && (
            <div style={{ padding: "20px 16px 80px" }}>
              <p style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700, color: "#6B6B8A", textTransform: "uppercase", letterSpacing: "0.08em" }}>Discover Creators</p>
              {exploreLoading ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ height: "200px", borderRadius: "12px", backgroundColor: "#1A1A2E", animation: "pulse 1.5s ease-in-out infinite" }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {exploreData.map((creator) => (
                    <MobileCreatorCard key={creator.id} creator={creator} onClick={() => navigateToCreator(creator.username)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Results list — when query has 2+ chars */}
          {hasQuery && (
            <div style={{ padding: "8px 8px 80px", display: "flex", flexDirection: "column", gap: "2px" }}>
              {searching && (
                <>
                  <CreatorSearchRowSkeleton />
                  <CreatorSearchRowSkeleton />
                  <CreatorSearchRowSkeleton />
                </>
              )}

              {!searching && results.length === 0 && (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#E5E5F0", fontWeight: 500 }}>
                    No creators found for &ldquo;{query.trim()}&rdquo;
                  </p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#6B6B8A" }}>
                    Try a different name or check the spelling.
                  </p>
                </div>
              )}

             {!searching && results.map((creator) => (
                <CreatorSearchRow
                  key={creator.id}
                  creator={creator}
                  query={query}
                  onSelect={() => navigateToCreator(creator.username)}
                />
              ))}
            </div>
          )}
       </div>
      </div>
    )}
  </>
  );
}