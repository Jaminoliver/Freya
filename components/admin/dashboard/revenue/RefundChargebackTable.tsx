"use client";

import { useState } from "react";

type Filter = "All" | "Refund" | "Chargeback";

const transactions = [
  { id: "TXN-8821", user: "James Vega",   handle: "@jvega",   type: "Chargeback", amount: "$49.99",  gateway: "Stripe",  date: "May 4, 2025",  status: "open",     reason: "Unauthorized charge",  avatar: "JV", color: "#a855f7" },
  { id: "TXN-8790", user: "Sara Kim",     handle: "@sarakim", type: "Refund",     amount: "$14.99",  gateway: "PayPal",  date: "May 3, 2025",  status: "resolved", reason: "Accidental purchase",  avatar: "SK", color: "#3b82f6" },
  { id: "TXN-8754", user: "Mike Torres",  handle: "@mikt",    type: "Chargeback", amount: "$99.99",  gateway: "CCBill",  date: "May 2, 2025",  status: "open",     reason: "Service not received", avatar: "MT", color: "#ec4899" },
  { id: "TXN-8712", user: "Anna Lee",     handle: "@annalee", type: "Refund",     amount: "$29.99",  gateway: "Stripe",  date: "May 1, 2025",  status: "resolved", reason: "Duplicate charge",     avatar: "AL", color: "#f59e0b" },
  { id: "TXN-8698", user: "Raj Patel",    handle: "@rajp",    type: "Refund",     amount: "$9.99",   gateway: "PayPal",  date: "Apr 30, 2025", status: "resolved", reason: "Cancelled subscription", avatar: "RP", color: "#10b981" },
  { id: "TXN-8650", user: "Chris Moon",   handle: "@cmoon",   type: "Chargeback", amount: "$149.99", gateway: "Stripe",  date: "Apr 29, 2025", status: "open",     reason: "Fraud claim",          avatar: "CM", color: "#6366f1" },
];

const statusStyle: Record<string, { bg: string; text: string }> = {
  open:     { bg: "#fef2f2", text: "#dc2626" },
  resolved: { bg: "#f0fdf4", text: "#16a34a" },
};

const typeStyle: Record<string, { bg: string; text: string }> = {
  Refund:     { bg: "#eff6ff", text: "#2563eb" },
  Chargeback: { bg: "#fff7ed", text: "#ea580c" },
};

export default function RefundChargebackTable() {
  const [filter, setFilter] = useState<Filter>("All");

  const filtered = transactions.filter(t => filter === "All" || t.type === filter);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <span className="card-title">Refunds & Chargebacks</span>
          <span className="card-count"> · {filtered.length} records</span>
        </div>
        <div className="toggle-group">
          {(["All", "Refund", "Chargeback"] as Filter[]).map(f => (
            <button key={f} className={`toggle-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Transaction</th>
              <th>User</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Gateway</th>
              <th>Reason</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => {
              const ss = statusStyle[t.status];
              const ts = typeStyle[t.type];
              return (
                <tr key={t.id} className="row" style={{ animationDelay: `${i * 40}ms` }}>
                  <td><span className="txn-id">{t.id}</span></td>
                  <td>
                    <div className="user-cell">
                      <div className="avatar" style={{ background: t.color + "22", color: t.color }}>{t.avatar}</div>
                      <div>
                        <div className="user-name">{t.user}</div>
                        <div className="user-handle">{t.handle}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="type-badge" style={{ background: ts.bg, color: ts.text }}>{t.type}</span></td>
                  <td><span className="amount">{t.amount}</span></td>
                  <td><span className="gateway">{t.gateway}</span></td>
                  <td><span className="reason">{t.reason}</span></td>
                  <td><span className="date">{t.date}</span></td>
                  <td><span className="status-badge" style={{ background: ss.bg, color: ss.text }}>{t.status}</span></td>
                </tr>
              );
            })}
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
          justify-content: space-between; margin-bottom: 16px; gap: 10px; flex-wrap: wrap;
        }
        .card-title { font-size: 15px; font-weight: 600; color: #0f0e1a; }
        .card-count { font-size: 13px; color: #9b9aaa; }
        .toggle-group {
          display: flex; background: #f5f3ff;
          border-radius: 8px; padding: 3px; gap: 2px;
        }
        .toggle-btn {
          padding: 5px 12px; border: none; border-radius: 6px;
          font-size: 12px; font-weight: 500; cursor: pointer;
          background: transparent; color: #9b9aaa; transition: all 0.2s;
        }
        .toggle-btn.active { background: #fff; color: #7c3aed; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        thead th {
          font-size: 11px; font-weight: 600; color: #9b9aaa;
          text-transform: uppercase; letter-spacing: 0.06em;
          padding: 0 12px 10px 0; text-align: left; white-space: nowrap;
        }
        .row { animation: rowIn 0.35s ease both; }
        .row:hover td { background: #faf8ff; }
        td { padding: 10px 12px 10px 0; border-top: 1px solid #f3f4f6; vertical-align: middle; }
        .txn-id { font-size: 12px; font-family: monospace; color: #6b6880; }
        .user-cell { display: flex; align-items: center; gap: 8px; }
        .avatar {
          width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; flex-shrink: 0;
        }
        .user-name { font-size: 13px; font-weight: 500; color: #0f0e1a; }
        .user-handle { font-size: 11px; color: #9b9aaa; }
        .type-badge, .status-badge {
          font-size: 11.5px; font-weight: 600; padding: 3px 8px;
          border-radius: 20px; white-space: nowrap;
        }
        .amount { font-size: 13px; font-weight: 600; color: #dc2626; }
        .gateway { font-size: 12px; color: #6b6880; }
        .reason { font-size: 12px; color: #3d3b52; }
        .date { font-size: 12px; color: #9b9aaa; white-space: nowrap; }
        @keyframes rowIn {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}