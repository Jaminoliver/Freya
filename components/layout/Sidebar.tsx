"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Search,
  MessageCircle,
  Bell,
  Wallet,
  User,
  Plus,
  X,
  BadgeCheck,
  ArrowLeft,
  CreditCard,
  MoreHorizontal,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { MoreDrawer } from "@/components/layout/MoreDrawer";

const navItems = [
  { label: "Home",          href: "/dashboard",     icon: Home          },
  { label: "Subscriptions", href: "/subscriptions", icon: CreditCard    },
  { label: "Messages",      href: "/messages",      icon: MessageCircle },
  { label: "Notifications", href: "/notifications", icon: Bell          },
  { label: "Wallet",        href: "/wallet",        icon: Wallet        },
];

interface Creator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  is_verified: boolean;
  subscriber_count: number;
}

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

const FALLBACK_COVER = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80";

export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();

  const [username,      setUsername]      = useState<string | null>(null);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [moreOpen,      setMoreOpen]      = useState(false);
  const [query,         setQuery]         = useState("");
  const [results,       setResults]       = useState<Creator[]>([]);
  const [searching,     setSearching]     = useState(false);
  const [exploreData,   setExploreData]   = useState<Creator[]>([]);
  const [exploreLoading,setExploreLoading]= useState(false);

  const inputRef    = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isDashboard = pathname === "/dashboard";

  useEffect(() => {
    const fetchUsername = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("username").eq("id", user.id).single();
      if (data?.username) setUsername(data.username);
    };
    fetchUsername();
  }, []);

  // Fetch explore/discover creators once
  const fetchExplore = useCallback(async () => {
    if (exploreData.length > 0) return;
    setExploreLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, banner_url, is_verified, subscriber_count")
      .eq("role", "creator")
      .eq("is_active", true)
      .eq("is_suspended", false)
      .order("subscriber_count", { ascending: false })
      .limit(20);
    setExploreData((data as Creator[]) || []);
    setExploreLoading(false);
  }, [exploreData.length]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      fetchExplore();
    }
  }, [searchOpen, fetchExplore]);

  // Search debounce
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, banner_url, is_verified, subscriber_count")
        .eq("role", "creator")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);
      setResults((data as Creator[]) || []);
      setSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const pendingClose = useRef(false);
  useEffect(() => {
    if (pendingClose.current) {
      pendingClose.current = false;
      setSearchOpen(false);
      setQuery("");
      setResults([]);
    }
  }, [pathname]);

  const closeSearch    = () => { setSearchOpen(false); setQuery(""); setResults([]); };
  const handleNavClick = () => { pendingClose.current = true; };

  const navigateToCreator = (username: string) => {
    pendingClose.current = true;
    router.push(`/${username}`);
  };

  return (
    <>
      <style>{`
        @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* MOBILE TOP BAR */}
      {isDashboard && (
        <div className="md:hidden" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: "#13131F", borderBottom: "1px solid #1F1F2A", height: "56px", fontFamily: "'Inter', sans-serif" }}>
          {/* Default bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: "100%", opacity: searchOpen ? 0 : 1, transform: searchOpen ? "translateY(-10px)" : "translateY(0)", transition: "all 0.2s ease", pointerEvents: searchOpen ? "none" : "auto", position: "absolute", inset: 0 }}>
            <span style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>Freya</span>
            <button onClick={() => setSearchOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: "8px" }}>
              <Search size={22} strokeWidth={1.8} />
            </button>
          </div>
          {/* Search bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 12px", height: "100%", opacity: searchOpen ? 1 : 0, transform: searchOpen ? "translateY(0)" : "translateY(-10px)", transition: "all 0.2s ease", pointerEvents: searchOpen ? "auto" : "none", position: "absolute", inset: 0 }}>
            <button onClick={closeSearch} style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", flexShrink: 0 }}>
              <ArrowLeft size={22} strokeWidth={1.8} />
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
                <button onClick={() => setQuery("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex", padding: 0 }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE SEARCH OVERLAY */}
      {isDashboard && searchOpen && (
        <div className="md:hidden" style={{ position: "fixed", top: "56px", left: 0, right: 0, bottom: "64px", backgroundColor: "#0A0A0F", zIndex: 99, overflowY: "auto", animation: "fadeIn 0.2s ease", fontFamily: "'Inter', sans-serif" }}>

          {/* ── No query: show Discover grid ── */}
          {!query.trim() && (
            <div style={{ padding: "20px 16px 80px" }}>
              <p style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700, color: "#6B6B8A", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Discover Creators
              </p>
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

          {/* ── Searching ── */}
          {searching && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#6B6B8A", fontSize: "14px" }}>Searching...</div>
          )}

          {/* ── No results ── */}
          {!searching && query.trim() && results.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#6B6B8A", fontSize: "14px" }}>No creators found for "{query}"</div>
          )}

          {/* ── Search results list ── */}
          {!searching && query.trim() && results.map((creator) => (
            <div
              key={creator.id}
              onClick={() => navigateToCreator(creator.username)}
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 20px", borderBottom: "1px solid #1F1F2A", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1E1E2E")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <Avatar src={creator.avatar_url ?? undefined} alt={creator.display_name || creator.username} size="md" showRing />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {creator.display_name || creator.username}
                  </span>
                  {creator.is_verified && <BadgeCheck size={14} color="#8B5CF6" />}
                </div>
                <span style={{ fontSize: "13px", color: "#6B6B8A" }}>@{creator.username}</span>
              </div>
              <span style={{ fontSize: "12px", color: "#6B6B8A", flexShrink: 0 }}>{formatCount(creator.subscriber_count)} subs</span>
            </div>
          ))}
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <div className="hidden md:flex" style={{ width: "280px", flexShrink: 0, height: "100vh", backgroundColor: "#13131F", borderRight: "1px solid #1F1F2A", flexDirection: "column", padding: "24px 16px", position: "sticky", top: 0, overflowY: "hidden", fontFamily: "'Inter', sans-serif" }}>
        {/* Logo */}
        <div style={{ padding: "0 12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "26px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>Freya</span>
          <Link href="/become-a-creator" style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px", borderRadius: "20px", textDecoration: "none", background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.15))", border: "1px solid rgba(139,92,246,0.35)", fontSize: "11px", fontWeight: 600, color: "#A78BFA", whiteSpace: "nowrap" }}>
            ✦ Creator
          </Link>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href === "/subscriptions" && pathname.startsWith("/subscriptions"));
            return (
              <Link key={href} href={href} onClick={handleNavClick}
                style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", borderRadius: "12px", textDecoration: "none", backgroundColor: active ? "#1E1E2E" : "transparent", color: active ? "#8B5CF6" : "#A3A3C2", fontSize: "16px", fontWeight: active ? 600 : 400, transition: "all 0.15s ease" }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.backgroundColor = "#1A1A2E"; e.currentTarget.style.color = "#F1F5F9"; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#A3A3C2"; } }}
              >
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            );
          })}

          {/* Profile */}
          {username && (
            <Link href={`/${username}`} onClick={handleNavClick}
              style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", borderRadius: "12px", textDecoration: "none", backgroundColor: pathname === `/${username}` ? "#1E1E2E" : "transparent", color: pathname === `/${username}` ? "#8B5CF6" : "#A3A3C2", fontSize: "16px", fontWeight: pathname === `/${username}` ? 600 : 400, transition: "all 0.15s ease" }}
              onMouseEnter={(e) => { if (pathname !== `/${username}`) { e.currentTarget.style.backgroundColor = "#1A1A2E"; e.currentTarget.style.color = "#F1F5F9"; } }}
              onMouseLeave={(e) => { if (pathname !== `/${username}`) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#A3A3C2"; } }}
            >
              <User size={22} strokeWidth={pathname === `/${username}` ? 2.2 : 1.8} />
              My Profile
            </Link>
          )}

          {/* More */}
          <button onClick={() => setMoreOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", borderRadius: "12px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", color: "#A3A3C2", fontSize: "16px", fontWeight: 400, transition: "all 0.15s ease", width: "100%", textAlign: "left" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1A1A2E"; e.currentTarget.style.color = "#F1F5F9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#A3A3C2"; }}
          >
            <MoreHorizontal size={22} strokeWidth={1.8} />
            More
          </button>

          {/* New Post */}
          <Link href="/create" onClick={handleNavClick}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "13px 16px", borderRadius: "30px", textDecoration: "none", background: "linear-gradient(to right, #8B5CF6, #EC4899)", color: "#fff", fontSize: "15px", fontWeight: 700, marginTop: "16px", transition: "opacity 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Plus size={20} strokeWidth={2.5} />
            New Post
          </Link>
        </nav>
      </div>

      <MoreDrawer isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

// ── Mobile creator card (cover image + avatar + name) ─────────────────────────
function MobileCreatorCard({ creator, onClick }: { creator: Creator; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderRadius: "10px", overflow: "hidden", cursor: "pointer", border: `1px solid ${hovered ? "#8B5CF6" : "#2A2A3D"}`, transition: "border-color 0.15s ease", position: "relative", height: "200px" }}
    >
      <img
        src={creator.banner_url || FALLBACK_COVER}
        alt={creator.display_name || creator.username}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.85) 100%)" }} />

      {/* Avatar */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -20%)", zIndex: 2 }}>
        <Avatar src={creator.avatar_url ?? undefined} alt={creator.display_name || creator.username} size="lg" showRing />
      </div>

      {/* Name */}
      <div style={{ position: "absolute", bottom: "28px", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", zIndex: 2, padding: "0 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "90px" }}>
            {creator.display_name || creator.username}
          </span>
          {creator.is_verified && <BadgeCheck size={11} color="#A78BFA" />}
        </div>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)" }}>@{creator.username}</span>
      </div>

      {/* Subscriber count */}
      <div style={{ position: "absolute", bottom: "8px", left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 2 }}>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
          {formatCount(creator.subscriber_count)} subscribers
        </span>
      </div>
    </div>
  );
}