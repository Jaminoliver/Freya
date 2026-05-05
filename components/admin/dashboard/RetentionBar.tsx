"use client";

import { useEffect, useState } from "react";

export default function RetentionBar() {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, []);

  const active = 18432;
  const cancelled = 1204;
  const total = active + cancelled;
  const retentionPct = ((active / total) * 100).toFixed(1);
  const activePct = (active / total) * 100;

  return (
    <div className="retention-wrap">
      <div className="retention-labels">
        <span className="label-active">{active.toLocaleString()} Active</span>
        <span className="label-retention">{retentionPct}% retention rate</span>
        <span className="label-cancelled">{cancelled.toLocaleString()} Cancelled</span>
      </div>

      <div className="bar-track">
        <div
          className="bar-active"
          style={{ width: animated ? `${activePct}%` : "0%" }}
        />
        <div
          className="bar-cancelled"
          style={{ width: animated ? `${100 - activePct}%` : "0%" }}
        />
      </div>

      <style jsx>{`
        .retention-wrap {
          margin: 20px 32px 0;
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 14px;
          padding: 16px 20px;
        }
        .retention-labels {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .label-active {
          font-size: 13px;
          font-weight: 600;
          color: #7c3aed;
        }
        .label-retention {
          font-size: 13px;
          font-weight: 600;
          color: #0f0e1a;
        }
        .label-cancelled {
          font-size: 13px;
          font-weight: 600;
          color: #ef4444;
        }
        .bar-track {
          height: 10px;
          border-radius: 99px;
          background: #f3f4f6;
          display: flex;
          overflow: hidden;
          gap: 2px;
        }
        .bar-active {
          height: 100%;
          background: linear-gradient(90deg, #a855f7, #7c3aed);
          border-radius: 99px 0 0 99px;
          transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .bar-cancelled {
          height: 100%;
          background: #ef4444;
          border-radius: 0 99px 99px 0;
          transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}