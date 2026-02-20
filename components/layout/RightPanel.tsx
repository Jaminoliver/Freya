"use client";

import { useState, useEffect, useRef } from "react";
import { Search, BadgeCheck, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Creator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

const topCreators = [
  { rank: 1, name: "Zara Johnson",   username: "zarajohnson",   subscribers: "45.2K" },
  { rank: 2, name: "Maya Williams",  username: "mayawilliams",  subscribers: "38.7K" },
  { rank: 3, name: "Luna Rodriguez", username: "lunarodriguez", subscribers: "32.1K" },
  { rank: 4, name: "Aria Martinez",  username: "ariamartinez",  subscribers: "28.5K" },
  { rank: 5, name: "Jade Thompson",  username: "jadethompson",  subscribers: "24.3K" },
];

const rankColors: Record<number, string> = { 1: "#F59E0B", 2: "#9CA3AF", 3: "#B45309", 4: "#8B5CF6", 5: "#8B5CF6" };
const categories = ["Lifestyle", "Gaming", "Fitness", "Art", "Music", "Fashion", "Comedy"];

export function RightPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isExplore = pathname === "/explore";
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .eq("role", "creator")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(8);
      setResults((data as Creator[]) || []);
      setLoading(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const showResults = query.trim().length > 0;

  return (
    <div style={{
      width: "300px", flexShrink: 0, minHeight: "100vh",
      backgroundColor: "#13131F", borderLeft: "1px solid #1F1F2A",
      padding: "24px 20px", display: "flex", flexDirection: "column", gap: "24px",
      position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      fontFamily: "'Inter', sans-serif", scrollbarWidth: "none",
    }}>

      {/* Search */}
      <div style={{ position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#6B6B8A", zIndex: 1 }} />
        <input
          type="text"
          placeholder="Search Freya..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%", borderRadius: "10px", padding: "12px 36px 12px 40px",
            fontSize: "14px", outline: "none", backgroundColor: "#1E1E2E",
            border: "1.5px solid #1F1F2A", color: "#FFFFFF",
            boxSizing: "border-box", fontFamily: "'Inter', sans-serif",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#1F1F2A")}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex", padding: 0 }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search Results */}
      {showResults && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "-12px" }}>
          {loading && (
            <div style={{ padding: "12px 0", textAlign: "center", fontSize: "13px", color: "#6B6B8A" }}>Searching...</div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: "12px 0", textAlign: "center", fontSize: "13px", color: "#6B6B8A" }}>No creators found</div>
          )}
          {!loading && results.map((creator) => (
            <div
              key={creator.id}
              onClick={() => { router.push(`/${creator.username}`); setQuery(""); }}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 10px", borderRadius: "10px", cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1E1E2E")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <div style={{
                width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
                background: creator.avatar_url ? `url(${creator.avatar_url}) center/cover` : "linear-gradient(135deg, #8B5CF6, #EC4899)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "15px", fontWeight: 700, color: "#fff",
              }}>
                {!creator.avatar_url && (creator.display_name || creator.username).charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {creator.display_name || creator.username}
                  </span>
                  {creator.is_verified && <BadgeCheck size={13} color="#8B5CF6" />}
                </div>
                <span style={{ fontSize: "11px", color: "#6B6B8A" }}>@{creator.username}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Default content when not searching */}
      {!showResults && isExplore && (
        <>
          <div>
            <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#FFFFFF" }}>Top Creators 👑</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {topCreators.map(({ rank, name, username, subscribers }) => (
                <div key={username} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: rankColors[rank], width: "14px", flexShrink: 0 }}>{rank}</span>
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #8B5CF6, #EC4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                    {name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</p>
                      <BadgeCheck size={13} color="#8B5CF6" />
                    </div>
                    <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A" }}>{subscribers} subscribers</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "#FFFFFF" }}>Categories</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {categories.map((cat) => (
                <button key={cat} style={{ padding: "6px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: 500, border: "1.5px solid #2A2A3D", backgroundColor: "transparent", color: "#A3A3C2", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s ease" }}
                  onMouseEnter={(e) => { (e.currentTarget).style.backgroundColor = "rgba(139,92,246,0.1)"; (e.currentTarget).style.borderColor = "#8B5CF6"; (e.currentTarget).style.color = "#8B5CF6"; }}
                  onMouseLeave={(e) => { (e.currentTarget).style.backgroundColor = "transparent"; (e.currentTarget).style.borderColor = "#2A2A3D"; (e.currentTarget).style.color = "#A3A3C2"; }}
                >{cat}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {!showResults && !isExplore && (
        <div>
          <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#FFFFFF" }}>Suggested Creators</h3>
          <SuggestedCreators router={router} />
        </div>
      )}
    </div>
  );
}

function SuggestedCreators({ router }: { router: ReturnType<typeof useRouter> }) {
  const [creators, setCreators] = useState<Creator[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .eq("role", "creator")
        .limit(5);
      setCreators((data as Creator[]) || []);
    };
    load();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {creators.map((creator) => (
        <div key={creator.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            onClick={() => router.push(`/${creator.username}`)}
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
          >
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: creator.avatar_url ? `url(${creator.avatar_url}) center/cover` : "linear-gradient(135deg, #8B5CF6, #EC4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {!creator.avatar_url && (creator.display_name || creator.username).charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>{creator.display_name || creator.username}</p>
                {creator.is_verified && <BadgeCheck size={13} color="#8B5CF6" />}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#6B6B8A" }}>@{creator.username}</p>
            </div>
          </div>
          <button style={{ padding: "6px 14px", borderRadius: "8px", backgroundColor: "#8B5CF6", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            Follow
          </button>
        </div>
      ))}
    </div>
  );
}