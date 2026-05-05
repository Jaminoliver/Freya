"use client";

import { useEffect, useRef } from "react";

const STATS = [
  {
    label: "Gross Revenue",
    value: "$284,920",
    change: "+12.4%",
    up: true,
    sub: "This month",
    color: "#a855f7",
    sparkData: [180, 210, 195, 230, 225, 250, 245, 265, 258, 275, 270, 285],
  },
  {
    label: "Platform Commission",
    value: "$42,738",
    change: "+10.1%",
    up: true,
    sub: "15% avg rate",
    color: "#3b82f6",
    sparkData: [28, 30, 27, 33, 32, 36, 35, 38, 37, 40, 39, 43],
  },
  {
    label: "Creator Payouts",
    value: "$242,182",
    change: "+12.8%",
    up: true,
    sub: "85% avg rate",
    color: "#10b981",
    sparkData: [152, 180, 168, 197, 193, 214, 210, 227, 221, 235, 231, 242],
  },
  {
    label: "Refund Rate",
    value: "1.8%",
    change: "-0.3%",
    up: false,
    sub: "↓ improving",
    color: "#f59e0b",
    sparkData: [2.8, 2.6, 2.9, 2.5, 2.4, 2.2, 2.3, 2.1, 2.0, 1.9, 1.8, 1.8],
  },
  {
    label: "Chargeback Rate",
    value: "0.4%",
    change: "-0.1%",
    up: false,
    sub: "↓ improving",
    color: "#ec4899",
    sparkData: [0.8, 0.7, 0.9, 0.7, 0.6, 0.6, 0.5, 0.5, 0.5, 0.4, 0.4, 0.4],
  },
];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = 48 * dpr;
    ctx.scale(dpr, dpr);
    const W = canvas.offsetWidth, H = 48;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * W,
      y: H - 8 - ((v - min) / range) * (H - 16),
    }));
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + "40");
    grad.addColorStop(1, color + "00");
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2;
      ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.lineTo(pts[pts.length - 1].x, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2;
      ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [data, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "48px", display: "block" }}
    />
  );
}

export default function RevenueStatCards() {
  return (
    <div className="stats-wrap">
      {STATS.map((s) => (
        <div key={s.label} className="stat-card">
          <div className="stat-top">
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-meta">
                <span className={`stat-change ${s.up ? "up" : "down"}`}>{s.change}</span>
                <span className="stat-sub">{s.sub}</span>
              </div>
            </div>
            <Sparkline data={s.sparkData} color={s.color} />
          </div>
        </div>
      ))}

      <style jsx>{`
        .stats-wrap {
          display: flex;
          gap: 14px;
          padding: 20px 32px 0;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          width: 100%;
          box-sizing: border-box;
        }
        .stats-wrap::-webkit-scrollbar { display: none; }
        .stat-card {
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 14px;
          padding: 16px;
          transition: box-shadow 0.2s;
          flex: 0 0 220px;
          min-width: 220px;
        }
        .stat-card:hover { box-shadow: 0 4px 20px rgba(124,58,237,0.08); }
        .stat-top {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .stat-label { font-size: 12px; color: #9b9aaa; font-weight: 500; margin-bottom: 6px; }
        .stat-value { font-size: 22px; font-weight: 700; color: #0f0e1a; letter-spacing: -0.5px; }
        .stat-meta { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
        .stat-change { font-size: 12px; font-weight: 600; }
        .stat-change.up { color: #16a34a; }
        .stat-change.down { color: #16a34a; }
        .stat-sub { font-size: 11.5px; color: #9b9aaa; }
      `}</style>
    </div>
  );
}