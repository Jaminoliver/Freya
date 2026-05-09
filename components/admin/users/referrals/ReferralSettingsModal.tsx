"use client";

import { useState, useEffect } from "react";
import { X, Settings, DollarSign, AlertTriangle } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function ReferralSettingsModal({ onClose }: Props) {
  const [rewardAmount,    setRewardAmount]    = useState("20");
  const [payoutThreshold, setPayoutThreshold] = useState("50");
  const [programEnabled,  setProgramEnabled]  = useState(true);
  const [saved,           setSaved]           = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  return (
    <>
      <div className="backdrop" onClick={onClose} />

      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="header-left">
            <div className="icon-wrap"><Settings size={16} /></div>
            <div className="modal-title">Referral Program Settings</div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="modal-body">

          {/* Program toggle */}
          <div className="field-group">
            <div className="field-row">
              <div>
                <div className="field-label">Program Status</div>
                <div className="field-sub">Enable or disable the referral program globally</div>
              </div>
              <button
                className={`toggle-wrap ${programEnabled ? "on" : "off"}`}
                onClick={() => setProgramEnabled((v) => !v)}
              >
                <span className={`toggle-thumb ${programEnabled ? "on" : ""}`} />
              </button>
            </div>
            {!programEnabled && (
              <div className="warning-notice">
                <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                Disabling the program will stop new referral rewards. Existing pending payouts are unaffected.
              </div>
            )}
          </div>

          <div className="divider" />

          {/* Reward amount */}
          <div className="field-group">
            <div className="field-label">Reward Per Referral</div>
            <div className="field-sub">Commission paid to the referrer when a referred user signs up and subscribes</div>
            <div className="input-wrap">
              <div className="input-prefix"><DollarSign size={14} /></div>
              <input
                type="number"
                min="1"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                className="field-input"
                placeholder="20"
              />
              <div className="input-suffix">USD</div>
            </div>
          </div>

          <div className="divider" />

          {/* Payout threshold */}
          <div className="field-group">
            <div className="field-label">Minimum Payout Threshold</div>
            <div className="field-sub">Referrer must accumulate at least this amount before a payout is triggered</div>
            <div className="input-wrap">
              <div className="input-prefix"><DollarSign size={14} /></div>
              <input
                type="number"
                min="1"
                value={payoutThreshold}
                onChange={(e) => setPayoutThreshold(e.target.value)}
                className="field-input"
                placeholder="50"
              />
              <div className="input-suffix">USD</div>
            </div>
          </div>

          <div className="divider" />

          {/* Preview */}
          <div className="preview-card">
            <div className="preview-label">Preview</div>
            <div className="preview-row">
              <span className="preview-key">Reward per referral</span>
              <span className="preview-val">${rewardAmount || "0"}</span>
            </div>
            <div className="preview-row">
              <span className="preview-key">Payout threshold</span>
              <span className="preview-val">${payoutThreshold || "0"}</span>
            </div>
            <div className="preview-row">
              <span className="preview-key">Referrals to trigger payout</span>
              <span className="preview-val">
                {rewardAmount && payoutThreshold
                  ? Math.ceil(Number(payoutThreshold) / Number(rewardAmount))
                  : "—"} referrals
              </span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className={`btn-save ${saved ? "saved" : ""}`} onClick={handleSave}>
            {saved ? "✓ Saved!" : "Save Settings"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .backdrop {
          position: fixed; inset: 0;
          background: rgba(15,14,26,0.45); z-index: 300;
          animation: fadeIn 0.2s ease;
        }
        .modal {
          position: fixed; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 301; background: #fff;
          border: 1px solid #eeecf8; border-radius: 16px;
          width: 100%; max-width: 460px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          animation: popIn 0.2s cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px; border-bottom: 1px solid #f3f4f6;
        }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .icon-wrap {
          width: 34px; height: 34px; border-radius: 9px;
          background: #f0fdf4; color: #16a34a;
          display: flex; align-items: center; justify-content: center;
        }
        .modal-title { font-size: 15px; font-weight: 700; color: #0f0e1a; }
        .close-btn {
          width: 28px; height: 28px; border-radius: 6px;
          border: 1px solid #e4e2f2; background: #fff; color: #9b9aaa;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.15s; font-family: inherit;
        }
        .close-btn:hover { background: #f5f4f9; color: #0f0e1a; }
        .modal-body { padding: 0; }
        .field-group { padding: 18px 24px; }
        .field-row {
          display: flex; align-items: center;
          justify-content: space-between; gap: 16px;
        }
        .field-label { font-size: 13.5px; font-weight: 600; color: #0f0e1a; margin-bottom: 3px; }
        .field-sub   { font-size: 12px; color: #9b9aaa; line-height: 1.5; max-width: 300px; }
        .toggle-wrap {
          width: 40px; height: 22px; border-radius: 11px;
          border: none; cursor: pointer; position: relative;
          transition: background 0.2s; padding: 0; flex-shrink: 0;
        }
        .toggle-wrap.on  { background: #16a34a; }
        .toggle-wrap.off { background: #d1d5db; }
        .toggle-thumb {
          position: absolute; top: 3px; left: 3px;
          width: 16px; height: 16px; border-radius: 50%;
          background: #fff; transition: transform 0.2s; display: block;
        }
        .toggle-thumb.on { transform: translateX(18px); }
        .warning-notice {
          display: flex; align-items: flex-start; gap: 7px;
          margin-top: 10px; padding: 9px 12px;
          background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
          font-size: 12px; color: #92400e; line-height: 1.5; font-weight: 500;
        }
        .input-wrap {
          display: flex; align-items: center; margin-top: 10px;
          border: 1px solid #e4e2f2; border-radius: 10px; overflow: hidden;
          background: #fff; transition: border-color 0.2s;
        }
        .input-wrap:focus-within { border-color: #16a34a; }
        .input-prefix {
          padding: 10px 12px; color: #9b9aaa;
          border-right: 1px solid #f3f4f6; background: #faf9fe;
          display: flex; align-items: center;
        }
        .input-suffix {
          padding: 10px 12px; color: #9b9aaa; font-size: 12px; font-weight: 600;
          border-left: 1px solid #f3f4f6; background: #faf9fe;
        }
        .field-input {
          flex: 1; padding: 10px 12px; border: none; outline: none;
          font-size: 14px; font-weight: 600; color: #0f0e1a;
          font-family: inherit; background: transparent;
        }
        .preview-card {
          margin: 0 24px 18px;
          padding: 14px 16px;
          background: #faf9fe; border: 1px solid #eeecf8; border-radius: 10px;
        }
        .preview-label {
          font-size: 11px; font-weight: 600; color: #9b9aaa;
          text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;
        }
        .preview-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 5px 0; border-bottom: 1px solid #f3f4f6;
        }
        .preview-row:last-child { border-bottom: none; }
        .preview-key { font-size: 12.5px; color: #9b9aaa; }
        .preview-val { font-size: 13px; font-weight: 700; color: #0f0e1a; }
        .divider { height: 1px; background: #f3f4f6; }
        .modal-footer {
          display: flex; justify-content: flex-end; gap: 10px;
          padding: 16px 24px; border-top: 1px solid #f3f4f6;
        }
        .btn-cancel {
          padding: 9px 20px; border-radius: 8px;
          border: 1px solid #e4e2f2; background: #fff; color: #3d3b52;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.15s; font-family: inherit;
        }
        .btn-cancel:hover { background: #f5f4f9; }
        .btn-save {
          padding: 9px 22px; border-radius: 8px; border: none;
          background: #16a34a; color: #fff;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.2s; font-family: inherit;
        }
        .btn-save:hover { background: #15803d; }
        .btn-save.saved { background: #15803d; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}