"use client";

import { useState } from "react";
import {
  X, FileText, CheckCircle, XCircle, RefreshCw,
  ShieldCheck, Flag, Clock, User, AlertTriangle,
  ChevronDown, ChevronUp,
} from "lucide-react";
import type { KYCSubmission } from "./KYCTable";
import KYCActionModal, { type KYCModalAction } from "./KYCActionModal";

interface Props {
  submission: KYCSubmission;
  onClose:    () => void;
  onSave:     (updated: KYCSubmission) => void;
  onAction:   (action: string, submission: KYCSubmission) => void;
}

const DOC_LABELS: Record<string, string> = {
  passport:        "Passport",
  national_id:     "National ID",
  drivers_license: "Driver's License",
};

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  approved: { bg: "#f0fdf4", color: "#16a34a", dot: "#16a34a" },
  pending:  { bg: "#fffbeb", color: "#d97706", dot: "#d97706" },
  rejected: { bg: "#fff1f2", color: "#e11d48", dot: "#e11d48" },
  flagged:  { bg: "#fdf2f8", color: "#9d174d", dot: "#db2777" },
};

// Mock history log entries
const MOCK_HISTORY = [
  { date: "Jun 1, 2024 · 10:42 AM",  event: "Submission received",          by: "System"  },
  { date: "Jun 1, 2024 · 11:05 AM",  event: "Auto-scan completed — no flags", by: "System" },
  { date: "Jun 2, 2024 · 09:14 AM",  event: "Assigned to review queue",     by: "System"  },
];

const REREQUEST_TEMPLATES = [
  "Document image is blurry or unreadable",
  "Document appears expired",
  "Wrong document type submitted",
  "Face not clearly visible in selfie",
  "Document does not match account name",
  "Other — see notes",
];

export default function KYCReviewPanel({ submission, onClose, onSave, onAction }: Props) {
  const [local, setLocal]           = useState<KYCSubmission>({ ...submission });
  const [modal, setModal]           = useState<KYCModalAction | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rerequestTemplate, setRerequestTemplate] = useState(REREQUEST_TEMPLATES[0]);
  const [showRerequestPicker, setShowRerequestPicker] = useState(false);

  const stat = local.status;
  const ss   = STATUS_STYLES[stat] ?? STATUS_STYLES.pending;

  const handleModalConfirm = () => {
    const action = modal!;
    setModal(null);
    onAction(action, local);
    if (action === "approve" || action === "override") setLocal((p) => ({ ...p, status: "approved", overridden: action === "override", reviewedBy: "Admin", reviewedAt: "Now" }));
    if (action === "reject")    setLocal((p) => ({ ...p, status: "rejected", reviewedBy: "Admin", reviewedAt: "Now" }));
    if (action === "flag")      setLocal((p) => ({ ...p, status: "flagged" }));
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
              {stat.charAt(0).toUpperCase() + stat.slice(1)}
              {local.overridden && <span className="override-pill">Override</span>}
            </span>
            <button className="close-btn" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        {/* Doc info bar */}
        <div className="doc-info-bar">
          <div className="doc-info-item">
            <FileText size={13} style={{ color: "#9b9aaa" }} />
            <span className="doc-info-label">Type</span>
            <span className="doc-info-value">{DOC_LABELS[local.docType]}</span>
          </div>
          <div className="doc-info-sep" />
          <div className="doc-info-item">
            <span className="doc-info-label">Doc ID</span>
            <span className="doc-info-id">{local.docId}</span>
          </div>
          <div className="doc-info-sep" />
          <div className="doc-info-item">
            <Clock size={13} style={{ color: "#9b9aaa" }} />
            <span className="doc-info-label">Submitted</span>
            <span className="doc-info-value">{local.submitted}</span>
          </div>
        </div>

        {/* Document previews */}
        <div className="section">
          <div className="section-label">Identity Documents</div>
          <div className="doc-previews">
            <div className="doc-card">
              <div className="doc-placeholder front">
                <FileText size={28} style={{ color: "#c4b5fd" }} />
                <span>Front of Document</span>
              </div>
              <div className="doc-card-label">Front</div>
            </div>
            {local.docBack && (
              <div className="doc-card">
                <div className="doc-placeholder back">
                  <FileText size={28} style={{ color: "#c4b5fd" }} />
                  <span>Back of Document</span>
                </div>
                <div className="doc-card-label">Back</div>
              </div>
            )}
            <div className="doc-card">
              <div className="doc-placeholder selfie">
                <User size={28} style={{ color: "#c4b5fd" }} />
                <span>Selfie / Liveness</span>
              </div>
              <div className="doc-card-label">Selfie</div>
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* Reviewed by */}
        {local.reviewedBy && (
          <div className="section">
            <div className="section-label">Review Info</div>
            <div className="review-info">
              <div className="review-row">
                <span className="review-key">Reviewed by</span>
                <span className="review-val">{local.reviewedBy}</span>
              </div>
              {local.reviewedAt && (
                <div className="review-row">
                  <span className="review-key">Reviewed at</span>
                  <span className="review-val">{local.reviewedAt}</span>
                </div>
              )}
              {local.rejectReason && (
                <div className="reject-reason">
                  <AlertTriangle size={12} style={{ color: "#e11d48", flexShrink: 0 }} />
                  <span>{local.rejectReason}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Re-request template picker */}
        {(stat === "pending" || stat === "flagged") && (
          <div className="section">
            <div className="section-label">Re-request Reason</div>
            <div className="section-sub">Select a template before sending a re-request</div>
            <button
              className="template-trigger"
              onClick={() => setShowRerequestPicker((v) => !v)}
            >
              <span>{rerequestTemplate}</span>
              {showRerequestPicker ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showRerequestPicker && (
              <div className="template-list">
                {REREQUEST_TEMPLATES.map((t) => (
                  <button
                    key={t}
                    className={`template-item ${rerequestTemplate === t ? "selected" : ""}`}
                    onClick={() => { setRerequestTemplate(t); setShowRerequestPicker(false); }}
                  >
                    {rerequestTemplate === t && <CheckCircle size={12} style={{ color: "#7c3aed", flexShrink: 0 }} />}
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="divider" />

        {/* Verification history */}
        <div className="section">
          <button className="history-toggle" onClick={() => setHistoryOpen((v) => !v)}>
            <span className="section-label" style={{ margin: 0 }}>Verification History</span>
            {historyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {historyOpen && (
            <div className="history-list">
              {MOCK_HISTORY.map((h, i) => (
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

        {/* Action buttons */}
        <div className="section">
          <div className="section-label danger-label">
            <AlertTriangle size={12} style={{ display:"inline", marginRight:5, verticalAlign:"middle", color:"#e11d48" }} />
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
            {(stat === "pending" || stat === "flagged") && (
              <button className="action-btn rerequest" onClick={() => setModal("rerequest")}>
                <RefreshCw size={13} /> Re-request
              </button>
            )}
            {stat !== "flagged" && (
              <button className="action-btn flag" onClick={() => setModal("flag")}>
                <Flag size={13} /> Flag
              </button>
            )}
            {!local.overridden && (
              <button className="action-btn override" onClick={() => setModal("override")}>
                <ShieldCheck size={13} /> Override
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
        <KYCActionModal
          action={modal}
          submission={local}
          onConfirm={handleModalConfirm}
          onCancel={() => setModal(null)}
        />
      )}

      <style jsx>{`
        .backdrop {
          position: fixed; inset: 0;
          background: rgba(15, 14, 26, 0.35);
          backdrop-filter: blur(3px);
          z-index: 150;
          animation: fadeIn 0.2s ease;
        }
        .panel {
          position: fixed;
          top: 0; right: 0;
          width: 440px;
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
        .user-info { display: flex; gap: 12px; align-items: center; flex: 1; min-width: 0; }
        .avatar {
          width: 42px; height: 42px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; flex-shrink: 0;
        }
        .user-name  { font-size: 15px; font-weight: 700; color: #0f0e1a; }
        .user-meta  { font-size: 12px; color: #9b9aaa; margin-top: 2px; }
        .header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px;
          font-size: 11.5px; font-weight: 600; white-space: nowrap;
        }
        .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .override-pill {
          font-size: 10px; font-weight: 600;
          background: rgba(0,0,0,0.1); padding: 1px 5px;
          border-radius: 4px; margin-left: 2px;
        }
        .close-btn {
          width: 28px; height: 28px; border-radius: 8px;
          border: 1px solid #e4e2f2; background: #fff; color: #9b9aaa;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; font-family: inherit;
        }
        .close-btn:hover { background: #f5f4f9; color: #3d3b52; }
        .doc-info-bar {
          display: flex;
          align-items: center;
          gap: 0;
          padding: 12px 20px;
          background: #faf9fe;
          border-bottom: 1px solid #f3f4f6;
        }
        .doc-info-item { display: flex; align-items: center; gap: 6px; }
        .doc-info-sep  { width: 1px; height: 20px; background: #e4e2f2; margin: 0 14px; }
        .doc-info-label { font-size: 11.5px; color: #9b9aaa; font-weight: 500; }
        .doc-info-value { font-size: 12.5px; color: #3d3b52; font-weight: 600; }
        .doc-info-id    { font-size: 12px; color: #6b6a80; font-family: monospace; background: #eeecf8; padding: 2px 7px; border-radius: 5px; }
        .section { padding: 16px 20px; }
        .section-label {
          font-size: 11.5px; font-weight: 600; color: #3d3b52;
          text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;
        }
        .danger-label { color: #e11d48; }
        .section-sub { font-size: 12px; color: #9b9aaa; margin-top: -6px; margin-bottom: 10px; }
        .doc-previews { display: flex; gap: 10px; }
        .doc-card { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .doc-placeholder {
          aspect-ratio: 4/3;
          border-radius: 10px;
          border: 1.5px dashed #d1c4f7;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 6px; font-size: 11px; color: #9b9aaa;
          font-weight: 500; text-align: center; padding: 8px;
        }
        .doc-placeholder.front  { background: #f5f3ff; }
        .doc-placeholder.back   { background: #f5f3ff; }
        .doc-placeholder.selfie { background: #f0f9ff; border-color: #bae6fd; }
        .doc-placeholder.selfie svg { color: #7dd3fc !important; }
        .doc-card-label { font-size: 11px; color: #9b9aaa; font-weight: 500; text-align: center; }
        .review-info { display: flex; flex-direction: column; gap: 8px; }
        .review-row  { display: flex; justify-content: space-between; align-items: center; }
        .review-key  { font-size: 12.5px; color: #9b9aaa; }
        .review-val  { font-size: 12.5px; color: #3d3b52; font-weight: 600; }
        .reject-reason {
          display: flex; align-items: flex-start; gap: 7px;
          padding: 9px 12px;
          background: #fff1f2; border: 1px solid #fecdd3; border-radius: 9px;
          font-size: 12.5px; color: #9f1239; line-height: 1.5; margin-top: 4px;
        }
        .template-trigger {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 9px 12px; border-radius: 9px; border: 1px solid #e4e2f2;
          background: #fff; color: #3d3b52; font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.15s; font-family: inherit; text-align: left;
        }
        .template-trigger:hover { border-color: #a855f7; background: #faf8ff; }
        .template-list {
          margin-top: 6px; border: 1px solid #eeecf8; border-radius: 10px;
          overflow: hidden; background: #fff;
        }
        .template-item {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 9px 12px; border: none; background: transparent;
          color: #3d3b52; font-size: 12.5px; font-weight: 500;
          cursor: pointer; text-align: left; transition: background 0.15s;
          font-family: inherit; border-bottom: 1px solid #f3f4f6;
        }
        .template-item:last-child { border-bottom: none; }
        .template-item:hover     { background: #f5f4f9; }
        .template-item.selected  { background: #f5f3ff; color: #7c3aed; }
        .history-toggle {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          background: none; border: none; cursor: pointer; font-family: inherit;
          color: #9b9aaa; padding: 0; transition: color 0.15s;
        }
        .history-toggle:hover { color: #3d3b52; }
        .history-list { margin-top: 12px; display: flex; flex-direction: column; gap: 0; }
        .history-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 10px 0; border-bottom: 1px solid #f3f4f6;
          position: relative;
        }
        .history-item:last-child { border-bottom: none; }
        .history-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #c4b5fd; flex-shrink: 0; margin-top: 4px;
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
        .action-btn.approve   { background: #f0fdf4; color: #16a34a; }
        .action-btn.approve:hover  { background: #dcfce7; }
        .action-btn.reject    { background: #fff1f2; color: #e11d48; }
        .action-btn.reject:hover   { background: #ffe4e6; }
        .action-btn.rerequest { background: #eff6ff; color: #0369a1; }
        .action-btn.rerequest:hover { background: #dbeafe; }
        .action-btn.flag      { background: #fdf2f8; color: #db2777; }
        .action-btn.flag:hover     { background: #fce7f3; }
        .action-btn.override  { background: #fffbeb; color: #d97706; }
        .action-btn.override:hover { background: #fef3c7; }
        .divider { height: 1px; background: #f3f4f6; }
        .panel-footer {
          margin-top: auto;
          padding: 16px 20px;
          border-top: 1px solid #f3f4f6;
          background: #fff;
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