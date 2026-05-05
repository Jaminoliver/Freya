"use client";

const posts = [
  { rank: 1, creator: "Luna Rose",  handle: "@lunarose",  type: "Video", tips: "$4,820", tippers: 312, avgTip: "$15.45", date: "May 3",  avatar: "LR", color: "#a855f7", typeColor: "#3b82f6" },
  { rank: 2, creator: "Mia Storm",  handle: "@miastorm",  type: "Photo", tips: "$3,210", tippers: 248, avgTip: "$12.94", date: "May 2",  avatar: "MS", color: "#3b82f6", typeColor: "#a855f7" },
  { rank: 3, creator: "Jade Voss",  handle: "@jadevoss",  type: "Video", tips: "$2,940", tippers: 201, avgTip: "$14.63", date: "Apr 30", avatar: "JV", color: "#ec4899", typeColor: "#3b82f6" },
  { rank: 4, creator: "Aria Black", handle: "@ariablack", type: "Photo", tips: "$2,180", tippers: 184, avgTip: "$11.85", date: "May 1",  avatar: "AB", color: "#f59e0b", typeColor: "#a855f7" },
  { rank: 5, creator: "Nova Kai",   handle: "@novakai",   type: "Audio", tips: "$1,760", tippers: 153, avgTip: "$11.50", date: "Apr 29", avatar: "NK", color: "#10b981", typeColor: "#10b981" },
  { rank: 6, creator: "Zara Night", handle: "@zaranight", type: "Video", tips: "$1,430", tippers: 118, avgTip: "$12.12", date: "Apr 28", avatar: "ZN", color: "#6366f1", typeColor: "#3b82f6" },
  { rank: 7, creator: "Elle Quinn", handle: "@ellequinn", type: "Photo", tips: "$1,120", tippers: 98,  avgTip: "$11.43", date: "Apr 27", avatar: "EQ", color: "#14b8a6", typeColor: "#a855f7" },
];

const rankEmojis = ["🥇", "🥈", "🥉"];

export default function TopTippedPostsTable() {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Top Tipped Posts</span>
        <button className="view-all">View all →</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Creator</th>
              <th>Type</th>
              <th>Total Tips</th>
              <th>Tippers</th>
              <th>Avg Tip</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p, i) => (
              <tr key={p.rank} className="row" style={{ animationDelay: `${i * 50}ms` }}>
                <td><span className="rank">{i < 3 ? rankEmojis[i] : p.rank}</span></td>
                <td>
                  <div className="creator-cell">
                    <div className="avatar" style={{ background: p.color + "22", color: p.color }}>{p.avatar}</div>
                    <div>
                      <div className="creator-name">{p.creator}</div>
                      <div className="creator-handle">{p.handle}</div>
                    </div>
                  </div>
                </td>
                <td><span className="type-badge" style={{ background: p.typeColor + "18", color: p.typeColor }}>{p.type}</span></td>
                <td><span className="tips">{p.tips}</span></td>
                <td><span className="muted">{p.tippers}</span></td>
                <td><span className="muted">{p.avgTip}</span></td>
                <td><span className="muted">{p.date}</span></td>
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
        .type-badge { font-size: 11.5px; font-weight: 600; padding: 3px 8px; border-radius: 20px; }
        .tips { font-size: 13px; font-weight: 700; color: #0f0e1a; }
        .muted { font-size: 13px; color: #6b6880; }
        @keyframes rowIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}