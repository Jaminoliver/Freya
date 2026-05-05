"use client";

import { ChevronLeft } from "lucide-react";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export default function SidebarHeader({ collapsed, onToggle }: Props) {
  return (
    <div className="sidebar-header">
      <div className="logo-wrap">
        {!collapsed && (
          <div className="logo-text">
            <span className="logo-freya">Fréya</span>
            <span className="logo-admin">Admin</span>
          </div>
        )}
        {collapsed && <div className="logo-icon">F</div>}
      </div>

      <button className="collapse-btn" onClick={onToggle} aria-label="Toggle sidebar">
        <ChevronLeft
          size={16}
          style={{
            transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </button>

      <style jsx>{`
        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 16px 16px;
          min-height: 64px;
          flex-shrink: 0;
        }
        .logo-wrap {
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        .logo-text {
          display: flex;
          align-items: baseline;
          gap: 6px;
          animation: fadeIn 0.2s ease;
        }
        .logo-freya {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.5px;
          font-style: italic;
        }
        .logo-admin {
          font-size: 13px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.45);
          letter-spacing: 0.02em;
        }
        .logo-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 700;
          color: white;
          font-style: italic;
          animation: fadeIn 0.2s ease;
        }
        .collapse-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .collapse-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.2);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}