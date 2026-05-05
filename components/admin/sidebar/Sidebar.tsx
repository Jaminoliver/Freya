"use client";

import { useState } from "react";
import SidebarHeader from "./SidebarHeader";
import SidebarProfile from "./SidebarProfile";
import SidebarNav from "./SidebarNav";
import SidebarFooter from "./SidebarFooter";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      style={{ width: collapsed ? "72px" : "280px" }}
      className="sidebar-root"
    >
      <SidebarHeader collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <SidebarProfile collapsed={collapsed} />
      <SidebarNav collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} />

      <style jsx>{`
        .sidebar-root {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          background: #0e0c1a;
          display: flex;
          flex-direction: column;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          z-index: 50;
          border-right: 1px solid rgba(255, 255, 255, 0.06);
        }
      `}</style>
    </aside>
  );
}