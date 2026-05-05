"use client";

import { UserPlus, Flag, DollarSign, ShieldAlert, CheckCircle, XCircle } from "lucide-react";

const activities = [
  { icon: UserPlus, color: "#7c3aed", bg: "#f3eeff", label: "New signup", desc: "jade_voss joined the platform", time: "2 min ago" },
  { icon: Flag, color: "#ef4444", bg: "#fef2f2", label: "Content flagged", desc: "Post #8821 flagged for review", time: "8 min ago" },
  { icon: DollarSign, color: "#16a34a", bg: "#f0fdf4", label: "Payout processed", desc: "$3,240 sent to Luna Rose", time: "15 min ago" },
  { icon: ShieldAlert, color: "#f59e0b", bg: "#fffbeb", label: "KYC submitted", desc: "mia_storm submitted ID docs", time: "22 min ago" },
  { icon: CheckCircle, color: "#2563eb", bg: "#eff6ff", label: "Creator approved", desc: "nova_kai approved as creator", time: "34 min ago" },
  { icon: XCircle, color: "#dc2626", bg: "#fef2f2", label: "Account banned", desc: "spam_user99 permanently banned", time: "1 hr ago" },
  { icon: DollarSign, color: "#16a34a", bg: "#f0fdf4", label: "Payout processed", desc: "$1,890 sent to Aria Black", time: "1.5 hr ago" },
];

export default function RecentActivityFeed() {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Recent Activity</span>
        <span className="live-badge">
          <span className="live-dot" /> Live
        </span>
      </div>

      <div className="feed">
        {activities.map((a, i) => {
          const Icon = a.icon;
          return (
            <div key={i} className="feed-item" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="feed-icon" style={{ background: a.bg }}>
                <Icon size={14} color={a.color} />
              </div>
              <div className="feed-content">
                <div className="feed-label">{a.label}</div>
                <div className="feed-desc">{a.desc}</div>
              </div>
              <span className="feed-time">{a.time}</span>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .card {
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 16px;
          padding: 20px;
          min-width: 280px;
          max-width: 340px;
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
        .live-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          background: #fef2f2;
          border-radius: 20px;
          font-size: 11.5px;
          font-weight: 600;
          color: #dc2626;
        }
        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ef4444;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .feed {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .feed-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 6px;
          border-radius: 9px;
          transition: background 0.15s;
          animation: itemIn 0.35s ease both;
          cursor: default;
        }
        .feed-item:hover { background: #faf8ff; }
        .feed-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .feed-content { flex: 1; min-width: 0; }
        .feed-label {
          font-size: 12px;
          font-weight: 600;
          color: #0f0e1a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .feed-desc {
          font-size: 11.5px;
          color: #9b9aaa;
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .feed-time {
          font-size: 11px;
          color: #c4c3cf;
          flex-shrink: 0;
          white-space: nowrap;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes itemIn {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}