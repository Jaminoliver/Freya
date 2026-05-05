"use client";

const creators = [
  { rank: 1, name: "Luna Rose",   handle: "@lunarose",   revenue: "$12,840", subs: "$7,450", ppv: "$3,920", tips: "$1,470", avatar: "LR", color: "#a855f7", change: "+18%" },
  { rank: 2, name: "Mia Storm",   handle: "@miastorm",   revenue: "$9,320",  subs: "$5,820", ppv: "$2,410", tips: "$1,090", avatar: "MS", color: "#3b82f6", change: "+12%" },
  { rank: 3, name: "Jade Voss",   handle: "@jadevoss",   revenue: "$8,110",  subs: "$5,100", ppv: "$2,130", tips: "$880",   avatar: "JV", color: "#ec4899", change: "+9%"  },
  { rank: 4, name: "Aria Black",  handle: "@ariablack",  revenue: "$6,540",  subs: "$4,020", ppv: "$1,740", tips: "$780",   avatar: "AB", color: "#f59e0b", change: "+7%"  },
  { rank: 5, name: "Nova Kai",    handle: "@novakai",    revenue: "$5,290",  subs: "$3,380", ppv: "$1,320", tips: "$590",   avatar: "NK", color: "#10b981", change: "+5%"  },
  { rank: 6, name: "Zara Night",  handle: "@zaranight",  revenue: "$4,810",  subs: "$3,010", ppv: "$1,180", tips: "$620",   avatar: "ZN", color: "#6366f1", change: "+4%"  },
  { rank: 7, name: "Elle Quinn",  handle: "@ellequinn",  revenue: "$4,220",  subs: "$2,760", ppv: "$1,020", tips: "$440",   avatar: "EQ", color: "#14b8a6", change: "+3%"  },
];

const rankEmojis = ["🥇", "🥈", "🥉"];

export default function TopCreatorsRevenueTable() {
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
              <th>Total Revenue</th>
              <th>Subscriptions</th>
              <th>PPV</th>
              <th>Tips</th>
              <th>Growth</th>
            </tr>
          </thead>
          <tbody>
            {creators.map((c, i) => (
              <tr key={c.rank} className="row" style={{ animationDelay: `${i * 50}ms` }}>
                <td><span className="rank">{i < 3 ? rankEmojis[i] : c.rank}</span></td>
                <td>
                  <div className="creator-cell">
                    <div className="avatar" style={{ background: c.color + "22", color: c.color }}>{c.avatar}</div>
                    <div>
                      <div className="creator-name">{c.name}</div>
                      <div className="creator-handle">{c.handle}</div>
                    </div>
                  </div>
                </td>
                <td><span className="revenue">{c.revenue}</span></td>
                <td><span className="muted">{c.subs}</span></td>
                <td><span className="muted">{c.ppv}</span></td>
                <td><span className="muted">{c.tips}</span></td>
                <td><span className="badge">{c.change}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .card {
          background: #fff; border: 1px solid #eeecf8;
          border-radius: 16px; padding: 20px;
          min-width: 0; overflow: hidden; width: 100%; box-sizing: border-box;
        }
        .card-header {
          display: flex; align-items: center;
          justify-content: space-between; margin-bottom: 16px;
        }
        .card-title { font-size: 15px; font-weight: 600; color: #0f0e1a; }
        .view-all {
          font-size: 12.5px; color: #7c3aed; background: none;
          border: none; cursor: pointer; font-weight: 500;
        }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        thead th {
          font-size: 11px; font-weight: 600; color: #9b9aaa;
          text-transform: uppercase; letter-spacing: 0.06em;
          padding: 0 12px 10px 0; text-align: left;
        }
        .row { animation: rowIn 0.4s ease both; transition: background 0.15s; }
        .row:hover td { background: #faf8ff; }
        td { padding: 10px 12px 10px 0; border-top: 1px solid #f3f4f6; vertical-align: middle; }
        .rank { font-size: 15px; }
        .creator-cell { display: flex; align-items: center; gap: 10px; }
        .avatar {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; flex-shrink: 0;
        }
        .creator-name { font-size: 13px; font-weight: 500; color: #0f0e1a; }
        .creator-handle { font-size: 11.5px; color: #9b9aaa; }
        .revenue { font-size: 13px; font-weight: 700; color: #0f0e1a; }
        .muted { font-size: 13px; color: #6b6880; }
        .badge {
          display: inline-block; padding: 3px 8px;
          background: #f0fdf4; color: #16a34a;
          font-size: 11.5px; font-weight: 600;
          border-radius: 20px; border: 1px solid #bbf7d0;
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}