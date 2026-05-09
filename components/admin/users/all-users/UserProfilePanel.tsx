"use client";

import { useEffect } from "react";
import {
  X,
  Mail,
  Globe,
  Calendar,
  Users,
  FileText,
  DollarSign,
  ShieldOff,
  Ban,
  LogIn,
  MessageSquare,
  ArrowLeftRight,
  ShieldCheck,
} from "lucide-react";
import type { AdminUser } from "./UsersTable";

interface Props {
  user:     AdminUser;
  onClose:  () => void;
  onAction: (action: string, user: AdminUser) => void;
}

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  fan:     { bg: "#eff6ff", color: "#2563eb" },
  creator: { bg: "#faf5ff", color: "#7c3aed" },
  admin:   { bg: "#fff7ed", color: "#c2410c" },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  active:    { bg: "#f0fdf4", color: "#16a34a", dot: "#16a34a" },
  suspended: { bg: "#fffbeb", color: "#d97706", dot: "#d97706" },
  banned:    { bg: "#fff1f2", color: "#e11d48", dot: "#e11d48" },
};

export default function UserProfilePanel({ user, onClose, onAction }: Props) {
  const roleStyle   = ROLE_STYLES[user.role];
  const statusStyle = STATUS_STYLES[user.status];
  const isBanned    = user.status === "banned";
  const isSuspended = user.status === "suspended";
  const isCreator   = user.role   === "creator";

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const act = (action: string) => { onAction(action, user); onClose(); };

  return (
    <>
      {/* Backdrop */}
      <div className="backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="panel">
        {/* Close */}
        <button className="close-btn" onClick={onClose}>
          <X size={16} />
        </button>

        {/* Avatar + Identity */}
        <div className="identity">
          <div className="avatar-lg" style={{ background: user.color + "22", color: user.color }}>
            {user.initials}
          </div>
          <div>
            <div className="panel-name">{user.name}</div>
            <div className="panel-username">@{user.username}</div>
            <div className="badges-row">
              <span className="badge" style={{ background: roleStyle.bg, color: roleStyle.color }}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
              <span className="status-badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                <span className="dot" style={{ background: statusStyle.dot }} />
                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="bio">{user.bio}</p>
        )}

        {/* Meta */}
        <div className="meta-list">
          <div className="meta-item"><Mail size={13} />{user.email}</div>
          <div className="meta-item"><Globe size={13} />{user.country}</div>
          <div className="meta-item"><Calendar size={13} />Joined {user.joined}</div>
        </div>

        <div className="divider" />

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-box">
            <Users size={14} className="stat-icon" />
            <div className="stat-val">{user.subs.toLocaleString()}</div>
            <div className="stat-lbl">Subscribers</div>
          </div>
          <div className="stat-box">
            <FileText size={14} className="stat-icon" />
            <div className="stat-val">{user.posts}</div>
            <div className="stat-lbl">Posts</div>
          </div>
          <div className="stat-box">
            <DollarSign size={14} className="stat-icon" />
            <div className="stat-val">{isCreator ? user.earned : user.spent}</div>
            <div className="stat-lbl">{isCreator ? "Earned" : "Spent"}</div>
          </div>
        </div>

        <div className="divider" />

        {/* Quick Actions */}
        <div className="actions-section">
          <div className="actions-label">Quick Actions</div>

          <div className="action-buttons">
            <button className="action-btn" onClick={() => act("impersonate")}>
              <LogIn size={14} /> Impersonate
            </button>
            <button className="action-btn" onClick={() => act("message")}>
              <MessageSquare size={14} /> Send Message
            </button>
            <button className="action-btn" onClick={() => act(isCreator ? "make_fan" : "make_creator")}>
              <ArrowLeftRight size={14} />
              {isCreator ? "Switch to Fan" : "Switch to Creator"}
            </button>
          </div>

          <div className="danger-buttons">
            {(isBanned || isSuspended) ? (
              <button className="danger-btn lift" onClick={() => act("unban")}>
                <ShieldCheck size={14} /> Lift Penalty
              </button>
            ) : (
              <button className="danger-btn suspend" onClick={() => act("suspend")}>
                <ShieldOff size={14} /> Suspend Account
              </button>
            )}
            {!isBanned && (
              <button className="danger-btn ban" onClick={() => act("ban")}>
                <Ban size={14} /> Ban Account
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 14, 26, 0.35);
          z-index: 200;
          animation: fadeIn 0.2s ease;
        }
        .panel {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: 360px;
          background: #fff;
          border-left: 1px solid #eeecf8;
          z-index: 201;
          overflow-y: auto;
          padding: 28px 24px;
          box-shadow: -8px 0 32px rgba(0,0,0,0.08);
          animation: slideIn 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        .close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 30px;
          height: 30px;
          border-radius: 6px;
          border: 1px solid #e4e2f2;
          background: #fff;
          color: #9b9aaa;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .close-btn:hover { background: #f5f4f9; color: #0f0e1a; }
        .identity {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 16px;
        }
        .avatar-lg {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .panel-name {
          font-size: 17px;
          font-weight: 700;
          color: #0f0e1a;
          letter-spacing: -0.3px;
        }
        .panel-username {
          font-size: 13px;
          color: #9b9aaa;
          margin-top: 2px;
        }
        .badges-row {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11.5px;
          font-weight: 600;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11.5px;
          font-weight: 600;
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .bio {
          font-size: 13.5px;
          color: #3d3b52;
          line-height: 1.55;
          margin-bottom: 16px;
        }
        .meta-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #6b6a80;
        }
        .divider {
          height: 1px;
          background: #f3f4f6;
          margin: 20px 0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .stat-box {
          background: #faf9fe;
          border: 1px solid #eeecf8;
          border-radius: 10px;
          padding: 12px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .stat-icon { color: #9b9aaa; }
        .stat-val {
          font-size: 15px;
          font-weight: 700;
          color: #0f0e1a;
        }
        .stat-lbl {
          font-size: 11px;
          color: #9b9aaa;
          font-weight: 500;
        }
        .actions-section { display: flex; flex-direction: column; gap: 10px; }
        .actions-label {
          font-size: 11px;
          font-weight: 600;
          color: #9b9aaa;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }
        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 8px;
          border: 1px solid #e4e2f2;
          background: #fff;
          color: #3d3b52;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          text-align: left;
        }
        .action-btn:hover { background: #f5f4f9; border-color: #cbc8e8; }
        .danger-buttons {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 4px;
        }
        .danger-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 8px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .danger-btn.suspend { background: #fffbeb; color: #d97706; }
        .danger-btn.suspend:hover { background: #fef3c7; }
        .danger-btn.ban     { background: #fff1f2; color: #e11d48; }
        .danger-btn.ban:hover { background: #ffe4e6; }
        .danger-btn.lift    { background: #f0fdf4; color: #16a34a; }
        .danger-btn.lift:hover { background: #dcfce7; }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}