"use client";

import { useState } from "react";
import {
  X, DollarSign, Users, FileText, Star,
  Clock, Tag, AlertTriangle, CheckCircle,
  XCircle, PauseCircle, Ban,
} from "lucide-react";
import type { Creator } from "./CreatorsTable";
import CreatorActionModal, { type ModalAction } from "./CreatorActionModal";

interface Props {
  creator:  Creator;
  onClose:  () => void;
  onSave:   (updated: Creator) => void;
  onAction: (action: string, creator: Creator) => void;
}

const ALL_CATEGORIES = ["photos", "videos", "audio", "live", "stories", "ppv"];

export default function CreatorProfilePanel({ creator, onClose, onSave, onAction }: Props) {
  const [local, setLocal]           = useState<Creator>({ ...creator });
  const [modal, setModal]           = useState<ModalAction | null>(null);
  const [commissionInput, setCI]    = useState(String(creator.commission));
  const [holdInput, setHI]          = useState(String(creator.holdDays));
  const [saved, setSaved]           = useState(false);

  const stat = local.status;

  const toggleCategory = (cat: string) => {
    setLocal((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleSave = () => {
    const updated: Creator = {
      ...local,
      commission: Math.max(0, Math.min(100, Number(commissionInput) || 0)),
      holdDays:   Math.max(0, Number(holdInput) || 0),
    };
    onSave(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleModalConfirm = () => {
    const action = modal!;
    setModal(null);
    onAction(action, local);
    if (action === "approve") setLocal((p) => ({ ...p, status: "approved" }));
    if (action === "reject")  setLocal((p) => ({ ...p, status: "rejected" }));
  };

  const STATUS_BADGE: Record<string, { bg: string; color: string; dot: string }> = {
    approved: { bg: "#f0fdf4", color: "#16a34a", dot: "#16a34a" },
    pending:  { bg: "#fffbeb", color: "#d97706", dot: "#d97706" },
    rejected: { bg: "#fff1f2", color: "#e11d48", dot: "#e11d48" },
  };
  const ss = STATUS_BADGE[stat] ?? STATUS_BADGE.pending;

  return (
    <>
      {/* Backdrop */}
      <div className="backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="panel">

        {/* Header */}
        <div className="panel-header">
          <div className="creator-info">
            <div
              className="avatar"
              style={{ background: local.color + "22", color: local.color }}
            >
              {local.initials}
            </div>
            <div>
              <div className="creator-name">{local.name}</div>
              <div className="creator-meta">@{local.username} · {local.email}</div>
              <div className="creator-bio">{local.bio}</div>
            </div>
          </div>
          <div className="header-right">
            <span className="status-badge" style={{ background: ss.bg, color: ss.color }}>
              <span className="dot" style={{ background: ss.dot }} />
              {stat.charAt(0).toUpperCase() + stat.slice(1)}
            </span>
            <button className="close-btn" onClick={onClose}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="stats-row">
          {[
            { icon: DollarSign, label: "Earnings",    value: local.earnings, color: "#7c3aed" },
            { icon: Users,      label: "Subscribers", value: local.subs.toLocaleString(), color: "#0369a1" },
            { icon: FileText,   label: "Posts",       value: local.posts.toLocaleString(), color: "#0f766e" },
            { icon: Star,       label: "Featured",    value: local.featured ? "Yes" : "No", color: local.featured ? "#d97706" : "#9b9aaa" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="stat-card">
                <div className="stat-icon" style={{ background: s.color + "15" }}>
                  <Icon size={14} style={{ color: s.color }} />
                </div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Joined */}
        <div className="joined-row">
          <Clock size={12} style={{ color: "#9b9aaa" }} />
          <span>Joined {local.joined}</span>
        </div>

        {/* Divider */}
        <div className="divider" />

        {/* Commission override */}
        <div className="section">
          <div className="section-label">Commission Override (%)</div>
          <div className="input-row">
            <input
              type="number"
              min={0}
              max={100}
              className="num-input"
              value={commissionInput}
              onChange={(e) => setCI(e.target.value)}
            />
            <span className="input-hint">Global default: 20%</span>
          </div>
        </div>

        {/* Payout hold */}
        <div className="section">
          <div className="section-label">Payout Hold (days)</div>
          <div className="input-row">
            <input
              type="number"
              min={0}
              className="num-input"
              value={holdInput}
              onChange={(e) => setHI(e.target.value)}
            />
            <span className="input-hint">Global default: 3 days</span>
          </div>
        </div>

        {/* Feature toggle */}
        <div className="section section-row">
          <div>
            <div className="section-label">Feature on Homepage</div>
            <div className="section-sub">Show this creator on the platform homepage</div>
          </div>
          <button
            className={`toggle ${local.featured ? "on" : "off"}`}
            onClick={() => setLocal((p) => ({ ...p, featured: !p.featured }))}
          >
            <span className="toggle-thumb" />
          </button>
        </div>

        {/* Category restrictions */}
        <div className="section">
          <div className="section-label">
            <Tag size={12} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
            Allowed Content Categories
          </div>
          <div className="section-sub" style={{ marginBottom: 10 }}>
            Unchecked categories will be restricted for this creator
          </div>
          <div className="cats">
            {ALL_CATEGORIES.map((cat) => {
              const active = local.categories.includes(cat);
              return (
                <button
                  key={cat}
                  className={`cat-tag ${active ? "cat-on" : "cat-off"}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div className="divider" />

        {/* Danger zone */}
        <div className="section">
          <div className="section-label danger-label">
            <AlertTriangle size={12} style={{ display: "inline", marginRight: 5, verticalAlign: "middle", color: "#e11d48" }} />
            Actions
          </div>
          <div className="action-btns">
            {stat === "pending" && (
              <>
                <button className="action-btn approve" onClick={() => setModal("approve")}>
                  <CheckCircle size={13} /> Approve
                </button>
                <button className="action-btn reject" onClick={() => setModal("reject")}>
                  <XCircle size={13} /> Reject
                </button>
              </>
            )}
            <button className="action-btn suspend" onClick={() => setModal("suspend")}>
              <PauseCircle size={13} /> Suspend
            </button>
            <button className="action-btn ban" onClick={() => setModal("ban")}>
              <Ban size={13} /> Ban
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="panel-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className={`btn-save ${saved ? "saved" : ""}`}
            onClick={handleSave}
          >
            {saved ? <><CheckCircle size={13} /> Saved!</> : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <CreatorActionModal
          action={modal}
          creator={local}
          onConfirm={handleModalConfirm}
          onCancel={() => setModal(null)}
        />
      )}

      <style jsx>{`
        .backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 14, 26, 0.35);
          backdrop-filter: blur(3px);
          z-index: 150;
          animation: fadeIn 0.2s ease;
        }
        .panel {
          position: fixed;
          top: 0; right: 0;
          width: 420px;
          height: 100vh;
          background: #fff;
          border-left: 1px solid #eeecf8;
          box-shadow: -8px 0 40px rgba(15, 14, 26, 0.12);
          z-index: 160;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.28s cubic-bezier(0.34, 1.2, 0.64, 1);
          overflow-y: auto;
        }
        .panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 22px 20px 16px;
          border-bottom: 1px solid #f3f4f6;
          gap: 12px;
        }
        .creator-info { display: flex; gap: 12px; align-items: flex-start; flex: 1; min-width: 0; }
        .avatar {
          width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; flex-shrink: 0;
        }
        .creator-name  { font-size: 15px; font-weight: 700; color: #0f0e1a; }
        .creator-meta  { font-size: 12px; color: #9b9aaa; margin-top: 2px; }
        .creator-bio   { font-size: 12.5px; color: #6b6a80; margin-top: 4px; }
        .header-right  { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 600;
          white-space: nowrap;
        }
        .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .close-btn {
          width: 28px; height: 28px; border-radius: 8px; border: 1px solid #e4e2f2;
          background: #fff; color: #9b9aaa; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; font-family: inherit;
        }
        .close-btn:hover { background: #f5f4f9; color: #3d3b52; }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding: 16px 20px 0;
        }
        .stat-card {
          background: #faf9fe;
          border: 1px solid #eeecf8;
          border-radius: 12px;
          padding: 12px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
        }
        .stat-icon {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }
        .stat-value { font-size: 13px; font-weight: 700; color: #0f0e1a; }
        .stat-label { font-size: 10.5px; color: #9b9aaa; font-weight: 500; }
        .joined-row {
          display: flex; align-items: center; gap: 5px;
          padding: 10px 20px 0;
          font-size: 12px; color: #9b9aaa;
        }
        .divider { height: 1px; background: #f3f4f6; margin: 16px 0; }
        .section { padding: 0 20px 14px; }
        .section-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
        }
        .section-label {
          font-size: 11.5px;
          font-weight: 600;
          color: #3d3b52;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
        }
        .danger-label { color: #e11d48; }
        .section-sub { font-size: 12px; color: #9b9aaa; margin-top: -4px; }
        .input-row { display: flex; align-items: center; gap: 12px; }
        .num-input {
          width: 80px;
          padding: 8px 10px;
          border-radius: 9px;
          border: 1px solid #e4e2f2;
          background: #fff;
          color: #0f0e1a;
          font-size: 14px;
          font-weight: 600;
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s;
        }
        .num-input:focus { border-color: #a855f7; }
        .input-hint { font-size: 12px; color: #9b9aaa; }
        .toggle {
          width: 40px; height: 22px; border-radius: 20px; border: none;
          cursor: pointer; position: relative; transition: background 0.25s;
          flex-shrink: 0;
        }
        .toggle.on  { background: #7c3aed; }
        .toggle.off { background: #e4e2f2; }
        .toggle-thumb {
          position: absolute; top: 4px;
          width: 14px; height: 14px; border-radius: 50%; background: #fff;
          transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }
        .toggle.on  .toggle-thumb { left: 22px; }
        .toggle.off .toggle-thumb { left: 4px; }
        .cats { display: flex; flex-wrap: wrap; gap: 7px; }
        .cat-tag {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 20px; border: none;
          font-size: 12.5px; font-weight: 500; cursor: pointer;
          transition: all 0.15s; font-family: inherit;
        }
        .cat-on  { background: #ede9fe; color: #7c3aed; }
        .cat-on:hover  { background: #ddd6fe; }
        .cat-off { background: #f5f4f9; color: #9b9aaa; }
        .cat-off:hover { background: #eeecf8; color: #6b6a80; }
        .action-btns { display: flex; flex-wrap: wrap; gap: 8px; }
        .action-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 8px; border: none;
          font-size: 12.5px; font-weight: 600; cursor: pointer;
          transition: all 0.15s; font-family: inherit;
        }
        .action-btn.approve { background: #f0fdf4; color: #16a34a; }
        .action-btn.approve:hover { background: #dcfce7; }
        .action-btn.reject  { background: #fff1f2; color: #e11d48; }
        .action-btn.reject:hover  { background: #ffe4e6; }
        .action-btn.suspend { background: #fffbeb; color: #d97706; }
        .action-btn.suspend:hover { background: #fef3c7; }
        .action-btn.ban     { background: #fff1f2; color: #dc2626; }
        .action-btn.ban:hover     { background: #fee2e2; }
        .panel-footer {
          margin-top: auto;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 20px;
          border-top: 1px solid #f3f4f6;
          background: #fff;
          position: sticky;
          bottom: 0;
        }
        .btn-cancel {
          padding: 9px 18px; border-radius: 9px; border: 1px solid #e4e2f2;
          background: #fff; color: #3d3b52; font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.15s; font-family: inherit;
        }
        .btn-cancel:hover { background: #f5f4f9; }
        .btn-save {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 20px; border-radius: 9px; border: none;
          background: #7c3aed; color: #fff; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .btn-save:hover { background: #6d28d9; }
        .btn-save.saved { background: #16a34a; }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}