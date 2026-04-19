"use client";

import { usePathname } from "next/navigation";
import { House, Mail, Compass, BadgeDollarSign, AlignJustify } from "lucide-react";
import { useState } from "react";
import { MoreDrawer } from "@/components/layout/MoreDrawer";
import { useNav } from "@/lib/hooks/useNav";
import { useUnreadConversationCount } from "@/app/(main)/messages/page";

export function MobileBottomNav() {
  const pathname     = usePathname();
  const { navigate } = useNav();
  const [moreOpen, setMoreOpen] = useState(false);
  const unreadCount = useUnreadConversationCount();

  const inChat = pathname.startsWith("/messages/");
  if (inChat) return null;

  const activeColor   = "#A78BFA";
  const inactiveColor = "#c9c9df";

  const btn = (active: boolean): React.CSSProperties => ({
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: "4px", height: "64px", minWidth: "52px",
    color: active ? activeColor : inactiveColor,
    background: "none", border: "none", cursor: "pointer",
    fontFamily: "'Inter', sans-serif", padding: 0,
    transition: "color 0.15s",
  });

  return (
    <>
      <style>{`
        .mobile-bottom-nav { display: flex !important; }
        @media (min-width: 768px) { .mobile-bottom-nav { display: none !important; } }
        body.story-modal-open .mobile-bottom-nav { display: none !important; }
        .mobile-bottom-nav {
          height: calc(64px + env(safe-area-inset-bottom));
          padding-bottom: env(safe-area-inset-bottom);
        }
        .mobile-bottom-nav a,
        .mobile-bottom-nav button {
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
        }
        .mobile-bottom-nav button:active {
          transform: scale(0.92);
          transition: transform 0.1s;
        }
      `}</style>

      <nav
        className="mobile-bottom-nav"
        style={{
          position: "fixed", bottom: "12px", left: "12px", right: "12px",
          backgroundColor: "#16162A",
          border: "1px solid #2A2A3D",
          borderRadius: "20px",
          zIndex: 200,
          fontFamily: "'Inter', sans-serif",
          alignItems: "center",
          justifyContent: "space-evenly",
          boxSizing: "border-box",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}
      >
        <button onClick={() => navigate("/dashboard")} style={btn(pathname === "/dashboard")}>
          <House size={22} strokeWidth={pathname === "/dashboard" ? 2.2 : 1.8} />
          <span style={{ fontSize: "10px", lineHeight: 1, fontWeight: pathname === "/dashboard" ? 700 : 400 }}>Home</span>
        </button>

        <button onClick={() => navigate("/messages")} style={{ ...btn(pathname === "/messages"), position: "relative" }}>
          <div style={{ position: "relative", display: "inline-flex" }}>
            <Mail size={22} strokeWidth={pathname === "/messages" ? 2.2 : 1.8} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: "-6px", right: "-10px",
                minWidth: "18px", height: "18px", borderRadius: "9px",
                backgroundColor: "#EF4444", color: "#FFFFFF",
                fontSize: "11px", fontWeight: 700, lineHeight: 1,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                padding: "0 4px", border: "2px solid #16162A",
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <span style={{ fontSize: "10px", lineHeight: 1, fontWeight: pathname === "/messages" ? 700 : 400 }}>Messages</span>
        </button>

        <button onClick={() => navigate("/explore")} style={btn(pathname === "/explore")}>
          <Compass size={22} strokeWidth={pathname === "/explore" ? 2.2 : 1.8} />
          <span style={{ fontSize: "10px", lineHeight: 1, fontWeight: pathname === "/explore" ? 700 : 400 }}>Explore</span>
        </button>

        <button onClick={() => navigate("/subscriptions")} style={btn(pathname.startsWith("/subscriptions"))}>
          <BadgeDollarSign size={22} strokeWidth={pathname.startsWith("/subscriptions") ? 2.2 : 1.8} />
          <span style={{ fontSize: "10px", lineHeight: 1, fontWeight: pathname.startsWith("/subscriptions") ? 700 : 400 }}>Subs</span>
        </button>

        <button onClick={() => setMoreOpen(true)} style={btn(moreOpen)}>
          <AlignJustify size={22} strokeWidth={1.8} />
          <span style={{ fontSize: "10px", lineHeight: 1, fontWeight: moreOpen ? 700 : 400 }}>More</span>
        </button>
      </nav>

      <MoreDrawer isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}