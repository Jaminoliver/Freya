"use client";

import { useState } from "react";
import { Calendar, ChevronDown, RefreshCw, Bell, Download } from "lucide-react";

const ranges = ["Last 7 days", "Last 30 days", "Last 90 days", "This year"];

export default function UserAnalyticsHeader() {
  const [range, setRange] = useState("Last 30 days");
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);

  function handleRefresh() {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 800);
  }

  return (
    <div className="header-wrap">
      <div className="header-left">
        <h1 className="header-title">User Analytics</h1>
        <p className="header-sub">Understand user growth, churn, and engagement</p>
      </div>

      <div className="header-right">
        <div className="range-wrap">
          <button className="range-btn" onClick={() => setOpen(!open)}>
            <Calendar size={14} />
            <span>{range}</span>
            <ChevronDown size={13} style={{ opacity: 0.5 }} />
          </button>
          {open && (
            <div className="range-dropdown">
              {ranges.map((r) => (
                <button key={r} className={`range-option ${r === range ? "active" : ""}`}
                  onClick={() => { setRange(r); setOpen(false); }}>
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="icon-btn" onClick={handleRefresh} aria-label="Refresh">
          <RefreshCw size={15} style={{ animation: spinning ? "spin 0.8s linear" : "none" }} />
        </button>

        <button className="icon-btn notif-btn" aria-label="Notifications">
          <Bell size={15} />
          <span className="notif-badge">3</span>
        </button>

        <button className="export-btn">
          <Download size={14} />
          <span>Export</span>
        </button>

        <div className="avatar">AC</div>
      </div>

      <style jsx>{`
        .header-wrap {
          display: flex; align-items: center; justify-content: space-between;
          padding: 28px 32px 0; flex-wrap: wrap; gap: 16px;
        }
        .header-title { font-size: 26px; font-weight: 700; color: #0f0e1a; letter-spacing: -0.5px; margin: 0; }
        .header-sub { font-size: 13px; color: #9b9aaa; margin: 2px 0 0; }
        .header-right { display: flex; align-items: center; gap: 10px; }
        .range-wrap { position: relative; }
        .range-btn {
          display: flex; align-items: center; gap: 7px; padding: 8px 14px;
          border-radius: 10px; border: 1px solid #e5e3f0; background: #fff;
          color: #3d3b52; font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.2s; white-space: nowrap;
        }
        .range-btn:hover { border-color: #c4b5fd; background: #faf8ff; }
        .range-dropdown {
          position: absolute; top: calc(100% + 6px); right: 0; background: #fff;
          border: 1px solid #e5e3f0; border-radius: 10px; padding: 4px; z-index: 100;
          min-width: 160px; box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        .range-option {
          display: block; width: 100%; padding: 8px 12px; border: none;
          background: transparent; color: #3d3b52; font-size: 13px;
          text-align: left; border-radius: 7px; cursor: pointer; transition: background 0.15s;
        }
        .range-option:hover { background: #f5f3ff; }
        .range-option.active { background: #f0ebff; color: #7c3aed; font-weight: 500; }
        .icon-btn {
          position: relative; width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid #e5e3f0; background: #fff; color: #6b6880;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
        }
        .icon-btn:hover { border-color: #c4b5fd; color: #7c3aed; background: #faf8ff; }
        .notif-badge {
          position: absolute; top: -4px; right: -4px; width: 16px; height: 16px;
          border-radius: 50%; background: #ef4444; color: white; font-size: 9px;
          font-weight: 700; display: flex; align-items: center; justify-content: center;
          border: 2px solid #f5f4f9;
        }
        .export-btn {
          display: flex; align-items: center; gap: 6px; padding: 8px 14px;
          border-radius: 10px; border: 1px solid #c4b5fd; background: #f5f3ff;
          color: #7c3aed; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .export-btn:hover { background: #ede9fe; }
        .avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          color: white; font-size: 13px; font-weight: 600;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}