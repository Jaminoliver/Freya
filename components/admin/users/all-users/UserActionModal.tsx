"use client";

import { useEffect } from "react";
import { X, ShieldOff, Ban, ArrowLeftRight, ShieldCheck } from "lucide-react";
import type { AdminUser } from "./UsersTable";

type ActionType = "ban" | "suspend" | "unban" | "make_creator" | "make_fan";

interface Props {
  action:    ActionType;
  user:      AdminUser;
  onConfirm: () => void;
  onCancel:  () => void;
}

const CONFIG: Record<ActionType, {
  icon:    React.ReactNode;
  title:   string;
  message: (name: string) => string;
  confirm: string;
  style:   "danger" | "warning" | "safe" | "neutral";
}> = {
  ban: {
    icon:    <Ban size={20} />,
    title:   "Ban Account",
    message: (n) => `${n} will be permanently banned and lose all access. This is reversible from the banned users list.`,
    confirm: "Ban Account",
    style:   "danger",
  },
  suspend: {
    icon:    <ShieldOff size={20} />,
    title:   "Suspend Account",
    message: (n) => `${n}'s account will be temporarily suspended. They won't be able to log in until the suspension is lifted.`,
    confirm: "Suspend",
    style:   "warning",
  },
  unban: {
    icon:    <ShieldCheck size={20} />,
    title:   "Lift Penalty",
    message: (n) => `This will restore full access to ${n}'s account. Their status will be set back to active.`,
    confirm: "Lift Penalty",
    style:   "safe",
  },
  make_creator: {
    icon:    <ArrowLeftRight size={20} />,
    title:   "Switch to Creator",
    message: (n) => `${n} will be upgraded to a creator account and gain access to all creator features.`,
    confirm: "Switch Role",
    style:   "neutral",
  },
  make_fan: {
    icon:    <ArrowLeftRight size={20} />,
    title:   "Switch to Fan",
    message: (n) => `${n} will be downgraded to a fan account. Their creator content and earnings will be preserved.`,
    confirm: "Switch Role",
    style:   "neutral",
  },
};

const STYLE_MAP = {
  danger:  { icon: "#fff1f2", iconColor: "#e11d48", btn: "#e11d48", btnHover: "#be123c" },
  warning: { icon: "#fffbeb", iconColor: "#d97706", btn: "#d97706", btnHover: "#b45309" },
  safe:    { icon: "#f0fdf4", iconColor: "#16a34a", btn: "#16a34a", btnHover: "#15803d" },
  neutral: { icon: "#faf5ff", iconColor: "#7c3aed", btn: "#7c3aed", btnHover: "#6d28d9" },
};

export default function UserActionModal({ action, user, onConfirm, onCancel }: Props) {
  const cfg   = CONFIG[action];
  const style = STYLE_MAP[cfg.style];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter")  onConfirm();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel, onConfirm]);

  return (
    <>
      <div className="backdrop" onClick={onCancel} />

      <div className="modal" role="dialog" aria-modal="true">
        {/* Close */}
        <button className="close-btn" onClick={onCancel}>
          <X size={15} />
        </button>

        {/* Icon */}
        <div className="icon-wrap" style={{ background: style.icon, color: style.iconColor }}>
          {cfg.icon}
        </div>

        {/* Text */}
        <div className="modal-title">{cfg.title}</div>
        <p className="modal-message">{cfg.message(user.name)}</p>

        {/* User pill */}
        <div className="user-pill">
          <div className="pill-avatar" style={{ background: user.color + "22", color: user.color }}>
            {user.initials}
          </div>
          <div>
            <div className="pill-name">{user.name}</div>
            <div className="pill-email">{user.email}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button
            className="btn-confirm"
            style={{ background: style.btn }}
            onMouseEnter={(e) => (e.currentTarget.style.background = style.btnHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = style.btn)}
            onClick={onConfirm}
          >
            {cfg.confirm}
          </button>
        </div>
      </div>

      <style jsx>{`
        .backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 14, 26, 0.45);
          z-index: 300;
          animation: fadeIn 0.2s ease;
        }
        .modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 301;
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 16px;
          padding: 28px 24px 24px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          animation: popIn 0.2s cubic-bezier(0.4,0,0.2,1);
        }
        .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid #e4e2f2;
          background: #fff;
          color: #9b9aaa;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .close-btn:hover { background: #f5f4f9; color: #0f0e1a; }
        .icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .modal-title {
          font-size: 17px;
          font-weight: 700;
          color: #0f0e1a;
          margin-bottom: 8px;
          letter-spacing: -0.3px;
        }
        .modal-message {
          font-size: 13.5px;
          color: #6b6a80;
          line-height: 1.55;
          margin-bottom: 18px;
        }
        .user-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: #faf9fe;
          border: 1px solid #eeecf8;
          border-radius: 10px;
          margin-bottom: 20px;
        }
        .pill-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .pill-name {
          font-size: 13px;
          font-weight: 600;
          color: #0f0e1a;
        }
        .pill-email {
          font-size: 12px;
          color: #9b9aaa;
          margin-top: 1px;
        }
        .modal-actions {
          display: flex;
          gap: 10px;
        }
        .btn-cancel {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #e4e2f2;
          background: #fff;
          color: #3d3b52;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .btn-cancel:hover { background: #f5f4f9; }
        .btn-confirm {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: none;
          color: #fff;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          font-family: inherit;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1);    }
        }
      `}</style>
    </>
  );
}