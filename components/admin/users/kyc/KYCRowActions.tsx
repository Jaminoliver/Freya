"use client";

import { useState, useRef, useEffect } from "react";
import {
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Flag,
} from "lucide-react";
import type { KYCSubmission } from "./KYCTable";

interface Props {
  submission: KYCSubmission;
  onAction:   (action: string, submission: KYCSubmission) => void;
}

const ACTIONS = [
  { key: "view",      label: "Review Panel",      icon: Eye,         color: "#7c3aed" },
  { key: "approve",   label: "Approve",           icon: CheckCircle, color: "#16a34a" },
  { key: "reject",    label: "Reject",            icon: XCircle,     color: "#e11d48" },
  { key: "rerequest", label: "Re-request Docs",   icon: RefreshCw,   color: "#0369a1" },
  { key: "override",  label: "Manual Override",   icon: ShieldCheck, color: "#7c3aed" },
  { key: "flag",      label: "Flag for Review",   icon: Flag,        color: "#db2777" },
];

export default function KYCRowActions({ submission, onAction }: Props) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const visibleActions = ACTIONS.filter((a) => {
    if (submission.status === "approved" && a.key === "approve")  return false;
    if (submission.status === "rejected" && a.key === "reject")   return false;
    if (submission.status === "flagged"  && a.key === "flag")     return false;
    if (submission.overridden            && a.key === "override") return false;
    return true;
  });

  return (
    <div className="wrap" ref={ref}>
      <button
        className={`trigger ${open ? "active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Actions"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="menu">
          {visibleActions.map((a, i) => {
            const Icon      = a.icon;
            const isDanger  = ["reject", "flag"].includes(a.key);
            const isWarning = a.key === "override";
            return (
              <button
                key={a.key}
                className={`item ${isDanger ? "danger" : ""} ${isWarning ? "warning" : ""}`}
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => {
                  setOpen(false);
                  onAction(a.key, submission);
                }}
              >
                <Icon size={13} style={{ color: a.color, flexShrink: 0 }} />
                <span>{a.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .wrap {
          position: relative;
          display: inline-block;
        }
        .trigger {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid #e4e2f2;
          background: #fff;
          color: #6b6a80;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .trigger:hover,
        .trigger.active {
          background: #f3f0ff;
          border-color: #c4b5fd;
          color: #7c3aed;
        }
        .menu {
          position: absolute;
          right: 0;
          top: calc(100% + 6px);
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(15, 14, 26, 0.12);
          min-width: 172px;
          z-index: 100;
          padding: 6px;
          overflow: hidden;
        }
        .item {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #3d3b52;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
          font-family: inherit;
          animation: itemIn 0.2s ease both;
        }
        .item:hover         { background: #f5f4f9; }
        .item.danger:hover  { background: #fff1f2; color: #e11d48; }
        .item.warning:hover { background: #fdf2f8; color: #9d174d; }
        @keyframes itemIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}