"use client";

const creators = [
  { rank: 1, name: "Luna Rose", handle: "@lunarose", revenue: "$12,840", subs: 3241, trend: "+18%", avatar: "LR", color: "#a855f7" },
  { rank: 2, name: "Mia Storm", handle: "@miastorm", revenue: "$9,320", subs: 2108, trend: "+12%", avatar: "MS", color: "#3b82f6" },
  { rank: 3, name: "Jade Voss", handle: "@jadevoss", revenue: "$8,110", subs: 1876, trend: "+9%", avatar: "JV", color: "#ec4899" },
  { rank: 4, name: "Aria Black", handle: "@ariablack", revenue: "$6,540", subs: 1432, trend: "+7%", avatar: "AB", color: "#f59e0b" },
  { rank: 5, name: "Nova Kai", handle: "@novakai", revenue: "$5,290", subs: 1198, trend: "+5%", avatar: "NK", color: "#10b981" },
];

const rankColors = ["#f59e0b", "#9b9aaa", "#cd7c4a"];

export default function TopCreatorsTable() {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Top Earning Creators</span>
        <button className="view-all">View all →</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Creator</th>
              <th>Revenue</th>
              <th>Subscribers</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {creators.map((c, i) => (
              <tr key={c.rank} style={{ animationDelay: `${i * 60}ms` }} className="creator-row">
                <td>
                  <span className="rank" style={{ color: i < 3 ? rankColors[i] : "#9b9aaa" }}>
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : c.rank}
                  </span>
                </td>
                <td>
                  <div className="creator-cell">
                    <div className="avatar" style={{ background: c.color + "22", color: c.color }}>
                      {c.avatar}
                    </div>
                    <div>
                      <div className="creator-name">{c.name}</div>
                      <div className="creator-handle">{c.handle}</div>
                    </div>
                  </div>
                </td>
                <td><span className="revenue">{c.revenue}</span></td>
                <td><span className="subs">{c.subs.toLocaleString()}</span></td>
                <td>
                  <span className="trend-badge">{c.trend}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .card {
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 16px;
          padding: 20px;
          flex: 1;
          min-width: 0;
        }
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .card-title {
          font-size: 15px;
          font-weight: 600;
          color: #0f0e1a;
        }
        .view-all {
          font-size: 12.5px;
          color: #7c3aed;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: opacity 0.2s;
        }
        .view-all:hover { opacity: 0.7; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        thead th {
          font-size: 11px;
          font-weight: 600;
          color: #9b9aaa;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 0 12px 10px 0;
          text-align: left;
        }
        .creator-row {
          animation: rowIn 0.4s ease both;
          transition: background 0.15s;
        }
        .creator-row:hover td { background: #faf8ff; }
        td {
          padding: 10px 12px 10px 0;
          border-top: 1px solid #f3f4f6;
          vertical-align: middle;
        }
        .rank { font-size: 15px; }
        .creator-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .creator-name {
          font-size: 13px;
          font-weight: 500;
          color: #0f0e1a;
        }
        .creator-handle {
          font-size: 11.5px;
          color: #9b9aaa;
          margin-top: 1px;
        }
        .revenue {
          font-size: 13px;
          font-weight: 600;
          color: #0f0e1a;
        }
        .subs {
          font-size: 13px;
          color: #3d3b52;
        }
        .trend-badge {
          display: inline-block;
          padding: 3px 8px;
          background: #f0fdf4;
          color: #16a34a;
          font-size: 11.5px;
          font-weight: 600;
          border-radius: 20px;
          border: 1px solid #bbf7d0;
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}