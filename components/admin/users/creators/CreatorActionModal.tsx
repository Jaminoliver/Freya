"use client";

import { useEffect } from "react";
import { X, CheckCircle, XCircle, PauseCircle, Ban } from "lucide-react";
import type { Creator } from "./CreatorsTable";

export type ModalAction = "approve" | "reject" | "suspend" | "ban";

interface Props {
  action:    ModalAction;
  creator:   Creator;
  onConfirm: () => void;
  onCancel:  () => void;
}

const CONFIG: Record<ModalAction, {
  icon:    React.ReactNode;
  title:   string;
  message: (name: string) => string;
  confirm: string;
  style:   "safe" | "warning" | "danger";
}> = {
  approve: {
    icon:    <CheckCircle size={20} />,
    title:   "Approve Creator",
    message: (n) => `${n} will be approved and can immediately start publishing content on the platform.`,
    confirm: "Approve",
    style:   "safe",
  },
  reject: {
    icon:    <XCircle size={20} />,
    title:   "Reject Application",
    message: (n) => `${n}'s creator application will be rejected. They will remain as a fan account.`,
    confirm: "Reject",
    style:   "danger",
  },
  suspend: {
    icon:    <PauseCircle size={20} />,
    title:   "Suspend Creator",
    message: (n) => `${n}'s account will be temporarily suspended. Their content will be hidden until the suspension is lifted.`,
    confirm: "Suspend",
    style:   "warning",
  },
  ban: {
    icon:    <Ban size={20} />,
    title:   "Ban Creator",
    message: (n) => `${n} will be permanently banned and lose all access. This is reversible from the banned users list.`,
    confirm: "Ban Account",
    style:   "danger",
  },
};

const STYLE_MAP = {
  safe:    { icon: "#f0fdf4", iconColor: "#16a34a", btn: "#16a34a", btnHover: "#15803d" },
  warning: { icon: "#fffbeb", iconColor: "#d97706", btn: "#d97706", btnHover: "#b45309" },
  danger:  { icon: "#fff1f2", iconColor: "#e11d48", btn: "#e11d48", btnHover: "#be123c" },
};

export default function CreatorActionModal({ action, creator, onConfirm, onCancel }: Props) {
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
        <p className="modal-message">{cfg.message(creator.name)}</p>

        {/* Creator pill */}
        <div className="user-pill">
          <div className="pill-avatar" style={{ background: creator.color + "22", color: creator.color }}>
            {creator.initials}
          </div>
          <div>
            <div className="pill-name">{creator.name}</div>
            <div className="pill-email">{creator.email}</div>
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
          font-family: inherit;
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
        .pill-name  { font-size: 13px; font-weight: 600; color: #0f0e1a; }
        .pill-email { font-size: 12px; color: #9b9aaa; margin-top: 1px; }
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
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}