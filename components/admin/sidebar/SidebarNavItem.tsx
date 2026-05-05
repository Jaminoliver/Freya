"use client";

import { usePathname, useRouter } from "next/navigation";
import { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  collapsed: boolean;
}

export default function SidebarNavItem({ label, href, icon: Icon, badge, collapsed }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const active = pathname === href;

  return (
    <div className="item-wrap">
      <button
        className={`nav-item ${active ? "active" : ""} ${collapsed ? "collapsed" : ""}`}
        onClick={() => router.push(href)}
        title={collapsed ? label : undefined}
      >
        <span className="icon-wrap">
          <Icon size={17} />
        </span>

        {!collapsed && (
          <span className="nav-label">{label}</span>
        )}

        {!collapsed && badge !== undefined && badge > 0 && (
          <span className="nav-badge">{badge}</span>
        )}

        {collapsed && badge !== undefined && badge > 0 && (
          <span className="badge-dot" />
        )}
      </button>

      <style jsx>{`
        .item-wrap {
          padding: 0 8px;
        }
        .nav-item {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.45);
          font-size: 13px;
          font-weight: 400;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          white-space: nowrap;
        }
        .nav-item.collapsed {
          justify-content: center;
          padding: 9px;
          width: 40px;
          margin: 0 auto;
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.85);
        }
        .nav-item.active {
          background: rgba(168, 85, 247, 0.18);
          color: #e9d5ff;
          font-weight: 500;
        }
        .nav-item.active .icon-wrap {
          color: #c084fc;
        }
        .icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 18px;
        }
        .nav-label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          animation: fadeIn 0.2s ease;
        }
        .nav-badge {
          margin-left: auto;
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 20px;
          min-width: 18px;
          text-align: center;
          animation: fadeIn 0.2s ease;
        }
        .badge-dot {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ef4444;
          border: 1.5px solid #0e0c1a;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}