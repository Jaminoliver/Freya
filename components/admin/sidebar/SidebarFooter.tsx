"use client";

import { Bell, HelpCircle } from "lucide-react";

interface Props {
  collapsed: boolean;
}

export default function SidebarFooter({ collapsed }: Props) {
  return (
    <div className={`sidebar-footer ${collapsed ? "collapsed" : ""}`}>
      <div className="status">
        <span className="status-dot" />
        {!collapsed && <span className="status-text">Systems healthy</span>}
      </div>

      {!collapsed && (
        <div className="footer-actions">
          <button className="icon-btn" aria-label="Notifications">
            <Bell size={15} />
          </button>
          <button className="icon-btn" aria-label="Help">
            <HelpCircle size={15} />
          </button>
        </div>
      )}

      {collapsed && (
        <div className="footer-actions-collapsed">
          <button className="icon-btn" aria-label="Notifications">
            <Bell size={15} />
          </button>
          <button className="icon-btn" aria-label="Help">
            <HelpCircle size={15} />
          </button>
        </div>
      )}

      <style jsx>{`
        .sidebar-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          flex-shrink: 0;
          min-height: 52px;
        }
        .sidebar-footer.collapsed {
          flex-direction: column;
          gap: 8px;
          padding: 12px 8px;
          align-items: center;
          justify-content: center;
        }
        .status {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          flex-shrink: 0;
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
          animation: pulse 2.5s ease-in-out infinite;
        }
        .status-text {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          white-space: nowrap;
          animation: fadeIn 0.2s ease;
        }
        .footer-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          animation: fadeIn 0.2s ease;
        }
        .footer-actions-collapsed {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.07);
          color: rgba(255, 255, 255, 0.75);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}