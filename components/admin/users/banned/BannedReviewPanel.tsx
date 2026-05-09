"use client";

import { useState } from "react";
import {
  X, ShieldOff, Clock, Ban, AlertTriangle,
  ChevronDown, ChevronUp, Wifi, Monitor,
} from "lucide-react";
import type { BannedUser } from "./BannedTable";
import BannedActionModal, { type BannedModalAction } from "./BannedActionModal";

interface Props {
  user:     BannedUser;
  onClose:  () => void;
  onSave:   (updated: BannedUser) => void;
  onAction: (action: string, user: BannedUser) => void;
}

const REASON_LABELS: Record<string, string> = {
  tos_violation: "ToS Violation",
  spam:          "Spam",
  harassment:    "Harassment",
  fraud:         "Fraud",
  csam:          "CSAM",
  other:         "Other",
};

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  banned:    { bg: "#fff1f2", color: "#e11d48", dot: "#e11d48" },
  suspended: { bg: "#fffbeb", color: "#d97706", dot: "#d97706" },
};

const MOCK_AUDIT = [
  { date: "May 3, 2024 · 10:12 AM",  event: "Account banned",              by: "Admin"       },
  { date: "May 3, 2024 · 10:10 AM",  event: "Warning issued",              by: "Admin"       },
  { date: "Apr 28, 2024 · 3:44 PM",  event: "Fraud report received",       by: "System"      },
  { date: "Apr 20, 2024 · 1:15 PM",  event: "First warning issued",        by: "Moderator A" },
];

export default function BannedReviewPanel({ user, onClose, onSave, onAction }: Props) {
  const [local,       setLocal]       = useState<BannedUser>({ ...user });
  const [modal,       setModal]       = useState<BannedModalAction | null>(null);
  const [auditOpen,   setAuditOpen]   = useState(false);
  const [ipsOpen,     setIpsOpen]     = useState(true);
  const [devicesOpen, setDevicesOpen] = useState(true);

  const ss = STATUS_STYLES[local.status];

  const handleModalConfirm = () => {
    const action = modal!;
    setModal(null);
    onAction(action, local);
    if (action === "lift")   { onClose(); return; }
    if (action === "extend") setLocal((p) => ({ ...p, duration: "permanent", expiresAt: null }));
    if (action === "reduce") setLocal((p) => ({ ...p, duration: "1 day", expiresAt: "Tomorrow" }));
    if (action === "reban")  setLocal((p) => ({ ...p, status: "banned", duration: "permanent", expiresAt: null }));
  };

  return (
    <>
      <div className="backdrop" onClick={onClose} />

      <div className="panel">

        {/* Header */}
        <div className="panel-header">
          <div className="user-info">
            <div className="avatar" style={{ background: local.color + "22", color: local.color }}>
              {local.initials}
            </div>
            <div>
              <div className="user-name">{local.name}</div>
              <div className="user-meta">@{local.username} · {local.email}</div>
            </div>
          </div>
          <div className="header-right">
            <span className="status-badge" style={{ background: ss.bg, color: ss.color }}>
              <span className="dot" style={{ background: ss.dot }} />
              {local.status.charAt(0).toUpperCase() + local.status.slice(1)}
            </span>
            <button className="close-btn" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        {/* Info bar */}
        <div className="info-bar">
          <div className="info-item">
            <span className="info-label">Reason</span>
            <span className="info-value">{REASON_LABELS[local.reason]}</span>
          </div>
          <div className="info-sep" />
          <div className="info-item">
            <span className="info-label">Actioned By</span>
            <span className="info-value">{local.actionedBy}</span>
          </div>
          <div className="info-sep" />
          <div className="info-item">
            <span className="info-label">Date</span>
            <span className="info-value">{local.actionedAt}</span>
          </div>
        </div>

        {/* Duration */}
        <div className="section">
          <div className="section-label">Penalty Duration</div>
          <div className="duration-card">
            <div className="duration-row">
              <div className="duration-info">
                <span className={`duration-val ${local.duration === "permanent" ? "permanent" : ""}`}>
                  {local.duration === "permanent" ? "Permanent Ban" : local.duration}
                </span>
                {local.expiresAt && (
                  <div className="expires-row">
                    <Clock size={12} style={{ color: "#d97706" }} />
                    <span className="expires-val">Expires {local.expiresAt}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="reason-note">
              <AlertTriangle size={12} style={{ color: "#e11d48", flexShrink: 0, marginTop: 1 }} />
              <span>{local.reasonNote}</span>
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* Banned IPs */}
        <div className="section">
          <button className="toggle-btn" onClick={() => setIpsOpen((v) => !v)}>
            <div className="toggle-left">
              <Wifi size={13} style={{ color: "#9b9aaa" }} />
              <span className="section-label" style={{ margin: 0 }}>Banned IPs</span>
              <span className="count-pill">{local.bannedIPs.length}</span>
            </div>
            {ipsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {ipsOpen && (
            <div className="list-items">
              {local.bannedIPs.length === 0 ? (
                <div className="empty-list">No IPs recorded</div>
              ) : local.bannedIPs.map((ip, i) => (
                <div key={i} className="list-item">
                  <span className="list-dot" />
                  <span className="ip-val">{ip}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Device fingerprints */}
        <div className="section">
          <button className="toggle-btn" onClick={() => setDevicesOpen((v) => !v)}>
            <div className="toggle-left">
              <Monitor size={13} style={{ color: "#9b9aaa" }} />
              <span className="section-label" style={{ margin: 0 }}>Device Fingerprints</span>
              <span className="count-pill">{local.devices.length}</span>
            </div>
            {devicesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {devicesOpen && (
            <div className="list-items">
              {local.devices.length === 0 ? (
                <div className="empty-list">No devices recorded</div>
              ) : local.devices.map((d, i) => (
                <div key={i} className="list-item">
                  <span className="list-dot" />
                  <span className="device-val">{d}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Audit log */}
        <div className="section">
          <button className="toggle-btn" onClick={() => setAuditOpen((v) => !v)}>
            <span className="section-label" style={{ margin: 0 }}>Ban History</span>
            {auditOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {auditOpen && (
            <div className="history-list">
              {MOCK_AUDIT.map((h, i) => (
                <div key={i} className="history-item">
                  <div className="history-dot" />
                  <div>
                    <div className="history-event">{h.event}</div>
                    <div className="history-meta">{h.date} · {h.by}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Actions */}
        <div className="section">
          <div className="section-label" style={{ color: "#e11d48" }}>
            <AlertTriangle size={12} style={{ display:"inline", marginRight:5, verticalAlign:"middle" }} />
            Actions
          </div>
          <div className="action-btns">
            <button className="action-btn lift" onClick={() => setModal("lift")}>
              <ShieldOff size={13} /> Lift Ban
            </button>
            {local.status === "suspended" && (
              <button className="action-btn reduce" onClick={() => setModal("reduce")}>
                <Clock size={13} /> Reduce
              </button>
            )}
            <button className="action-btn extend" onClick={() => setModal("extend")}>
              <Ban size={13} /> Extend
            </button>
            {local.status === "suspended" && (
              <button className="action-btn reban" onClick={() => setModal("reban")}>
                <Ban size={13} /> Re-ban
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="panel-footer">
          <button className="btn-close" onClick={onClose}>Close Panel</button>
        </div>
      </div>

      {modal && (
        <BannedActionModal
          action={modal}
          user={local}
          onConfirm={handleModalConfirm}
          onCancel={() => setModal(null)}
        />
      )}

      <style jsx>{`
        .backdrop {
          position: fixed; inset: 0;
          background: rgba(15,14,26,0.35);
          backdrop-filter: blur(3px);
          z-index: 150; animation: fadeIn 0.2s ease;
        }
        .panel {
          position: fixed; top: 0; right: 0;
          width: 440px; height: 100vh;
          background: #fff; border-left: 1px solid #eeecf8;
          box-shadow: -8px 0 40px rgba(15,14,26,0.12);
          z-index: 160; display: flex; flex-direction: column;
          animation: slideIn 0.28s cubic-bezier(0.34,1.2,0.64,1);
          overflow-y: auto;
        }
        .panel-header {
          display: flex; align-items: flex-start;
          justify-content: space-between;
          padding: 22px 20px 16px;
          border-bottom: 1px solid #f3f4f6; gap: 12px;
        }
        .user-info { display: flex; gap: 12px; align-items: center; flex: 1; min-width: 0; }
        .avatar {
          width: 42px; height: 42px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; flex-shrink: 0;
        }
        .user-name { font-size: 15px; font-weight: 700; color: #0f0e1a; }
        .user-meta { font-size: 12px; color: #9b9aaa; margin-top: 2px; }
        .header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px;
          font-size: 11.5px; font-weight: 600; white-space: nowrap;
        }
        .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .close-btn {
          width: 28px; height: 28px; border-radius: 8px;
          border: 1px solid #e4e2f2; background: #fff; color: #9b9aaa;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; font-family: inherit;
        }
        .close-btn:hover { background: #f5f4f9; color: #3d3b52; }
        .info-bar {
          display: flex; align-items: center;
          padding: 12px 20px;
          background: #faf9fe; border-bottom: 1px solid #f3f4f6;
        }
        .info-item  { display: flex; align-items: center; gap: 6px; }
        .info-sep   { width: 1px; height: 20px; background: #e4e2f2; margin: 0 14px; }
        .info-label { font-size: 11.5px; color: #9b9aaa; font-weight: 500; }
        .info-value { font-size: 12.5px; color: #3d3b52; font-weight: 600; }
        .section { padding: 16px 20px; }
        .section-label {
          font-size: 11.5px; font-weight: 600; color: #3d3b52;
          text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;
        }
        .duration-card {
          background: #faf9fe; border: 1px solid #eeecf8;
          border-radius: 10px; padding: 12px 14px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .duration-row  { display: flex; align-items: center; justify-content: space-between; }
        .duration-info { display: flex; flex-direction: column; gap: 4px; }
        .duration-val  { font-size: 14px; font-weight: 700; color: #3d3b52; }
        .duration-val.permanent { color: #e11d48; }
        .expires-row { display: flex; align-items: center; gap: 5px; }
        .expires-val { font-size: 12px; color: #d97706; font-weight: 500; }
        .reason-note {
          display: flex; align-items: flex-start; gap: 7px;
          font-size: 12.5px; color: #6b6a80; line-height: 1.5;
          padding-top: 8px; border-top: 1px solid #f3f4f6;
        }
        .toggle-btn {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          background: none; border: none; cursor: pointer; font-family: inherit;
          color: #9b9aaa; padding: 0; transition: color 0.15s; margin-bottom: 10px;
        }
        .toggle-btn:hover { color: #3d3b52; }
        .toggle-left { display: flex; align-items: center; gap: 7px; }
        .count-pill {
          font-size: 11px; font-weight: 600;
          background: #f5f4f9; color: #6b6a80;
          padding: 1px 7px; border-radius: 20px;
        }
        .list-items { display: flex; flex-direction: column; gap: 4px; }
        .list-item  { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
        .list-dot   { width: 6px; height: 6px; border-radius: 50%; background: #d1c4f7; flex-shrink: 0; }
        .ip-val     { font-size: 12.5px; color: #3d3b52; font-family: monospace; background: #f5f4f9; padding: 2px 8px; border-radius: 5px; }
        .device-val { font-size: 12.5px; color: #6b6a80; }
        .empty-list { font-size: 12.5px; color: #b8b6cc; padding: 4px 0; }
        .history-list { display: flex; flex-direction: column; margin-top: 4px; }
        .history-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 10px 0; border-bottom: 1px solid #f3f4f6;
        }
        .history-item:last-child { border-bottom: none; }
        .history-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #fca5a5; flex-shrink: 0; margin-top: 4px;
        }
        .history-event { font-size: 13px; font-weight: 500; color: #3d3b52; }
        .history-meta  { font-size: 11.5px; color: #9b9aaa; margin-top: 2px; }
        .action-btns { display: flex; flex-wrap: wrap; gap: 8px; }
        .action-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 8px; border: none;
          font-size: 12.5px; font-weight: 600; cursor: pointer;
          transition: all 0.15s; font-family: inherit;
        }
        .action-btn.lift    { background: #f0fdf4; color: #16a34a; }
        .action-btn.lift:hover   { background: #dcfce7; }
        .action-btn.reduce  { background: #eff6ff; color: #0369a1; }
        .action-btn.reduce:hover { background: #dbeafe; }
        .action-btn.extend  { background: #fffbeb; color: #d97706; }
        .action-btn.extend:hover { background: #fef3c7; }
        .action-btn.reban   { background: #fff1f2; color: #e11d48; }
        .action-btn.reban:hover  { background: #ffe4e6; }
        .divider { height: 1px; background: #f3f4f6; }
        .panel-footer {
          margin-top: auto; padding: 16px 20px;
          border-top: 1px solid #f3f4f6; background: #fff;
          position: sticky; bottom: 0;
          display: flex; justify-content: flex-end;
        }
        .btn-close {
          padding: 9px 20px; border-radius: 9px;
          border: 1px solid #e4e2f2; background: #fff; color: #3d3b52;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.15s; font-family: inherit;
        }
        .btn-close:hover { background: #f5f4f9; }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}