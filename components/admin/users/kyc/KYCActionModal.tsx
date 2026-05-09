"use client";

import { useEffect } from "react";
import { X, CheckCircle, XCircle, RefreshCw, ShieldCheck, Flag } from "lucide-react";
import type { KYCSubmission } from "./KYCTable";

export type KYCModalAction = "approve" | "reject" | "rerequest" | "override" | "flag";

interface Props {
  action:    KYCModalAction;
  submission: KYCSubmission;
  onConfirm: () => void;
  onCancel:  () => void;
}

const CONFIG: Record<KYCModalAction, {
  icon:    React.ReactNode;
  title:   string;
  message: (name: string) => string;
  confirm: string;
  style:   "safe" | "danger" | "warning" | "info" | "pink";
}> = {
  approve: {
    icon:    <CheckCircle size={20} />,
    title:   "Approve Verification",
    message: (n) => `${n}'s identity has been verified. Their account will be marked as KYC approved.`,
    confirm: "Approve",
    style:   "safe",
  },
  reject: {
    icon:    <XCircle size={20} />,
    title:   "Reject Submission",
    message: (n) => `${n}'s KYC submission will be rejected. They will be notified and can resubmit.`,
    confirm: "Reject",
    style:   "danger",
  },
  rerequest: {
    icon:    <RefreshCw size={20} />,
    title:   "Re-request Documents",
    message: (n) => `${n} will receive a notification to resubmit their identity documents with the selected reason.`,
    confirm: "Send Request",
    style:   "info",
  },
  override: {
    icon:    <ShieldCheck size={20} />,
    title:   "Manual Override",
    message: (n) => `You are manually approving ${n}'s account. This bypasses standard KYC checks and will be logged in the audit trail.`,
    confirm: "Override & Approve",
    style:   "warning",
  },
  flag: {
    icon:    <Flag size={20} />,
    title:   "Flag for Review",
    message: (n) => `${n}'s submission will be flagged and escalated for further review by a senior moderator.`,
    confirm: "Flag Submission",
    style:   "pink",
  },
};

const STYLE_MAP = {
  safe:    { icon: "#f0fdf4", iconColor: "#16a34a", btn: "#16a34a", btnHover: "#15803d" },
  danger:  { icon: "#fff1f2", iconColor: "#e11d48", btn: "#e11d48", btnHover: "#be123c" },
  warning: { icon: "#fffbeb", iconColor: "#d97706", btn: "#d97706", btnHover: "#b45309" },
  info:    { icon: "#eff6ff", iconColor: "#0369a1", btn: "#0369a1", btnHover: "#075985" },
  pink:    { icon: "#fdf2f8", iconColor: "#db2777", btn: "#db2777", btnHover: "#9d174d" },
};

export default function KYCActionModal({ action, submission, onConfirm, onCancel }: Props) {
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
        <button className="close-btn" onClick={onCancel}>
          <X size={15} />
        </button>

        <div className="icon-wrap" style={{ background: style.icon, color: style.iconColor }}>
          {cfg.icon}
        </div>

        <div className="modal-title">{cfg.title}</div>
        <p className="modal-message">{cfg.message(submission.name)}</p>

        <div className="user-pill">
          <div className="pill-avatar" style={{ background: submission.color + "22", color: submission.color }}>
            {submission.initials}
          </div>
          <div>
            <div className="pill-name">{submission.name}</div>
            <div className="pill-meta">{submission.docId} · {submission.email}</div>
          </div>
        </div>

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
          top: 16px; right: 16px;
          width: 28px; height: 28px;
          border-radius: 6px;
          border: 1px solid #e4e2f2;
          background: #fff;
          color: #9b9aaa;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .close-btn:hover { background: #f5f4f9; color: #0f0e1a; }
        .icon-wrap {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
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
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; flex-shrink: 0;
        }
        .pill-name { font-size: 13px; font-weight: 600; color: #0f0e1a; }
        .pill-meta { font-size: 12px; color: #9b9aaa; margin-top: 1px; font-family: monospace; }
        .modal-actions { display: flex; gap: 10px; }
        .btn-cancel {
          flex: 1; padding: 10px;
          border-radius: 8px; border: 1px solid #e4e2f2;
          background: #fff; color: #3d3b52;
          font-size: 13.5px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .btn-cancel:hover { background: #f5f4f9; }
        .btn-confirm {
          flex: 1; padding: 10px;
          border-radius: 8px; border: none;
          color: #fff; font-size: 13.5px; font-weight: 600;
          cursor: pointer; transition: background 0.2s; font-family: inherit;
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}