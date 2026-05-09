"use client";

import { Search, ChevronDown, X } from "lucide-react";

interface Props {
  search:    string;
  onSearch:  (v: string) => void;
  role:      string;
  onRole:    (v: string) => void;
  status:    string;
  onStatus:  (v: string) => void;
  country:   string;
  onCountry: (v: string) => void;
  date:      string;
  onDate:    (v: string) => void;
}

const ROLES     = ["all", "fan", "creator", "admin"];
const STATUSES  = ["all", "active", "suspended", "banned"];
const COUNTRIES = ["all", "US", "UK", "NG", "CA", "AU", "DE", "FR"];
const DATES     = ["all", "today", "this_week", "this_month", "this_year"];

const DATE_LABELS: Record<string, string> = {
  all: "All time", today: "Today",
  this_week: "This week", this_month: "This month", this_year: "This year",
};

function FilterSelect({
  value, onChange, options, label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
}) {
  const isActive = value !== "all";
  return (
    <div className="select-wrap">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`filter-select ${isActive ? "active" : ""}`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "all"
              ? label
              : label === "Date"
              ? DATE_LABELS[o]
              : o.charAt(0).toUpperCase() + o.slice(1)}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="select-chevron" />
      {isActive && (
        <button className="clear-btn" onClick={() => onChange("all")}>
          <X size={11} />
        </button>
      )}
      <style jsx>{`
        .select-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .filter-select {
          appearance: none;
          padding: 8px 32px 8px 12px;
          border-radius: 8px;
          border: 1px solid #e4e2f2;
          background: #fff;
          color: #3d3b52;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          outline: none;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .filter-select:hover {
          border-color: #a855f7;
        }
        .filter-select.active {
          border-color: #a855f7;
          background: #faf5ff;
          color: #7c3aed;
        }
        .select-chevron {
          position: absolute;
          right: ${value !== "all" ? "24px" : "10px"};
          color: #9b9aaa;
          pointer-events: none;
        }
        .clear-btn {
          position: absolute;
          right: 8px;
          background: none;
          border: none;
          color: #9b9aaa;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        .clear-btn:hover { color: #7c3aed; }
      `}</style>
    </div>
  );
}

export default function UsersFilterBar({
  search, onSearch,
  role,   onRole,
  status, onStatus,
  country, onCountry,
  date,   onDate,
}: Props) {
  const hasFilters = role !== "all" || status !== "all" || country !== "all" || date !== "all" || search !== "";

  const clearAll = () => {
    onSearch(""); onRole("all"); onStatus("all"); onCountry("all"); onDate("all");
  };

  return (
    <div className="filter-wrap">
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

      {/* Filters */}
      <div className="filters-row">
        <FilterSelect value={role}    onChange={onRole}    options={ROLES}     label="Role"    />
        <FilterSelect value={status}  onChange={onStatus}  options={STATUSES}  label="Status"  />
        <FilterSelect value={country} onChange={onCountry} options={COUNTRIES} label="Country" />
        <FilterSelect value={date}    onChange={onDate}    options={DATES}     label="Date"    />

        {hasFilters && (
          <button className="clear-all" onClick={clearAll}>
            Clear all
          </button>
        )}
      </div>

      <style jsx>{`
        .filter-wrap {
          padding: 16px 32px 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .search-wrap {
          position: relative;
          display: flex;
          align-items: center;
          max-width: 420px;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          color: #9b9aaa;
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          padding: 9px 36px 9px 36px;
          border-radius: 10px;
          border: 1px solid #e4e2f2;
          background: #fff;
          color: #0f0e1a;
          font-size: 13.5px;
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .search-input::placeholder { color: #b8b6cc; }
        .search-input:focus { border-color: #a855f7; }
        .search-clear {
          position: absolute;
          right: 10px;
          background: none;
          border: none;
          color: #9b9aaa;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
          transition: color 0.2s;
        }
        .search-clear:hover { color: #7c3aed; }
        .filters-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .clear-all {
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px dashed #cbc8e8;
          background: transparent;
          color: #9b9aaa;
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .clear-all:hover {
          border-color: #a855f7;
          color: #7c3aed;
        }
      `}</style>
    </div>
  );
}