"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  FileVideo,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

interface Props {
  collapsed: boolean;
}

const analyticsItems = [
  {
    label: "Main Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Revenue Analytics",
    href: "/admin/dashboard/analytics/revenue",
    icon: TrendingUp,
  },
  {
    label: "User Analytics",
    href: "/admin/dashboard/analytics/users",
    icon: Users,
  },
  {
    label: "Content Analytics",
    href: "/admin/dashboard/analytics/content",
    icon: FileVideo,
  },
];

export default function SidebarAnalyticsDropdown({ collapsed }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const isAnyActive = analyticsItems.some((i) => pathname === i.href);

  if (collapsed) {
    return (
      <div className="collapsed-items">
        {analyticsItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <button
              key={item.href}
              className={`nav-item-collapsed ${active ? "active" : ""}`}
              onClick={() => router.push(item.href)}
              title={item.label}
            >
              <Icon size={18} />
            </button>
          );
        })}
        <style jsx>{`
          .collapsed-items {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            padding: 0 8px;
          }
          .nav-item-collapsed {
            width: 40px;
            height: 36px;
            border-radius: 8px;
            border: none;
            background: transparent;
            color: rgba(255,255,255,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .nav-item-collapsed:hover {
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.85);
          }
          .nav-item-collapsed.active {
            background: rgba(168,85,247,0.18);
            color: #c084fc;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dropdown-wrap">
      <button
        className={`dropdown-trigger ${isAnyActive ? "any-active" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <LayoutDashboard size={16} />
        <span className="trigger-label">Dashboard & Analytics</span>
        <ChevronDown
          size={14}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.25s ease",
            marginLeft: "auto",
            color: "rgba(255,255,255,0.3)",
          }}
        />
      </button>

      <div className={`dropdown-items ${open ? "open" : ""}`}>
        {analyticsItems.map((item, i) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <button
              key={item.href}
              className={`sub-item ${active ? "active" : ""}`}
              onClick={() => router.push(item.href)}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="sub-dot" />
              <Icon size={14} />
              <span className="sub-label">{item.label}</span>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .dropdown-wrap {
          padding: 0 8px;
        }
        .dropdown-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.55);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }
        .dropdown-trigger:hover {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.85);
        }
        .dropdown-trigger.any-active {
          color: rgba(255,255,255,0.85);
        }
        .trigger-label {
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dropdown-items {
          overflow: hidden;
          max-height: 0;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dropdown-items.open {
          max-height: 300px;
        }
        .sub-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px 8px 20px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.4);
          font-size: 12.5px;
          font-weight: 400;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }
        .sub-item:hover {
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.75);
        }
        .sub-item.active {
          background: rgba(168,85,247,0.15);
          color: #c084fc;
          font-weight: 500;
        }
        .sub-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: currentColor;
          flex-shrink: 0;
          opacity: 0.6;
        }
        .sub-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
}