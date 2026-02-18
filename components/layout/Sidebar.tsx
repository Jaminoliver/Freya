"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageCircle, Bell, Wallet, Bookmark, User } from "lucide-react";

const navItems = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Explore", href: "/explore", icon: Search },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
  { label: "Profile", href: "/profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div style={{
      width: "280px",
      minHeight: "100vh",
      backgroundColor: "#0A0A0F",
      borderRight: "1px solid #1F1F2A",
      display: "flex",
      flexDirection: "column",
      padding: "24px 16px",
      position: "sticky",
      top: 0,
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ padding: "0 12px 32px" }}>
        <span style={{ fontSize: "26px", fontWeight: 800, color: "#8B5CF6", letterSpacing: "-0.5px" }}>Freya</span>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "12px 16px",
              borderRadius: "12px",
              textDecoration: "none",
              backgroundColor: active ? "#141420" : "transparent",
              color: active ? "#8B5CF6" : "#A3A3C2",
              fontSize: "16px",
              fontWeight: active ? 600 : 400,
              transition: "all 0.15s ease",
            }}>
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}