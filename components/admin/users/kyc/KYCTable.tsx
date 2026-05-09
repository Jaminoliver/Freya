"use client";

import { useState } from "react";
import { FileText, Clock } from "lucide-react";
import KYCRowActions from "./KYCRowActions";
import KYCReviewPanel from "./KYCReviewPanel";

export interface KYCSubmission {
  id:          string;
  name:        string;
  email:       string;
  username:    string;
  initials:    string;
  color:       string;
  status:      "pending" | "approved" | "rejected" | "flagged";
  docType:     "passport" | "national_id" | "drivers_license";
  docId:       string;
  submitted:   string;
  reviewedBy:  string | null;
  reviewedAt:  string | null;
  rejectReason: string | null;
  overridden:  boolean;
  // mock doc image placeholders
  docFront:    string;
  docBack:     string | null;
  selfie:      string;
}

const MOCK: KYCSubmission[] = [
  { id:"1", name:"Jade Voss",    email:"jade@example.com",   username:"jadevoss",   initials:"JV", color:"#3b82f6", status:"pending",  docType:"passport",        docId:"PP-20948301", submitted:"Jun 1, 2024",  reviewedBy:null,       reviewedAt:null,         rejectReason:null,                      overridden:false, docFront:"/mock/id1f.jpg", docBack:null,            selfie:"/mock/s1.jpg" },
  { id:"2", name:"Rena Wolf",    email:"rena@example.com",   username:"renawolf",   initials:"RW", color:"#14b8a6", status:"pending",  docType:"national_id",     docId:"NI-77341209", submitted:"Jun 2, 2024",  reviewedBy:null,       reviewedAt:null,         rejectReason:null,                      overridden:false, docFront:"/mock/id2f.jpg", docBack:"/mock/id2b.jpg", selfie:"/mock/s2.jpg" },
  { id:"3", name:"Luna Rose",    email:"luna@example.com",   username:"lunarose",   initials:"LR", color:"#a855f7", status:"approved", docType:"drivers_license",  docId:"DL-44912087", submitted:"Jan 10, 2024", reviewedBy:"Admin",    reviewedAt:"Jan 11, 2024", rejectReason:null,                    overridden:false, docFront:"/mock/id3f.jpg", docBack:"/mock/id3b.jpg", selfie:"/mock/s3.jpg" },
  { id:"4", name:"Mia Storm",    email:"mia@example.com",    username:"miastorm",   initials:"MS", color:"#ec4899", status:"approved", docType:"passport",        docId:"PP-33871045", submitted:"Mar 5, 2024",  reviewedBy:"Admin",    reviewedAt:"Mar 6, 2024",  rejectReason:null,                    overridden:false, docFront:"/mock/id4f.jpg", docBack:null,            selfie:"/mock/s4.jpg" },
  { id:"5", name:"Sam Torres",   email:"sam@example.com",    username:"samtorres",  initials:"ST", color:"#6366f1", status:"rejected", docType:"national_id",     docId:"NI-19023847", submitted:"May 2, 2024",  reviewedBy:"Admin",    reviewedAt:"May 3, 2024",  rejectReason:"Document image is blurry and unreadable.", overridden:false, docFront:"/mock/id5f.jpg", docBack:"/mock/id5b.jpg", selfie:"/mock/s5.jpg" },
  { id:"6", name:"Aria Black",   email:"aria@example.com",   username:"ariablack",  initials:"AB", color:"#10b981", status:"approved", docType:"drivers_license",  docId:"DL-88210394", submitted:"Apr 12, 2024", reviewedBy:"Admin",    reviewedAt:"Apr 13, 2024", rejectReason:null,                    overridden:false, docFront:"/mock/id6f.jpg", docBack:"/mock/id6b.jpg", selfie:"/mock/s6.jpg" },
  { id:"7", name:"Zoe Blake",    email:"zoe@example.com",    username:"zoeblake",   initials:"ZB", color:"#f59e0b", status:"flagged",  docType:"passport",        docId:"PP-50019283", submitted:"Jun 5, 2024",  reviewedBy:null,       reviewedAt:null,           rejectReason:null,                    overridden:false, docFront:"/mock/id7f.jpg", docBack:null,            selfie:"/mock/s7.jpg" },
  { id:"8", name:"Nova Kai",     email:"nova@example.com",   username:"novakai",    initials:"NK", color:"#f97316", status:"flagged",  docType:"national_id",     docId:"NI-62019374", submitted:"Jun 6, 2024",  reviewedBy:null,       reviewedAt:null,           rejectReason:null,                    overridden:false, docFront:"/mock/id8f.jpg", docBack:"/mock/id8b.jpg", selfie:"/mock/s8.jpg" },
];

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

interface Props { search: string; tab: string; }

export default function KYCTable({ search, tab }: Props) {
  const [submissions,      setSubmissions]      = useState<KYCSubmission[]>(MOCK);
  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmission | null>(null);

  const filtered = submissions.filter((s) => {
    const q           = search.toLowerCase();
    const matchSearch = !q ||
      s.name.toLowerCase().includes(q)     ||
      s.email.toLowerCase().includes(q)    ||
      s.docId.toLowerCase().includes(q)    ||
      s.username.toLowerCase().includes(q);
    const matchTab    = tab === "all" || s.status === tab;
    return matchSearch && matchTab;
  });

  const handleAction = (action: string, submission: KYCSubmission) => {
    if (action === "view")     return setSelectedSubmission(submission);
    if (action === "approve")  return setSubmissions((prev) => prev.map((s) => s.id === submission.id ? { ...s, status: "approved", reviewedBy: "Admin", reviewedAt: "Now" } : s));
    if (action === "reject")   return setSubmissions((prev) => prev.map((s) => s.id === submission.id ? { ...s, status: "rejected", reviewedBy: "Admin", reviewedAt: "Now" } : s));
    if (action === "flag")     return setSubmissions((prev) => prev.map((s) => s.id === submission.id ? { ...s, status: "flagged" } : s));
    if (action === "override") return setSubmissions((prev) => prev.map((s) => s.id === submission.id ? { ...s, overridden: true, status: "approved" } : s));
  };

  const handlePanelSave = (updated: KYCSubmission) =>
    setSubmissions((prev) => prev.map((s) => s.id === updated.id ? updated : s));

  return (
    <>
      <div className="table-wrap">
        <div className="card">
          <div className="result-count">
            {filtered.length} submission{filtered.length !== 1 ? "s" : ""} found
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Document</th>
                  <th>Doc ID</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Reviewed By</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign:"center", padding:"48px 0", color:"#9b9aaa", fontSize:"14px" }}>
                      No submissions match your filters
                    </td>
                  </tr>
                )}
                {filtered.map((s, i) => {
                  const ss = STATUS_STYLES[s.status];
                  return (
                    <tr
                      key={s.id}
                      className="sub-row"
                      style={{ animationDelay:`${i * 40}ms` }}
                      onClick={() => setSelectedSubmission(s)}
                    >
                      {/* User */}
                      <td>
                        <div className="user-cell">
                          <div className="avatar" style={{ background: s.color + "22", color: s.color }}>
                            {s.initials}
                          </div>
                          <div>
                            <div className="user-name">{s.name}</div>
                            <div className="user-email">{s.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Document type */}
                      <td>
                        <div className="doc-cell">
                          <FileText size={13} style={{ color: "#9b9aaa", flexShrink: 0 }} />
                          <span className="doc-label">{DOC_LABELS[s.docType]}</span>
                        </div>
                      </td>

                      {/* Doc ID */}
                      <td><span className="doc-id">{s.docId}</span></td>

                      {/* Submitted */}
                      <td>
                        <div className="submitted-cell">
                          <Clock size={12} style={{ color: "#b8b6cc", flexShrink: 0 }} />
                          <span className="submitted-date">{s.submitted}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className="status-badge" style={{ background: ss.bg, color: ss.color }}>
                          <span className="dot" style={{ background: ss.dot }} />
                          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                          {s.overridden && <span className="override-tag">Override</span>}
                        </span>
                      </td>

                      {/* Reviewed by */}
                      <td>
                        <span className="reviewed-by">
                          {s.reviewedBy ?? <span style={{ color: "#b8b6cc" }}>—</span>}
                        </span>
                      </td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <KYCRowActions submission={s} onAction={handleAction} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedSubmission && (
        <KYCReviewPanel
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onSave={handlePanelSave}
          onAction={handleAction}
        />
      )}

      <style jsx>{`
        .table-wrap { padding: 16px 32px 0; }
        .card {
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 16px;
          overflow: hidden;
        }
        .result-count {
          padding: 14px 20px;
          font-size: 12.5px;
          color: #9b9aaa;
          font-weight: 500;
          border-bottom: 1px solid #f3f4f6;
        }
        .table-scroll { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        thead th {
          font-size: 11px;
          font-weight: 600;
          color: #9b9aaa;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 12px 16px;
          text-align: left;
          background: #faf9fe;
          border-bottom: 1px solid #f3f4f6;
          white-space: nowrap;
        }
        .sub-row {
          animation: rowIn 0.35s ease both;
          cursor: pointer;
          transition: background 0.15s;
        }
        .sub-row:hover td { background: #faf8ff; }
        td {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: middle;
          font-size: 13px;
        }
        .sub-row:last-child td { border-bottom: none; }
        .user-cell  { display: flex; align-items: center; gap: 10px; }
        .avatar {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; flex-shrink: 0;
        }
        .user-name  { font-size: 13.5px; font-weight: 600; color: #0f0e1a; }
        .user-email { font-size: 12px; color: #9b9aaa; margin-top: 1px; }
        .doc-cell   { display: flex; align-items: center; gap: 6px; }
        .doc-label  { font-size: 13px; color: #3d3b52; font-weight: 500; }
        .doc-id     { font-size: 12px; color: #6b6a80; font-family: monospace; background: #f5f4f9; padding: 2px 8px; border-radius: 6px; }
        .submitted-cell { display: flex; align-items: center; gap: 5px; }
        .submitted-date { font-size: 12.5px; color: #6b6a80; }
        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
        }
        .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .override-tag {
          font-size: 10px;
          font-weight: 600;
          background: rgba(0,0,0,0.08);
          padding: 1px 5px;
          border-radius: 4px;
          margin-left: 2px;
        }
        .reviewed-by { font-size: 12.5px; color: #6b6a80; }
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}