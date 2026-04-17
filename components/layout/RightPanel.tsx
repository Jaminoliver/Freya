// components/layout/RightPanel.tsx
"use client";

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { Search, X, Clock } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { HomeSidebar } from "@/components/feed/HomeSidebar";
import { CreatorSearchRow, CreatorSearchRowSkeleton, type SearchRowCreator } from "@/components/search/CreatorSearchRow";

const SAMPLE_STATS = { active: 3, expired: 1, total: 4, monthlySpend: 6000, totalSpent: 24000 };
const fmt = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 0 });

const RECENT_SEARCHES_KEY = "freya_recent_searches";
const MAX_RECENT = 5;

interface RecentSearch {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  follower_count: number;
  likes_count: number;
}

// ── Recent searches helpers ────────────────────────────────────────────────
function loadRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(items: RecentSearch[]) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch {}
}

function addRecentSearch(creator: RecentSearch): RecentSearch[] {
  const existing = loadRecentSearches();
  const filtered = existing.filter((c) => c.id !== creator.id);
  const updated = [creator, ...filtered].slice(0, MAX_RECENT);
  saveRecentSearches(updated);
  return updated;
}

function removeRecentSearch(id: string): RecentSearch[] {
  const updated = loadRecentSearches().filter((c) => c.id !== id);
  saveRecentSearches(updated);
  return updated;
}

function clearAllRecentSearches(): RecentSearch[] {
  saveRecentSearches([]);
  return [];
}

export function RightPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchRowCreator[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [autoRenewAll, setAutoRenewAll] = useState(true);

  const pathname = usePathname();
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isSubscriptions = pathname.startsWith("/subscriptions");

  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

  // ── Debounced server-side search ────────────────────────────────────────
  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      if (abortRef.current) abortRef.current.abort();
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);

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
        console.error("[RightPanel] search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    setHighlightIdx(-1);
  }, [results, query]);

  // ── Click outside to close dropdown ─────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
        setHighlightIdx(-1);
      }
    };
    if (focused) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [focused]);

  useEffect(() => {
    setFocused(false);
    setQuery("");
  }, [pathname]);

  // ── Selection handler ────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (creator: SearchRowCreator) => {
      const updated = addRecentSearch({
        id: creator.id,
        username: creator.username,
        display_name: creator.display_name,
        avatar_url: creator.avatar_url,
        is_verified: creator.is_verified,
        follower_count: creator.follower_count,
        likes_count: creator.likes_count,
      });
      setRecentSearches(updated);
      setQuery("");
      setFocused(false);
      router.push(`/${creator.username}`);
    },
    [router]
  );

  const handleSeeAllResults = useCallback(() => {
    if (!query.trim()) return;
    setFocused(false);
    router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
  }, [query, router]);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const list = query.trim().length >= 2 ? results : [];

    if (e.key === "Escape") {
      e.preventDefault();
      if (query) {
        setQuery("");
      } else {
        setFocused(false);
        inputRef.current?.blur();
      }
      return;
    }

    if (list.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev + 1) % list.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev <= 0 ? list.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIdx >= 0 && list[highlightIdx]) {
        handleSelect(list[highlightIdx]);
      } else if (query.trim().length >= 2) {
        handleSeeAllResults();
      }
    }
  };

  // ── Subscriptions stats panel ────────────────────────────────────────────
  if (isSubscriptions) {
    return (
      <div style={{ width: "380px", flexShrink: 0, backgroundColor: "#13131F", borderLeft: "1px solid #1F1F2A", padding: "24px 20px", display: "flex", flexDirection: "column", gap: "20px", position: "sticky", top: 0, height: "100vh", overflowY: "auto", fontFamily: "'Inter', sans-serif", scrollbarWidth: "none" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, color: "#6B6B8A", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>Subscriptions</p>
          <p style={{ fontSize: "26px", fontWeight: 700, color: "#F1F5F9", margin: 0 }}>{SAMPLE_STATS.active} Active</p>
        </div>
        <div style={{ backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", overflow: "hidden" }}>
          {[
            { label: "Active", value: SAMPLE_STATS.active, color: "#10B981" },
            { label: "Expired", value: SAMPLE_STATS.expired, color: "#EF4444" },
            { label: "Total", value: SAMPLE_STATS.total, color: "#F1F5F9" },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", borderBottom: i < arr.length - 1 ? "1px solid #2A2A3D" : "none" }}>
              <span style={{ fontSize: "13px", color: "#94A3B8" }}>{row.label}</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: row.color }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div style={{ backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", overflow: "hidden" }}>
          {[
            { label: "Monthly Spend", value: fmt(SAMPLE_STATS.monthlySpend) },
            { label: "Total Spent", value: fmt(SAMPLE_STATS.totalSpent) },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", borderBottom: i < arr.length - 1 ? "1px solid #2A2A3D" : "none" }}>
              <span style={{ fontSize: "13px", color: "#94A3B8" }}>{row.label}</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#F1F5F9" }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div style={{ backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#F1F5F9" }}>Auto-renew all</span>
            <button
              onClick={() => setAutoRenewAll(!autoRenewAll)}
              style={{ width: "40px", height: "22px", borderRadius: "11px", border: "none", cursor: "pointer", padding: "2px", backgroundColor: autoRenewAll ? "#8B5CF6" : "#2A2A3D", display: "flex", alignItems: "center", justifyContent: autoRenewAll ? "flex-end" : "flex-start", transition: "all 0.2s ease", flexShrink: 0 }}
            >
              <div style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#fff" }} />
            </button>
          </div>
          <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0 }}>Applies to all active subscriptions</p>
        </div>
        <button
          onClick={() => router.push("/explore")}
          style={{ width: "100%", padding: "11px", borderRadius: "10px", border: "1.5px solid #8B5CF6", backgroundColor: "transparent", color: "#8B5CF6", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s ease" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          Explore Creators
        </button>
      </div>
    );
  }

  // ── Default panel (all other pages) ──────────────────────────────────────
  const showDropdown = focused;
  const hasQuery = query.trim().length >= 2;
  const hasRecent = recentSearches.length > 0;

  return (
    <div style={{ width: "380px", flexShrink: 0, minHeight: "100vh", backgroundColor: "#13131F", borderLeft: "1px solid #1F1F2A", padding: "8px 20px 24px", display: "flex", flexDirection: "column", gap: "24px", position: "sticky", top: 0, height: "100vh", overflowY: "auto", fontFamily: "'Inter', sans-serif", scrollbarWidth: "none" }}>

      {/* Search */}
      <div ref={containerRef} style={{ position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: "14px", top: "22px", transform: "translateY(-50%)", color: "#6B6B8A", zIndex: 1, pointerEvents: "none" }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search Freya..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          style={{
            width: "100%",
            borderRadius: "10px",
            padding: "12px 36px 12px 40px",
            fontSize: "14px",
            outline: "none",
            backgroundColor: "#1E1E2E",
            border: `1.5px solid ${focused ? "#8B5CF6" : "#1F1F2A"}`,
            color: "#FFFFFF",
            boxSizing: "border-box",
            fontFamily: "'Inter', sans-serif",
            transition: "border-color 0.15s ease",
          }}
        />
        {query && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex", padding: 0 }}
          >
            <X size={14} />
          </button>
        )}

        {/* Dropdown */}
        {showDropdown && (
          <div
            role="listbox"
            style={{
              marginTop: "8px",
              backgroundColor: "#141420",
              border: "1px solid #1F1F2A",
              borderRadius: "12px",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              maxHeight: "420px",
              overflowY: "auto",
            }}
          >
            {/* Recent searches */}
            {!hasQuery && hasRecent && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px 8px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#6B6B8A", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Recent
                  </span>
                  {recentSearches.length >= 3 && (
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setRecentSearches(clearAllRecentSearches());
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#8B5CF6", fontSize: "11px", fontWeight: 600, padding: 0 }}
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {recentSearches.map((r) => (
                  <div key={r.id} style={{ position: "relative" }}>
                    <CreatorSearchRow
                      creator={r}
                      query=""
                      onSelect={() => handleSelect(r)}
                    />
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setRecentSearches(removeRecentSearch(r.id));
                      }}
                      aria-label={`Remove ${r.username} from recent searches`}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#6B6B8A",
                        display: "flex",
                        padding: "6px",
                        borderRadius: "6px",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* Empty state */}
            {!hasQuery && !hasRecent && (
              <div style={{ padding: "24px 12px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <Clock size={20} color="#3A3A50" />
                <p style={{ margin: 0, fontSize: "13px", color: "#6B6B8A", lineHeight: 1.5 }}>
                  Search by name or @username to find creators
                </p>
              </div>
            )}

            {/* Loading */}
            {hasQuery && loading && (
              <>
                <CreatorSearchRowSkeleton />
                <CreatorSearchRowSkeleton />
                <CreatorSearchRowSkeleton />
              </>
            )}

            {/* Results */}
            {hasQuery && !loading && results.length > 0 && (
              <>
                {results.map((creator, idx) => (
                  <CreatorSearchRow
                    key={creator.id}
                    creator={creator}
                    query={query}
                    highlighted={idx === highlightIdx}
                    onSelect={() => handleSelect(creator)}
                  />
                ))}
                <div style={{ borderTop: "1px solid #1F1F2A", marginTop: "4px", paddingTop: "4px" }}>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSeeAllResults();
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#8B5CF6",
                      fontSize: "13px",
                      fontWeight: 600,
                      textAlign: "left",
                      borderRadius: "8px",
                      fontFamily: "'Inter', sans-serif",
                      transition: "background-color 0.12s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1A1A2A")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    See all results for &ldquo;{query.trim()}&rdquo; →
                  </button>
                </div>
              </>
            )}

            {/* No results */}
            {hasQuery && !loading && results.length === 0 && (
              <div style={{ padding: "20px 12px", textAlign: "center" }}>
                <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#E5E5F0", fontWeight: 500 }}>
                  No creators found for &ldquo;{query.trim()}&rdquo;
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "#6B6B8A", lineHeight: 1.5 }}>
                  Try a different name or check the spelling.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggestions */}
      <HomeSidebar />
    </div>
  );
}