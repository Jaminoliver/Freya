"use client";

const gateways = [
  { name: "Stripe",  amount: "$171,240", pct: 60, transactions: 8420, status: "healthy", color: "#635bff" },
  { name: "PayPal",  amount: "$71,230",  pct: 25, transactions: 3102, status: "healthy", color: "#009cde" },
  { name: "CCBill",  amount: "$28,492",  pct: 10, transactions: 1243, status: "warning", color: "#f59e0b" },
  { name: "Crypto",  amount: "$13,958",  pct: 5,  transactions: 389,  status: "healthy", color: "#10b981" },
];

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  healthy: { bg: "#f0fdf4", text: "#16a34a", label: "Healthy" },
  warning: { bg: "#fffbeb", text: "#d97706", label: "Warning" },
  error:   { bg: "#fef2f2", text: "#dc2626", label: "Error"   },
};

export default function GatewayBreakdownCard() {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Payment Gateways</span>
        <span className="card-sub">Revenue split by processor</span>
      </div>

      <div className="gateway-list">
        {gateways.map((g) => {
          const s = statusColors[g.status];
          return (
            <div key={g.name} className="gateway-row">
              <div className="gateway-top">
                <div className="gateway-left">
                  <div className="gateway-name">{g.name}</div>
                  <div className="gateway-txn">{g.transactions.toLocaleString()} transactions</div>
                </div>
                <div className="gateway-right">
                  <div className="gateway-amount">{g.amount}</div>
                  <span className="status-badge" style={{ background: s.bg, color: s.text }}>{s.label}</span>
                </div>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${g.pct}%`, background: g.color }}
                />
              </div>
              <div className="bar-label">{g.pct}% of total revenue</div>
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
          flex: 1;
          min-width: 0;
        }
        .card-header { margin-bottom: 16px; }
        .card-title { font-size: 15px; font-weight: 600; color: #0f0e1a; display: block; }
        .card-sub { font-size: 12px; color: #9b9aaa; margin-top: 2px; display: block; }
        .gateway-list { display: flex; flex-direction: column; gap: 16px; }
        .gateway-row {}
        .gateway-top {
          display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;
        }
        .gateway-name { font-size: 13px; font-weight: 600; color: #0f0e1a; }
        .gateway-txn { font-size: 11.5px; color: #9b9aaa; margin-top: 2px; }
        .gateway-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .gateway-amount { font-size: 14px; font-weight: 700; color: #0f0e1a; }
        .status-badge {
          font-size: 11px; font-weight: 600; padding: 2px 8px;
          border-radius: 20px; display: inline-block;
        }
        .bar-track {
          height: 6px; background: #f3f4f6; border-radius: 99px; overflow: hidden;
        }
        .bar-fill {
          height: 100%; border-radius: 99px;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .bar-label { font-size: 11px; color: #9b9aaa; margin-top: 4px; }
      `}</style>
    </div>
  );
}