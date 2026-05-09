"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, GitBranch, CreditCard, CheckCircle } from "lucide-react";
import type { Referrer } from "./ReferralTable";

interface Props {
  referrer: Referrer;
  onAction: (action: string, referrer: Referrer) => void;
}

const ACTIONS = [
  { key: "tree",    label: "View Referral Tree",  icon: GitBranch,   color: "#7c3aed" },
  { key: "payouts", label: "View Payouts",         icon: CreditCard,  color: "#0369a1" },
  { key: "markpaid",label: "Mark as Paid",         icon: CheckCircle, color: "#16a34a" },
];

export default function ReferralRowActions({ referrer, onAction }: Props) {
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
    if (a.key === "markpaid" && referrer.pendingPayout === "$0.00") return false;
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
            return (
              <button
                key={a.key}
                className="item"
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => {
                  setOpen(false);
                  onAction(a.key, referrer);
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
          background: #f0fdf4; border-color: #bbf7d0; color: #16a34a;
        }
        .menu {
          position: absolute; right: 0; top: calc(100% + 6px);
          background: #fff; border: 1px solid #eeecf8;
          border-radius: 12px; box-shadow: 0 8px 24px rgba(15,14,26,0.12);
          min-width: 172px; z-index: 100; padding: 6px;
        }
        .item {
          display: flex; align-items: center; gap: 9px;
          width: 100%; padding: 8px 10px; border-radius: 8px;
          border: none; background: transparent; color: #3d3b52;
          font-size: 13px; font-weight: 500; cursor: pointer;
          text-align: left; transition: background 0.15s;
          font-family: inherit; animation: itemIn 0.2s ease both;
        }
        .item:hover { background: #f5f4f9; }
        @keyframes itemIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}