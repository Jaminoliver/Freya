"use client";

import { Download, RefreshCw, Clock } from "lucide-react";

interface Props {
  total:   number;
  pending: number;
}

export default function CreatorsHeader({ total, pending }: Props) {
  const handleExport = () => {
    const csv  = "Name,Email,Status,Commission,Earnings,Subscribers\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "creators-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="header-wrap">
      <div className="header-left">
        <div>
          <div className="title-row">
            <h1 className="title">Creator Accounts</h1>
            <span className="count">{total.toLocaleString()} total</span>
          </div>
          {pending > 0 && (
            <div className="pending-notice">
              <Clock size={12} />
              <span>{pending} creators awaiting approval</span>
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        <button className="btn-ghost">
          <RefreshCw size={14} />
          Refresh
        </button>
        <button className="btn-primary" onClick={handleExport}>
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <style jsx>{`
        .header-wrap {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 28px 32px 0;
        }
        .header-left {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .title-row {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }
        .title {
          font-size: 24px;
          font-weight: 700;
          color: #0f0e1a;
          letter-spacing: -0.5px;
          margin: 0;
        }
        .count {
          font-size: 13px;
          color: #9b9aaa;
          font-weight: 500;
          background: #eeecf8;
          padding: 3px 10px;
          border-radius: 20px;
        }
        .pending-notice {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12.5px;
          color: #d97706;
          font-weight: 500;
          background: #fffbeb;
          border: 1px solid #fde68a;
          padding: 4px 10px;
          border-radius: 20px;
          width: fit-content;
          margin-top: 6px;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .btn-ghost {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #e4e2f2;
          background: #fff;
          color: #3d3b52;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .btn-ghost:hover {
          background: #f5f4f9;
          border-color: #cbc8e8;
        }
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: #7c3aed;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .btn-primary:hover { background: #6d28d9; }
      `}</style>
    </div>
  );
}