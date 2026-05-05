"use client";

const streams = [
  { creator: "Luna Rose",  handle: "@lunarose",  viewers: 4820, tips: "$1,240", duration: "2h 14m", avatar: "LR", color: "#a855f7", live: true  },
  { creator: "Mia Storm",  handle: "@miastorm",  viewers: 3102, tips: "$890",   duration: "1h 48m", avatar: "MS", color: "#3b82f6", live: true  },
  { creator: "Jade Voss",  handle: "@jadevoss",  viewers: 2481, tips: "$620",   duration: "3h 02m", avatar: "JV", color: "#ec4899", live: true  },
  { creator: "Nova Kai",   handle: "@novakai",   viewers: 1890, tips: "$480",   duration: "0h 52m", avatar: "NK", color: "#10b981", live: false },
];

const statItems = [
  { label: "Active Streams",    value: "14",     color: "#a855f7" },
  { label: "Total Viewers",     value: "28,491", color: "#3b82f6" },
  { label: "Peak Concurrent",   value: "6,240",  color: "#10b981" },
  { label: "Tips This Session", value: "$8,320", color: "#f59e0b" },
];

export default function LiveStreamStatsCard() {
  return (
    <div className="card">
      <div className="card-title">Live Stream Stats</div>

      {/* Stat row */}
      <div className="stat-grid">
        {statItems.map((s) => (
          <div key={s.label} className="stat-item">
            <div className="stat-val" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Stream list */}
      <div className="stream-list">
        <div className="list-title">Top Earning Streams</div>
        {streams.map((s) => (
          <div key={s.handle} className="stream-row">
            <div className="stream-left">
              <div className="avatar" style={{ background: s.color + "22", color: s.color }}>{s.avatar}</div>
              <div>
                <div className="stream-name">{s.creator}</div>
                <div className="stream-handle">{s.handle}</div>
              </div>
              {s.live && <span className="live-badge">● LIVE</span>}
            </div>
            <div className="stream-right">
              <div className="viewers">👁 {s.viewers.toLocaleString()}</div>
              <div className="tips">{s.tips}</div>
              <div className="duration">{s.duration}</div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .card { background: #fff; border: 1px solid #eeecf8; border-radius: 16px; padding: 20px; flex: 1; min-width: 0; box-sizing: border-box; }
        .card-title { font-size: 15px; font-weight: 600; color: #0f0e1a; margin-bottom: 16px; }
        .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 18px; }
        .stat-item { background: #f9f7ff; border-radius: 10px; padding: 12px; }
        .stat-val { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
        .stat-label { font-size: 11px; color: #9b9aaa; }
        .list-title { font-size: 12px; font-weight: 600; color: #9b9aaa; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
        .stream-list { border-top: 1px solid #f3f4f6; padding-top: 14px; }
        .stream-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f9f7ff; }
        .stream-left { display: flex; align-items: center; gap: 10px; }
        .avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
        .stream-name { font-size: 13px; font-weight: 500; color: #0f0e1a; }
        .stream-handle { font-size: 11.5px; color: #9b9aaa; }
        .live-badge { font-size: 10px; font-weight: 700; color: #ef4444; background: #fef2f2; padding: 2px 7px; border-radius: 20px; }
        .stream-right { display: flex; align-items: center; gap: 12px; text-align: right; }
        .viewers { font-size: 12px; color: #6b6880; }
        .tips { font-size: 13px; font-weight: 700; color: #0f0e1a; }
        .duration { font-size: 11.5px; color: #9b9aaa; min-width: 44px; text-align: right; }
      `}</style>
    </div>
  );
}