"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageCircle, Bell, Wallet, Bookmark, User, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Explore", href: "/explore", icon: Search },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
];

export function Sidebar() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsername = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();
      if (data?.username) setUsername(data.username);
    };
    fetchUsername();
  }, []);

  return (
    <>
      {/* DESKTOP SIDEBAR — hidden on mobile */}
      <div
        className="hidden md:flex"
        style={{
          width: "280px",
          flexShrink: 0,
          height: "100vh",
          backgroundColor: "#13131F",
          borderRight: "1px solid #1F1F2A",
          flexDirection: "column",
          padding: "24px 16px",
          position: "sticky",
          top: 0,
          overflowY: "hidden",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ padding: "0 12px 32px" }}>
          <span style={{ fontSize: "26px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>Freya</span>
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
        </nav>
      </div>

      {/* MOBILE BOTTOM NAV — ✅ NO inline display, Tailwind controls visibility */}
      <nav
        className="md:hidden flex items-center justify-around"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "64px",
          backgroundColor: "#13131F",
          borderTop: "1px solid #1F1F2A",
          zIndex: 50,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <Link href="/dashboard" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: pathname === "/dashboard" ? "#8B5CF6" : "#6B6B8A", textDecoration: "none" }}>
          <Home size={22} strokeWidth={pathname === "/dashboard" ? 2.2 : 1.8} />
          <span style={{ fontSize: "10px" }}>Home</span>
        </Link>

        <Link href="/explore" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: pathname === "/explore" ? "#8B5CF6" : "#6B6B8A", textDecoration: "none" }}>
          <Search size={22} strokeWidth={pathname === "/explore" ? 2.2 : 1.8} />
          <span style={{ fontSize: "10px" }}>Explore</span>
        </Link>

        <Link href="/new-post" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#8B5CF6", textDecoration: "none" }}>
          <Plus size={22} color="#fff" />
        </Link>

        <Link href="/notifications" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: pathname === "/notifications" ? "#8B5CF6" : "#6B6B8A", textDecoration: "none" }}>
          <Bell size={22} strokeWidth={pathname === "/notifications" ? 2.2 : 1.8} />
          <span style={{ fontSize: "10px" }}>Alerts</span>
        </Link>

        {username ? (
          <Link href={`/${username}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", color: pathname === `/${username}` ? "#8B5CF6" : "#6B6B8A", textDecoration: "none" }}>
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