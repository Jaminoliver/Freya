"use client";

import { useState } from "react";
import { Download, ChevronDown, FileText, Sheet } from "lucide-react";

export default function ExportRevenueButton() {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  function handleExport(type: string) {
    setExporting(type);
    setOpen(false);
    setTimeout(() => setExporting(null), 1800);
  }

  return (
    <div className="wrap">
      <button className="export-btn" onClick={() => setOpen(!open)}>
        {exporting ? (
          <span className="loading">Exporting {exporting}…</span>
        ) : (
          <>
            <Download size={14} />
            <span>Export</span>
            <ChevronDown size={12} style={{ opacity: 0.6 }} />
          </>
        )}
      </button>

      {open && (
        <div className="dropdown">
          <button className="option" onClick={() => handleExport("CSV")}>
            <Sheet size={14} />
            Export as CSV
          </button>
          <button className="option" onClick={() => handleExport("PDF")}>
            <FileText size={14} />
            Export as PDF
          </button>
        </div>
      )}

      <style jsx>{`
        .wrap { position: relative; }
        .export-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 10px;
          border: 1px solid #c4b5fd; background: #f5f3ff;
          color: #7c3aed; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; white-space: nowrap;
        }
        .export-btn:hover { background: #ede9fe; }
        .loading { font-size: 12px; color: #7c3aed; }
        .dropdown {
          position: absolute; top: calc(100% + 6px); right: 0;
          background: #fff; border: 1px solid #e5e3f0;
          border-radius: 10px; padding: 4px; z-index: 100;
          min-width: 160px; box-shadow: 0 8px 24px rgba(0,0,0,0.08);
          animation: dropIn 0.15s ease;
        }
        .option {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 9px 12px; border: none;
          background: transparent; color: #3d3b52; font-size: 13px;
          text-align: left; border-radius: 7px; cursor: pointer;
          transition: background 0.15s;
        }
        .option:hover { background: #f5f3ff; color: #7c3aed; }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}