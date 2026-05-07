"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface ScheduleSheetProps {
  value:    Date | null;
  onChange: (d: Date | null) => void;
  onClose:  () => void;
}

export function ScheduleSheet({ value, onChange, onClose }: ScheduleSheetProps) {
  const [date, setDate] = useState(value ? value.toISOString().slice(0, 10) : "");
  const [time, setTime] = useState(value ? value.toTimeString().slice(0, 5) : "");

  const apply = () => {
    if (!date || !time) return;
    const d = new Date(`${date}T${time}`);
    if (isNaN(d.getTime()) || d.getTime() <= Date.now()) return;
    onChange(d);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    flex:       1,
    padding:    "12px 14px",
    borderRadius: "10px",
    border:     "1px solid #2A2A3D",
    background: "#1A1A2E",
    color:      "#FFF",
    fontSize:   "15px",
    fontFamily: "inherit",
    outline:    "none",
    colorScheme: "dark" as any,
  };

  const valid = !!(date && time);

  return (
    <>
      <div onClick={onClose} className="mm-backdrop" />
      <div className="mm-sheet" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2A2A3D" }} />
        </div>

        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 16px 12px" }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>Schedule send</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", padding: "6px", display: "flex" }}
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        {/* Date + Time pickers */}
        <div style={{ padding: "0 16px 14px", display: "flex", gap: "8px" }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
        </div>

        {/* Actions */}
        <div style={{ padding: "0 16px 16px", display: "flex", gap: "8px" }}>
          {value && (
            <button
              onClick={() => { onChange(null); onClose(); }}
              style={{
                flex:         1,
                padding:      "12px 0",
                borderRadius: "10px",
                border:       "1px solid #2A2A3D",
                background:   "transparent",
                color:        "#A3A3C2",
                fontSize:     "14px",
                fontWeight:   600,
                cursor:       "pointer",
                fontFamily:   "inherit",
              }}
            >
              Remove
            </button>
          )}
          <button
            onClick={apply}
            disabled={!valid}
            style={{
              flex:         1,
              padding:      "12px 0",
              borderRadius: "10px",
              border:       "none",
              background:   valid ? "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)" : "#1A1A2E",
              color:        valid ? "#FFF" : "#4A4A6A",
              fontSize:     "14px",
              fontWeight:   700,
              cursor:       valid ? "pointer" : "default",
              fontFamily:   "inherit",
            }}
          >
            Set schedule
          </button>
        </div>
      </div>
    </>
  );
}