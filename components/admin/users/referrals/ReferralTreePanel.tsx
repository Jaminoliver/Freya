"use client";

import { X, GitBranch, DollarSign, CheckCircle, Clock, TrendingUp } from "lucide-react";
import type { Referrer } from "./ReferralTable";

interface Props {
  referrer:   Referrer;
  onClose:    () => void;
  onMarkPaid: (r: Referrer) => void;
}

export default function ReferralTreePanel({ referrer, onClose, onMarkPaid }: Props) {
  const hasPending = referrer.pendingPayout !== "$0.00";

  return (
    <>
      <div className="backdrop" onClick={onClose} />

      <div className="panel">

        {/* Header */}
        <div className="panel-header">
          <div className="user-info">
            <div className="avatar" style={{ background: referrer.color + "22", color: referrer.color }}>
              {referrer.initials}
            </div>
            <div>
              <div className="user-name">{referrer.name}</div>
              <div className="user-meta">@{referrer.username} · {referrer.email}</div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Summary cards */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-icon green"><TrendingUp size={14} /></div>
            <div>
              <div className="summary-label">Referred</div>
              <div className="summary-value">{referrer.referredCount} users</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon purple"><DollarSign size={14} /></div>
            <div>
              <div className="summary-label">Earned</div>
              <div className="summary-value">{referrer.commissionEarned}</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon orange"><Clock size={14} /></div>
            <div>
              <div className="summary-label">Pending</div>
              <div className="summary-value">{referrer.pendingPayout}</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon blue"><CheckCircle size={14} /></div>
            <div>
              <div className="summary-label">Paid Out</div>
              <div className="summary-value">{referrer.totalPaid}</div>
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* Referral tree */}
        <div className="section">
          <div className="section-label">
            <GitBranch size={13} style={{ display:"inline", marginRight:6, verticalAlign:"middle" }} />
            Referral Tree
          </div>

          {/* Root node */}
          <div className="tree-root">
            <div className="root-avatar" style={{ background: referrer.color + "22", color: referrer.color }}>
              {referrer.initials}
            </div>
            <div>
              <div className="root-name">{referrer.name}</div>
              <div className="root-sub">Referrer · {referrer.referredCount} referrals</div>
            </div>
          </div>

          {/* Referred users */}
          {referrer.referredUsers.length === 0 ? (
            <div className="empty-tree">No referred users on record</div>
          ) : (
            <div className="tree-children">
              {referrer.referredUsers.map((u, i) => (
                <div key={i} className="tree-child" style={{ animationDelay:`${i * 50}ms` }}>
                  <div className="tree-line" />
                  <div className="child-node">
                    <div className="child-avatar" style={{ background: u.color + "22", color: u.color }}>
                      {u.initials}
                    </div>
                    <div className="child-info">
                      <div className="child-name">{u.name}</div>
                      <div className="child-meta">{u.email} · Joined {u.joinedAt}</div>
                    </div>
                    <div className="child-commission">{u.commission}</div>
                  </div>
                </div>
              ))}
              {referrer.referredCount > referrer.referredUsers.length && (
                <div className="more-refs">
                  +{referrer.referredCount - referrer.referredUsers.length} more referrals not shown
                </div>
              )}
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Payout history */}
        <div className="section">
          <div className="section-label">Payout History</div>
          <div className="payout-list">
            {referrer.totalPaid !== "$0.00" ? (
              <div className="payout-item">
                <div className="payout-dot paid" />
                <div>
                  <div className="payout-amount">{referrer.totalPaid} paid out</div>
                  <div className="payout-meta">All time total · Platform commission</div>
                </div>
              </div>
            ) : (
              <div className="empty-list">No payouts yet</div>
            )}
            {hasPending && (
              <div className="payout-item">
                <div className="payout-dot pending" />
                <div>
                  <div className="payout-amount">{referrer.pendingPayout} pending</div>
                  <div className="payout-meta">Awaiting approval</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="panel-footer">
          <button className="btn-close" onClick={onClose}>Close</button>
          {hasPending && (
            <button className="btn-markpaid" onClick={() => { onMarkPaid(referrer); onClose(); }}>
              <CheckCircle size={13} />
              Mark as Paid
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .backdrop {
          position: fixed; inset: 0;
          background: rgba(15,14,26,0.35);
          backdrop-filter: blur(3px);
          z-index: 150; animation: fadeIn 0.2s ease;
        }
        .panel {
          position: fixed; top: 0; right: 0;
          width: 440px; height: 100vh;
          background: #fff; border-left: 1px solid #eeecf8;
          box-shadow: -8px 0 40px rgba(15,14,26,0.12);
          z-index: 160; display: flex; flex-direction: column;
          animation: slideIn 0.28s cubic-bezier(0.34,1.2,0.64,1);
          overflow-y: auto;
        }
        .panel-header {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 22px 20px 16px;
          border-bottom: 1px solid #f3f4f6; gap: 12px;
        }
        .user-info { display: flex; gap: 12px; align-items: center; flex: 1; min-width: 0; }
        .avatar {
          width: 42px; height: 42px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; flex-shrink: 0;
        }
        .user-name { font-size: 15px; font-weight: 700; color: #0f0e1a; }
        .user-meta { font-size: 12px; color: #9b9aaa; margin-top: 2px; }
        .close-btn {
          width: 28px; height: 28px; border-radius: 8px;
          border: 1px solid #e4e2f2; background: #fff; color: #9b9aaa;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; font-family: inherit; flex-shrink: 0;
        }
        .close-btn:hover { background: #f5f4f9; color: #3d3b52; }
        .summary-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; padding: 16px 20px;
        }
        .summary-card {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; background: #faf9fe;
          border: 1px solid #eeecf8; border-radius: 10px;
        }
        .summary-icon {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .summary-icon.green  { background: #f0fdf4; color: #16a34a; }
        .summary-icon.purple { background: #f5f3ff; color: #7c3aed; }
        .summary-icon.orange { background: #fffbeb; color: #d97706; }
        .summary-icon.blue   { background: #eff6ff; color: #0369a1; }
        .summary-label { font-size: 11px; color: #9b9aaa; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
        .summary-value { font-size: 14px; font-weight: 700; color: #0f0e1a; margin-top: 1px; }
        .section { padding: 16px 20px; }
        .section-label {
          font-size: 11.5px; font-weight: 600; color: #3d3b52;
          text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px;
        }
        .tree-root {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; background: #faf9fe;
          border: 1px solid #eeecf8; border-radius: 10px; margin-bottom: 8px;
        }
        .root-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; flex-shrink: 0;
        }
        .root-name { font-size: 13.5px; font-weight: 600; color: #0f0e1a; }
        .root-sub  { font-size: 12px; color: #9b9aaa; margin-top: 1px; }
        .tree-children { display: flex; flex-direction: column; gap: 0; padding-left: 16px; }
        .tree-child { display: flex; align-items: stretch; animation: childIn 0.3s ease both; }
        .tree-line {
          width: 2px; background: #eeecf8; margin-right: 12px;
          border-radius: 2px; flex-shrink: 0;
        }
        .child-node {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 0; flex: 1; border-bottom: 1px solid #f3f4f6;
        }
        .tree-child:last-child .child-node { border-bottom: none; }
        .child-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; flex-shrink: 0;
        }
        .child-info { flex: 1; min-width: 0; }
        .child-name { font-size: 13px; font-weight: 600; color: #0f0e1a; }
        .child-meta { font-size: 11.5px; color: #9b9aaa; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .child-commission { font-size: 12.5px; font-weight: 700; color: #16a34a; font-family: monospace; flex-shrink: 0; }
        .more-refs { font-size: 12px; color: #9b9aaa; padding: 8px 0 0 14px; }
        .empty-tree { font-size: 12.5px; color: #b8b6cc; padding: 8px 0; }
        .payout-list { display: flex; flex-direction: column; gap: 8px; }
        .payout-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .payout-item:last-child { border-bottom: none; }
        .payout-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
        .payout-dot.paid    { background: #86efac; }
        .payout-dot.pending { background: #fcd34d; }
        .payout-amount { font-size: 13px; font-weight: 600; color: #3d3b52; }
        .payout-meta   { font-size: 11.5px; color: #9b9aaa; margin-top: 2px; }
        .empty-list    { font-size: 12.5px; color: #b8b6cc; }
        .divider { height: 1px; background: #f3f4f6; }
        .panel-footer {
          margin-top: auto; padding: 16px 20px;
          border-top: 1px solid #f3f4f6; background: #fff;
          position: sticky; bottom: 0;
          display: flex; justify-content: flex-end; gap: 10px;
        }
        .btn-close {
          padding: 9px 20px; border-radius: 9px;
          border: 1px solid #e4e2f2; background: #fff; color: #3d3b52;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.15s; font-family: inherit;
        }
        .btn-close:hover { background: #f5f4f9; }
        .btn-markpaid {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 18px; border-radius: 9px; border: none;
          background: #16a34a; color: #fff;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: background 0.15s; font-family: inherit;
        }
        .btn-markpaid:hover { background: #15803d; }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes childIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}