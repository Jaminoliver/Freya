"use client";

const items = [
  { rank: 1, creator: "Luna Rose",  handle: "@lunarose",  price: "$24.99", unlocks: 1842, revenue: "$46,030", growth: "+22%", avatar: "LR", color: "#a855f7" },
  { rank: 2, creator: "Mia Storm",  handle: "@miastorm",  price: "$19.99", unlocks: 1401, revenue: "$28,006", growth: "+17%", avatar: "MS", color: "#3b82f6" },
  { rank: 3, creator: "Jade Voss",  handle: "@jadevoss",  price: "$14.99", unlocks: 1182, revenue: "$17,719", growth: "+11%", avatar: "JV", color: "#ec4899" },
  { rank: 4, creator: "Aria Black", handle: "@ariablack", price: "$29.99", unlocks: 520,  revenue: "$15,595", growth: "+8%",  avatar: "AB", color: "#f59e0b" },
  { rank: 5, creator: "Nova Kai",   handle: "@novakai",   price: "$9.99",  unlocks: 1390, revenue: "$13,886", growth: "+6%",  avatar: "NK", color: "#10b981" },
  { rank: 6, creator: "Zara Night", handle: "@zaranight", price: "$12.99", unlocks: 880,  revenue: "$11,431", growth: "+5%",  avatar: "ZN", color: "#6366f1" },
  { rank: 7, creator: "Elle Quinn", handle: "@ellequinn", price: "$7.99",  unlocks: 1120, revenue: "$8,949",  growth: "+4%",  avatar: "EQ", color: "#14b8a6" },
];

const rankEmojis = ["🥇", "🥈", "🥉"];

export default function TopPPVContentTable() {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Top PPV Content by Revenue</span>
        <button className="view-all">View all →</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Creator</th>
              <th>PPV Price</th>
              <th>Unlocks</th>
              <th>Total Revenue</th>
              <th>Growth</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.rank} className="row" style={{ animationDelay: `${i * 50}ms` }}>
                <td><span className="rank">{i < 3 ? rankEmojis[i] : item.rank}</span></td>
                <td>
                  <div className="creator-cell">
                    <div className="avatar" style={{ background: item.color + "22", color: item.color }}>{item.avatar}</div>
                    <div>
                      <div className="creator-name">{item.creator}</div>
                      <div className="creator-handle">{item.handle}</div>
                    </div>
                  </div>
                </td>
                <td><span className="price">{item.price}</span></td>
                <td><span className="muted">{item.unlocks.toLocaleString()}</span></td>
                <td><span className="revenue">{item.revenue}</span></td>
                <td><span className="badge">{item.growth}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .card { background: #fff; border: 1px solid #eeecf8; border-radius: 16px; padding: 20px; min-width: 0; overflow: hidden; width: 100%; box-sizing: border-box; }
        .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .card-title { font-size: 15px; font-weight: 600; color: #0f0e1a; }
        .view-all { font-size: 12.5px; color: #7c3aed; background: none; border: none; cursor: pointer; font-weight: 500; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        thead th { font-size: 11px; font-weight: 600; color: #9b9aaa; text-transform: uppercase; letter-spacing: 0.06em; padding: 0 12px 10px 0; text-align: left; }
        .row { animation: rowIn 0.4s ease both; transition: background 0.15s; }
        .row:hover td { background: #faf8ff; }
        td { padding: 10px 12px 10px 0; border-top: 1px solid #f3f4f6; vertical-align: middle; }
        .rank { font-size: 15px; }
        .creator-cell { display: flex; align-items: center; gap: 10px; }
        .avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
        .creator-name { font-size: 13px; font-weight: 500; color: #0f0e1a; }
        .creator-handle { font-size: 11.5px; color: #9b9aaa; }
        .price { font-size: 13px; font-weight: 600; color: #7c3aed; }
        .revenue { font-size: 13px; font-weight: 700; color: #0f0e1a; }
        .muted { font-size: 13px; color: #6b6880; }
        .badge { display: inline-block; padding: 3px 8px; background: #f0fdf4; color: #16a34a; font-size: 11.5px; font-weight: 600; border-radius: 20px; border: 1px solid #bbf7d0; }
        @keyframes rowIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}