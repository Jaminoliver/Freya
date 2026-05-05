"use client";

const countries = [
  { name: "United States", code: "US", users: 48320, pct: 33.9, flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", users: 18940, pct: 13.3, flag: "🇬🇧" },
  { name: "Canada",         code: "CA", users: 12810, pct: 9.0,  flag: "🇨🇦" },
  { name: "Australia",      code: "AU", users: 10240, pct: 7.2,  flag: "🇦🇺" },
  { name: "Germany",        code: "DE", users: 8920,  pct: 6.3,  flag: "🇩🇪" },
  { name: "France",         code: "FR", users: 7640,  pct: 5.4,  flag: "🇫🇷" },
  { name: "Brazil",         code: "BR", users: 6180,  pct: 4.3,  flag: "🇧🇷" },
  { name: "Others",         code: "XX", users: 29621, pct: 20.8, flag: "🌍" },
];

const barColors = ["#a855f7","#3b82f6","#10b981","#f59e0b","#ec4899","#6366f1","#14b8a6","#94a3b8"];

export default function GeographicBreakdownCard() {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Geographic Breakdown</span>
        <span className="card-sub">Top countries by user count</span>
      </div>

      <div className="country-list">
        {countries.map((c, i) => (
          <div key={c.code} className="country-row">
            <div className="country-left">
              <span className="flag">{c.flag}</span>
              <span className="country-name">{c.name}</span>
            </div>
            <div className="bar-wrap">
              <div className="bar-fill" style={{ width: `${c.pct}%`, background: barColors[i] }} />
            </div>
            <div className="country-right">
              <span className="country-pct">{c.pct}%</span>
              <span className="country-users">{c.users.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .card {
          background: #fff; border: 1px solid #eeecf8; border-radius: 16px;
          padding: 20px; flex: 1; min-width: 0; box-sizing: border-box;
        }
        .card-header { margin-bottom: 16px; }
        .card-title { font-size: 15px; font-weight: 600; color: #0f0e1a; display: block; }
        .card-sub { font-size: 12px; color: #9b9aaa; margin-top: 2px; display: block; }
        .country-list { display: flex; flex-direction: column; gap: 10px; }
        .country-row { display: flex; align-items: center; gap: 10px; }
        .country-left { display: flex; align-items: center; gap: 8px; width: 150px; flex-shrink: 0; }
        .flag { font-size: 16px; }
        .country-name { font-size: 13px; color: #3d3b52; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bar-wrap { flex: 1; height: 8px; background: #f3f4f6; border-radius: 99px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 99px; transition: width 1s cubic-bezier(0.4,0,0.2,1); }
        .country-right { display: flex; flex-direction: column; align-items: flex-end; width: 70px; flex-shrink: 0; }
        .country-pct { font-size: 12px; font-weight: 600; color: #0f0e1a; }
        .country-users { font-size: 11px; color: #9b9aaa; }
      `}</style>
    </div>
  );
}