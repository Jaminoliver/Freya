"use client";

import { useState } from "react";
import { Download, RefreshCw, GitBranch, Settings } from "lucide-react";

interface Props {
  total:         number;
  programActive: boolean;
  onToggle:      (v: boolean) => void;
  onSettings:    () => void;
}

export default function ReferralHeader({ total, programActive, onToggle, onSettings }: Props) {
  const [active, setActive] = useState(programActive);

  const handleToggle = () => {
    setActive((v) => !v);
    onToggle(!active);
  };

  const handleExport = () => {
    const csv  = "Referrer,Email,Referred Users,Commission Earned,Pending Payout,Joined\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "referral-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="header-wrap">
      <div className="header-left">
        <div className="title-row">
          <div className="icon-wrap">
            <GitBranch size={18} />
          </div>
          <div>
            <div className="title-row-inner">
              <h1 className="title">Referral Management</h1>
              <span className="count">{total.toLocaleString()} referrers</span>
            </div>
            <div className="program-status">
              <button
                className={`toggle-wrap ${active ? "on" : "off"}`}
                onClick={handleToggle}
              >
                <span className={`toggle-thumb ${active ? "on" : ""}`} />
              </button>
              <span className={`status-label ${active ? "active" : "inactive"}`}>
                Referral program {active ? "enabled" : "disabled"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="header-right">
        <button className="btn-ghost" onClick={onSettings}>
          <Settings size={14} />
          Settings
        </button>
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
          display: flex; align-items: flex-start;
          justify-content: space-between;
          padding: 28px 32px 0;
        }
        .header-left { display: flex; flex-direction: column; gap: 6px; }
        .title-row   { display: flex; align-items: flex-start; gap: 12px; }
        .icon-wrap {
          width: 40px; height: 40px; border-radius: 11px;
          background: #f0fdf4; color: #16a34a;
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
        .program-status {
          display: flex; align-items: center; gap: 8px; margin-top: 8px;
        }
        .toggle-wrap {
          width: 36px; height: 20px; border-radius: 10px;
          border: none; cursor: pointer; position: relative;
          transition: background 0.2s; padding: 0;
        }
        .toggle-wrap.on  { background: #16a34a; }
        .toggle-wrap.off { background: #d1d5db; }
        .toggle-thumb {
          position: absolute; top: 2px; left: 2px;
          width: 16px; height: 16px; border-radius: 50%;
          background: #fff; transition: transform 0.2s;
          display: block;
        }
        .toggle-thumb.on { transform: translateX(16px); }
        .status-label { font-size: 12.5px; font-weight: 500; }
        .status-label.active   { color: #16a34a; }
        .status-label.inactive { color: #9b9aaa; }
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
          background: #16a34a; color: #fff;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.2s ease; font-family: inherit;
        }
        .btn-primary:hover { background: #15803d; }
      `}</style>
    </div>
  );
}