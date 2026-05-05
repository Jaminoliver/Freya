"use client";

import { useEffect, useState } from "react";

const gateways = [
  { name: "Stripe", status: "online" as const },
  { name: "PayPal", status: "online" as const },
  { name: "CCBill", status: "degraded" as const },
];

export default function GatewayStatusBar() {
  const [lastChecked, setLastChecked] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastChecked((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkedText = lastChecked === 0
    ? "Last checked 2 min ago"
    : `Last checked ${lastChecked + 2} min ago`;

  return (
    <div className="gateway-bar">
      <span className="gateway-label">Payment Gateways</span>
      <div className="gateway-list">
        {gateways.map((g) => (
          <div key={g.name} className="gateway-item">
            <span className={`gateway-dot ${g.status}`} />
            <span className="gateway-name">{g.name}</span>
          </div>
        ))}
      </div>
      <span className="gateway-checked">{checkedText}</span>

      <style jsx>{`
        .gateway-bar {
          display: flex;
          align-items: center;
          gap: 20px;
          margin: 20px 32px 0;
          padding: 10px 16px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 10px;
          flex-wrap: wrap;
        }
        .gateway-label {
          font-size: 12.5px;
          font-weight: 600;
          color: #374151;
          letter-spacing: 0.01em;
        }
        .gateway-list {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
        }
        .gateway-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .gateway-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .gateway-dot.online {
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34,197,94,0.5);
          animation: pulse 2.5s ease-in-out infinite;
        }
        .gateway-dot.degraded {
          background: #f59e0b;
          box-shadow: 0 0 6px rgba(245,158,11,0.5);
          animation: pulse 1.5s ease-in-out infinite;
        }
        .gateway-dot.offline {
          background: #ef4444;
          box-shadow: 0 0 6px rgba(239,68,68,0.5);
        }
        .gateway-name {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }
        .gateway-checked {
          font-size: 12px;
          color: #9ca3af;
          margin-left: auto;
          white-space: nowrap;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}