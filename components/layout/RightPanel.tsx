"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { BadgeCheck } from "lucide-react";
import { HomeSidebar } from "@/components/feed/HomeSidebar";

interface Creator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

const SAMPLE_STATS = { active: 3, expired: 1, total: 4, monthlySpend: 6000, totalSpent: 24000 };
const fmt = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 0 });

export function RightPanel() {
  const [query,        setQuery]        = useState("");
  const [results,      setResults]      = useState<Creator[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [autoRenewAll, setAutoRenewAll] = useState(true);
  const pathname    = usePathname();
  const router      = useRouter();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const isSubscriptions = pathname.startsWith("/subscriptions");

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

  // ── Subscriptions stats panel ──────────────────────────────────────────────
  if (isSubscriptions) {
    return (
      <div style={{ width: "380px", flexShrink: 0, backgroundColor: "#13131F", borderLeft: "1px solid #1F1F2A", padding: "24px 20px", display: "flex", flexDirection: "column", gap: "20px", position: "sticky", top: 0, height: "100vh", overflowY: "auto", fontFamily: "'Inter', sans-serif", scrollbarWidth: "none" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, color: "#6B6B8A", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>Subscriptions</p>
          <p style={{ fontSize: "26px", fontWeight: 700, color: "#F1F5F9", margin: 0 }}>{SAMPLE_STATS.active} Active</p>
        </div>
        <div style={{ backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", overflow: "hidden" }}>
          {[
            { label: "Active",  value: SAMPLE_STATS.active,  color: "#10B981" },
            { label: "Expired", value: SAMPLE_STATS.expired, color: "#EF4444" },
            { label: "Total",   value: SAMPLE_STATS.total,   color: "#F1F5F9" },
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
            { label: "Total Spent",   value: fmt(SAMPLE_STATS.totalSpent)   },
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

  // ── Default panel (all other pages) ───────────────────────────────────────
  return (
    <div style={{ width: "380px", flexShrink: 0, minHeight: "100vh", backgroundColor: "#13131F", borderLeft: "1px solid #1F1F2A", padding: "24px 20px", display: "flex", flexDirection: "column", gap: "24px", position: "sticky", top: 0, height: "100vh", overflowY: "auto", fontFamily: "'Inter', sans-serif", scrollbarWidth: "none" }}>

      {/* Search */}
      <div style={{ position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#6B6B8A", zIndex: 1 }} />
        <input
          type="text"
          placeholder="Search Freya..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", borderRadius: "10px", padding: "12px 36px 12px 40px", fontSize: "14px", outline: "none", backgroundColor: "#1E1E2E", border: "1.5px solid #1F1F2A", color: "#FFFFFF", boxSizing: "border-box", fontFamily: "'Inter', sans-serif", transition: "border-color 0.2s" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
          onBlur={(e)  => (e.currentTarget.style.borderColor = "#1F1F2A")}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex", padding: 0 }}
          >
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
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "10px", cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1E1E2E")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <Avatar src={creator.avatar_url ?? undefined} alt={creator.display_name || creator.username} size="sm" showRing />
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

      {/* Suggestions grid — shown on all pages when not searching */}
      {!showResults && <HomeSidebar />}
    </div>
  );
}