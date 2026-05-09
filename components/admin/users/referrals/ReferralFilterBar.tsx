"use client";

import { Search, X } from "lucide-react";

interface Props {
  search:   string;
  onSearch: (v: string) => void;
  tab:      string;
  onTab:    (v: string) => void;
}

const TABS = [
  { key: "all",     label: "All Referrers", count: 312 },
  { key: "pending", label: "Pending Payout", count: 47  },
  { key: "paid",    label: "Paid Out",       count: 265 },
];

export default function ReferralFilterBar({ search, onSearch, tab, onTab }: Props) {
  return (
    <div className="filter-wrap">
      <div className="top-row">
        <div className="tabs-row">
          {TABS.map((t) => {
            const active    = tab === t.key;
            const isPending = t.key === "pending" && t.count > 0;
            return (
              <button
                key={t.key}
                className={`tab ${active ? "active" : ""}`}
                onClick={() => onTab(t.key)}
              >
                {t.label}
                <span className={`tab-count ${active ? "count-active" : isPending ? "count-pending" : ""}`}>
                  {t.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name or email..."
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
      </div>

      <style jsx>{`
        .filter-wrap { padding: 16px 32px 0; }
        .top-row {
          display: flex; align-items: center;
          justify-content: space-between; gap: 12px;
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
          background: #16a34a; color: #fff;
          box-shadow: 0 2px 8px rgba(22,163,74,0.25);
        }
        .tab-count {
          font-size: 11px; font-weight: 600;
          padding: 2px 7px; border-radius: 20px;
          background: #f0fdf4; color: #16a34a;
        }
        .count-active  { background: rgba(255,255,255,0.25); color: #fff; }
        .count-pending { background: #fffbeb; color: #d97706; }
        .search-wrap {
          position: relative; display: flex; align-items: center; max-width: 380px; width: 100%;
        }
        .search-icon { position: absolute; left: 12px; color: #9b9aaa; pointer-events: none; }
        .search-input {
          width: 100%; padding: 9px 36px;
          border-radius: 10px; border: 1px solid #e4e2f2;
          background: #fff; color: #0f0e1a; font-size: 13.5px;
          outline: none; transition: border-color 0.2s; font-family: inherit;
        }
        .search-input::placeholder { color: #b8b6cc; }
        .search-input:focus { border-color: #16a34a; }
        .search-clear {
          position: absolute; right: 10px;
          background: none; border: none; color: #9b9aaa;
          cursor: pointer; display: flex; align-items: center; padding: 0;
        }
        .search-clear:hover { color: #16a34a; }
      `}</style>
    </div>
  );
}