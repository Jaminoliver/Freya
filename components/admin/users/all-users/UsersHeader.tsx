"use client";

import { Download, RefreshCw } from "lucide-react";

interface Props {
  total: number;
}

export default function UsersHeader({ total }: Props) {
  const handleExport = () => {
    // CSV export trigger
    const csv = "Name,Email,Role,Status,Country,Joined\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "users-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="header-wrap">
      <div className="header-left">
        <h1 className="title">All Users</h1>
        <span className="count">{total.toLocaleString()} total</span>
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
          align-items: center;
          justify-content: space-between;
          padding: 28px 32px 0;
        }
        .header-left {
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
        }
        .btn-primary:hover {
          background: #6d28d9;
        }
      `}</style>
    </div>
  );
}