"use client";

import { useEffect, useRef, useState } from "react";

const platforms = [
  { label: "Web",     value: 52, users: "74,100", color: "#a855f7", icon: "🌐" },
  { label: "iOS",     value: 31, users: "44,163", color: "#3b82f6", icon: "🍎" },
  { label: "Android", value: 17, users: "24,208", color: "#10b981", icon: "🤖" },
];

export default function DevicePlatformCard() {
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    let start: number | null = null;
    function animate(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 900, 1);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Device & Platform Usage</span>
        <span className="card-sub">Where users access the platform</span>
      </div>

      {/* Stacked bar */}
      <div className="stack-wrap">
        <div className="stack-bar">
          {platforms.map((p) => (
            <div
              key={p.label}
              className="stack-seg"
              style={{
                width: `${p.value * progress}%`,
                background: p.color,
              }}
              title={`${p.label}: ${p.value}%`}
            />
          ))}
        </div>
        <div className="stack-labels">
          {platforms.map((p) => (
            <span key={p.label} className="stack-lbl" style={{ color: p.color }}>
              {p.value}%
            </span>
          ))}
        </div>
      </div>

      {/* Platform rows */}
      <div className="platform-list">
        {platforms.map((p) => (
          <div key={p.label} className="platform-row">
            <div className="platform-left">
              <span className="platform-icon">{p.icon}</span>
              <div>
                <div className="platform-name">{p.label}</div>
                <div className="platform-users">{p.users} users</div>
              </div>
            </div>
            <div className="platform-right">
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${p.value * progress}%`, background: p.color }}
                />
              </div>
              <span className="platform-pct">{p.value}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom stats */}
      <div className="bottom-stats">
        <div className="stat-item">
          <div className="stat-val">142,471</div>
          <div className="stat-label">Total Sessions</div>
        </div>
        <div className="divider" />
        <div className="stat-item">
          <div className="stat-val">3.4</div>
          <div className="stat-label">Avg. Sessions/User</div>
        </div>
        <div className="divider" />
        <div className="stat-item">
          <div className="stat-val">18m 42s</div>
          <div className="stat-label">Avg. Session Duration</div>
        </div>
      </div>

      <style jsx>{`
        .card {
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 16px;
          padding: 20px;
          flex: 1;
          min-width: 0;
          box-sizing: border-box;
        }
        .card-header { margin-bottom: 16px; }
        .card-title { font-size: 15px; font-weight: 600; color: #0f0e1a; display: block; }
        .card-sub { font-size: 12px; color: #9b9aaa; margin-top: 2px; display: block; }

        .stack-wrap { margin-bottom: 16px; }
        .stack-bar {
          display: flex;
          height: 10px;
          border-radius: 99px;
          overflow: hidden;
          background: #f3f4f6;
          gap: 2px;
        }
        .stack-seg {
          height: 100%;
          border-radius: 99px;
          transition: width 0.05s linear;
        }
        .stack-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
        }
        .stack-lbl { font-size: 11px; font-weight: 600; }

        .platform-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px; }
        .platform-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .platform-left { display: flex; align-items: center; gap: 10px; min-width: 120px; }
        .platform-icon { font-size: 18px; }
        .platform-name { font-size: 13px; font-weight: 600; color: #0f0e1a; }
        .platform-users { font-size: 11.5px; color: #9b9aaa; }
        .platform-right { display: flex; align-items: center; gap: 10px; flex: 1; }
        .bar-track { flex: 1; height: 6px; background: #f3f4f6; border-radius: 99px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 99px; transition: width 0.05s linear; }
        .platform-pct { font-size: 13px; font-weight: 700; color: #0f0e1a; width: 36px; text-align: right; }

        .bottom-stats {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0 0;
          border-top: 1px solid #f3f4f6;
        }
        .stat-item { text-align: center; flex: 1; }
        .stat-val { font-size: 16px; font-weight: 700; color: #0f0e1a; }
        .stat-label { font-size: 11px; color: #9b9aaa; margin-top: 2px; }
        .divider { width: 1px; height: 32px; background: #f3f4f6; }
      `}</style>
    </div>
  );
}