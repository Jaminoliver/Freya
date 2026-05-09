"use client";

import { useState } from "react";
import { Clock, TrendingUp } from "lucide-react";
import ReferralRowActions from "./ReferralRowActions";
import ReferralTreePanel from "./ReferralTreePanel";

export interface ReferredUser {
  name:      string;
  email:     string;
  initials:  string;
  color:     string;
  joinedAt:  string;
  commission: string;
}

export interface Referrer {
  id:             string;
  name:           string;
  email:          string;
  username:       string;
  initials:       string;
  color:          string;
  referredCount:  number;
  commissionEarned: string;
  pendingPayout:  string;
  totalPaid:      string;
  joinedAt:       string;
  payoutStatus:   "pending" | "paid" | "none";
  referredUsers:  ReferredUser[];
}

const MOCK: Referrer[] = [
  {
    id:"1", name:"Luna Rose",   email:"luna@example.com",  username:"lunarose",  initials:"LR", color:"#a855f7",
    referredCount:42, commissionEarned:"$840.00", pendingPayout:"$120.00", totalPaid:"$720.00",
    joinedAt:"Jan 10, 2024", payoutStatus:"pending",
    referredUsers:[
      { name:"Jade Voss",  email:"jade@example.com",  initials:"JV", color:"#3b82f6", joinedAt:"Feb 1, 2024",  commission:"$20.00" },
      { name:"Rena Wolf",  email:"rena@example.com",  initials:"RW", color:"#14b8a6", joinedAt:"Feb 5, 2024",  commission:"$20.00" },
      { name:"Zoe Blake",  email:"zoe@example.com",   initials:"ZB", color:"#f59e0b", joinedAt:"Mar 2, 2024",  commission:"$20.00" },
    ],
  },
  {
    id:"2", name:"Mia Storm",   email:"mia@example.com",   username:"miastorm",  initials:"MS", color:"#ec4899",
    referredCount:28, commissionEarned:"$560.00", pendingPayout:"$80.00",  totalPaid:"$480.00",
    joinedAt:"Mar 5, 2024",  payoutStatus:"pending",
    referredUsers:[
      { name:"Nova Kai",   email:"nova@example.com",  initials:"NK", color:"#f97316", joinedAt:"Apr 1, 2024",  commission:"$20.00" },
      { name:"Aria Black", email:"aria@example.com",  initials:"AB", color:"#10b981", joinedAt:"Apr 10, 2024", commission:"$20.00" },
    ],
  },
  {
    id:"3", name:"Aria Black",  email:"aria@example.com",  username:"ariablack", initials:"AB", color:"#10b981",
    referredCount:15, commissionEarned:"$300.00", pendingPayout:"$0.00",   totalPaid:"$300.00",
    joinedAt:"Apr 12, 2024", payoutStatus:"paid",
    referredUsers:[
      { name:"Finn Cruz",  email:"finn@example.com",  initials:"FC", color:"#0ea5e9", joinedAt:"May 1, 2024",  commission:"$20.00" },
    ],
  },
  {
    id:"4", name:"Nova Kai",    email:"nova@example.com",  username:"novakai",   initials:"NK", color:"#f97316",
    referredCount:9,  commissionEarned:"$180.00", pendingPayout:"$60.00",  totalPaid:"$120.00",
    joinedAt:"May 1, 2024",  payoutStatus:"pending",
    referredUsers:[
      { name:"Sam Torres", email:"sam@example.com",   initials:"ST", color:"#6366f1", joinedAt:"May 15, 2024", commission:"$20.00" },
    ],
  },
  {
    id:"5", name:"Zoe Blake",   email:"zoe@example.com",   username:"zoeblake",  initials:"ZB", color:"#f59e0b",
    referredCount:5,  commissionEarned:"$100.00", pendingPayout:"$0.00",   totalPaid:"$100.00",
    joinedAt:"Jun 1, 2024",  payoutStatus:"paid",
    referredUsers:[],
  },
  {
    id:"6", name:"Theo Park",   email:"theo@example.com",  username:"theopark",  initials:"TP", color:"#14b8a6",
    referredCount:3,  commissionEarned:"$60.00",  pendingPayout:"$60.00",  totalPaid:"$0.00",
    joinedAt:"Jun 3, 2024",  payoutStatus:"pending",
    referredUsers:[],
  },
];

const PAYOUT_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  pending: { bg: "#fffbeb", color: "#d97706", dot: "#d97706" },
  paid:    { bg: "#f0fdf4", color: "#16a34a", dot: "#16a34a" },
  none:    { bg: "#f5f4f9", color: "#9b9aaa", dot: "#d1d5db" },
};

interface Props { search: string; tab: string; }

export default function ReferralTable({ search, tab }: Props) {
  const [referrers,      setReferrers]      = useState<Referrer[]>(MOCK);
  const [selectedReferrer, setSelectedReferrer] = useState<Referrer | null>(null);

  const filtered = referrers.filter((r) => {
    const q           = search.toLowerCase();
    const matchSearch = !q ||
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.username.toLowerCase().includes(q);
    const matchTab =
      tab === "all" ||
      (tab === "pending" && r.payoutStatus === "pending") ||
      (tab === "paid"    && r.payoutStatus === "paid");
    return matchSearch && matchTab;
  });

  const handleAction = (action: string, referrer: Referrer) => {
    if (action === "tree" || action === "payouts") return setSelectedReferrer(referrer);
    if (action === "markpaid") {
      setReferrers((prev) => prev.map((r) =>
        r.id === referrer.id
          ? { ...r, payoutStatus: "paid", totalPaid: r.commissionEarned, pendingPayout: "$0.00" }
          : r
      ));
    }
  };

  return (
    <>
      <div className="table-wrap">
        <div className="card">
          <div className="result-count">
            {filtered.length} referrer{filtered.length !== 1 ? "s" : ""} found
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Referrer</th>
                  <th>Referred Users</th>
                  <th>Commission Earned</th>
                  <th>Total Paid</th>
                  <th>Pending Payout</th>
                  <th>Payout Status</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign:"center", padding:"48px 0", color:"#9b9aaa", fontSize:"14px" }}>
                      No referrers match your filters
                    </td>
                  </tr>
                )}
                {filtered.map((r, i) => {
                  const ps = PAYOUT_STYLES[r.payoutStatus];
                  return (
                    <tr
                      key={r.id}
                      className="ref-row"
                      style={{ animationDelay:`${i * 40}ms` }}
                      onClick={() => setSelectedReferrer(r)}
                    >
                      {/* Referrer */}
                      <td>
                        <div className="user-cell">
                          <div className="avatar" style={{ background: r.color + "22", color: r.color }}>
                            {r.initials}
                          </div>
                          <div>
                            <div className="user-name">{r.name}</div>
                            <div className="user-email">{r.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Referred count */}
                      <td>
                        <div className="referred-cell">
                          <TrendingUp size={12} style={{ color: "#16a34a" }} />
                          <span className="referred-count">{r.referredCount}</span>
                          <span className="referred-label">users</span>
                        </div>
                      </td>

                      {/* Commission */}
                      <td><span className="money green">{r.commissionEarned}</span></td>

                      {/* Total paid */}
                      <td><span className="money">{r.totalPaid}</span></td>

                      {/* Pending */}
                      <td>
                        <span className={`money ${r.pendingPayout !== "$0.00" ? "orange" : "muted"}`}>
                          {r.pendingPayout}
                        </span>
                      </td>

                      {/* Payout status */}
                      <td>
                        <span className="status-badge" style={{ background: ps.bg, color: ps.color }}>
                          <span className="dot" style={{ background: ps.dot }} />
                          {r.payoutStatus === "none" ? "—" : r.payoutStatus.charAt(0).toUpperCase() + r.payoutStatus.slice(1)}
                        </span>
                      </td>

                      {/* Joined */}
                      <td>
                        <div className="joined-cell">
                          <Clock size={12} style={{ color: "#b8b6cc" }} />
                          <span className="joined-date">{r.joinedAt}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <ReferralRowActions referrer={r} onAction={handleAction} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedReferrer && (
        <ReferralTreePanel
          referrer={selectedReferrer}
          onClose={() => setSelectedReferrer(null)}
          onMarkPaid={(r) => handleAction("markpaid", r)}
        />
      )}

      <style jsx>{`
        .table-wrap { padding: 16px 32px 0; }
        .card { background: #fff; border: 1px solid #eeecf8; border-radius: 16px; overflow: hidden; }
        .result-count {
          padding: 14px 20px; font-size: 12.5px;
          color: #9b9aaa; font-weight: 500; border-bottom: 1px solid #f3f4f6;
        }
        .table-scroll { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        thead th {
          font-size: 11px; font-weight: 600; color: #9b9aaa;
          text-transform: uppercase; letter-spacing: 0.06em;
          padding: 12px 16px; text-align: left;
          background: #faf9fe; border-bottom: 1px solid #f3f4f6; white-space: nowrap;
        }
        .ref-row { animation: rowIn 0.35s ease both; cursor: pointer; transition: background 0.15s; }
        .ref-row:hover td { background: #f8fdf9; }
        td { padding: 12px 16px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; font-size: 13px; }
        .ref-row:last-child td { border-bottom: none; }
        .user-cell  { display: flex; align-items: center; gap: 10px; }
        .avatar {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; flex-shrink: 0;
        }
        .user-name  { font-size: 13.5px; font-weight: 600; color: #0f0e1a; }
        .user-email { font-size: 12px; color: #9b9aaa; margin-top: 1px; }
        .referred-cell { display: flex; align-items: center; gap: 5px; }
        .referred-count { font-size: 14px; font-weight: 700; color: #0f0e1a; }
        .referred-label { font-size: 12px; color: #9b9aaa; }
        .money       { font-size: 13px; font-weight: 600; color: #3d3b52; font-family: monospace; }
        .money.green  { color: #16a34a; }
        .money.orange { color: #d97706; }
        .money.muted  { color: #b8b6cc; }
        .status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
        }
        .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .joined-cell { display: flex; align-items: center; gap: 5px; }
        .joined-date { font-size: 12.5px; color: #6b6a80; }
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}