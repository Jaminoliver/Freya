"use client";

import { usePathname } from "next/navigation";
import { Home, MessageCircle, CreditCard, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { MoreDrawer } from "@/components/layout/MoreDrawer";
import { useNav } from "@/lib/hooks/useNav";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { navigate } = useNav();
  const [moreOpen, setMoreOpen] = useState(false);

  const inChat = pathname.startsWith("/messages/");
  if (inChat) return null;

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
      `}</style>

      <nav
        className="mobile-bottom-nav"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          backgroundColor: "#13131F", borderTop: "1px solid #1F1F2A",
          zIndex: 200, fontFamily: "'Inter', sans-serif",
          alignItems: "center", justifyContent: "space-evenly",
          boxSizing: "border-box",
        }}
      >
        <button onClick={() => navigate("/dashboard")}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px", height: "64px", minWidth: "48px", color: pathname === "/dashboard" ? "#8B5CF6" : "#6B6B8A", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", padding: 0 }}
        >
          <Home size={22} strokeWidth={pathname === "/dashboard" ? 2.2 : 1.8} />
          <span style={{ fontSize: "10px", lineHeight: 1 }}>Home</span>
        </button>

        <button onClick={() => navigate("/messages")}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px", height: "64px", minWidth: "48px", color: pathname === "/messages" ? "#8B5CF6" : "#6B6B8A", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", padding: 0 }}
        >
          <MessageCircle size={22} strokeWidth={pathname === "/messages" ? 2.2 : 1.8} />
          <span style={{ fontSize: "10px", lineHeight: 1 }}>Messages</span>
        </button>

        <button onClick={() => navigate("/create")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#8B5CF6", border: "none", cursor: "pointer", flexShrink: 0 }}
        >
          <Plus size={22} color="#fff" />
        </button>

        <button onClick={() => navigate("/subscriptions")}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px", height: "64px", minWidth: "48px", color: pathname.startsWith("/subscriptions") ? "#8B5CF6" : "#6B6B8A", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", padding: 0 }}
        >
          <CreditCard size={22} strokeWidth={pathname.startsWith("/subscriptions") ? 2.2 : 1.8} />
          <span style={{ fontSize: "10px", lineHeight: 1 }}>Subs</span>
        </button>

        <button onClick={() => setMoreOpen(true)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px", height: "64px", minWidth: "48px", color: moreOpen ? "#8B5CF6" : "#6B6B8A", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", padding: 0 }}
        >
          <MoreHorizontal size={22} strokeWidth={1.8} />
          <span style={{ fontSize: "10px", lineHeight: 1 }}>More</span>
        </button>
      </nav>

      <MoreDrawer isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}