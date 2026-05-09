"use client";

import { useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import BannedRowActions from "./BannedRowActions";
import BannedReviewPanel from "./BannedReviewPanel";

export interface BannedUser {
  id:          string;
  name:        string;
  email:       string;
  username:    string;
  initials:    string;
  color:       string;
  status:      "banned" | "suspended";
  reason:      "tos_violation" | "spam" | "harassment" | "fraud" | "csam" | "other";
  reasonNote:  string;
  actionedBy:  string;
  actionedAt:  string;
  duration:    "permanent" | string;
  expiresAt:   string | null;
  bannedIPs:   string[];
  devices:     string[];
}

const MOCK: BannedUser[] = [
  { id:"1", name:"Sam Torres",   email:"sam@example.com",   username:"samtorres",  initials:"ST", color:"#6366f1", status:"banned",    reason:"fraud",         reasonNote:"Multiple fraudulent payment attempts detected.",        actionedBy:"Admin",       actionedAt:"May 3, 2024",  duration:"permanent",   expiresAt:null,           bannedIPs:["192.168.1.45","10.0.0.22"],            devices:["Chrome/Win11","Safari/iOS17"]       },
  { id:"2", name:"Rex Dark",     email:"rex@example.com",   username:"rexdark",    initials:"RD", color:"#ef4444", status:"banned",    reason:"csam",          reasonNote:"CSAM content uploaded and reported.",                  actionedBy:"Admin",       actionedAt:"Apr 10, 2024", duration:"permanent",   expiresAt:null,           bannedIPs:["203.0.113.12"],                        devices:["Firefox/Win10"]                    },
  { id:"3", name:"Kay Mercer",   email:"kay@example.com",   username:"kaymercer",  initials:"KM", color:"#f97316", status:"suspended", reason:"harassment",    reasonNote:"Repeated harassment of other users via DMs.",          actionedBy:"Moderator A", actionedAt:"Jun 1, 2024",  duration:"7 days",      expiresAt:"Jun 8, 2024",  bannedIPs:["198.51.100.5"],                        devices:["Chrome/Android"]                   },
  { id:"4", name:"Vex Cole",     email:"vex@example.com",   username:"vexcole",    initials:"VC", color:"#8b5cf6", status:"suspended", reason:"spam",          reasonNote:"Mass spam messages sent to followers.",                actionedBy:"Admin",       actionedAt:"Jun 3, 2024",  duration:"3 days",      expiresAt:"Jun 6, 2024",  bannedIPs:[],                                      devices:["Edge/Win11"]                       },
  { id:"5", name:"Nora Bell",    email:"nora@example.com",  username:"norabell",   initials:"NB", color:"#ec4899", status:"banned",    reason:"tos_violation", reasonNote:"Repeated ToS violations after two prior warnings.",    actionedBy:"Admin",       actionedAt:"May 20, 2024", duration:"permanent",   expiresAt:null,           bannedIPs:["192.0.2.78","192.0.2.79"],             devices:["Chrome/Win10","Chrome/Android"]     },
  { id:"6", name:"Theo Park",    email:"theo@example.com",  username:"theopark",   initials:"TP", color:"#14b8a6", status:"suspended", reason:"other",         reasonNote:"Account under investigation — temporary hold applied.", actionedBy:"Moderator B", actionedAt:"Jun 5, 2024",  duration:"14 days",     expiresAt:"Jun 19, 2024", bannedIPs:[],                                      devices:["Safari/macOS"]                     },
  { id:"7", name:"Zara Moon",    email:"zara@example.com",  username:"zaramoon",   initials:"ZM", color:"#a855f7", status:"banned",    reason:"fraud",         reasonNote:"Chargeback fraud on multiple transactions.",           actionedBy:"Admin",       actionedAt:"Apr 28, 2024", duration:"permanent",   expiresAt:null,           bannedIPs:["10.10.10.5"],                          devices:["Chrome/Win11"]                     },
  { id:"8", name:"Finn Cruz",    email:"finn@example.com",  username:"finncruz",   initials:"FC", color:"#10b981", status:"suspended", reason:"harassment",    reasonNote:"Targeted harassment campaign against a creator.",       actionedBy:"Admin",       actionedAt:"Jun 4, 2024",  duration:"30 days",     expiresAt:"Jul 4, 2024",  bannedIPs:["172.16.0.44"],                         devices:["Firefox/Linux"]                    },
];

const REASON_LABELS: Record<string, string> = {
  tos_violation: "ToS Violation",
  spam:          "Spam",
  harassment:    "Harassment",
  fraud:         "Fraud",
  csam:          "CSAM",
  other:         "Other",
};

const REASON_STYLES: Record<string, { bg: string; color: string }> = {
  tos_violation: { bg: "#fff7ed", color: "#c2410c" },
  spam:          { bg: "#f0f9ff", color: "#0369a1" },
  harassment:    { bg: "#fdf2f8", color: "#9d174d" },
  fraud:         { bg: "#fff1f2", color: "#e11d48" },
  csam:          { bg: "#1a0000", color: "#ff4d4d" },
  other:         { bg: "#f5f4f9", color: "#6b6a80" },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  banned:    { bg: "#fff1f2", color: "#e11d48", dot: "#e11d48" },
  suspended: { bg: "#fffbeb", color: "#d97706", dot: "#d97706" },
};

interface Props { search: string; tab: string; reasonFilter: string; }

export default function BannedTable({ search, tab, reasonFilter }: Props) {
  const [users,         setUsers]         = useState<BannedUser[]>(MOCK);
  const [selectedUser,  setSelectedUser]  = useState<BannedUser | null>(null);

  const filtered = users.filter((u) => {
    const q           = search.toLowerCase();
    const matchSearch = !q ||
      u.name.toLowerCase().includes(q)     ||
      u.email.toLowerCase().includes(q)    ||
      u.username.toLowerCase().includes(q);
    const matchTab    = tab === "all"    || u.status === tab;
    const matchReason = reasonFilter === "all" || u.reason === reasonFilter;
    return matchSearch && matchTab && matchReason;
  });

  const handleAction = (action: string, user: BannedUser) => {
    if (action === "view")   return setSelectedUser(user);
    if (action === "lift")   return setUsers((prev) => prev.filter((u) => u.id !== user.id));
    if (action === "extend") return setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, duration: "permanent", expiresAt: null } : u));
    if (action === "reduce") return setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, duration: "1 day", expiresAt: "Tomorrow" } : u));
  };

  const handlePanelSave = (updated: BannedUser) =>
    setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));

  return (
    <>
      <div className="table-wrap">
        <div className="card">
          <div className="result-count">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""} found
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Actioned By</th>
                  <th>Duration</th>
                  <th>Expires</th>
                  <th>IPs</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign:"center", padding:"48px 0", color:"#9b9aaa", fontSize:"14px" }}>
                      No users match your filters
                    </td>
                  </tr>
                )}
                {filtered.map((u, i) => {
                  const ss = STATUS_STYLES[u.status];
                  const rs = REASON_STYLES[u.reason];
                  return (
                    <tr
                      key={u.id}
                      className="user-row"
                      style={{ animationDelay:`${i * 40}ms` }}
                      onClick={() => setSelectedUser(u)}
                    >
                      {/* User */}
                      <td>
                        <div className="user-cell">
                          <div className="avatar" style={{ background: u.color + "22", color: u.color }}>
                            {u.initials}
                          </div>
                          <div>
                            <div className="user-name">{u.name}</div>
                            <div className="user-email">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className="status-badge" style={{ background: ss.bg, color: ss.color }}>
                          <span className="dot" style={{ background: ss.dot }} />
                          {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                        </span>
                      </td>

                      {/* Reason */}
                      <td>
                        <span className="reason-badge" style={{ background: rs.bg, color: rs.color }}>
                          {u.reason === "csam" && <AlertTriangle size={11} style={{ flexShrink: 0 }} />}
                          {REASON_LABELS[u.reason]}
                        </span>
                      </td>

                      {/* Actioned by */}
                      <td><span className="actioned-by">{u.actionedBy}</span></td>

                      {/* Duration */}
                      <td>
                        <span className={`duration ${u.duration === "permanent" ? "permanent" : ""}`}>
                          {u.duration === "permanent" ? "Permanent" : u.duration}
                        </span>
                      </td>

                      {/* Expires */}
                      <td>
                        {u.expiresAt ? (
                          <div className="expires-cell">
                            <Clock size={12} style={{ color: "#d97706", flexShrink: 0 }} />
                            <span className="expires-date">{u.expiresAt}</span>
                          </div>
                        ) : (
                          <span style={{ color: "#b8b6cc" }}>—</span>
                        )}
                      </td>

                      {/* IPs */}
                      <td>
                        <span className="ip-count">
                          {u.bannedIPs.length > 0 ? `${u.bannedIPs.length} IP${u.bannedIPs.length > 1 ? "s" : ""}` : "—"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <BannedRowActions user={u} onAction={handleAction} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedUser && (
        <BannedReviewPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSave={handlePanelSave}
          onAction={handleAction}
        />
      )}

      <style jsx>{`
        .table-wrap { padding: 16px 32px 0; }
        .card {
          background: #fff; border: 1px solid #eeecf8;
          border-radius: 16px; overflow: hidden;
        }
        .result-count {
          padding: 14px 20px; font-size: 12.5px;
          color: #9b9aaa; font-weight: 500; border-bottom: 1px solid #f3f4f6;
        }
        .table-scroll { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        thead th {
          font-size: 11px; font-weight: 600; color: #9b9aaa;
          text-transform: uppercase; letter-spacing: 0.06em;
          padding: 12px 16px; text-align: left;
          background: #faf9fe; border-bottom: 1px solid #f3f4f6;
          white-space: nowrap;
        }
        .user-row {
          animation: rowIn 0.35s ease both;
          cursor: pointer; transition: background 0.15s;
        }
        .user-row:hover td { background: #fdf8f8; }
        td {
          padding: 12px 16px; border-bottom: 1px solid #f3f4f6;
          vertical-align: middle; font-size: 13px;
        }
        .user-row:last-child td { border-bottom: none; }
        .user-cell  { display: flex; align-items: center; gap: 10px; }
        .avatar {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; flex-shrink: 0;
        }
        .user-name  { font-size: 13.5px; font-weight: 600; color: #0f0e1a; }
        .user-email { font-size: 12px; color: #9b9aaa; margin-top: 1px; }
        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px;
          font-size: 12px; font-weight: 600;
        }
        .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .reason-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 9px; border-radius: 6px;
          font-size: 11.5px; font-weight: 600;
        }
        .actioned-by { font-size: 12.5px; color: #6b6a80; }
        .duration {
          font-size: 12.5px; color: #6b6a80; font-weight: 500;
        }
        .duration.permanent {
          color: #e11d48; font-weight: 700;
        }
        .expires-cell { display: flex; align-items: center; gap: 5px; }
        .expires-date { font-size: 12.5px; color: #d97706; font-weight: 500; }
        .ip-count {
          font-size: 12px; color: #6b6a80;
          background: #f5f4f9; padding: 2px 8px; border-radius: 6px;
          font-family: monospace;
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}