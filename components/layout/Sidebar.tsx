"use client";

import { usePathname } from "next/navigation";
import {
  Home, MessageCircle, Bell, Wallet,
  User, Plus, BadgeCheck, CreditCard, MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { MoreDrawer } from "@/components/layout/MoreDrawer";
import { useAppStore } from "@/lib/store/appStore";
import { useNav } from "@/lib/hooks/useNav";
import { useUnreadConversationCount } from "@/app/(main)/messages/page";
import { useUnreadNotificationCount } from "@/lib/notifications/store";

const navItems = [
  { label: "Home",          href: "/dashboard",     icon: Home          },
  { label: "Subscriptions", href: "/subscriptions", icon: CreditCard    },
  { label: "Messages",      href: "/messages",      icon: MessageCircle },
  { label: "Notifications", href: "/notifications", icon: Bell          },
  { label: "Wallet",        href: "/wallet",        icon: Wallet        },
];

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span style={{
      minWidth: "18px", height: "18px", borderRadius: "9px",
      backgroundColor: "#EF4444", color: "#FFFFFF",
      fontSize: "11px", fontWeight: 700, lineHeight: 1,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      padding: "0 5px", marginLeft: "auto", flexShrink: 0,
    }}>
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { navigate } = useNav();

  const viewer   = useAppStore((s) => s.viewer);
  const username = viewer?.username ?? null;

  const unreadMessageCount      = useUnreadConversationCount();
  const unreadNotificationCount = useUnreadNotificationCount();

  const isActive = (href: string) =>
    pathname === href || (href === "/subscriptions" && pathname.startsWith("/subscriptions"));

  const [moreOpen, setMoreOpen] = useState(false);

  const handleNav = (href: string) => navigate(href);

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* DESKTOP SIDEBAR */}
      <div className="hidden md:flex" style={{ width: "280px", flexShrink: 0, height: "100vh", backgroundColor: "#13131F", borderRight: "1px solid #1F1F2A", flexDirection: "column", padding: "24px 16px", position: "sticky", top: 0, overflowY: "hidden", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ padding: "0 12px 0", marginBottom: "-16px" }}>
  <img src="/freya_logo.png" alt="Fréya" style={{ height: "110px", width: "auto", display: "block", marginTop: "-44px", marginLeft: "-35px" }} />
</div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {navItems.map(({ label, href, icon: Icon }) => {
            const active  = isActive(href);
            const isMsg   = href === "/messages";
            const isNotif = href === "/notifications";
            const badge   = isMsg ? unreadMessageCount : isNotif ? unreadNotificationCount : 0;
            return (
              <button key={href} onClick={() => handleNav(href)}
                style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", borderRadius: "12px", background: active ? "#1E1E2E" : "none", border: "none", cursor: "pointer", color: active ? "#8B5CF6" : "#A3A3C2", fontSize: "16px", fontWeight: active ? 600 : 400, transition: "all 0.15s ease", width: "100%", textAlign: "left", fontFamily: "'Inter', sans-serif" }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.backgroundColor = "#1A1A2E"; e.currentTarget.style.color = "#F1F5F9"; }}}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#A3A3C2"; }}}
              >
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                {label}
                <UnreadBadge count={badge} />
              </button>
            );
          })}

          {username === null ? (
            <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", borderRadius: "12px" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", backgroundColor: "#2A2A3D", animation: "pulse 1.5s ease-in-out infinite", flexShrink: 0 }} />
              <div style={{ width: "80px", height: "14px", borderRadius: "6px", backgroundColor: "#2A2A3D", animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
          ) : (() => {
            const href   = `/${username}`;
            const active = isActive(href);
            return (
              <button onClick={() => handleNav(href)}
                style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", borderRadius: "12px", background: active ? "#1E1E2E" : "none", border: "none", cursor: "pointer", color: active ? "#8B5CF6" : "#A3A3C2", fontSize: "16px", fontWeight: active ? 600 : 400, transition: "all 0.15s ease", width: "100%", textAlign: "left", fontFamily: "'Inter', sans-serif" }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.backgroundColor = "#1A1A2E"; e.currentTarget.style.color = "#F1F5F9"; }}}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#A3A3C2"; }}}
              >
                <User size={22} strokeWidth={active ? 2.2 : 1.8} />
                My Profile
              </button>
            );
          })()}

          <button onClick={() => setMoreOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", borderRadius: "12px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", color: "#A3A3C2", fontSize: "16px", fontWeight: 400, transition: "all 0.15s ease", width: "100%", textAlign: "left" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1A1A2E"; e.currentTarget.style.color = "#F1F5F9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#A3A3C2"; }}
          >
            <MoreHorizontal size={22} strokeWidth={1.8} />
            More
          </button>

          {viewer?.role === "creator" && <button onClick={() => handleNav("/create")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "13px 16px", borderRadius: "30px", border: "none", cursor: "pointer", background: "linear-gradient(to right, #8B5CF6, #EC4899)", color: "#fff", fontSize: "15px", fontWeight: 700, marginTop: "16px", transition: "opacity 0.15s ease", fontFamily: "'Inter', sans-serif" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Plus size={20} strokeWidth={2.5} />
            New Post
          </button>}
        </nav>
      </div>

      <MoreDrawer isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}