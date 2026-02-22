"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightPanel } from "@/components/layout/RightPanel";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSettings      = pathname.startsWith("/settings");
  const isSubscriptions = pathname.startsWith("/subscriptions");
  const isDashboard     = pathname === "/dashboard";

  const showRightPanel = !isSettings && !isSubscriptions;

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0A0A0F", overflow: "hidden", width: "100%" }}>
      <Sidebar />

      <main
        className={`main-scroll md:pb-0${!isDashboard ? " no-topbar" : ""}`}
        style={{
          flex: 1, minWidth: 0, height: "100vh",
          borderRight: showRightPanel ? "1px solid #1F1F2A" : "none",
          overflowY: "auto", overflowX: "hidden",
          paddingBottom: "72px", paddingTop: "0px",
          scrollbarWidth: "none", msOverflowStyle: "none",
        } as React.CSSProperties}
      >
        <style>{`
          @media (min-width: 768px) { .main-scroll { padding-top: 0 !important; } }
          @media (max-width: 767px) { .main-scroll { padding-top: 56px; } .main-scroll.no-topbar { padding-top: 0 !important; } }
        `}</style>
        {children}
      </main>

      {showRightPanel && (
        <div className="hidden lg:block" style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
          <RightPanel />
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}