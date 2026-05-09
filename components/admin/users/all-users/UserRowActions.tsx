"use client";

import { useState, useRef, useEffect } from "react";
import {
  MoreHorizontal,
  User,
  ArrowLeftRight,
  LogIn,
  MessageSquare,
  ShieldOff,
  Ban,
  ShieldCheck,
} from "lucide-react";
import type { AdminUser } from "./UsersTable";

interface Props {
  user:     AdminUser;
  onAction: (action: string, user: AdminUser) => void;
}

export default function UserRowActions({ user, onAction }: Props) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isBanned    = user.status === "banned";
  const isSuspended = user.status === "suspended";
  const isCreator   = user.role   === "creator";

  const actions = [
    { key: "view",         label: "View Profile",    icon: User,            danger: false },
    { key: "impersonate",  label: "Impersonate",     icon: LogIn,           danger: false },
    { key: "message",      label: "Send Message",    icon: MessageSquare,   danger: false },
    { key: "divider" },
    isCreator
      ? { key: "make_fan",     label: "Switch to Fan",     icon: ArrowLeftRight, danger: false }
      : { key: "make_creator", label: "Switch to Creator", icon: ArrowLeftRight, danger: false },
    { key: "divider2" },
    isBanned || isSuspended
      ? { key: "unban",    label: "Lift Penalty",    icon: ShieldCheck,     danger: false }
      : { key: "suspend",  label: "Suspend",         icon: ShieldOff,       danger: true  },
    ...(!isBanned ? [{ key: "ban", label: "Ban Account", icon: Ban, danger: true }] : []),
  ];

  return (
    <div className="wrap" ref={ref}>
      <button
        className={`trigger ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="dropdown">
          {actions.map((a, i) => {
            if (a.key === "divider" || a.key === "divider2") {
              return <div key={i} className="divider" />;
            }
            const Icon = a.icon!;
            return (
              <button
                key={a.key}
                className={`action-item ${a.danger ? "danger" : ""}`}
                onClick={() => { onAction(a.key!, user); setOpen(false); }}
              >
                <Icon size={14} />
                {a.label}
              </button>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .wrap {
          position: relative;
          display: flex;
          justify-content: flex-end;
        }
        .trigger {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          border: 1px solid transparent;
          background: transparent;
          color: #9b9aaa;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .trigger:hover, .trigger.open {
          background: #f3f0ff;
          border-color: #e4e2f2;
          color: #7c3aed;
        }
        .dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 6px);
          background: #fff;
          border: 1px solid #e4e2f2;
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.10);
          z-index: 100;
          min-width: 172px;
          padding: 6px;
          animation: dropIn 0.15s ease;
        }
        .action-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: #3d3b52;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
          font-family: inherit;
        }
        .action-item:hover {
          background: #f5f4f9;
        }
        .action-item.danger {
          color: #e11d48;
        }
        .action-item.danger:hover {
          background: #fff1f2;
        }
        .divider {
          height: 1px;
          background: #f3f4f6;
          margin: 4px 0;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}