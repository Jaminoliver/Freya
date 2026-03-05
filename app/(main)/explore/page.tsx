"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { FilterTabs } from "@/components/explore/FilterTabs";
import { CreatorGrid } from "@/components/explore/CreatorGrid";
import { createClient } from "@/lib/supabase/client";

interface Creator {
  username: string;
  name: string;
  avatar: string;
  coverImage: string;
  subscribers: string;
  trending?: boolean;
}

interface ProfileRow {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  subscriber_count: number | null;
  is_verified: boolean | null;
}

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

const FALLBACK_COVER = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80";

export default function ExplorePage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [search,       setSearch]       = useState("");
  const [creators,     setCreators]     = useState<Creator[]>([]);
  const [loading,      setLoading]      = useState(true);

  const fetchCreators = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url, banner_url, subscriber_count, is_verified")
      .eq("role", "creator")
      .eq("is_active", true)
      .eq("is_suspended", false)
      .order("subscriber_count", { ascending: false })
      .limit(50);

    if (!error && data) {
      const mapped: Creator[] = (data as ProfileRow[]).map((p, i) => ({
        username:    p.username,
        name:        p.display_name || p.username,
        avatar:      p.avatar_url || `https://i.pravatar.cc/150?img=${i + 1}`,
        coverImage:  p.banner_url  || FALLBACK_COVER,
        subscribers: formatCount(p.subscriber_count ?? 0),
        trending:    (p.subscriber_count ?? 0) > 10000,
      }));
      setCreators(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCreators(); }, [fetchCreators]);

  const filtered = creators.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                          c.username.toLowerCase().includes(search.toLowerCase());
    if (activeFilter === "trending") return matchesSearch && c.trending;
    return matchesSearch;
  });

  return (
    <div style={{ maxWidth: "100%", fontFamily: "'Inter', sans-serif", backgroundColor: "#0A0A0F", minHeight: "100vh" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 10, backgroundColor: "#0A0A0F", padding: "24px 20px 16px", borderBottom: "1px solid #1E1E2E" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", gap: "16px", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "#F1F5F9" }}>Discover</h1>
          <div style={{ position: "relative", flex: 1, maxWidth: "360px", minWidth: "200px" }}>
            <Search size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#6B6B8A" }} />
            <input
              type="text"
              placeholder="Search creators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", borderRadius: "20px", padding: "10px 16px 10px 38px", fontSize: "14px", outline: "none", backgroundColor: "#1E1E2E", border: "1.5px solid #2A2A3D", color: "#F1F5F9", boxSizing: "border-box", fontFamily: "'Inter', sans-serif" }}
            />
          </div>
        </div>
        <FilterTabs active={activeFilter} onChange={setActiveFilter} />
      </div>

      <div style={{ padding: "20px 20px 80px" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ height: "260px", borderRadius: "12px", backgroundColor: "#1A1A2E", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#6B6B8A", fontSize: "14px" }}>
            No creators found
          </div>
        ) : (
          <CreatorGrid creators={filtered} />
        )}
      </div>
    </div>
  );
}