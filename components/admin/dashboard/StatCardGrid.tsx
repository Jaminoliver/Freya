"use client";

import { useEffect, useRef } from "react";

const STATS = [
  { label: "Total Revenue", value: "$284,920", change: "+12.4%", up: true, sub: "This month", color: "#a855f7",
    sparkData: [62, 58, 65, 60, 72, 68, 75, 70, 78, 74, 82, 80] },
  { label: "Active Subscriptions", value: "18,432", change: "+8.1%", up: true, sub: "This month", color: "#3b82f6",
    sparkData: [50, 52, 54, 53, 57, 58, 60, 61, 63, 64, 66, 68] },
  { label: "Total Users", value: "142,671", change: "+5.6%", up: true, sub: "This month", color: "#10b981",
    sparkData: [40, 43, 45, 47, 48, 51, 53, 55, 57, 59, 61, 64] },
  { label: "Pending Reviews", value: "47", change: "+23 today", up: false, sub: "Needs attention", color: "#ef4444",
    sparkData: [12, 18, 14, 22, 19, 28, 24, 31, 27, 35, 38, 47] },
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
    const min = Math.min(...data), max = Math.max(...data);
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
  return <canvas ref={canvasRef} style={{ width: "100%", height: "48px", display: "block" }} />;
}

export default function StatCardGrid() {
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
        .stat-top { display: flex; flex-direction: column; gap: 12px; }
        .stat-label { font-size: 12px; color: #9b9aaa; font-weight: 500; margin-bottom: 6px; }
        .stat-value { font-size: 22px; font-weight: 700; color: #0f0e1a; letter-spacing: -0.5px; }
        .stat-meta { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
        .stat-change { font-size: 12px; font-weight: 600; }
        .stat-change.up { color: #16a34a; }
        .stat-change.down { color: #e11d48; }
        .stat-sub { font-size: 11.5px; color: #9b9aaa; }
      `}</style>
    </div>
  );
}