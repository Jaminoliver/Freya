"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Eye, ShieldOff, Clock, Ban, FileText } from "lucide-react";
import type { BannedUser } from "./BannedTable";

interface Props {
  user:     BannedUser;
  onAction: (action: string, user: BannedUser) => void;
}

const ACTIONS = [
  { key: "view",    label: "View Details",    icon: Eye,      color: "#7c3aed" },
  { key: "lift",    label: "Lift Ban",        icon: ShieldOff, color: "#16a34a" },
  { key: "reduce",  label: "Reduce Penalty",  icon: Clock,    color: "#0369a1" },
  { key: "extend",  label: "Extend Ban",      icon: Ban,      color: "#d97706" },
  { key: "audit",   label: "View Audit Log",  icon: FileText, color: "#6b6a80" },
];

export default function BannedRowActions({ user, onAction }: Props) {
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
    if (user.status === "banned" && a.key === "reduce") return false;
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
            const Icon     = a.icon;
            const isDanger = a.key === "extend";
            return (
              <button
                key={a.key}
                className={`item ${isDanger ? "warning" : ""}`}
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => {
                  setOpen(false);
                  onAction(a.key, user);
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
        .wrap { position: relative; display: inline-block; }
        .trigger {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 8px;
          border: 1px solid #e4e2f2; background: #fff; color: #6b6a80;
          cursor: pointer; transition: all 0.15s; font-family: inherit;
        }
        .trigger:hover, .trigger.active {
          background: #fff1f2; border-color: #fecdd3; color: #e11d48;
        }
        .menu {
          position: absolute; right: 0; top: calc(100% + 6px);
          background: #fff; border: 1px solid #eeecf8;
          border-radius: 12px; box-shadow: 0 8px 24px rgba(15,14,26,0.12);
          min-width: 172px; z-index: 100; padding: 6px; overflow: hidden;
        }
        .item {
          display: flex; align-items: center; gap: 9px;
          width: 100%; padding: 8px 10px; border-radius: 8px;
          border: none; background: transparent; color: #3d3b52;
          font-size: 13px; font-weight: 500; cursor: pointer;
          text-align: left; transition: background 0.15s;
          font-family: inherit; animation: itemIn 0.2s ease both;
        }
        .item:hover         { background: #f5f4f9; }
        .item.warning:hover { background: #fffbeb; color: #d97706; }
        @keyframes itemIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}