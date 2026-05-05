"use client";

const fans = [
  { rank: 1, name: "James Vega",    handle: "@jvega",    spent: "$3,240", subs: 8,  tips: "$1,120", ppv: "$890",  avatar: "JV", color: "#a855f7", joined: "Jan 2024" },
  { rank: 2, name: "Marco Reyes",   handle: "@marcor",   spent: "$2,910", subs: 6,  tips: "$980",   ppv: "$760",  avatar: "MR", color: "#3b82f6", joined: "Mar 2023" },
  { rank: 3, name: "Tyler Brooks",  handle: "@tylerb",   spent: "$2,580", subs: 5,  tips: "$820",   ppv: "$640",  avatar: "TB", color: "#ec4899", joined: "Feb 2024" },
  { rank: 4, name: "Leo Huang",     handle: "@leohuang", spent: "$2,100", subs: 4,  tips: "$670",   ppv: "$510",  avatar: "LH", color: "#f59e0b", joined: "Jun 2023" },
  { rank: 5, name: "Ryan Cole",     handle: "@rcole",    spent: "$1,870", subs: 4,  tips: "$590",   ppv: "$440",  avatar: "RC", color: "#10b981", joined: "Aug 2023" },
  { rank: 6, name: "Ethan Miles",   handle: "@emiles",   spent: "$1,640", subs: 3,  tips: "$490",   ppv: "$380",  avatar: "EM", color: "#6366f1", joined: "Nov 2023" },
  { rank: 7, name: "Noah Sinclair", handle: "@noahs",    spent: "$1,420", subs: 3,  tips: "$410",   ppv: "$320",  avatar: "NS", color: "#14b8a6", joined: "Apr 2024" },
];

const rankEmojis = ["🥇", "🥈", "🥉"];

export default function TopSpendingFansTable() {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Top Spending Fans</span>
        <button className="view-all">View all →</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Fan</th>
              <th>Total Spent</th>
              <th>Subscriptions</th>
              <th>Tips</th>
              <th>PPV</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {fans.map((f, i) => (
              <tr key={f.rank} className="row" style={{ animationDelay: `${i * 50}ms` }}>
                <td><span className="rank">{i < 3 ? rankEmojis[i] : f.rank}</span></td>
                <td>
                  <div className="fan-cell">
                    <div className="avatar" style={{ background: f.color + "22", color: f.color }}>{f.avatar}</div>
                    <div>
                      <div className="fan-name">{f.name}</div>
                      <div className="fan-handle">{f.handle}</div>
                    </div>
                  </div>
                </td>
                <td><span className="spent">{f.spent}</span></td>
                <td><span className="muted">{f.subs} creators</span></td>
                <td><span className="muted">{f.tips}</span></td>
                <td><span className="muted">{f.ppv}</span></td>
                <td><span className="joined">{f.joined}</span></td>
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
        .fan-cell { display: flex; align-items: center; gap: 10px; }
        .avatar {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; flex-shrink: 0;
        }
        .fan-name { font-size: 13px; font-weight: 500; color: #0f0e1a; }
        .fan-handle { font-size: 11.5px; color: #9b9aaa; }
        .spent { font-size: 13px; font-weight: 700; color: #0f0e1a; }
        .muted { font-size: 13px; color: #6b6880; }
        .joined { font-size: 12px; color: #9b9aaa; }
        @keyframes rowIn {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}