"use client";

import { useState, useRef, useEffect } from "react";
import {
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Eye,
  UserCheck,
  PauseCircle,
  Ban,
} from "lucide-react";
import type { Creator } from "./CreatorsTable";

interface Props {
  creator:  Creator;
  onAction: (action: string, creator: Creator) => void;
}

const ACTIONS = [
  { key: "view",        label: "View Panel",   icon: Eye,         color: "#7c3aed" },
  { key: "approve",     label: "Approve",      icon: CheckCircle, color: "#16a34a" },
  { key: "reject",      label: "Reject",       icon: XCircle,     color: "#e11d48" },
  { key: "impersonate", label: "Impersonate",  icon: UserCheck,   color: "#0369a1" },
  { key: "suspend",     label: "Suspend",      icon: PauseCircle, color: "#d97706" },
  { key: "ban",         label: "Ban",          icon: Ban,         color: "#dc2626" },
];

export default function CreatorRowActions({ creator, onAction }: Props) {
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
    if (creator.status === "approved" && (a.key === "approve")) return false;
    if (creator.status === "rejected" && (a.key === "reject"))  return false;
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
            const Icon = a.icon;
            const isDanger = a.key === "ban" || a.key === "suspend" || a.key === "reject";
            return (
              <button
                key={a.key}
                className={`item ${isDanger ? "danger" : ""}`}
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => {
                  setOpen(false);
                  onAction(a.key, creator);
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
          min-width: 160px;
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
        .item:hover {
          background: #f5f4f9;
        }
        .item.danger:hover {
          background: #fff1f2;
          color: #e11d48;
        }
        @keyframes itemIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}