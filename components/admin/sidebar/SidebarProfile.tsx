"use client";

import { ChevronDown } from "lucide-react";

interface Props {
  collapsed: boolean;
}

export default function SidebarProfile({ collapsed }: Props) {
  return (
    <div className={`profile-wrap ${collapsed ? "collapsed" : ""}`}>
      <div className="avatar">AC</div>

      {!collapsed && (
        <div className="profile-info">
          <div className="profile-top">
            <span className="profile-name">Alex Carter</span>
            <ChevronDown size={14} className="chevron" />
          </div>
          <span className="profile-badge">Super Admin</span>
        </div>
      )}

      <style jsx>{`
        .profile-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          margin: 0 8px 8px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s ease;
          flex-shrink: 0;
        }
        .profile-wrap:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .profile-wrap.collapsed {
          justify-content: center;
          padding: 12px 8px;
        }
        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          color: white;
          flex-shrink: 0;
          letter-spacing: 0.5px;
        }
        .profile-info {
          flex: 1;
          overflow: hidden;
          animation: fadeIn 0.2s ease;
        }
        .profile-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
        }
        .profile-name {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chevron {
          color: rgba(255, 255, 255, 0.35);
          flex-shrink: 0;
        }
        .profile-badge {
          display: inline-block;
          margin-top: 3px;
          padding: 2px 8px;
          background: rgba(168, 85, 247, 0.2);
          border: 1px solid rgba(168, 85, 247, 0.35);
          border-radius: 20px;
          font-size: 10px;
          font-weight: 500;
          color: #c084fc;
          letter-spacing: 0.02em;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}