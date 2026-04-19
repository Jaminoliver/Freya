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
    justifyContent: "center", gap: "4px", height: "68px", minWidth: "52px",
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
body.search-open .mobile-bottom-nav { display: none !important; }
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
          position: "fixed", bottom: "0", left: "0", right: "0",
          backgroundColor: "#16162A",
          border: "1px solid #2A2A3D",
          borderRadius: "20px 20px 0 0",
          zIndex: 200,
          fontFamily: "'Inter', sans-serif",
          alignItems: "center",
          justifyContent: "space-evenly",
          boxSizing: "border-box",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}
      >
        <button onClick={() => navigate("/dashboard")} style={btn(pathname === "/dashboard")}>
  <House size={26} strokeWidth={pathname === "/dashboard" ? 2.2 : 1.8} />
</button>

       <button onClick={() => navigate("/messages")} style={{ ...btn(pathname === "/messages"), position: "relative" }}>
  <div style={{ position: "relative", display: "inline-flex" }}>
    <Mail size={26} strokeWidth={pathname === "/messages" ? 2.2 : 1.8} />
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
</button>

<button onClick={() => navigate("/explore")} style={btn(pathname === "/explore")}>
  <Compass size={26} strokeWidth={pathname === "/explore" ? 2.2 : 1.8} />
</button>

<button onClick={() => navigate("/subscriptions")} style={btn(pathname.startsWith("/subscriptions"))}>
  <BadgeDollarSign size={26} strokeWidth={pathname.startsWith("/subscriptions") ? 2.2 : 1.8} />
</button>

<button onClick={() => setMoreOpen(true)} style={btn(moreOpen)}>
  <AlignJustify size={26} strokeWidth={1.8} />
</button>
      </nav>

      <MoreDrawer isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}