"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Search,
  MessageCircle,
  Bell,
  Wallet,
  Bookmark,
  User,
  Plus,
  Settings,
  X,
  BadgeCheck,
  ArrowLeft,
  CreditCard,
  MoreHorizontal,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { MoreDrawer } from "@/components/layout/MoreDrawer";

const navItems = [
  { label: "Home",          href: "/dashboard",      icon: Home         },
  { label: "Subscriptions", href: "/subscriptions",  icon: CreditCard   },
  { label: "Messages",      href: "/messages",       icon: MessageCircle},
  { label: "Notifications", href: "/notifications",  icon: Bell         },
  { label: "Wallet",        href: "/wallet",         icon: Wallet       },
  { label: "Bookmarks",     href: "/bookmarks",      icon: Bookmark     },
];

interface Creator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [username,    setUsername]    = useState<string | null>(null);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [moreOpen,    setMoreOpen]    = useState(false);
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState<Creator[]>([]);
  const [searching,   setSearching]   = useState(false);
  const inputRef    = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isSettings  = pathname.startsWith("/settings");
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

  useEffect(() => {
    if (pendingClose.current) {
      pendingClose.current = false;
      setSearchOpen(false);
      setQuery("");
      setResults([]);
    }
  }, [pathname]);

  const closeSearch   = () => { setSearchOpen(false); setQuery(""); setResults([]); };
  const handleNavClick = () => { pendingClose.current = true; };

  const handleSettingsClick = (e: React.MouseEvent) => {
    handleNavClick();
    if (isSettings) {
      e.preventDefault();
      router.push("/settings?panel=menu");
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* MOBILE TOP BAR — dashboard only */}
      {isDashboard && (
        <div
          className="md:hidden"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
            backgroundColor: "#13131F", borderBottom: "1px solid #1F1F2A",
            height: "56px", fontFamily: "'Inter', sans-serif",
          }}
        >
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
              <input
                ref={inputRef}
                type="text"
                placeholder="Search creators..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: "100%", borderRadius: "10px", padding: "10px 36px 10px 14px",
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
      )}

      {/* MOBILE SEARCH OVERLAY — dashboard only */}
      {isDashboard && searchOpen && (
        <div
          className="md:hidden"
          style={{
            position: "fixed", top: "56px", left: 0, right: 0, bottom: "64px",
            backgroundColor: "#0A0A0F", zIndex: 99, overflowY: "auto",
            animation: "fadeIn 0.2s ease", fontFamily: "'Inter', sans-serif",
          }}
        >
          {!query.trim() && <MobileSuggestedCreators onSelect={(u: string) => { pendingClose.current = true; router.push(`/${u}`); }} />}
          {searching && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#6B6B8A", fontSize: "14px" }}>Searching...</div>
          )}
          {!searching && query.trim() && results.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#6B6B8A", fontSize: "14px" }}>No creators found for "{query}"</div>
          )}
          {!searching && results.map((creator) => (
            <div
              key={creator.id}
              onClick={() => { pendingClose.current = true; router.push(`/${creator.username}`); }}
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 20px", borderBottom: "1px solid #1F1F2A", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1E1E2E")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <Avatar
                src={creator.avatar_url ?? undefined}
                alt={creator.display_name || creator.username}
                size="md"
                showRing
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "#FFFFFF" }}>{creator.display_name || creator.username}</span>
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
              display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px",
              borderRadius: "20px", textDecoration: "none",
              background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.15))",
              border: "1px solid rgba(139,92,246,0.35)", fontSize: "11px", fontWeight: 600,
              color: "#A78BFA", whiteSpace: "nowrap",
            }}
          >
            ✦ Creator
          </Link>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href === "/subscriptions" && pathname.startsWith("/subscriptions"));
            return (
              <Link
                key={href}
                href={href}
                onClick={handleNavClick}
                style={{
                  display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px",
                  borderRadius: "12px", textDecoration: "none",
                  backgroundColor: active ? "#1E1E2E" : "transparent",
                  color: active ? "#8B5CF6" : "#A3A3C2",
                  fontSize: "16px", fontWeight: active ? 600 : 400, transition: "all 0.15s ease",
                }}
              >
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            );
          })}

          {username && (
            <Link
              href={`/${username}`}
              onClick={handleNavClick}
              style={{
                display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px",
                borderRadius: "12px", textDecoration: "none",
                backgroundColor: pathname === `/${username}` ? "#1E1E2E" : "transparent",
                color: pathname === `/${username}` ? "#8B5CF6" : "#A3A3C2",
                fontSize: "16px", fontWeight: pathname === `/${username}` ? 600 : 400, transition: "all 0.15s ease",
              }}
            >
              <User size={22} strokeWidth={pathname === `/${username}` ? 2.2 : 1.8} />
              Profile
            </Link>
          )}

          <Link
            href="/settings"
            onClick={handleSettingsClick}
            style={{
              display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px",
              borderRadius: "12px", textDecoration: "none",
              backgroundColor: isSettings ? "#1E1E2E" : "transparent",
              color: isSettings ? "#8B5CF6" : "#A3A3C2",
              fontSize: "16px", fontWeight: isSettings ? 600 : 400, transition: "all 0.15s ease",
            }}
          >
            <Settings size={22} strokeWidth={isSettings ? 2.2 : 1.8} />
            Settings
          </Link>

          {/* More */}
          <button
            onClick={() => setMoreOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px",
              borderRadius: "12px", background: "none", border: "none",
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              color: "#A3A3C2", fontSize: "16px", fontWeight: 400,
              transition: "all 0.15s ease", width: "100%",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1E1E2E"; e.currentTarget.style.color = "#F1F5F9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#A3A3C2"; }}
          >
            <MoreHorizontal size={22} strokeWidth={1.8} />
            More
          </button>
        </nav>
      </div>

      <MoreDrawer isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
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
          style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 20px", borderBottom: "1px solid #1F1F2A", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1E1E2E")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Avatar
            src={creator.avatar_url ?? undefined}
            alt={creator.display_name || creator.username}
            size="md"
            showRing
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ fontSize: "15px", fontWeight: 600, color: "#FFFFFF" }}>{creator.display_name || creator.username}</span>
              {creator.is_verified && <BadgeCheck size={14} color="#8B5CF6" />}
            </div>
            <span style={{ fontSize: "13px", color: "#6B6B8A" }}>@{creator.username}</span>
          </div>
        </div>
      ))}
    </div>
  );
}