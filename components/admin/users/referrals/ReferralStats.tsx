"use client";

import { Users, DollarSign, Clock, GitBranch } from "lucide-react";

const STATS = [
  {
    label:   "Total Referrals",
    value:   "3,241",
    sub:     "+124 this month",
    icon:    GitBranch,
    color:   "#16a34a",
    bg:      "#f0fdf4",
    trend:   "up",
  },
  {
    label:   "Commission Paid",
    value:   "$18,420",
    sub:     "All time",
    icon:    DollarSign,
    color:   "#7c3aed",
    bg:      "#f5f3ff",
    trend:   "up",
  },
  {
    label:   "Pending Payouts",
    value:   "$2,310",
    sub:     "47 referrers awaiting",
    icon:    Clock,
    color:   "#d97706",
    bg:      "#fffbeb",
    trend:   "neutral",
  },
  {
    label:   "Active Referrers",
    value:   "312",
    sub:     "Referred ≥1 user",
    icon:    Users,
    color:   "#0369a1",
    bg:      "#eff6ff",
    trend:   "up",
  },
];

export default function ReferralStats() {
  return (
    <div className="stats-wrap">
      {STATS.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
              <Icon size={16} />
            </div>
            <div className="stat-body">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          </div>
        );
      })}

      <style jsx>{`
        .stats-wrap {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          padding: 20px 32px 0;
        }
        .stat-card {
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          animation: cardIn 0.35s ease both;
        }
        .stat-icon {
          width: 38px; height: 38px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .stat-body { display: flex; flex-direction: column; gap: 2px; }
        .stat-label {
          font-size: 11.5px; font-weight: 600; color: #9b9aaa;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .stat-value {
          font-size: 22px; font-weight: 700; color: #0f0e1a;
          letter-spacing: -0.5px; line-height: 1.2;
        }
        .stat-sub { font-size: 12px; color: #9b9aaa; margin-top: 2px; }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}