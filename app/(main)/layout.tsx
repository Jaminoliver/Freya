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
      {/* Sidebar - desktop sidebar & mobile bottom nav handled inside */}
      <Sidebar />

      {/* Main content - ONLY this scrolls, scrollbar hidden */}
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
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        } as React.CSSProperties}
      >
        {children}
      </main>

      {/* Right panel - hidden on settings, hidden on mobile */}
      {!isSettings && (
        <div
          className="hidden lg:block"
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            overflow: "hidden",
          }}
        >
          <RightPanel />
        </div>
      )}
    </div>
  );
}