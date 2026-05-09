"use client";

import { Search, X } from "lucide-react";

interface Props {
  search:      string;
  onSearch:    (v: string) => void;
  tab:         string;
  onTab:       (v: string) => void;
  reasonFilter: string;
  onReason:    (v: string) => void;
}

const TABS = [
  { key: "all",       label: "All",       count: 124 },
  { key: "banned",    label: "Banned",    count: 89  },
  { key: "suspended", label: "Suspended", count: 35  },
];

const REASON_FILTERS = [
  { key: "all",           label: "All Reasons"       },
  { key: "tos_violation", label: "ToS Violation"     },
  { key: "spam",          label: "Spam"              },
  { key: "harassment",    label: "Harassment"        },
  { key: "fraud",         label: "Fraud"             },
  { key: "csam",          label: "CSAM"              },
  { key: "other",         label: "Other"             },
];

export default function BannedFilterBar({ search, onSearch, tab, onTab, reasonFilter, onReason }: Props) {
  return (
    <div className="filter-wrap">

      {/* Tabs */}
      <div className="top-row">
        <div className="tabs-row">
          {TABS.map((t) => {
            const active    = tab === t.key;
            const isBanned  = t.key === "banned"    && t.count > 0;
            const isSuspend = t.key === "suspended" && t.count > 0;
            return (
              <button
                key={t.key}
                className={`tab ${active ? "active" : ""}`}
                onClick={() => onTab(t.key)}
              >
                {t.label}
                <span className={`tab-count ${
                  active      ? "count-active"    :
                  isBanned    ? "count-banned"    :
                  isSuspend   ? "count-suspended" : ""
                }`}>
                  {t.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Reason filter */}
        <div className="reason-row">
          {REASON_FILTERS.map((r) => (
            <button
              key={r.key}
              className={`reason-btn ${reasonFilter === r.key ? "active" : ""}`}
              onClick={() => onReason(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="search-wrap">
        <Search size={15} className="search-icon" />
        <input
          type="text"
          placeholder="Search by name, email or username..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="search-input"
        />
        {search && (
          <button className="search-clear" onClick={() => onSearch("")}>
            <X size={13} />
          </button>
        )}
      </div>

      <style jsx>{`
        .filter-wrap {
          padding: 16px 32px 0;
          display: flex; flex-direction: column; gap: 12px;
        }
        .top-row {
          display: flex; align-items: center;
          justify-content: space-between; gap: 12px; flex-wrap: wrap;
        }
        .tabs-row {
          display: flex; align-items: center; gap: 4px;
          background: #fff; border: 1px solid #eeecf8;
          border-radius: 10px; padding: 4px; width: fit-content;
        }
        .tab {
          display: flex; align-items: center; gap: 7px;
          padding: 7px 14px; border-radius: 7px; border: none;
          background: transparent; color: #6b6a80;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.2s ease; font-family: inherit;
        }
        .tab:hover { color: #0f0e1a; }
        .tab.active {
          background: #e11d48; color: #fff;
          box-shadow: 0 2px 8px rgba(225,29,72,0.25);
        }
        .tab-count {
          font-size: 11px; font-weight: 600;
          padding: 2px 7px; border-radius: 20px;
          background: #fef2f2; color: #e11d48;
        }
        .count-active    { background: rgba(255,255,255,0.25); color: #fff; }
        .count-banned    { background: #fff1f2; color: #e11d48; }
        .count-suspended { background: #fffbeb; color: #d97706; }
        .reason-row {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
        }
        .reason-btn {
          padding: 5px 12px; border-radius: 20px;
          border: 1px solid #e4e2f2; background: #fff;
          color: #6b6a80; font-size: 12px; font-weight: 500;
          cursor: pointer; transition: all 0.15s; font-family: inherit;
        }
        .reason-btn:hover { border-color: #e11d48; color: #e11d48; }
        .reason-btn.active {
          background: #fff1f2; border-color: #fecdd3;
          color: #e11d48; font-weight: 600;
        }
        .search-wrap {
          position: relative; display: flex; align-items: center; max-width: 420px;
        }
        .search-icon { position: absolute; left: 12px; color: #9b9aaa; pointer-events: none; }
        .search-input {
          width: 100%; padding: 9px 36px 9px 36px;
          border-radius: 10px; border: 1px solid #e4e2f2;
          background: #fff; color: #0f0e1a; font-size: 13.5px;
          outline: none; transition: border-color 0.2s; font-family: inherit;
        }
        .search-input::placeholder { color: #b8b6cc; }
        .search-input:focus { border-color: #e11d48; }
        .search-clear {
          position: absolute; right: 10px;
          background: none; border: none; color: #9b9aaa;
          cursor: pointer; display: flex; align-items: center;
          padding: 0; transition: color 0.2s;
        }
        .search-clear:hover { color: #e11d48; }
      `}</style>
    </div>
  );
}