"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, MessageCircle, Bell, Wallet, Bookmark, User, Plus, Settings, X, BadgeCheck, ArrowLeft } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Explore", href: "/explore", icon: Search },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
];

interface Creator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Creator[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isSettings = pathname.startsWith("/settings");

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

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [searchOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .eq("role", "creator")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);
      setResults((data as Creator[]) || []);
      setSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const pendingClose = useRef(false);

  // Close search AFTER route changes to prevent flash of previous page
  useEffect(() => {
    if (pendingClose.current) {
      pendingClose.current = false;
      setSearchOpen(false);
      setQuery("");
      setResults([]);
    }
  }, [pathname]);

  const closeSearch = () => { setSearchOpen(false); setQuery(""); setResults([]); };

  const goToProfile = (u: string) => {
    pendingClose.current = true;
    router.push(`/${u}`);
  };

  const handleNavClick = () => { pendingClose.current = true; };

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* MOBILE TOP BAR */}
      <div
        className="md:hidden"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          backgroundColor: "#13131F", borderBottom: "1px solid #1F1F2A",
          height: "56px", fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Normal top bar */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 16px", height: "100%",
            opacity: searchOpen ? 0 : 1,
            transform: searchOpen ? "translateY(-10px)" : "translateY(0)",
            transition: "all 0.2s ease",
            pointerEvents: searchOpen ? "none" : "auto",
            position: "absolute", inset: 0,
          }}
        >
          <span style={{ fontSize: "22px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>Freya</span>
          <button
            onClick={() => setSearchOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px" }}
          >
            <Search size={22} strokeWidth={1.8} />
          </button>
        </div>

        {/* Search bar - slides in */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "0 12px", height: "100%",
            opacity: searchOpen ? 1 : 0,
            transform: searchOpen ? "translateY(0)" : "translateY(-10px)",
            transition: "all 0.2s ease",
            pointerEvents: searchOpen ? "auto" : "none",
            position: "absolute", inset: 0,
          }}
        >
          <button onClick={closeSearch} style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", flexShrink: 0 }}>
            <ArrowLeft size={22} strokeWidth={1.8} />
          </button>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6B6B8A" }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search creators..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%", borderRadius: "10px", padding: "10px 36px 10px 36px",
                fontSize: "14px", outline: "none", backgroundColor: "#1E1E2E",
                border: "1.5px solid #2A2A3D", color: "#FFFFFF",
                boxSizing: "border-box", fontFamily: "'Inter', sans-serif",
              }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex", padding: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE SEARCH OVERLAY */}
      {searchOpen && (
        <div
          className="md:hidden"
          style={{
            position: "fixed", top: "56px", left: 0, right: 0, bottom: "64px",
            backgroundColor: "#0A0A0F", zIndex: 99, overflowY: "auto",
            animation: "fadeIn 0.2s ease",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {!query.trim() && (
            <MobileSuggestedCreators onSelect={goToProfile} />
          )}

          {searching && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#6B6B8A", fontSize: "14px" }}>Searching...</div>
          )}

          {!searching && query.trim() && results.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#6B6B8A", fontSize: "14px" }}>No creators found for "{query}"</div>
          )}

          {!searching && results.map((creator) => (
            <div
              key={creator.id}
              onClick={() => goToProfile(creator.username)}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "14px 20px", borderBottom: "1px solid #1F1F2A",
                cursor: "pointer", transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1E1E2E")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <div style={{
                width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
                background: creator.avatar_url ? `url(${creator.avatar_url}) center/cover` : "linear-gradient(135deg, #8B5CF6, #EC4899)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "17px", fontWeight: 700, color: "#fff",
              }}>
                {!creator.avatar_url && (creator.display_name || creator.username).charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "#FFFFFF" }}>
                    {creator.display_name || creator.username}
                  </span>
                  {creator.is_verified && <BadgeCheck size={14} color="#8B5CF6" />}
                </div>
                <span style={{ fontSize: "13px", color: "#6B6B8A" }}>@{creator.username}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <div
        className="hidden md:flex"
        style={{
          width: "280px", flexShrink: 0, height: "100vh",
          backgroundColor: "#13131F", borderRight: "1px solid #1F1F2A",
          flexDirection: "column", padding: "24px 16px",
          position: "sticky", top: 0, overflowY: "hidden",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ padding: "0 12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "26px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>Freya</span>
          <Link
            href="/become-a-creator"
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "5px 10px", borderRadius: "20px", textDecoration: "none",
              background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.15))",
              border: "1px solid rgba(139,92,246,0.35)",
              fontSize: "11px", fontWeight: 600, color: "#A78BFA",
              whiteSpace: "nowrap", transition: "all 0.15s ease",
            }}
          >
            ✦ Creator
          </Link>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "12px 16px", borderRadius: "12px", textDecoration: "none",
                backgroundColor: active ? "#1E1E2E" : "transparent",
                color: active ? "#8B5CF6" : "#A3A3C2",
                fontSize: "16px", fontWeight: active ? 600 : 400, transition: "all 0.15s ease",
              }}>
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            );
          })}

          {username && (
            <Link href={`/${username}`} style={{
              display: "flex", alignItems: "center", gap: "14px",
              padding: "12px 16px", borderRadius: "12px", textDecoration: "none",
              backgroundColor: pathname === `/${username}` ? "#1E1E2E" : "transparent",
              color: pathname === `/${username}` ? "#8B5CF6" : "#A3A3C2",
              fontSize: "16px", fontWeight: pathname === `/${username}` ? 600 : 400,
              transition: "all 0.15s ease",
            }}>
              <User size={22} strokeWidth={pathname === `/${username}` ? 2.2 : 1.8} />
              Profile
            </Link>
          )}

          <Link href="/settings" style={{
            display: "flex", alignItems: "center", gap: "14px",
            padding: "12px 16px", borderRadius: "12px", textDecoration: "none",
            backgroundColor: isSettings ? "#1E1E2E" : "transparent",
            color: isSettings ? "#8B5CF6" : "#A3A3C2",
            fontSize: "16px", fontWeight: isSettings ? 600 : 400,
            transition: "all 0.15s ease",
          }}>
            <Settings size={22} strokeWidth={isSettings ? 2.2 : 1.8} />
            Settings
          </Link>
        </nav>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav
        className="md:hidden flex items-center justify-around"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, height: "64px",
          backgroundColor: "#13131F", borderTop: "1px solid #1F1F2A",
          zIndex: 101, fontFamily: "'Inter', sans-serif",
        }}
      >
        <Link href="/dashboard" onClick={handleNavClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: pathname === "/dashboard" ? "#8B5CF6" : "#6B6B8A", textDecoration: "none" }}>
          <Home size={22} strokeWidth={pathname === "/dashboard" ? 2.2 : 1.8} />
          <span style={{ fontSize: "10px" }}>Home</span>
        </Link>
        <Link href="/explore" onClick={handleNavClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: pathname === "/explore" ? "#8B5CF6" : "#6B6B8A", textDecoration: "none" }}>
          <Search size={22} strokeWidth={pathname === "/explore" ? 2.2 : 1.8} />
          <span style={{ fontSize: "10px" }}>Explore</span>
        </Link>
        <Link href="/new-post" onClick={handleNavClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#8B5CF6", textDecoration: "none" }}>
          <Plus size={22} color="#fff" />
        </Link>
        <Link href="/settings" onClick={handleNavClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: isSettings ? "#8B5CF6" : "#6B6B8A", textDecoration: "none" }}>
          <Settings size={22} strokeWidth={isSettings ? 2.2 : 1.8} />
          <span style={{ fontSize: "10px" }}>Settings</span>
        </Link>
        {username ? (
          <Link href={`/${username}`} onClick={handleNavClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: pathname === `/${username}` ? "#8B5CF6" : "#6B6B8A", textDecoration: "none" }}>
            <User size={22} strokeWidth={pathname === `/${username}` ? 2.2 : 1.8} />
            <span style={{ fontSize: "10px" }}>Profile</span>
          </Link>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: "#6B6B8A" }}>
            <User size={22} strokeWidth={1.8} />
            <span style={{ fontSize: "10px" }}>Profile</span>
          </div>
        )}
      </nav>
    </>
  );
}

function MobileSuggestedCreators({ onSelect }: { onSelect: (username: string) => void }) {
  const [creators, setCreators] = useState<Creator[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .eq("role", "creator")
        .limit(8);
      setCreators((data as Creator[]) || []);
    };
    load();
  }, []);

  return (
    <div>
      <p style={{ padding: "16px 20px 8px", margin: 0, fontSize: "13px", fontWeight: 600, color: "#6B6B8A", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Suggested Creators
      </p>
      {creators.map((creator) => (
        <div
          key={creator.id}
          onClick={() => onSelect(creator.username)}
          style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "14px 20px", borderBottom: "1px solid #1F1F2A",
            cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1E1E2E")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <div style={{
            width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
            background: creator.avatar_url ? `url(${creator.avatar_url}) center/cover` : "linear-gradient(135deg, #8B5CF6, #EC4899)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "17px", fontWeight: 700, color: "#fff",
          }}>
            {!creator.avatar_url && (creator.display_name || creator.username).charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ fontSize: "15px", fontWeight: 600, color: "#FFFFFF" }}>
                {creator.display_name || creator.username}
              </span>
              {creator.is_verified && <BadgeCheck size={14} color="#8B5CF6" />}
            </div>
            <span style={{ fontSize: "13px", color: "#6B6B8A" }}>@{creator.username}</span>
          </div>
        </div>
      ))}
    </div>
  );
}