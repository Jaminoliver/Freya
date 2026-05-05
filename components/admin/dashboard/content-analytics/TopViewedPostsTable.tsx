"use client";

const posts = [
  { id: 1, creator: "Luna Rose",  handle: "@lunarose",  type: "Video", views: "284K", likes: "18.2K", comments: "3.4K", date: "May 3",  color: "#a855f7", avatar: "LR", typeColor: "#3b82f6" },
  { id: 2, creator: "Mia Storm",  handle: "@miastorm",  type: "Photo", views: "201K", likes: "14.1K", comments: "2.1K", date: "May 2",  color: "#3b82f6", avatar: "MS", typeColor: "#a855f7" },
  { id: 3, creator: "Jade Voss",  handle: "@jadevoss",  type: "Video", views: "178K", likes: "11.8K", comments: "1.8K", date: "Apr 30", color: "#ec4899", avatar: "JV", typeColor: "#3b82f6" },
  { id: 4, creator: "Aria Black", handle: "@ariablack", type: "Photo", views: "143K", likes: "9.4K",  comments: "1.2K", date: "May 1",  color: "#f59e0b", avatar: "AB", typeColor: "#a855f7" },
  { id: 5, creator: "Nova Kai",   handle: "@novakai",   type: "Audio", views: "98K",  likes: "6.2K",  comments: "890",  date: "Apr 29", color: "#10b981", avatar: "NK", typeColor: "#10b981" },
  { id: 6, creator: "Zara Night", handle: "@zaranight", type: "Video", views: "87K",  likes: "5.8K",  comments: "740",  date: "Apr 28", color: "#6366f1", avatar: "ZN", typeColor: "#3b82f6" },
  { id: 7, creator: "Elle Quinn", handle: "@ellequinn", type: "Photo", views: "74K",  likes: "4.9K",  comments: "610",  date: "Apr 27", color: "#14b8a6", avatar: "EQ", typeColor: "#a855f7" },
];

const rankEmojis = ["🥇", "🥈", "🥉"];

export default function TopViewedPostsTable() {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Top Viewed Posts</span>
        <button className="view-all">View all →</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Creator</th>
              <th>Type</th>
              <th>Views</th>
              <th>Likes</th>
              <th>Comments</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p, i) => (
              <tr key={p.id} className="row" style={{ animationDelay: `${i * 50}ms` }}>
                <td><span className="rank">{i < 3 ? rankEmojis[i] : p.id}</span></td>
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
                <td><span className="strong">{p.views}</span></td>
                <td><span className="muted">{p.likes}</span></td>
                <td><span className="muted">{p.comments}</span></td>
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
        .strong { font-size: 13px; font-weight: 700; color: #0f0e1a; }
        .muted { font-size: 13px; color: #6b6880; }
        @keyframes rowIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}