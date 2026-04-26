"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useRef, useState, useEffect, Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { RightPanel } from "@/components/layout/RightPanel";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PostUploadProvider } from "@/lib/context/PostUploadContext";
import { StoryUploadProvider } from "@/lib/context/StoryUploadContext";
import UploadProgressBar from "@/components/layout/UploadProgressBar";
import { AppStoreProvider } from "@/lib/providers/AppStoreProvider";
import PageLoader from "@/components/ui/PageLoader";
import SplashScreen from "@/components/ui/SplashScreen";
import { useVisibilitySplash } from "@/lib/hooks/useVisibilitySplash";
import { useAppStore } from "@/lib/store/appStore";

function NavigationWatcher() {
  const pathname      = usePathname();
  const searchParams  = useSearchParams();
  const setNavigating = useAppStore((s) => s.setNavigating);

  useEffect(() => {
    setNavigating(false);
  }, [pathname, searchParams, setNavigating]);

  return null;
}

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isSettings      = pathname.startsWith("/settings");
  const isSubscriptions = pathname.startsWith("/subscriptions");
  const isMessages      = pathname.startsWith("/messages");
  const isNotifications = pathname.startsWith("/notifications");
  const isDashboard     = pathname === "/dashboard";
  const isExplore       = pathname === "/explore";
  const isPostPage      = pathname.startsWith("/posts/");

  const isWindowScrollPage =
    pathname === "/dashboard" ||
    (pathname.split("/").length === 2 &&
     pathname !== "/" &&
     !["/messages", "/settings", "/wallet", "/create", "/posts"].some(p => pathname.startsWith(p)));

  const showRightPanel = !isSettings && !isMessages;
  const noTopbar = (!isDashboard && !isExplore) || isPostPage || isNotifications;

  const [headerVisible, setHeaderVisible] = useState(true);
  const [initialSplash, setInitialSplash] = useState(true);
  const lastScrollY = useRef(0);
  const ticking     = useRef(false);
  const mainRef     = useRef<HTMLElement>(null);

  const { showSplash: showVisibilitySplash, dismissVisibilitySplash } = useVisibilitySplash();

  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      fetch("/api/log-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:  e.message,
          filename: e.filename,
          lineno:   e.lineno,
          colno:    e.colno,
          stack:    e.error?.stack,
        }),
      }).catch(() => {});
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  const showAnySplash = initialSplash || showVisibilitySplash;

  useEffect(() => {
    const el = isWindowScrollPage ? window : mainRef.current;
    if (!el) return;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const current = isWindowScrollPage ? window.scrollY : (mainRef.current?.scrollTop ?? 0);
        const diff    = current - lastScrollY.current;
        if (current === 0) {
          setHeaderVisible(true);
        } else if (diff > 4) {
          setHeaderVisible(false);
        } else if (diff < -4) {
          setHeaderVisible(true);
        }
        lastScrollY.current = current;
        ticking.current     = false;
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isWindowScrollPage]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0A0A0F", overflow: isWindowScrollPage ? "visible" : "hidden", width: "100%" }}>

      {/* Initial load splash */}
      {initialSplash && (
        <SplashScreen onDone={() => setInitialSplash(false)} />
      )}

      {/* 5-min away return splash */}
      {!initialSplash && showVisibilitySplash && (
        <SplashScreen onDone={dismissVisibilitySplash} />
      )}

      <PageLoader />
      <Suspense fallback={null}>
        <NavigationWatcher />
      </Suspense>
      <Sidebar />
      <MobileHeader headerVisible={headerVisible} />

      <main
        ref={mainRef}
        className={`main-scroll md:pb-0${noTopbar ? " no-topbar" : ""}${isMessages ? " messages" : ""}`}
        style={{
          flex:       1,
          minWidth:   0,
          maxWidth:   isSettings || isMessages || isNotifications ? "100%" : "720px",
          height:     isMessages ? "100dvh" : isWindowScrollPage ? "auto" : "100vh",
          boxSizing:  "border-box",
          borderRight: showRightPanel ? "1px solid #1F1F2A" : "none",
          overflowY:   isMessages ? "hidden" : isWindowScrollPage ? "visible" : "auto",
          overflowX:   "hidden",
          paddingBottom: isMessages || isNotifications ? "0" : "72px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        } as React.CSSProperties}
      >
        <style>{`
          main::-webkit-scrollbar { display: none; }
          @media (min-width: 768px) { .main-scroll { padding-top: 0 !important; } }
          @media (max-width: 767px) {
            .main-scroll { padding-top: 56px; }
            .main-scroll.no-topbar { padding-top: 0 !important; }
            .main-scroll.messages  { padding-top: env(safe-area-inset-top, 0px) !important; }
          }
        `}</style>
        {children}
      </main>

      {showRightPanel && (
        <div className="hidden lg:block" style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", width: "380px", flexShrink: 0 }}>
          <RightPanel />
        </div>
      )}

      <MobileBottomNav />
      <UploadProgressBar />
      
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <PostUploadProvider>
      <StoryUploadProvider>
        <AppStoreProvider>
          <MainLayoutInner>{children}</MainLayoutInner>
        </AppStoreProvider>
      </StoryUploadProvider>
    </PostUploadProvider>
  );
}