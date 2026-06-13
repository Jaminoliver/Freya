"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { MoreDrawer } from "@/components/layout/MoreDrawer";
import { useNav } from "@/lib/hooks/useNav";
import { useUnreadConversationCount } from "@/app/(main)/messages/page";
import { House, MessagesSquare, Search, Crown, AlignJustify } from "lucide-react";
import { useAppStore } from "@/lib/store/appStore";
import { useGuestGuard } from "@/lib/hooks/useGuestGuard";

export function MobileBottomNav() {
  const pathname     = usePathname();
  const { navigate } = useNav();
  const { viewer } = useAppStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const [tappedHref, setTappedHref] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const guard = useGuestGuard();
  const unreadCount = useUnreadConversationCount();
  const router = useRouter();

  // Prefetch all nav destinations on mount so taps are instant
  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/messages");
    router.prefetch("/explore");
    router.prefetch("/subscriptions");
    router.prefetch("/notifications");
  }, [router]);

  useEffect(() => { setTappedHref(null); }, [pathname]);

  const isActive = (href: string) =>
    tappedHref === href || (!tappedHref && pathname === href);

  const tap = (href: string, fn?: () => void) => {
    setTappedHref(href);
    fn ? fn() : navigate(href);
  };

  const inChat = pathname.startsWith("/messages/");
  if (inChat || pathname === "/create-story") return null;

  const activeColor   = "#A78BFA";
  const inactiveColor = "#A3A3C2";

  const btn = (active: boolean): React.CSSProperties => ({
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: "4px", height: "52px", minWidth: "44px",
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
          height: calc(52px + env(safe-area-inset-bottom));
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
          backgroundColor: "#0A0A0F",
          border: "none",
          borderRadius: "12px 12px 0 0",
          zIndex: 200,
          fontFamily: "'Inter', sans-serif",
          alignItems: "center",
          justifyContent: "space-evenly",
          boxSizing: "border-box",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}
      >
        <button onClick={() => {
          if (pathname === "/dashboard") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            tap("/dashboard");
          }
        }} style={btn(isActive("/dashboard"))}>
          <House size={25} strokeWidth={pathname === "/dashboard" ? 2.2 : 1.8} />
        </button>

        <button onClick={guard(() => tap("/messages"))} style={{ ...btn(isActive("/messages")), position: "relative" }}>
          <div style={{ position: "relative", display: "inline-flex" }}>
            <MessagesSquare size={25} strokeWidth={pathname === "/messages" ? 2.2 : 1.8} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: "-6px", right: "-10px",
                minWidth: "18px", height: "18px", borderRadius: "9px",
                backgroundColor: "#EF4444", color: "#FFFFFF",
                fontSize: "11px", fontWeight: 700, lineHeight: 1,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                padding: "0 4px", border: "2px solid #13131F",
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        </button>

        <button onClick={() => tap("/explore")} style={btn(isActive("/explore"))}>
          <Search size={25} strokeWidth={isActive("/explore") ? 2.2 : 1.8} />
        </button>

        <button onClick={guard(() => tap("/subscriptions"))} style={btn(isActive("/subscriptions"))}>
          <Crown size={25} strokeWidth={isActive("/subscriptions") ? 2.2 : 1.8} />
        </button>

        <button onClick={guard(() => setMoreOpen(true))} style={btn(moreOpen)}>
          {mounted && viewer ? (
            viewer.avatar_url ? (
              <img
                src={viewer.avatar_url}
                alt="profile"
                style={{
                  width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover",
                  border: moreOpen ? "2px solid #A78BFA" : "2px solid #8888AA",
                }}
              />
            ) : (
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                border: moreOpen ? "2px solid #A78BFA" : "2px solid #8888AA",
                background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 700, color: "#fff",
              }}>
                {(viewer.display_name || viewer.username)?.[0]?.toUpperCase()}
              </div>
            )
          ) : (
            <AlignJustify size={25} strokeWidth={1.8} />
          )}
        </button>
      </nav>

      <MoreDrawer isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}