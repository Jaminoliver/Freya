"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightPanel } from "@/components/layout/RightPanel";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSettings = pathname.startsWith("/settings");

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      backgroundColor: "#0A0A0F",
      overflow: "hidden",
      width: "100%",
    }}>
      <Sidebar />

      <main
        className="main-scroll md:pb-0"
        style={{
          flex: 1,
          minWidth: 0,
          height: "100vh",
          borderRight: isSettings ? "none" : "1px solid #1F1F2A",
          overflowY: "auto",
          overflowX: "hidden",
          paddingBottom: "72px",
          paddingTop: "56px", // mobile top bar height
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        } as React.CSSProperties}
      >
        {/* Remove top padding on desktop */}
        <style>{`
          @media (min-width: 768px) {
            .main-scroll { padding-top: 0 !important; }
          }
        `}</style>
        {children}
      </main>

      {!isSettings && (
        <div
          className="hidden lg:block"
          style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}
        >
          <RightPanel />
        </div>
      )}
    </div>
  );
}