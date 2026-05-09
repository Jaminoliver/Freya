"use client";

import { Download, RefreshCw, Ban } from "lucide-react";

interface Props {
  total:     number;
  banned:    number;
  suspended: number;
}

export default function BannedHeader({ total, banned, suspended }: Props) {
  const handleExport = () => {
    const csv  = "Name,Email,Status,Ban Reason,Actioned By,Duration\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "banned-users-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="header-wrap">
      <div className="header-left">
        <div className="title-row">
          <div className="icon-wrap">
            <Ban size={18} />
          </div>
          <div>
            <div className="title-row-inner">
              <h1 className="title">Banned & Suspended Users</h1>
              <span className="count">{total.toLocaleString()} total</span>
            </div>
            <div className="pills-row">
              <div className="pill banned-pill">
                <span className="pill-dot" style={{ background: "#e11d48" }} />
                <span>{banned} banned</span>
              </div>
              <div className="pill suspended-pill">
                <span className="pill-dot" style={{ background: "#d97706" }} />
                <span>{suspended} suspended</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="header-right">
        <button className="btn-ghost">
          <RefreshCw size={14} />
          Refresh
        </button>
        <button className="btn-primary" onClick={handleExport}>
          <Download size={14} />
          Export Report
        </button>
      </div>

      <style jsx>{`
        .header-wrap {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 28px 32px 0;
        }
        .header-left { display: flex; flex-direction: column; gap: 6px; }
        .title-row   { display: flex; align-items: flex-start; gap: 12px; }
        .icon-wrap {
          width: 40px; height: 40px; border-radius: 11px;
          background: #fff1f2; color: #e11d48;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 2px;
        }
        .title-row-inner { display: flex; align-items: baseline; gap: 12px; }
        .title {
          font-size: 24px; font-weight: 700; color: #0f0e1a;
          letter-spacing: -0.5px; margin: 0;
        }
        .count {
          font-size: 13px; color: #9b9aaa; font-weight: 500;
          background: #eeecf8; padding: 3px 10px; border-radius: 20px;
        }
        .pills-row {
          display: flex; align-items: center; gap: 8px; margin-top: 7px;
        }
        .pill {
          display: flex; align-items: center; gap: 6px;
          font-size: 12.5px; font-weight: 500;
          padding: 4px 10px; border-radius: 20px; width: fit-content;
        }
        .banned-pill    { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }
        .suspended-pill { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
        .pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .header-right { display: flex; align-items: center; gap: 10px; }
        .btn-ghost {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 8px;
          border: 1px solid #e4e2f2; background: #fff; color: #3d3b52;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.2s ease; font-family: inherit;
        }
        .btn-ghost:hover { background: #f5f4f9; border-color: #cbc8e8; }
        .btn-primary {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 8px; border: none;
          background: #e11d48; color: #fff;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.2s ease; font-family: inherit;
        }
        .btn-primary:hover { background: #be123c; }
      `}</style>
    </div>
  );
}