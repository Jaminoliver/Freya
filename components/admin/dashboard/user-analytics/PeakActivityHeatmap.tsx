"use client";

import { useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = ["12a","1a","2a","3a","4a","5a","6a","7a","8a","9a","10a","11a","12p","1p","2p","3p","4p","5p","6p","7p","8p","9p","10p","11p"];

// Activity levels 0–4 per [day][hour]
const RAW: number[][] = [
  [0,0,0,0,0,0,1,2,3,3,2,2,3,2,2,3,3,4,4,3,2,2,1,1], // Mon
  [0,0,0,0,0,0,1,2,3,3,2,2,3,2,2,3,3,4,4,3,2,2,1,1], // Tue
  [0,0,0,0,0,0,1,2,3,3,2,2,3,2,2,3,3,4,4,3,2,2,1,1], // Wed
  [0,0,0,0,0,0,1,2,3,3,2,2,3,2,3,3,4,4,4,3,2,2,1,1], // Thu
  [0,0,0,0,0,0,1,2,3,3,2,2,3,2,3,3,4,4,4,4,3,3,2,1], // Fri
  [0,0,0,0,0,1,1,2,2,2,2,3,3,3,3,3,3,4,4,4,4,3,2,1], // Sat
  [0,0,0,0,0,1,1,2,2,2,2,2,3,3,3,3,3,3,3,3,3,2,1,0], // Sun
];

const COLORS = ["#f3f4f6", "#e9d5ff", "#c084fc", "#9333ea", "#6b21a8"];
const LABELS = ["Quiet", "Low", "Moderate", "High", "Peak"];

function getLabel(level: number) {
  return LABELS[level] ?? "Unknown";
}

export default function PeakActivityHeatmap() {
  const [tooltip, setTooltip] = useState<{ day: string; hour: string; level: number } | null>(null);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <span className="card-title">Peak Activity Hours</span>
          <span className="card-sub">User activity heatmap by day & hour (last 4 weeks avg)</span>
        </div>
        <div className="legend">
          {COLORS.map((c, i) => (
            <div key={i} className="leg-item">
              <div className="leg-swatch" style={{ background: c }} />
              {i === 0 && <span className="leg-text">Quiet</span>}
              {i === 4 && <span className="leg-text">Peak</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="heatmap-wrap">
        {/* Hour labels top */}
        <div className="hour-row header-row">
          <div className="day-label" />
          {HOURS.map((h) => (
            <div key={h} className="hour-label">{h}</div>
          ))}
        </div>

        {/* Grid */}
        {DAYS.map((day, di) => (
          <div key={day} className="hour-row">
            <div className="day-label">{day}</div>
            {HOURS.map((hour, hi) => {
              const level = RAW[di][hi];
              const isHov = tooltip?.day === day && tooltip?.hour === hour;
              return (
                <div
                  key={hi}
                  className={`cell ${isHov ? "hov" : ""}`}
                  style={{ background: COLORS[level] }}
                  onMouseEnter={() => setTooltip({ day, hour, level })}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="tooltip-bar">
          <span className="tt-day">{tooltip.day}</span>
          <span className="tt-sep">·</span>
          <span className="tt-hour">{tooltip.hour}</span>
          <span className="tt-sep">·</span>
          <span className="tt-level" style={{ color: COLORS[tooltip.level] === "#f3f4f6" ? "#9b9aaa" : COLORS[tooltip.level] }}>
            {getLabel(tooltip.level)}
          </span>
        </div>
      )}

      {/* Peak insight */}
      <div className="insight-row">
        <div className="insight-item">
          <div className="insight-val">6 PM – 8 PM</div>
          <div className="insight-label">Peak window daily</div>
        </div>
        <div className="insight-divider" />
        <div className="insight-item">
          <div className="insight-val">Friday</div>
          <div className="insight-label">Busiest day</div>
        </div>
        <div className="insight-divider" />
        <div className="insight-item">
          <div className="insight-val">3 AM – 5 AM</div>
          <div className="insight-label">Lowest activity</div>
        </div>
      </div>

      <style jsx>{`
        .card {
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 16px;
          padding: 20px;
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }
        .card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .card-title { font-size: 15px; font-weight: 600; color: #0f0e1a; display: block; }
        .card-sub { font-size: 12px; color: #9b9aaa; margin-top: 2px; display: block; }

        .legend { display: flex; align-items: center; gap: 4px; }
        .leg-item { display: flex; align-items: center; gap: 4px; }
        .leg-swatch { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #eeecf8; }
        .leg-text { font-size: 11px; color: #9b9aaa; }

        .heatmap-wrap { overflow-x: auto; }
        .hour-row { display: flex; align-items: center; gap: 3px; margin-bottom: 3px; }
        .header-row { margin-bottom: 4px; }
        .day-label {
          width: 32px;
          flex-shrink: 0;
          font-size: 11px;
          color: #9b9aaa;
          font-weight: 500;
          text-align: right;
          padding-right: 6px;
        }
        .hour-label {
          flex: 1;
          min-width: 20px;
          font-size: 9px;
          color: #c4c2d0;
          text-align: center;
        }
        .cell {
          flex: 1;
          min-width: 20px;
          height: 22px;
          border-radius: 4px;
          cursor: pointer;
          transition: transform 0.1s, box-shadow 0.1s;
          border: 1px solid rgba(0,0,0,0.04);
        }
        .cell.hov {
          transform: scale(1.25);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 1;
          position: relative;
        }

        .tooltip-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f9f7ff;
          border-radius: 8px;
          margin-top: 12px;
          font-size: 12.5px;
        }
        .tt-day { font-weight: 600; color: #0f0e1a; }
        .tt-hour { color: #6b6880; }
        .tt-sep { color: #d1d5db; }
        .tt-level { font-weight: 600; }

        .insight-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid #f3f4f6;
        }
        .insight-item { text-align: center; flex: 1; }
        .insight-val { font-size: 14px; font-weight: 700; color: #0f0e1a; }
        .insight-label { font-size: 11px; color: #9b9aaa; margin-top: 2px; }
        .insight-divider { width: 1px; height: 32px; background: #f3f4f6; }
      `}</style>
    </div>
  );
}